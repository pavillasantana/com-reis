/**
 * currency.test.ts
 * Testes unitários rigorosos para utils/currency.ts
 *
 * Cobre:
 * - Precisão de ponto flutuante (o problema clássico de 0.1 + 0.2)
 * - Formatação por moeda
 * - Operações aritméticas (soma, subtração, multiplicação, divisão)
 * - Edge cases: zero, negativos, strings, valores muito grandes
 */

import { describe, it, expect } from 'vitest';
import { addMoney, subtractMoney, multiplyMoney, divideMoney, formatCurrency } from '../utils/currency';

// ─── PONTO FLUTUANTE ──────────────────────────────────────────────────────────

describe('Precisão de Ponto Flutuante', () => {
  it('0.1 + 0.2 deve ser exatamente 0.30 (não 0.30000000000000004)', () => {
    expect(addMoney(0.1, 0.2)).toBe(0.3);
  });

  it('1.005 deve arredondar para 1.01, não 1.00', () => {
    expect(addMoney(1.0, 0.005)).toBe(1.01);
  });

  it('19.90 - 0.01 deve ser exatamente 19.89', () => {
    expect(subtractMoney(19.9, 0.01)).toBe(19.89);
  });

  it('10.00 / 3 não deve causar dízima infinita no resultado', () => {
    const result = divideMoney(10.0, 3);
    expect(result).toBe(3.33); // Currency.js faz o arredondamento na precisão 2
  });
});

// ─── addMoney ─────────────────────────────────────────────────────────────────

describe('addMoney()', () => {
  it('soma dois inteiros positivos', () => {
    expect(addMoney(100, 200)).toBe(300);
  });

  it('soma dois decimais com precisão monetária', () => {
    expect(addMoney(1500.50, 299.75)).toBe(1800.25);
  });

  it('soma zero a um valor', () => {
    expect(addMoney(500, 0)).toBe(500);
  });

  it('soma strings numéricas (aceita string como entrada)', () => {
    expect(addMoney('100.50', '200.25')).toBe(300.75);
  });

  it('resultado de múltiplas somas encadeadas é preciso', () => {
    // Simula acumulação de transações
    let saldo = 0;
    [100.10, 200.20, 300.30, 400.40].forEach(v => { saldo = addMoney(saldo, v); });
    expect(saldo).toBe(1001.00);
  });

  it('soma valores muito grandes sem overflow', () => {
    expect(addMoney(999999999.99, 0.01)).toBe(1000000000.00);
  });
});

// ─── subtractMoney ────────────────────────────────────────────────────────────

describe('subtractMoney()', () => {
  it('subtrai dois inteiros positivos', () => {
    expect(subtractMoney(500, 200)).toBe(300);
  });

  it('subtrai com precisão decimal', () => {
    expect(subtractMoney(1000.00, 99.99)).toBe(900.01);
  });

  it('resultado pode ser zero', () => {
    expect(subtractMoney(100, 100)).toBe(0);
  });

  it('resultado pode ser negativo (saldo devedor)', () => {
    // Conta pode ficar negativa (cheque especial)
    expect(subtractMoney(50, 100)).toBe(-50);
  });

  it('subtração encadeada de despesas é precisa', () => {
    // Simula desconto de 5 despesas de R$10,10
    let saldo = 100;
    for (let i = 0; i < 5; i++) {
      saldo = subtractMoney(saldo, 10.10);
    }
    expect(saldo).toBe(49.50);
  });
});

// ─── multiplyMoney ────────────────────────────────────────────────────────────

describe('multiplyMoney()', () => {
  it('calcula reserva de emergência (4× renda)', () => {
    expect(multiplyMoney(5000, 4)).toBe(20000);
  });

  it('multiplica por fator decimal (ex: 1.5% ao mês)', () => {
    expect(multiplyMoney(1000, 0.015)).toBe(15);
  });

  it('multiplica por zero retorna zero', () => {
    expect(multiplyMoney(9999, 0)).toBe(0);
  });

  it('aplica fator de câmbio corretamente', () => {
    // 100 USD × 5.40 BRL/USD = 540 BRL
    expect(multiplyMoney(100, 5.40)).toBe(540);
  });
});

// ─── divideMoney ──────────────────────────────────────────────────────────────

describe('divideMoney()', () => {
  it('divide igualmente', () => {
    expect(divideMoney(300, 3)).toBe(100);
  });

  it('divide com decimais', () => {
    expect(divideMoney(100, 3)).toBe(33.33); // arredondado em 2 casas
  });

  it('divide valor alto por fator de câmbio', () => {
    // 540 BRL ÷ 5.40 = 100 USD
    expect(divideMoney(540, 5.40)).toBe(100);
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency()', () => {
  it('formata BRL com símbolo e separadores brasileiros', () => {
    const result = formatCurrency(1500.99, 'BRL');
    expect(result).toContain('R$');
    expect(result).toContain('1.500'); // separador de milhar
    expect(result).toContain(',99');   // separador decimal
  });

  it('formata USD com símbolo dólar', () => {
    const result = formatCurrency(999.99, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('999');
  });

  it('formata EUR com símbolo euro', () => {
    const result = formatCurrency(250.00, 'EUR');
    expect(result).toContain('€');
  });

  it('usa BRL como fallback para moeda desconhecida', () => {
    const result = formatCurrency(100, 'XYZ');
    expect(result).toContain('R$');
  });

  it('formata zero corretamente', () => {
    const result = formatCurrency(0, 'BRL');
    expect(result).toContain('0');
  });

  it('formata valor negativo (saldo devedor)', () => {
    const result = formatCurrency(-500, 'BRL');
    expect(result).toContain('-');
    expect(result).toContain('500');
  });

  it('aceita string como entrada', () => {
    const result = formatCurrency('1234.56', 'BRL');
    expect(result).toContain('R$');
  });
});
