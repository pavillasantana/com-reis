import { describe, it, expect } from 'vitest';
import type { TransacaoAtivo } from '../services/supabaseService';
import {
  apurarRendaVariavel, computarIsentometro, gerarDARFs,
  ultimoDiaUtilMesSeguinte, LIMITE_ISENCAO_ACOES,
} from '../utils/fiscalBR';

function tx(partial: Partial<TransacaoAtivo> & Pick<TransacaoAtivo, 'ticker' | 'tipo' | 'quantidade' | 'preco_unitario' | 'data_transacao'>): TransacaoAtivo {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    id_usuario: 'u1',
    currency: 'BRL',
    country: 'BR',
    price_orig: partial.preco_unitario,
    taxa_cambio: 1,
    ...partial,
  };
}

describe('apurarRendaVariavel — isenção R$ 20k (ações swing)', () => {
  it('vendas <= 20k com lucro → isento, sem DARF', () => {
    // Compra 100 @ 10 (Jan) e vende 100 @ 12 (Jan) = vendas R$ 1.200 ≤ 20k
    const txs = [
      tx({ ticker: 'PETR4', tipo: 'compra', quantidade: 100, preco_unitario: 10, data_transacao: '2026-01-05', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
      tx({ ticker: 'PETR4', tipo: 'venda', quantidade: 100, preco_unitario: 12, data_transacao: '2026-01-20', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
    ];
    const { meses } = apurarRendaVariavel(txs);
    const jan = meses.find((m) => m.mes === '2026-01')!;
    expect(jan.acoes.isento).toBe(true);
    expect(jan.acoes.resultado).toBeCloseTo(200, 2);
    expect(jan.ganho_isento).toBeCloseTo(200, 2);
    expect(jan.total_darf).toBe(0);
  });

  it('vendas > 20k com lucro → 15% sobre o lucro (DARF)', () => {
    // Compra 2000 @ 10 e vende 2000 @ 12 = vendas R$ 24.000 > 20k, lucro R$ 4.000
    const txs = [
      tx({ ticker: 'VALE3', tipo: 'compra', quantidade: 2000, preco_unitario: 10, data_transacao: '2026-01-05', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
      tx({ ticker: 'VALE3', tipo: 'venda', quantidade: 2000, preco_unitario: 12, data_transacao: '2026-01-20', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
    ];
    const { meses } = apurarRendaVariavel(txs);
    const jan = meses.find((m) => m.mes === '2026-01')!;
    expect(jan.acoes.isento).toBe(false);
    expect(jan.acoes.base).toBeCloseTo(4000, 2);
    // imposto = 4000*15% - IRRF (0,005%*24000 = 1,20)
    expect(jan.acoes.irrf).toBeCloseTo(1.2, 2);
    expect(jan.acoes.imposto).toBeCloseTo(600 - 1.2, 2);
    expect(jan.total_darf).toBeCloseTo(598.8, 2);
  });
});

describe('apurarRendaVariavel — day trade (20%)', () => {
  it('compra e venda no mesmo dia → day trade a 20%, sem isenção', () => {
    const txs = [
      tx({ ticker: 'MGLU3', tipo: 'compra', quantidade: 1000, preco_unitario: 10, data_transacao: '2026-02-10', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
      tx({ ticker: 'MGLU3', tipo: 'venda', quantidade: 1000, preco_unitario: 12, data_transacao: '2026-02-10', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
    ];
    const { meses, operacoes } = apurarRendaVariavel(txs);
    const fev = meses.find((m) => m.mes === '2026-02')!;
    expect(operacoes.every((o) => o.silo === 'daytrade')).toBe(true);
    expect(fev.daytrade.resultado).toBeCloseTo(2000, 2);
    expect(fev.daytrade.isento).toBe(false);
    expect(fev.daytrade.base).toBeCloseTo(2000, 2);
    // IRRF day trade = 1% * 2000 = 20; imposto = 2000*20% - 20 = 380
    expect(fev.daytrade.irrf).toBeCloseTo(20, 2);
    expect(fev.daytrade.imposto).toBeCloseTo(380, 2);
    expect(fev.total_darf).toBeCloseTo(380, 2);
  });
});

describe('apurarRendaVariavel — FII (20%)', () => {
  it('venda de FII com lucro → 20%, sem isenção', () => {
    const txs = [
      tx({ ticker: 'KNRI11', tipo: 'compra', quantidade: 100, preco_unitario: 100, data_transacao: '2026-01-10', categoria: 'renda_variavel_br', subcategoria: 'fiis' }),
      tx({ ticker: 'KNRI11', tipo: 'venda', quantidade: 100, preco_unitario: 110, data_transacao: '2026-03-15', categoria: 'renda_variavel_br', subcategoria: 'fiis' }),
    ];
    const { meses } = apurarRendaVariavel(txs);
    const mar = meses.find((m) => m.mes === '2026-03')!;
    expect(mar.fiis.resultado).toBeCloseTo(1000, 2);
    expect(mar.fiis.isento).toBe(false);
    expect(mar.fiis.imposto).toBeCloseTo(1000 * 0.2 - (11000 * 0.005) / 100, 2);
    expect(mar.total_darf).toBeGreaterThan(0);
  });
});

describe('apurarRendaVariavel — compensação de prejuízos', () => {
  it('prejuízo de um mês compensa lucro futuro da mesma modalidade', () => {
    const txs = [
      // Mês 1: prejuízo de R$ 1.000 (vende abaixo do custo)
      tx({ ticker: 'ITUB4', tipo: 'compra', quantidade: 1000, preco_unitario: 30, data_transacao: '2026-01-05', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
      tx({ ticker: 'ITUB4', tipo: 'venda', quantidade: 1000, preco_unitario: 29, data_transacao: '2026-01-20', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
      // Mês 3: lucro de R$ 2.000
      tx({ ticker: 'ITUB4', tipo: 'compra', quantidade: 1000, preco_unitario: 30, data_transacao: '2026-03-01', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
      tx({ ticker: 'ITUB4', tipo: 'venda', quantidade: 1000, preco_unitario: 32, data_transacao: '2026-03-20', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
    ];
    const { meses } = apurarRendaVariavel(txs);
    const jan = meses.find((m) => m.mes === '2026-01')!;
    const mar = meses.find((m) => m.mes === '2026-03')!;
    expect(jan.acoes.base).toBe(0);
    expect(jan.acoes.prejuizo_restante).toBeCloseTo(-1000, 2);
    // março: resultado 2000, compensa 1000 → base 1000
    expect(mar.acoes.prejuizo_acumulado).toBeCloseTo(-1000, 2);
    expect(mar.acoes.base).toBeCloseTo(1000, 2);
  });
});

describe('isentômetro', () => {
  it('calcula restante e isenção para vendas no mês', () => {
    const iso = computarIsentometro(12000, '2026-04');
    expect(iso.limite).toBe(LIMITE_ISENCAO_ACOES);
    expect(iso.restante).toBe(8000);
    expect(iso.isento).toBe(true);
    expect(iso.percentual).toBe(60);

    const iso2 = computarIsentometro(25000, '2026-04');
    expect(iso2.isento).toBe(false);
    expect(iso2.percentual).toBe(125);
  });
});

describe('DARF', () => {
  it('gera DARF código 6015 com vencimento no último dia útil do mês seguinte', () => {
    const txs = [
      tx({ ticker: 'PETR4', tipo: 'compra', quantidade: 2000, preco_unitario: 10, data_transacao: '2026-01-05', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
      tx({ ticker: 'PETR4', tipo: 'venda', quantidade: 2000, preco_unitario: 12, data_transacao: '2026-01-20', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
    ];
    const { meses } = apurarRendaVariavel(txs);
    const darfs = gerarDARFs(meses);
    expect(darfs.length).toBe(1);
    expect(darfs[0].codigo).toBe('6015');
    expect(darfs[0].mes).toBe('2026-01');
    expect(darfs[0].vencimento).toBe('2026-02-27'); // último dia útil de fev/2026 (sex 27)
  });

  it('não gera DARF abaixo de R$ 10', () => {
    // lucro pequeno: imposto < R$ 10 → acumula (sem DARF)
    const txs = [
      tx({ ticker: 'ITUB4', tipo: 'compra', quantidade: 100, preco_unitario: 30, data_transacao: '2026-01-05', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
      tx({ ticker: 'ITUB4', tipo: 'venda', quantidade: 100, preco_unitario: 30.1, data_transacao: '2026-01-20', categoria: 'renda_variavel_br', subcategoria: 'acoes' }),
    ];
    const { meses } = apurarRendaVariavel(txs);
    const darfs = gerarDARFs(meses);
    expect(darfs.length).toBe(0);
  });
});

describe('ultimoDiaUtilMesSeguinte', () => {
  it('janeiro → fevereiro', () => {
    expect(ultimoDiaUtilMesSeguinte('2026-01')).toBe('2026-02-27');
  });
  it('março → abril (sem fim de semana)', () => {
    expect(ultimoDiaUtilMesSeguinte('2026-03')).toBe('2026-04-30');
  });
});
