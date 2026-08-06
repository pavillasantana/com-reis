export interface ResultadoInvestimento {
  bruto: number;
  juros: number;
  ir?: number;
  liquido?: number;
}

const TAXA_CDI_DEFAULT = 10.65;
const TAXA_SELIC_DEFAULT = 11.75;

function taxaMensalEquivalente(taxaAnualPct: number): number {
  return Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1;
}

export function jurosCompostos(
  principal: number,
  taxaMensalPct: number,
  meses: number,
  aporteMensal = 0,
): number {
  if (meses <= 0) return principal;
  const i = taxaMensalPct / 100;
  const fvPrincipal = principal * Math.pow(1 + i, meses);
  if (aporteMensal <= 0) return fvPrincipal;
  const fvAportes = aporteMensal * ((Math.pow(1 + i, meses) - 1) / i);
  return fvPrincipal + fvAportes;
}

export function jurosSimples(
  principal: number,
  taxaPct: number,
  meses: number,
): { juros: number; montante: number } {
  const juros = principal * (taxaPct / 100) * meses;
  return { juros, montante: principal + juros };
}

export function converterTaxaMensalParaAnual(taxaMensalPct: number): number {
  return (Math.pow(1 + taxaMensalPct / 100, 12) - 1) * 100;
}

export function converterTaxaAnualParaMensal(taxaAnualPct: number): number {
  return (Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1) * 100;
}

export function aliquotIRCDB(dias: number): number {
  if (dias <= 180) return 22.5;
  if (dias <= 360) return 20;
  if (dias <= 720) return 17.5;
  return 15;
}

export function calcularInvestimentoIndexado(
  principal: number,
  percentualIndice: number,
  taxaIndiceAnualPct: number,
  meses: number,
): ResultadoInvestimento {
  const taxaAnual = taxaIndiceAnualPct * (percentualIndice / 100);
  const i = taxaMensalEquivalente(taxaAnual);
  const bruto = principal * Math.pow(1 + i, meses);
  return { bruto, juros: bruto - principal };
}

export function calcularCDB(
  principal: number,
  percentualCDI: number,
  taxaCDIAnualPct: number,
  meses: number,
): ResultadoInvestimento {
  const base = calcularInvestimentoIndexado(principal, percentualCDI, taxaCDIAnualPct, meses);
  const ir = base.juros * (aliquotIRCDB(meses * 30) / 100);
  return { ...base, ir, liquido: base.bruto - ir };
}

export function calcularPoupanca(
  principal: number,
  aporteMensal: number,
  taxaMensalPct: number,
  meses: number,
): ResultadoInvestimento {
  const total = jurosCompostos(principal, taxaMensalPct, meses, aporteMensal);
  const aportes = aporteMensal * meses;
  const depositos = principal + aportes;
  return { bruto: total, juros: total - depositos };
}

export function calcularFGTS(
  salario: number,
  meses: number,
  taxaAnualPct = 3,
): { depositos: number; juros: number; total: number } {
  const i = taxaMensalEquivalente(taxaAnualPct);
  const depositoMensal = salario * 0.08;
  const total = jurosCompostos(0, i * 100, meses, depositoMensal);
  const depositos = depositoMensal * meses;
  return { depositos, juros: total - depositos, total };
}

export function calcularFerias(salario: number, dias: number, adicionalPct = 100 / 3): number {
  const base = (salario / 30) * dias;
  return base * (1 + adicionalPct / 100);
}

export function calcularFeriasProporcionais(salario: number, mesesTrabalhados: number): number {
  const meses = Math.max(0, Math.min(12, mesesTrabalhados));
  return ((salario / 12) * meses) * (4 / 3);
}

export function calcularAbonoFerias(salario: number): number {
  return salario / 3;
}

interface FaixaINSS {
  topo: number;
  aliquota: number;
}

const FAIXAS_INSS: FaixaINSS[] = [
  { topo: 1518.0, aliquota: 0.075 },
  { topo: 2793.88, aliquota: 0.09 },
  { topo: 4190.24, aliquota: 0.12 },
  { topo: 8157.41, aliquota: 0.14 },
];

const TETO_INSS = 8157.41;

export function calcularINSS(salario: number): number {
  const base = Math.min(salario, TETO_INSS);
  let contribuicao = 0;
  let anterior = 0;
  for (const faixa of FAIXAS_INSS) {
    const teto = Math.min(faixa.topo, base);
    if (teto > anterior) {
      contribuicao += (teto - anterior) * faixa.aliquota;
    }
    anterior = faixa.topo;
  }
  return contribuicao;
}

interface FaixaIRRF {
  topo: number;
  aliquota: number;
  deducao: number;
}

