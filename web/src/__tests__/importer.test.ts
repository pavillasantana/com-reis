/**
 * importer.test.ts
 * Testes unitários rigorosos para utils/importer.ts
 *
 * Cobre:
 * - autoCategorize: categorização por palavras-chave
 * - parseCSV: formatos variados, cabeçalhos, encoding, edge cases
 * - parseOFX: blocos STMTTRN, CREDIT/DEBIT, datas OFX, edge cases
 */

import { describe, it, expect } from 'vitest';
import { autoCategorize, parseCSV, parseOFX, parseXLSX } from '../utils/importer';
import * as XLSX from 'xlsx';

const FAKE_CONTA_ID = 'conta-test-123';

// ─── autoCategorize ───────────────────────────────────────────────────────────

describe('autoCategorize()', () => {
  it('categoriza Uber como Transporte', () => {
    expect(autoCategorize('UBER TRIP 1234')).toBe('Transporte');
  });
  it('categoriza iFood como Alimentação', () => {
    expect(autoCategorize('IFOOD*RESTAURANTE')).toBe('Alimentação');
  });
  it('categoriza Netflix como Lazer', () => {
    expect(autoCategorize('NETFLIX.COM')).toBe('Lazer');
  });
  it('categoriza aluguel como Moradia', () => {
    expect(autoCategorize('Aluguel apartamento')).toBe('Moradia');
  });
  it('categoriza salario como Salário', () => {
    expect(autoCategorize('salario mensal empresa')).toBe('Salário');
  });
  it('retorna Outros para descrição desconhecida', () => {
    expect(autoCategorize('PAGAMENTO BOLETO 123456')).toBe('Outros');
  });
  it('é case-insensitive', () => {
    expect(autoCategorize('SUPERMERCADO PEG-MÁS')).toBe('Alimentação');
  });
  it('retorna Outros para string vazia', () => {
    expect(autoCategorize('')).toBe('Outros');
  });
});

// ─── parseCSV ─────────────────────────────────────────────────────────────────

describe('parseCSV()', () => {
  it('retorna array vazio para CSV só com header', () => {
    const csv = 'Data,Descrição,Valor,Categoria\n';
    expect(parseCSV(csv, FAKE_CONTA_ID)).toHaveLength(0);
  });

  it('retorna array vazio para string vazia', () => {
    expect(parseCSV('', FAKE_CONTA_ID)).toHaveLength(0);
  });

  it('parseia 1 transação de receita com cabeçalho padrão', () => {
    const csv = 'Data,Descrição,Valor,Categoria\n2026-06-15,Salário,5000.00,Salário';
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('receita');
    expect(result[0].valor).toBe(5000);
    expect(result[0].categoria).toBe('Salário');
    expect(result[0].id_conta).toBe(FAKE_CONTA_ID);
  });

  it('parseia despesa com valor negativo corretamente', () => {
    const csv = 'Data,Descrição,Valor\n2026-06-18,Aluguel,-1200.00';
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('despesa');
    expect(result[0].valor).toBe(1200); // abs do valor
    expect(result[0].categoria).toBe('Moradia'); // auto-categorizado
  });

  it('parseia múltiplas linhas', () => {
    const csv = [
      'Data;Descrição;Valor',
      '2026-06-01;Salário;3500',
      '2026-06-05;iFood;-45.50',
      '2026-06-10;Uber;-15.00',
    ].join('\n');
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result).toHaveLength(3);
    expect(result[0].tipo).toBe('receita');
    expect(result[1].tipo).toBe('despesa');
    expect(result[2].tipo).toBe('despesa');
  });

  it('converte data no formato DD/MM/YYYY corretamente', () => {
    const csv = 'Data,Descrição,Valor\n15/06/2026,Teste,100';
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result[0].data_transacao).toBe('2026-06-15');
  });

  it('converte data no formato YYYY-MM-DD corretamente', () => {
    const csv = 'Data,Descrição,Valor\n2026-06-15,Teste,100';
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result[0].data_transacao).toBe('2026-06-15');
  });

  it('ignora linhas com valores não numéricos', () => {
    const csv = 'Data,Descrição,Valor\n2026-06-01,Teste,abc\n2026-06-02,Real,100';
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].valor).toBe(100);
  });

  it('define taxa_cambio_dia como 1.0 por padrão', () => {
    const csv = 'Data,Descrição,Valor\n2026-06-01,Teste,100';
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result[0].taxa_cambio_dia).toBe(1.0);
  });

  it('auto-categoriza quando coluna de categoria está ausente', () => {
    const csv = 'Data,Descrição,Valor\n2026-06-01,Netflix,29.90';
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result[0].categoria).toBe('Lazer');
  });

  it('usa categoria do CSV quando fornecida', () => {
    const csv = 'Data,Descrição,Valor,Categoria\n2026-06-01,Qualquer,100,Investimentos';
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result[0].categoria).toBe('Investimentos');
  });

  it('lida com separadores ponto-e-vírgula', () => {
    const csv = 'Data;Descrição;Valor\n2026-06-01;Teste;500';
    const result = parseCSV(csv, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].valor).toBe(500);
  });
});

