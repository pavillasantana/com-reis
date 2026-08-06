/**
 * calculadoras.test.ts
 * Testes unitários para utils/calculadoras.ts
 *
 * Cobre: CDI/LCA/LCI/CDB, juros compostos/simples, equivalência de taxas,
 * férias, salário líquido (BR/AR), FGTS, rescisão, dias, financiamentos (Price/SAC).
 */

import { describe, it, expect } from 'vitest';
import {
  jurosCompostos,
  jurosSimples,
  converterTaxaMensalParaAnual,
  converterTaxaAnualParaMensal,
  aliquotIRCDB,
  calcularInvestimentoIndexado,
  calcularCDB,
  calcularPoupanca,
  calcularFGTS,
  calcularFerias,
  calcularFeriasProporcionais,
  calcularAbonoFerias,
  calcularINSS,
  calcularSalarioLiquidoBR,
  calcularSalarioLiquidoAR,
  calcularRescisaoCLT,
  diasEntre,
  diasRestantesAte,
  calcularParcelaPrice,
  calcularFinanciamentoPrice,
  calcularFinanciamentoSAC,
} from '../utils/calculadoras';

function arredondar(valor: number, casas = 2): number {
  return Math.round(valor * 10 ** casas) / 10 ** casas;
}

describe('Juros Compostos', () => {
  it('1.000 a 1% a.m. por 12 meses sem aporte', () => {
    expect(arredondar(jurosCompostos(1000, 1, 12))).toBe(1126.83);
  });

  it('com aporte mensal', () => {
    const total = jurosCompostos(0, 1, 12, 100);
    expect(arredondar(total)).toBe(1268.25);
  });

  it('meses zerados retorna o principal', () => {
    expect(jurosCompostos(500, 2, 0)).toBe(500);
  });
});

describe('Juros Simples', () => {
  it('1.000 a 2% a.m. por 6 meses', () => {
    const r = jurosSimples(1000, 2, 6);
    expect(r.juros).toBe(120);
    expect(r.montante).toBe(1120);
  });
});

describe('Equivalência de taxas', () => {
  it('1% a.m. equivale a ~12,68% a.a.', () => {
    expect(arredondar(converterTaxaMensalParaAnual(1), 2)).toBe(12.68);
  });

  it('12,68% a.a. equivale a ~1% a.m.', () => {
    expect(arredondar(converterTaxaAnualParaMensal(12.68), 2)).toBe(1);
  });
});

describe('CDI / LCA / LCI', () => {
  it('100% CDI (10,65% a.a.) por 12 meses', () => {
    const r = calcularInvestimentoIndexado(10000, 100, 10.65, 12);
    expect(arredondar(r.juros)).toBe(1065);
    expect(r.bruto).toBeGreaterThan(10000);
  });

  it('120% CDI rende mais que 100%', () => {
    const r120 = calcularInvestimentoIndexado(10000, 120, 10.65, 12);
    const r100 = calcularInvestimentoIndexado(10000, 100, 10.65, 12);
    expect(r120.juros).toBeGreaterThan(r100.juros);
  });
});

describe('CDB com IR regressivo', () => {
  it('alíquota por prazo', () => {
    expect(aliquotIRCDB(90)).toBe(22.5);
    expect(aliquotIRCDB(200)).toBe(20);
    expect(aliquotIRCDB(400)).toBe(17.5);
    expect(aliquotIRCDB(800)).toBe(15);
  });

  it('líquido é menor que bruto e maior que o principal', () => {
    const r = calcularCDB(10000, 100, 10.65, 12);
    expect(r.liquido!).toBeGreaterThan(10000);
    expect(r.liquido!).toBeLessThan(r.bruto);
    expect(r.ir!).toBeGreaterThan(0);
  });
});

describe('Poupança', () => {
  it('1.000 a 0,5% a.m. por 12 meses', () => {
    const r = calcularPoupanca(1000, 0, 0.5, 12);
    expect(arredondar(r.bruto)).toBe(1061.68);
  });
});