const FAIXAS_IRRF: FaixaIRRF[] = [
  { topo: 2259.2, aliquota: 0, deducao: 0 },
  { topo: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { topo: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { topo: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { topo: Infinity, aliquota: 0.275, deducao: 896.0 },
];

const DEDUCAO_DEPENDENTE = 189.59;

export function calcularIRRF(base: number, dependentes = 0): number {
  const baseReduzida = Math.max(0, base - dependentes * DEDUCAO_DEPENDENTE);
  const faixa = FAIXAS_IRRF.find((f) => baseReduzida <= f.topo) ?? FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
  return Math.max(0, baseReduzida * faixa.aliquota - faixa.deducao);
}

export function calcularSalarioLiquidoBR(
  salario: number,
  dependentes = 0,
): { inss: number; irrf: number; liquido: number } {
  const inss = calcularINSS(salario);
  const irrf = calcularIRRF(salario - inss, dependentes);
  return { inss, irrf, liquido: salario - inss - irrf };
}

export function calcularSalarioLiquidoAR(salario: number): { aportes: number; liquido: number } {
  const aportes = salario * 0.17;
  return { aportes, liquido: salario - aportes };
}

export interface DadosRescisao {
  salario: number;
  diasTrabalhadosNoMes: number;
  mesesFeriasProporcionais: number;
  mesesDecimoTerceiro: number;
  diasAvisoPrevio: number;
  saldoFGTS: number;
}

export interface ResultadoRescisao {
  saldoSalario: number;
  avisoPrevio: number;
  feriasProporcionais: number;
  decimoTerceiro: number;
  multaFGTS: number;
  total: number;
}

export function calcularRescisaoCLT(dados: DadosRescisao): ResultadoRescisao {
  const saldoSalario = (dados.salario / 30) * dados.diasTrabalhadosNoMes;
  const avisoPrevio = (dados.salario / 30) * dados.diasAvisoPrevio;
  const feriasProporcionais = calcularFeriasProporcionais(dados.salario, dados.mesesFeriasProporcionais);
  const decimoTerceiro = (dados.salario / 12) * dados.mesesDecimoTerceiro;
  const multaFGTS = dados.saldoFGTS * 0.4;
  return {
    saldoSalario,
    avisoPrevio,
    feriasProporcionais,
    decimoTerceiro,
    multaFGTS,
    total: saldoSalario + avisoPrevio + feriasProporcionais + decimoTerceiro + multaFGTS,
  };
}

export function diasEntre(inicio: Date, fim: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  const inicioMidnight = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
  const fimMidnight = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate()).getTime();
  return Math.round((fimMidnight - inicioMidnight) / msPorDia);
}

export function diasRestantesAte(data: Date): number {
  return Math.max(0, diasEntre(new Date(), data));
}

export interface ResultadoFinanciamento {
  valorParcela: number;
  totalPago: number;
  jurosTotais: number;
}

export function calcularParcelaPrice(valor: number, taxaMensalPct: number, parcelas: number): number {
  if (parcelas <= 0) return 0;
  const i = taxaMensalPct / 100;
  if (i === 0) return valor / parcelas;
  return (valor * i) / (1 - Math.pow(1 + i, -parcelas));
}

export function calcularFinanciamentoPrice(
  valor: number,
  taxaMensalPct: number,
  parcelas: number,
): ResultadoFinanciamento {
  const valorParcela = calcularParcelaPrice(valor, taxaMensalPct, parcelas);
  const totalPago = valorParcela * parcelas;
  return { valorParcela, totalPago, jurosTotais: totalPago - valor };
}

export interface ResultadoSAC {
  primeiraParcela: number;
  ultimaParcela: number;
  totalPago: number;
  jurosTotais: number;
}

export function calcularFinanciamentoSAC(
  valor: number,
  taxaMensalPct: number,
  parcelas: number,
): ResultadoSAC {
  if (parcelas <= 0) {
    return { primeiraParcela: 0, ultimaParcela: 0, totalPago: 0, jurosTotais: 0 };
  }
  const i = taxaMensalPct / 100;
  const amortizacao = valor / parcelas;
  const primeiraParcela = amortizacao + valor * i;
  const ultimaParcela = amortizacao + amortizacao * i;
  const totalPago = valor + i * valor * ((parcelas + 1) / 2);
  return { primeiraParcela, ultimaParcela, totalPago, jurosTotais: totalPago - valor };
}

export const TAXAS_REFERENCIA = {
  cdi: TAXA_CDI_DEFAULT,
  selic: TAXA_SELIC_DEFAULT,
  poupanca: 0.5,
  taxaFeriasAdicional: 100 / 3,
} as const;
