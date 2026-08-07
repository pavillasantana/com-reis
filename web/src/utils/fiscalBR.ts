import type { TransacaoAtivo } from '../services/supabaseService';

// ─── Fiscal BR — Apuração de IR de Renda Variável (B3) ─────────────────────
// Regras: Lei 11.033/2004 (isenção R$ 20k/mês ações à vista) e IN RFB 1.585/2015.
// Estimativa educativa — confira com seu informe de rendimentos / contador.

export const LIMITE_ISENCAO_ACOES = 20000;
export const DARF_VALOR_MINIMO = 10;
export const CODIGO_DARF = '6015';
export const ALIQUOTA_ACOES = 0.15;
export const ALIQUOTA_OUTROS = 0.15;
export const ALIQUOTA_FII = 0.2;
export const ALIQUOTA_DAYTRADE = 0.2;
export const IRRF_SWING_ALIQUOTA = 0.00005; // 0,005% sobre vendas (dedo-duro)
export const IRRF_DAYTRADE_ALIQUOTA = 0.01; // 1% sobre o ganho bruto (day trade)

export type SiloFiscal = 'acoes' | 'outros' | 'fiis' | 'daytrade';

export interface OperacaoVenda {
  ticker: string;
  data: string; // YYYY-MM-DD
  mes: string; // YYYY-MM
  quantidade: number;
  valor: number; // venda em BRL
  custo: number; // custo médio correspondente
  resultado: number; // valor - custo
  silo: SiloFiscal;
}

export interface ApuracaoSiloMensal {
  vendas: number;
  custo: number;
  resultado: number;
  isento: boolean; // apenas 'acoes': vendas do mês <= R$ 20k
  prejuizo_acumulado: number; // prejuízo de meses anteriores (negativo ou 0)
  base: number; // resultado - prejuízo compensado
  prejuizo_restante: number; // negativo se ainda resta prejuízo
  imposto: number; // já descontado o IRRF
  irrf: number; // dedo-duro estimado
  darf: number; // valor da DARF (>= R$ 10), senão 0
}

export interface ApuracaoMes {
  mes: string; // YYYY-MM
  acoes: ApuracaoSiloMensal;
  outros: ApuracaoSiloMensal;
  fiis: ApuracaoSiloMensal;
  daytrade: ApuracaoSiloMensal;
  ganho_isento: number; // lucro isento (ações com vendas <= R$ 20k)
  total_darf: number;
  total_vendas: number;
}

export interface DARF {
  mes: string; // mês de apuração YYYY-MM
  codigo: string;
  valor: number;
  vencimento: string; // YYYY-MM-DD (último dia útil do mês seguinte)
}

