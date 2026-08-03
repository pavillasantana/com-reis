/**
 * investmentImporter.test.ts
 * Testes unitários para utils/investmentImporter.ts
 *
 * Cobre:
 * - normalizeTicker: "PETR4 - PETROBRAS" → "PETR4"
 * - parseAportesCSV: formatos variados, detecção de colunas, compra/venda
 * - parseAtivosCSV: posição atual (ticker, quantidade, preço médio)
 * - parseAportesXLSX / parseAtivosXLSX: planilhas reais
 */

import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  normalizeTicker,
  parseAportesCSV,
  parseAtivosCSV,
  parseAportesXLSX,
  parseAtivosXLSX,
} from '../utils/investmentImporter';

const csv = (text: string) => text.trim();

// ─── normalizeTicker ───────────────────────────────────────────────────────────

describe('normalizeTicker()', () => {
  it('extrai ticker de "PETR4 - PETROBRAS"', () => {
    expect(normalizeTicker('PETR4 - PETROBRAS')).toBe('PETR4');
  });
  it('extrai ticker de BDR internacional', () => {
    expect(normalizeTicker('ASML34 - ASML HOLDING NV')).toBe('ASML34');
  });
  it('extrai ticker de ação americana', () => {
    expect(normalizeTicker('AAPL - APPLE INC.')).toBe('AAPL');
  });
  it('converte para maiúsculas e limpa espaços', () => {
    expect(normalizeTicker('  itub4  ')).toBe('ITUB4');
  });
  it('mantém ticker simples intacto', () => {
    expect(normalizeTicker('MXRF11')).toBe('MXRF11');
  });
});

// ─── parseAportesCSV ──────────────────────────────────────────────────────────

describe('parseAportesCSV()', () => {
  it('retorna vazio para CSV sem cabeçalho de ticker', () => {
    const r = parseAportesCSV(csv(`
      Data,Descricao,Valor
      01/01/2026,Compras,100.00
    `));
    expect(r).toEqual([]);
  });

  it('parseia colunas ticker, quantidade, preço e data', () => {
    const r = parseAportesCSV(csv(`
      ticker,quantidade,preco unitario,data
      PETR4,10,30.50,01/02/2026
      VALE3,5,60.25,02/02/2026
    `));
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({
      ticker: 'PETR4',
      tipo: 'compra',
      quantidade: 10,
      precoUnitario: 30.5,
      dataTransacao: '2026-02-01',
      categoria: 'renda_variavel_br',
      subcategoria: 'acoes',
    });
    expect(r[1].ticker).toBe('VALE3');
  });

  it('detecta venda pela coluna tipo', () => {
    const r = parseAportesCSV(csv(`
      Ativo;Tipo Operacao;Qtd;Preco
      PETR4;VENDA;10;31.00
      VALE3;Compra;5;60.00
    `));
    expect(r[0].tipo).toBe('venda');
    expect(r[1].tipo).toBe('compra');
  });

  it('detecta venda por quantidade negativa', () => {
    const r = parseAportesCSV(csv(`
      ticker,quantidade,preco,data
      PETR4,-10,31.00,01/02/2026
    `));
    expect(r[0].tipo).toBe('venda');
    expect(r[0].quantidade).toBe(10);
  });

  it('extrai ticker do formato "ATIVO - NOME"', () => {
    const r = parseAportesCSV(csv(`
      Produto,Qtde,Preço,Data
      ASML34 - ASML HOLDING NV,2,90.10,10/08/2026
    `));
    expect(r[0].ticker).toBe('ASML34');
  });

  it('infere categoria internacional para ticker dos EUA', () => {
    const r = parseAportesCSV(csv(`
      ticker,quantidade,preco,data
      AAPL,3,220.00,01/02/2026
    `));
    expect(r[0].categoria).toBe('internacional');
    expect(r[0].subcategoria).toBe('stocks');
  });

  it('deriva preço unitário do valor total quando não informado', () => {
    const r = parseAportesCSV(csv(`
      ticker,quantidade,valor total,data
      PETR4,10,305.00,01/02/2026
    `));
    expect(r[0].precoUnitario).toBeCloseTo(30.5, 2);
  });

  it('aceita valor no formato BR (vírgula decimal)', () => {
    const r = parseAportesCSV(csv(`
      ticker;quantidade;preco;data
      PETR4;10;30,50;01/02/2026
    `));
    expect(r[0].precoUnitario).toBeCloseTo(30.5, 2);
  });

  it('usa data de hoje quando não há coluna de data', () => {
    const r = parseAportesCSV(csv(`
      ticker,quantidade,preco
      PETR4,10,30.50
    `));
    expect(r[0].dataTransacao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── parseAtivosCSV ───────────────────────────────────────────────────────────

describe('parseAtivosCSV()', () => {
  it('parseia posição atual (ticker, quantidade, preço médio)', () => {
    const r = parseAtivosCSV(csv(`
      ticker,quantidade,preco medio
      PETR4,100,28.40
      MXRF11,200,9.85
    `));
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({
      ticker: 'PETR4',
      quantidade: 100,
      precoMedio: 28.4,
      categoria: 'renda_variavel_br',
    });
    expect(r[1].subcategoria).toBe('fiis');
  });

  it('ignora linhas sem quantidade ou preço', () => {
    const r = parseAtivosCSV(csv(`
      ticker,quantidade,preco medio
      PETR4,100,28.40
      ,,,
    `));
    expect(r).toHaveLength(1);
  });

  it('categoriza FII e ETF corretamente', () => {
    const r = parseAtivosCSV(csv(`
      ticker,quantidade,preco medio
      BOVA11,50,120.00
      KNCR11,300,95.00
    `));
    expect(r[0].subcategoria).toBe('etfs_br');
    expect(r[1].subcategoria).toBe('fiis');
  });
});

// ─── parseXLSX (via XLSX.build) ───────────────────────────────────────────────

function makeBuffer(rows: unknown[][], headers: string[]): ArrayBuffer {
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

describe('parseAportesXLSX()', () => {
  it('parseia planilha de operações', () => {
    const buf = makeBuffer(
      [
        ['PETR4', 'COMPRA', 10, 30.5, new Date(2026, 1, 1)],
        ['VALE3', 'VENDA', 5, 60.25, new Date(2026, 1, 2)],
      ],
      ['Ticker', 'Tipo', 'Quantidade', 'Preço Unitário', 'Data'],
    );
    const r = parseAportesXLSX(buf);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ ticker: 'PETR4', tipo: 'compra', quantidade: 10 });
    expect(r[1]).toMatchObject({ ticker: 'VALE3', tipo: 'venda' });
  });
});

describe('parseAtivosXLSX()', () => {
  it('parseia planilha de posição atual', () => {
    const buf = makeBuffer(
      [
        ['ITUB4', 100, 25.4],
        ['IVVB11', 30, 350.0],
      ],
      ['Produto', 'Quantidade', 'Preço Médio'],
    );
    const r = parseAtivosXLSX(buf);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ ticker: 'ITUB4', quantidade: 100, precoMedio: 25.4 });
    expect(r[1].subcategoria).toBe('etfs_br');
  });
});