describe('FGTS', () => {
  it('depósito é 8% do salário por mês', () => {
    const r = calcularFGTS(2000, 12);
    expect(arredondar(r.depositos)).toBe(1920);
    expect(r.total).toBeGreaterThan(r.depositos);
  });
});

describe('Férias', () => {
  it('30 dias + 1/3', () => {
    expect(arredondar(calcularFerias(3000, 30))).toBe(4000);
  });

  it('proporcionais (6 meses)', () => {
    expect(arredondar(calcularFeriasProporcionais(3000, 6))).toBe(2000);
  });

  it('abono/venda = 1/3 do salário', () => {
    expect(arredondar(calcularAbonoFerias(3000))).toBe(1000);
  });
});

describe('Salário Líquido BR', () => {
  it('INSS progressivo', () => {
    expect(arredondar(calcularINSS(2000))).toBe(157.23);
  });

  it('salário mínimo não paga IRRF', () => {
    const r = calcularSalarioLiquidoBR(1518);
    expect(r.irrf).toBe(0);
    expect(r.liquido).toBeLessThan(1518);
  });

  it('faixa alta paga IRRF', () => {
    const r = calcularSalarioLiquidoBR(10000);
    expect(r.irrf).toBeGreaterThan(0);
    expect(r.liquido).toBeLessThan(10000);
  });

  it('dependentes reduzem IRRF', () => {
    const sem = calcularSalarioLiquidoBR(5000, 0);
    const com = calcularSalarioLiquidoBR(5000, 2);
    expect(com.irrf).toBeLessThan(sem.irrf);
  });
});

describe('Salário Líquido AR', () => {
  it('aportes de ~17%', () => {
    const r = calcularSalarioLiquidoAR(1000000);
    expect(arredondar(r.aportes)).toBe(170000);
    expect(r.liquido).toBe(830000);
  });
});

describe('Rescisão CLT', () => {
  it('calcula todas as verbas e a multa de 40% do FGTS', () => {
    const r = calcularRescisaoCLT({
      salario: 3000,
      diasTrabalhadosNoMes: 15,
      mesesFeriasProporcionais: 6,
      mesesDecimoTerceiro: 8,
      diasAvisoPrevio: 30,
      saldoFGTS: 5000,
    });
    expect(arredondar(r.saldoSalario)).toBe(1500);
    expect(arredondar(r.avisoPrevio)).toBe(3000);
    expect(arredondar(r.multaFGTS)).toBe(2000);
    expect(r.total).toBeGreaterThan(0);
  });
});

describe('Dias restantes', () => {
  it('diferença entre datas', () => {
    const d1 = new Date(2026, 0, 1);
    const d2 = new Date(2026, 0, 11);
    expect(diasEntre(d1, d2)).toBe(10);
  });

  it('datas invertidas retornam dias negativos em diasEntre', () => {
    expect(diasEntre(new Date(2026, 5, 1), new Date(2026, 0, 1))).toBeLessThan(0);
  });

  it('data no passado retorna 0 em diasRestantesAte', () => {
    expect(diasRestantesAte(new Date(2000, 0, 1))).toBe(0);
  });
});

describe('Financiamentos', () => {
  it('Price: parcela de 10.000 a 1% a.m. em 12x', () => {
    expect(arredondar(calcularParcelaPrice(10000, 1, 12))).toBe(888.49);
  });

  it('Price: total pago > valor', () => {
    const r = calcularFinanciamentoPrice(10000, 1, 12);
    expect(r.totalPago).toBeGreaterThan(10000);
    expect(r.jurosTotais).toBeGreaterThan(0);
  });

  it('SAC: primeira parcela > última parcela', () => {
    const r = calcularFinanciamentoSAC(10000, 1, 12);
    expect(r.primeiraParcela).toBeGreaterThan(r.ultimaParcela);
    expect(r.totalPago).toBeGreaterThan(10000);
  });

  it('taxa zero: Price parcela = valor/parcelas', () => {
    expect(arredondar(calcularParcelaPrice(1200, 0, 12))).toBe(100);
  });
});
