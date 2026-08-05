import * as XLSX from 'xlsx';
import { parseValor, parseData } from './importer';
import { getCategoriaByTicker } from './investmentCategories';

/**
 * Importação de planilhas EXCLUSIVA para Investimentos:
 *  - Aportes  → operações de compra/venda de ativos (transacoes_ativos)
 *  - Ativos   → posição atual (ticker, quantidade, preço médio)
 * Suporta .xlsx/.xls/.csv/.tsv e tolera formatos de corretoras/B3,
 * inclusive "PETR4 - PETROBRAS" (nome no mesmo campo do ticker).
 */

export interface PendingAporte {
  _key: string;
  ticker: string;
  nome: string;
  tipo: 'compra' | 'venda';
  quantidade: number;
  precoUnitario: number;
  dataTransacao: string;
  categoria: string;
  subcategoria: string;
}

export interface PendingAtivo {
  _key: string;
  ticker: string;
  nome: string;
  quantidade: number;
  precoMedio: number;
  dataTransacao: string;
  categoria: string;
  subcategoria: string;
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** "PETR4 - PETROBRAS" → "PETR4"; "ASML34 - ASML HOLDING NV" → "ASML34" */
export function normalizeTicker(raw: unknown): string {
  let s = String(raw ?? '').trim();
  const dash = s.indexOf(' - ');
  if (dash > 0) s = s.slice(0, dash);
  s = s.split(/\s+/)[0];
  return s.toUpperCase();
}

function categoriaDeTicker(ticker: string): { categoria: string; subcategoria: string } {
  const info = getCategoriaByTicker(ticker);
  return {
    categoria: info?.categoria || 'renda_variavel_br',
    subcategoria: info?.subcategoria || 'acoes',
  };
}

/** Localiza a coluna que corresponde a algum dos nomes informados. */
function findKey(keys: string[], ...names: string[]): string | null {
  for (const n of names) {
    const nl = stripAccents(n);
    const found = keys.find((k) => {
      const kl = stripAccents(k);
      return kl.includes(nl) || nl.includes(kl);
    });
    if (found) return found;
  }
  return null;
}

/** Detecta compra/venda a partir da coluna de tipo/operação ou do sinal da quantidade. */
function detectTipo(rawTipo: unknown, qtdCell: unknown): 'compra' | 'venda' {
  const qtdNegativa = typeof qtdCell === 'number'
    ? qtdCell < 0
    : /-\s*\d/.test(String(qtdCell ?? ''));
  if (qtdNegativa) return 'venda';
  const s = String(rawTipo ?? '').trim().toLowerCase();
  if (!s) return 'compra';
  if (s.startsWith('v') || s.startsWith('sell') || s.startsWith('sale')) return 'venda';
  return 'compra';
}

let keySeq = 0;
const nextKey = () => `inv-${Date.now().toString(36)}-${(keySeq++).toString(36)}`;

// ─── APORTES ────────────────────────────────────────────────────────────────

function parseAportesRows(rows: Record<string, unknown>[]): PendingAporte[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);

  const tickerKey = findKey(keys, 'ticker', 'produto', 'papel', 'codigo', 'ativo', 'nome ativo', 'negociacao');
  if (!tickerKey) return [];

  const tipoKey = findKey(keys, 'tipo', 'tipo operacao', 'operação', 'operacao', 'movimentacao', 'movimento');
  const qtdKey = findKey(keys, 'quantidade', 'qtd', 'qtde', 'quant', 'quant. vend', 'quant. comp');
  const puKey = findKey(keys, 'preco unitario', 'preço unitário', 'preco', 'preço', 'pu', 'valor unitario', 'valor unitário');
  const valorKey = findKey(keys, 'valor total', 'valor', 'total', 'liquido', 'líquido', 'vlr');
  const dataKey = findKey(keys, 'data', 'data negociacao', 'data da operacao', 'data operacao', 'data do negocio', 'dt', 'lancamento', 'pagamento');
  const nomeKey = findKey(keys, 'nome', 'descricao', 'descrição', 'nome do papel', 'empresa');