// ─── parseOFX ────────────────────────────────────────────────────────────────

describe('parseOFX()', () => {
  const buildOFX = (blocks: string) => `
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          ${blocks}
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

  it('retorna vazio para OFX sem transações', () => {
    expect(parseOFX('<OFX></OFX>', FAKE_CONTA_ID)).toHaveLength(0);
  });

  it('parseia uma transação de débito', () => {
    const ofx = buildOFX(`
      <STMTTRN>
        <TRNTYPE>DEBIT
        <DTPOSTED>20260615
        <TRNAMT>-1200.00
        <MEMO>Aluguel Apartamento
      </STMTTRN>
    `);
    const result = parseOFX(ofx, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('despesa');
    expect(result[0].valor).toBe(1200);
    expect(result[0].data_transacao).toBe('2026-06-15');
    expect(result[0].id_conta).toBe(FAKE_CONTA_ID);
  });

  it('parseia uma transação de crédito', () => {
    const ofx = buildOFX(`
      <STMTTRN>
        <TRNTYPE>CREDIT
        <DTPOSTED>20260601
        <TRNAMT>5000.00
        <MEMO>Salário Mensal
      </STMTTRN>
    `);
    const result = parseOFX(ofx, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('receita');
    expect(result[0].valor).toBe(5000);
  });

  it('parseia múltiplas transações', () => {
    const ofx = buildOFX(`
      <STMTTRN>
        <TRNTYPE>CREDIT
        <DTPOSTED>20260601
        <TRNAMT>3500.00
        <MEMO>Salario
      </STMTTRN>
      <STMTTRN>
        <TRNTYPE>DEBIT
        <DTPOSTED>20260605
        <TRNAMT>-250.50
        <MEMO>Supermercado
      </STMTTRN>
    `);
    const result = parseOFX(ofx, FAKE_CONTA_ID);
    expect(result).toHaveLength(2);
    expect(result[0].tipo).toBe('receita');
    expect(result[1].tipo).toBe('despesa');
  });

  it('converte data OFX YYYYMMDD para YYYY-MM-DD', () => {
    const ofx = buildOFX(`
      <STMTTRN>
        <DTPOSTED>20260101
        <TRNAMT>100.00
        <MEMO>Teste
      </STMTTRN>
    `);
    const result = parseOFX(ofx, FAKE_CONTA_ID);
    expect(result[0].data_transacao).toBe('2026-01-01');
  });

  it('auto-categoriza pelo MEMO', () => {
    const ofx = buildOFX(`
      <STMTTRN>
        <DTPOSTED>20260615
        <TRNAMT>-29.90
        <MEMO>NETFLIX.COM
      </STMTTRN>
    `);
    const result = parseOFX(ofx, FAKE_CONTA_ID);
    expect(result[0].categoria).toBe('Lazer');
  });

  it('ignora blocos sem TRNAMT', () => {
    const ofx = buildOFX(`
      <STMTTRN>
        <TRNTYPE>DEBIT
        <DTPOSTED>20260615
        <MEMO>Sem valor
      </STMTTRN>
    `);
    const result = parseOFX(ofx, FAKE_CONTA_ID);
    expect(result).toHaveLength(0);
  });

  it('valor absoluto é sempre positivo na saída', () => {
    const ofx = buildOFX(`
      <STMTTRN>
        <DTPOSTED>20260615
        <TRNAMT>-500.00
        <MEMO>Qualquer
      </STMTTRN>
    `);
    const result = parseOFX(ofx, FAKE_CONTA_ID);
    expect(result[0].valor).toBeGreaterThan(0);
    expect(result[0].valor).toBe(500);
  });
});

// ─── parseXLSX ───────────────────────────────────────────────────────────────

function buildXLSX(data: Record<string, unknown>[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function buildXLSXArray(rows: unknown[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('parseXLSX()', () => {
  it('retorna array vazio para planilha vazia', () => {
    const buf = buildXLSX([]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result).toHaveLength(0);
  });

  it('parseia header-based com colunas em português', () => {
    const buf = buildXLSX([
      { Data: '15/06/2026', Descricao: 'Salário', Valor: 5000 },
    ]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('receita');
    expect(result[0].valor).toBe(5000);
    expect(result[0].data_transacao).toBe('2026-06-15');
  });

  it('parseia header-based com colunas em inglês', () => {
    const buf = buildXLSX([
      { Date: '2026-06-15', Description: 'Freelance', Amount: 2500.50 },
    ]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('receita');
    expect(result[0].valor).toBe(2500.50);
    expect(result[0].descricao).toBe('Freelance');
  });

  it('parseia despesa com valor negativo', () => {
    const buf = buildXLSX([
      { Data: '18/06/2026', Descricao: 'Aluguel', Valor: -1200.00 },
    ]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('despesa');
    expect(result[0].valor).toBe(1200);
  });

  it('fallback column-position-based quando não há cabeçalho', () => {
    const buf = buildXLSXArray([
      ['15/06/2026', 'iFood', -45.90],
    ]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].valor).toBe(45.90);
    expect(result[0].tipo).toBe('despesa');
  });

  it('auto-categoriza descrições', () => {
    const buf = buildXLSX([
      { Data: '01/07/2026', Descricao: 'NETFLIX.COM', Valor: 29.90 },
    ]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result[0].categoria).toBe('Lazer');
  });

  it('lida com string de valor em formato BR (1.500,00)', () => {
    const buf = buildXLSX([
      { Data: '10/07/2026', Descricao: 'Notebook', Valor: '1.500,00' },
    ]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result[0].valor).toBe(1500);
  });

  it('lida com serial date do Excel', () => {
    // Serial 46188 = 15/06/2026 (Excel epoch)
    const buf = buildXLSX([
      { Data: 46188, Descricao: 'Teste', Valor: 100 },
    ]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result[0].data_transacao).toBe('2026-06-15');
  });

  it('filtra linhas com valor zero', () => {
    const buf = buildXLSX([
      { Data: '01/07/2026', Descricao: 'Nulo', Valor: 0 },
      { Data: '02/07/2026', Descricao: 'Real', Valor: 100 },
    ]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].valor).toBe(100);
  });

  it('usa data atual como fallback quando não encontra coluna de data', () => {
    const buf = buildXLSX([
      { Valor: 200, Descricao: 'Sem data' },
    ]);
    const result = parseXLSX(buf, FAKE_CONTA_ID);
    expect(result).toHaveLength(1);
    expect(result[0].data_transacao).toBeDefined();
  });
});