export interface Isentometro {
  mes: string;
  limite: number;
  vendas: number;
  restante: number;
  isento: boolean;
  percentual: number; // 0..100+
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

const SILOS: SiloFiscal[] = ['acoes', 'outros', 'fiis', 'daytrade'];

function aliquotaSilo(silo: SiloFiscal): number {
  switch (silo) {
    case 'fiis': return ALIQUOTA_FII;
    case 'daytrade': return ALIQUOTA_DAYTRADE;
    default: return ALIQUOTA_ACOES;
  }
}

// Classifica a venda de uma operação no silo fiscal correto (ou null se não
// entra na apuração mensal de renda variável — ex.: renda fixa, cripto).
export function siloDeVenda(tx: TransacaoAtivo): SiloFiscal | null {
  const cat = (tx.categoria || '').toLowerCase();
  const sub = (tx.subcategoria || '').toLowerCase();
  if (cat === 'renda_variavel_br') {
    if (sub === 'fiis' || sub === 'fiagro') return 'fiis';
    if (sub === 'acoes' || !sub) return 'acoes';
    return 'outros'; // ETFs BR, opções/derivativos (15% sem isenção — aproximação)
  }
  if (cat === 'internacional' && sub === 'bdrs') return 'outros';
  return null;
}

function emptySilo(): ApuracaoSiloMensal {
  return {
    vendas: 0, custo: 0, resultado: 0, isento: false,
    prejuizo_acumulado: 0, base: 0, prejuizo_restante: 0,
    imposto: 0, irrf: 0, darf: 0,
  };
}

function emptyMes(mes: string): ApuracaoMes {
  return {
    mes,
    acoes: emptySilo(), outros: emptySilo(), fiis: emptySilo(), daytrade: emptySilo(),
    ganho_isento: 0, total_darf: 0, total_vendas: 0,
  };
}

export function ultimoDiaUtilMesSeguinte(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m + 1, 0); // último dia do mês seguinte ao `mes`
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function computarIsentometro(vendasAcoesMes: number, mes: string): Isentometro {
  const vendas = r2(vendasAcoesMes);
  return {
    mes,
    limite: LIMITE_ISENCAO_ACOES,
    vendas,
    restante: r2(LIMITE_ISENCAO_ACOES - vendas),
    isento: vendas <= LIMITE_ISENCAO_ACOES,
    percentual: Math.round((vendas / LIMITE_ISENCAO_ACOES) * 100),
  };
}

export function isentometroPorMes(meses: ApuracaoMes[], mes: string): Isentometro {
  const ap = meses.find((m) => m.mes === mes);
  return computarIsentometro(ap?.acoes.vendas ?? 0, mes);
}

// Apura o IR mensal de renda variável usando preço médio ponderado por ticker.
// Detecção de day trade: compra e venda do mesmo ticker no mesmo dia — a parcela
// mínima entre as duas é tratada como day trade (alíquota 20%); o restante é
// operação comum (swing).
export function apurarRendaVariavel(
  txs: TransacaoAtivo[],
): { operacoes: OperacaoVenda[]; meses: ApuracaoMes[] } {
  const byTicker: Record<string, TransacaoAtivo[]> = {};
  for (const tx of txs) {
    if (tx.tipo !== 'compra' && tx.tipo !== 'venda') continue;
    const k = tx.ticker.toUpperCase();
    if (!byTicker[k]) byTicker[k] = [];
    byTicker[k].push(tx);
  }

  const operacoes: OperacaoVenda[] = [];

  for (const ticker of Object.keys(byTicker)) {
    const byDate = new Map<string, TransacaoAtivo[]>();
    for (const tx of byTicker[ticker]) {
      const d = tx.data_transacao.slice(0, 10);
      const arr = byDate.get(d);
      if (arr) arr.push(tx);
      else byDate.set(d, [tx]);
    }
    const dates = [...byDate.keys()].sort();

    let pm = 0;
    let qtd = 0;

    for (const date of dates) {
      const dayTxs = byDate.get(date)!;
      const compras = dayTxs.filter((t) => t.tipo === 'compra');
      const vendas = dayTxs.filter((t) => t.tipo === 'venda');
      const totCompra = compras.reduce((s, t) => s + t.quantidade, 0);
      const totVenda = vendas.reduce((s, t) => s + t.quantidade, 0);
      const precoCompra = totCompra > 0
        ? compras.reduce((s, t) => s + t.quantidade * t.preco_unitario, 0) / totCompra
        : 0;
      const precoVenda = totVenda > 0
        ? vendas.reduce((s, t) => s + t.quantidade * t.preco_unitario, 0) / totVenda
        : 0;
      const mes = date.slice(0, 7);

      const dayQtd = Math.min(totCompra, totVenda);
      if (dayQtd > 0) {
        operacoes.push({
          ticker, data: date, mes, quantidade: dayQtd,
          valor: r2(dayQtd * precoVenda), custo: r2(dayQtd * precoCompra),
          resultado: r2(dayQtd * (precoVenda - precoCompra)),
          silo: 'daytrade',
        });
      }

      const swingQtdCompra = totCompra - dayQtd;
      if (swingQtdCompra > 0) {
        pm = (pm * qtd + swingQtdCompra * precoCompra) / (qtd + swingQtdCompra);
        qtd += swingQtdCompra;
      }

      const swingQtdVenda = totVenda - dayQtd;
      if (swingQtdVenda > 0 && qtd > 0) {
        const custo = Math.min(qtd, swingQtdVenda) * pm;
        const valor = swingQtdVenda * precoVenda;
        const silo = siloDeVenda(dayTxs[0]) ?? 'outros';
        operacoes.push({
          ticker, data: date, mes, quantidade: swingQtdVenda,
          valor: r2(valor), custo: r2(custo),
          resultado: r2(valor - custo),
          silo,
        });
        qtd = Math.max(0, qtd - swingQtdVenda);
        if (qtd <= 0) pm = 0;
      }
    }
  }

  const mesesMap = new Map<string, ApuracaoMes>();
  const prejuizos: Record<SiloFiscal, number> = { acoes: 0, outros: 0, fiis: 0, daytrade: 0 };

  const sortedOps = [...operacoes].sort(
    (a, b) => a.mes.localeCompare(b.mes) || a.data.localeCompare(b.data),
  );

  for (const op of sortedOps) {
    let m = mesesMap.get(op.mes);
    if (!m) {
      m = emptyMes(op.mes);
      mesesMap.set(op.mes, m);
    }
    const ap = m[op.silo];
    ap.vendas += op.valor;
    ap.custo += op.custo;
    ap.resultado += op.resultado;
  }

  for (const mes of [...mesesMap.values()].sort((a, b) => a.mes.localeCompare(b.mes))) {
    mes.total_vendas = r2(mes.acoes.vendas + mes.outros.vendas + mes.fiis.vendas + mes.daytrade.vendas);
    for (const silo of SILOS) {
      const ap = mes[silo];
      ap.vendas = r2(ap.vendas);
      ap.custo = r2(ap.custo);
      ap.resultado = r2(ap.resultado);

      const isentoAcoes = silo === 'acoes' && ap.vendas <= LIMITE_ISENCAO_ACOES && ap.resultado > 0;
      if (isentoAcoes) {
        ap.isento = true;
        ap.base = 0;
        ap.imposto = 0;
        ap.irrf = 0;
        ap.darf = 0;
        ap.prejuizo_acumulado = prejuizos[silo];
        ap.prejuizo_restante = prejuizos[silo];
        mes.ganho_isento = r2(mes.ganho_isento + ap.resultado);
      } else {
        ap.prejuizo_acumulado = prejuizos[silo];
        const comPrejuizo = ap.resultado + prejuizos[silo];
        ap.base = r2(Math.max(0, comPrejuizo));
        ap.prejuizo_restante = r2(Math.min(0, comPrejuizo));

        if (silo === 'daytrade') {
          ap.irrf = r2(Math.max(0, ap.resultado) * IRRF_DAYTRADE_ALIQUOTA);
        } else if (ap.vendas > 0) {
          ap.irrf = r2(ap.vendas * IRRF_SWING_ALIQUOTA);
        }
        ap.imposto = r2(Math.max(0, ap.base * aliquotaSilo(silo) - ap.irrf));
        ap.darf = ap.imposto >= DARF_VALOR_MINIMO ? r2(ap.imposto) : 0;
      }

      mes.total_darf = r2(mes.total_darf + ap.darf);
      prejuizos[silo] = ap.prejuizo_restante;
    }
  }

  const meses = [...mesesMap.values()].sort((a, b) => b.mes.localeCompare(a.mes));
  return { operacoes, meses };
}

export function gerarDARFs(meses: ApuracaoMes[]): DARF[] {
  return meses
    .filter((m) => m.total_darf > 0)
    .map((m) => ({
      mes: m.mes,
      codigo: CODIGO_DARF,
      valor: r2(m.total_darf),
      vencimento: ultimoDiaUtilMesSeguinte(m.mes),
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}