  return rows.map((row) => {
    const ticker = normalizeTicker(row[tickerKey]);
    if (!ticker) return null;

    const qtdCell = qtdKey ? row[qtdKey] : undefined;
    const quantidade = Math.abs(parseValor(qtdCell));
    const precoUnitario = puKey ? parseValor(row[puKey]) : 0;
    const valorTotal = valorKey ? parseValor(row[valorKey]) : 0;

    // Fallback: se só houver valor total, derivar o preço unitário da quantidade
    const precoFinal = precoUnitario > 0 ? precoUnitario : (quantidade > 0 ? valorTotal / quantidade : 0);
    if (quantidade <= 0 && precoFinal <= 0) return null;

    const dataRaw = dataKey ? row[dataKey] : '';
    const dataTransacao = dataRaw != null && String(dataRaw).trim() !== '' ? parseData(dataRaw) : new Date().toISOString().split('T')[0];

    const { categoria, subcategoria } = categoriaDeTicker(ticker);
    return {
      _key: nextKey(),
      ticker,
      nome: nomeKey ? String(row[nomeKey] || '').trim() : '',
      tipo: detectTipo(tipoKey ? row[tipoKey] : undefined, qtdCell),
      quantidade: quantidade > 0 ? quantidade : (precoFinal > 0 ? valorTotal / precoFinal : 0),
      precoUnitario: precoFinal,
      dataTransacao,
      categoria,
      subcategoria,
    };
  }).filter((r): r is PendingAporte => r !== null && r.quantidade > 0 && r.precoUnitario > 0);
}

export function parseAportesXLSX(arrayBuffer: ArrayBuffer): PendingAporte[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return parseAportesRows(rows);
}

export function parseAportesCSV(text: string): PendingAporte[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  const delim = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].toLowerCase().split(delim).map((h) => h.trim());
  const toRow = (line: string): Record<string, unknown> => {
    const cells = line.split(delim);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  };
  return parseAportesRows(lines.slice(1).map(toRow));
}

// ─── ATIVOS (POSIÇÃO) ───────────────────────────────────────────────────────

function parseAtivosRows(rows: Record<string, unknown>[]): PendingAtivo[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);

  const tickerKey = findKey(keys, 'ticker', 'produto', 'papel', 'codigo', 'ativo', 'nome ativo', 'código');
  if (!tickerKey) return [];

  const qtdKey = findKey(keys, 'quantidade', 'qtd', 'qtde', 'quant', 'saldo', 'posicao', 'posição');
  const pmKey = findKey(keys, 'preco medio', 'preço médio', 'preco médio', 'preço medio', 'custo medio', 'custo médio', 'pm', 'preco', 'preço', 'valor');
  const nomeKey = findKey(keys, 'nome', 'descricao', 'descrição', 'nome do papel', 'empresa');
  const dataKey = findKey(keys, 'data', 'data posicao', 'data posição', 'posicao em', 'posição em', 'data inicial', 'dt', 'lancamento');

  return rows.map((row) => {
    const ticker = normalizeTicker(row[tickerKey]);
    if (!ticker) return null;

    const quantidade = qtdKey ? Math.abs(parseValor(row[qtdKey])) : 0;
    const precoMedio = pmKey ? parseValor(row[pmKey]) : 0;
    if (quantidade <= 0 || precoMedio <= 0) return null;

    const dataRaw = dataKey ? row[dataKey] : '';
    const dataTransacao = dataRaw != null && String(dataRaw).trim() !== '' ? parseData(dataRaw) : new Date().toISOString().split('T')[0];

    const { categoria, subcategoria } = categoriaDeTicker(ticker);
    return {
      _key: nextKey(),
      ticker,
      nome: nomeKey ? String(row[nomeKey] || '').trim() : '',
      quantidade,
      precoMedio,
      dataTransacao,
      categoria,
      subcategoria,
    };
  }).filter((r): r is PendingAtivo => r !== null);
}

export function parseAtivosXLSX(arrayBuffer: ArrayBuffer): PendingAtivo[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return parseAtivosRows(rows);
}

export function parseAtivosCSV(text: string): PendingAtivo[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  const delim = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].toLowerCase().split(delim).map((h) => h.trim());
  const toRow = (line: string): Record<string, unknown> => {
    const cells = line.split(delim);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  };
  return parseAtivosRows(lines.slice(1).map(toRow));
}

/**
 * Ponto de entrada unificado: decide CSV vs XLSX pelo nome do arquivo.
 */
export function parseInvestmentFile(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  mode: 'ativos' | 'aportes'
): PendingAporte[] | PendingAtivo[] {
  const lower = fileName.toLowerCase();
  const isText = /\.(csv|tsv|txt)$/.test(lower);
  if (isText) {
    const text = new TextDecoder('utf-8').decode(arrayBuffer);
    return mode === 'aportes' ? parseAportesCSV(text) : parseAtivosCSV(text);
  }
  return mode === 'aportes' ? parseAportesXLSX(arrayBuffer) : parseAtivosXLSX(arrayBuffer);
}
