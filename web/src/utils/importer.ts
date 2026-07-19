import type { Transacao } from '../store/useStore';
import * as XLSX from 'xlsx';

/**
 * Função para auto-categorizar transações baseada na descrição.
 */
export function autoCategorize(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('uber') || desc.includes('99app') || desc.includes('posto') || desc.includes('combustivel')) {
    return 'Transporte';
  }
  if (desc.includes('ifood') || desc.includes('restaurante') || desc.includes('supermercado') || desc.includes('mercado') || desc.includes('padaria')) {
    return 'Alimentação';
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('steam') || desc.includes('cinema')) {
    return 'Lazer';
  }
  if (desc.includes('aluguel') || desc.includes('condominio') || desc.includes('luz') || desc.includes('energia') || desc.includes('agua') || desc.includes('internet')) {
    return 'Moradia';
  }
  if (desc.includes('salario') || desc.includes('pix recebido') || desc.includes('ted recebido') || desc.includes('rendimento')) {
    return 'Salário';
  }
  return 'Outros';
}

/**
 * Interpreta arquivos CSV e extrai transações.
 * Suporta formatos:
 * - Data,Descrição,Valor,Categoria (e variações em inglês)
 */
export function parseCSV(text: string, idConta: string): Omit<Transacao, 'id'>[] {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  // Tenta identificar cabeçalhos
  const headers = lines[0].toLowerCase().split(/[;,]/);
  const dateIdx = headers.findIndex((h) => h.includes('data') || h.includes('date'));
  const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('memo') || h.includes('detalhe'));
  const valueIdx = headers.findIndex((h) => h.includes('valor') || h.includes('value') || h.includes('monto') || h.includes('quant'));
  const catIdx = headers.findIndex((h) => h.includes('cat'));

  const transactions: Omit<Transacao, 'id'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/[;,]/);
    if (row.length < 2) continue;

    // Fallbacks se não achar índices corretos
    const dateStr = dateIdx !== -1 ? row[dateIdx] : row[0];
    const descStr = descIdx !== -1 ? row[descIdx] : row[1];
    const valStr = valueIdx !== -1 ? row[valueIdx] : row[2];
    const catStr = catIdx !== -1 && row[catIdx] ? row[catIdx] : '';

    // Limpa valor e converte para número
    if (!valStr) continue;
    const cleanValueStr = valStr.replace(/"/g, '').replace(/\s/g, '').replace(',', '.');
    const rawVal = parseFloat(cleanValueStr);
    if (isNaN(rawVal)) continue;

    // Normaliza a data (YYYY-MM-DD)
    let formattedDate = new Date().toISOString().split('T')[0];
    try {
      const parts = dateStr.replace(/"/g, '').split(/[-/]/);
      if (parts.length === 3) {
        // Assume DD/MM/YYYY ou YYYY-MM-DD
        if (parts[0].length === 4) {
          formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    } catch (e) {
      console.warn('Erro ao formatar data no CSV', e);
    }

    const valorAbs = Math.abs(rawVal);
    const tipo = rawVal >= 0 ? 'receita' : 'despesa';
    const categoria = catStr.trim() || autoCategorize(descStr);

    transactions.push({
      id_conta: idConta,
      tipo,
      valor: valorAbs,
      categoria,
      data_transacao: formattedDate,
      taxa_cambio_dia: 1.0,
      descricao: descStr.replace(/"/g, '').trim(),
    });
  }

  return transactions;
}

/**
 * Interpreta arquivos OFX simplificados e extrai transações.
 */
export function parseOFX(text: string, idConta: string): Omit<Transacao, 'id'>[] {
  const transactions: Omit<Transacao, 'id'>[] = [];
  
  // Expressão regular para capturar blocos <STMTTRN>
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = stmttrnRegex.exec(text)) !== null) {
    const block = match[1];

    // Extrai campos
    const trntype = (/<TRNTYPE>(.*)/i.exec(block)?.[1] || '').trim();
    const dtposted = (/<DTPOSTED>(\d{8})/i.exec(block)?.[1] || '').trim();
    const trnamt = (/<TRNAMT>([^<\s]+)/i.exec(block)?.[1] || '').trim();
    const memo = (/<MEMO>(.*)/i.exec(block)?.[1] || /<NAME>(.*)/i.exec(block)?.[1] || 'Transação OFX').trim();

    if (!trnamt) continue;

    // Valor da transação
    const rawVal = parseFloat(trnamt.replace(',', '.'));
    if (isNaN(rawVal)) continue;

    // Data formatada YYYY-MM-DD
    let formattedDate = new Date().toISOString().split('T')[0];
    if (dtposted && dtposted.length >= 8) {
      formattedDate = `${dtposted.substring(0, 4)}-${dtposted.substring(4, 6)}-${dtposted.substring(6, 8)}`;
    }

    const valorAbs = Math.abs(rawVal);
    // Em OFX, se for CREDIT ou valor positivo é receita, se for DEBIT ou valor negativo é despesa
    const tipo = rawVal >= 0 || trntype.toUpperCase() === 'CREDIT' ? 'receita' : 'despesa';
    const categoria = autoCategorize(memo);

    transactions.push({
      id_conta: idConta,
      tipo,
      valor: valorAbs,
      categoria,
      data_transacao: formattedDate,
      taxa_cambio_dia: 1.0,
      descricao: memo,
    });
  }

  return transactions;
}

/**
 * Interpreta arquivos XLSX e extrai transações.
 */
/** Tenta parsear um valor para número, aceitando formato BR (1.500,00) e US (1500.50) */
function parseValor(v: unknown): number {
  if (typeof v === 'number') return Math.abs(v);
  if (v == null || v === '') return 0;
  const str = String(v).replace(/[R$\s]/g, '').trim();
  // Detecta formato BR: "1.500,00" ou "500,00"
  if (/,00$/.test(str)) {
    const n = parseFloat(str.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : Math.abs(n);
  }
  const n = parseFloat(str.replace(',', '.'));
  return isNaN(n) ? 0 : Math.abs(n);
}

/** Tenta converter um valor para data ISO (YYYY-MM-DD) */
function parseData(v: unknown): string {
  if (v == null || v === '') return new Date().toISOString().split('T')[0];
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000); // Excel epoch
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return new Date().toISOString().split('T')[0];
}

export function parseXLSX(arrayBuffer: ArrayBuffer, idConta: string): Omit<Transacao, 'id'>[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  console.log(`[parseXLSX] Sheet names:`, wb.SheetNames);

  // ── Tentativa 1: header-based (primeira linha = cabeçalho) ──────────────
  const rowsObj = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  console.log(`[parseXLSX] Header-based rows:`, rowsObj.length);
  if (rowsObj.length > 0) {
    console.log(`[parseXLSX] Sample keys:`, Object.keys(rowsObj[0]));
    console.log(`[parseXLSX] Sample row:`, JSON.stringify(rowsObj[0]));
  }

  const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const tryHeaderBased = (rows: Record<string, unknown>[]) => {
    const getKey = (...names: string[]): string | null => {
      const keys = Object.keys(rows[0] || {});
      for (const n of names) {
        const nl = n.toLowerCase();
        const found = keys.find((k) => stripAccents(k).includes(nl) || nl.includes(stripAccents(k)));
        if (found) return found;
      }
      return null;
    };

    const vKey = getKey('valor', 'value', 'amount', 'montante', 'saldo', 'credito', 'debito', 'movimento', 'lancamento', 'total');
    const dKey = getKey('data', 'date', 'dt', 'vencimento', 'lancamento', 'dia', 'periodo');
    const descKey = getKey('descricao', 'descri', 'historico', 'memo', 'description', 'histórico', 'obs', 'observacao', 'complemento', 'detalhe');

    if (!vKey) {
      console.log('[parseXLSX] No value column found via header. Available keys:', Object.keys(rows[0] || {}));
      return [];
    }

    console.log('[parseXLSX] Matched columns:', { vKey, dKey, descKey });

    return rows.map((row) => {
      const valorNum = parseValor(row[vKey]);
      const dataStr = dKey ? parseData(row[dKey]) : new Date().toISOString().split('T')[0];
      const descricao = descKey ? String(row[descKey] || '').trim() : '';
      return {
        id_conta: idConta,
        tipo: (typeof row[vKey] === 'number' && row[vKey] < 0 ? 'despesa' : 'receita') as 'receita' | 'despesa',
        valor: valorNum,
        categoria: autoCategorize(descricao),
        descricao: descricao || 'Transação Excel',
        data_transacao: dataStr,
        taxa_cambio_dia: 1.0,
      };
    }).filter((t) => t.valor > 0);
  };

  let result = tryHeaderBased(rowsObj);
  if (result.length > 0) return result;

  // ── Tentativa 1b: tentar outras linhas como possível cabeçalho ──────
  if (rowsObj.length > 1) {
    for (let headerRowIdx = 1; headerRowIdx < Math.min(rowsObj.length, 5); headerRowIdx++) {
      const altRows = rowsObj.slice(headerRowIdx);
      if (altRows.length > 0) {
        console.log(`[parseXLSX] Trying row ${headerRowIdx} as header:`, Object.keys(altRows[0]));
        result = tryHeaderBased(altRows);
        if (result.length > 0) return result;
      }
    }
  }

  // ── Tentativa 1c: detecção por tipo de conteúdo ──────────────────────
  console.log('[parseXLSX] Trying content-based column detection');
  if (rowsObj.length > 0) {
    const keys = Object.keys(rowsObj[0]);
    let dateKey: string | null = null;
    let valueKey: string | null = null;
    let descKey: string | null = null;

    for (const k of keys) {
      const sampleValues = rowsObj.slice(0, 5).map(r => r[k]);
      const isDate = sampleValues.some(v => {
        if (typeof v === 'number' && v > 30000 && v < 60000) return true;
        const s = String(v);
        return /^\d{2}\/\d{2}\/\d{4}$/.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s);
      });
      const isValue = sampleValues.some(v => {
        if (typeof v === 'number' && v !== 0) return true;
        const s = String(v).replace(/[R$\s.]/g, '').replace(',', '.');
        const n = parseFloat(s);
        return !isNaN(n) && n !== 0;
      });

      if (isDate && !dateKey) dateKey = k;
      else if (isValue && !valueKey) valueKey = k;
      else if (!isDate && !isValue && !descKey) descKey = k;
    }

    if (valueKey) {
      console.log('[parseXLSX] Content-based detection:', { dateKey, valueKey, descKey });
      return rowsObj.map((row) => {
        const valorNum = parseValor(row[valueKey!]);
        const dataStr = dateKey ? parseData(row[dateKey]) : new Date().toISOString().split('T')[0];
        const descricao = descKey ? String(row[descKey] || '').trim() : '';
        return {
          id_conta: idConta,
          tipo: (typeof row[valueKey!] === 'number' && (row[valueKey!] as number) < 0 ? 'despesa' : 'receita') as 'receita' | 'despesa',
          valor: valorNum,
          categoria: autoCategorize(descricao),
          descricao: descricao || 'Transação Excel',
          data_transacao: dataStr,
          taxa_cambio_dia: 1.0,
        };
      }).filter((t) => t.valor > 0);
    }
  }

  // ── Tentativa 2: column-based (sem cabeçalho, colunas por posição) ─────
  console.log('[parseXLSX] Falling back to column-position-based parse');
  const rowsArr: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`[parseXLSX] Array rows:`, rowsArr.length);
  if (rowsArr.length > 0) console.log(`[parseXLSX] Sample rows:`, JSON.stringify(rowsArr.slice(0, 3)));

  // Pula linhas de título/cabeçalho que não tenham valor numérico
  const dataRows = rowsArr.filter((row) => {
    if (row.length < 2) return false;
    return row.some(cell => parseValor(cell) > 0);
  });
  console.log(`[parseXLSX] Data rows after filter:`, dataRows.length);

  return dataRows.map((row) => {
    // Encontra a célula com maior valor numérico (provavelmente o valor)
    let bestValIdx = 0;
    let bestVal = 0;
    row.forEach((cell, idx) => {
      const v = parseValor(cell);
      if (v > bestVal) { bestVal = v; bestValIdx = idx; }
    });
    const valCell = row[bestValIdx];
    const valorNum = parseValor(valCell);
    
    // Descrição: célula não-numérica mais longa (provavelmente texto)
    let descIdx = bestValIdx === 0 ? 1 : 0;
    row.forEach((cell, idx) => {
      if (idx !== bestValIdx && parseValor(cell) === 0 && String(cell).length > String(row[descIdx] || '').length) {
        descIdx = idx;
      }
    });
    const descricao = String(row[descIdx] || '').replace(/,?\s*\d+[.,]\d+.*$/, '').trim();
    
    // Data: primeira célula que parece data
    let dataStr = new Date().toISOString().split('T')[0];
    for (const cell of row) {
      const parsed = parseData(cell);
      if (parsed !== new Date().toISOString().split('T')[0] || row.length <= 2) {
        dataStr = parsed;
        break;
      }
    }
    
    return {
      id_conta: idConta,
      tipo: (typeof valCell === 'number' && valCell < 0 ? 'despesa' : 'receita') as 'receita' | 'despesa',
      valor: valorNum,
      categoria: autoCategorize(descricao),
      descricao: descricao || 'Transação Excel',
      data_transacao: dataStr,
      taxa_cambio_dia: 1.0,
    };
  }).filter((t) => t.valor > 0);
}

/**
 * Interpreta arquivos PDF e extrai transações.
 */
export async function parsePDF(arrayBuffer: ArrayBuffer, idConta: string): Promise<Omit<Transacao, 'id'>[]> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Configura worker no browser via CDN do cdnjs
    if ((pdfjsLib as any).GlobalWorkerOptions) {
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return parsePDFText(fullText, idConta);
  } catch (err) {
    console.warn('Erro ao ler PDF:', err);
    return [];
  }
}

export function parsePDFText(text: string, idConta: string): Omit<Transacao, 'id'>[] {
  const transactions: Omit<Transacao, 'id'>[] = [];
  const lines = text.split(/\r?\n/);
  
  const dateRegex = /(\d{2}\/\d{2}(?:\/\d{4})?)/;
  const amountRegex = /(?:R\$\s*)?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateMatch = dateRegex.exec(line);
    const amountMatch = amountRegex.exec(line);

    if (dateMatch && amountMatch) {
      const rawDate = dateMatch[1];
      const rawAmount = amountMatch[1];

      let dateStr = new Date().toISOString().split('T')[0];
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts.length === 2) {
        const currentYear = new Date().getFullYear();
        dateStr = `${currentYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }

      let cleanedVal = rawAmount.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      const amountNum = parseFloat(cleanedVal);

      if (isNaN(amountNum) || amountNum === 0) continue;

      let desc = line.replace(rawDate, '').replace(rawAmount, '').replace(/R\$/g, '').trim();
      if (!desc) desc = 'Transação Extrato PDF';

      const tipo = amountNum < 0 || desc.toLowerCase().includes('saida') || desc.toLowerCase().includes('pagamento') ? 'despesa' : 'receita';
      const valorAbsoluto = Math.abs(amountNum);
      const categoria = autoCategorize(desc);

      transactions.push({
        id_conta: idConta,
        tipo,
        valor: valorAbsoluto,
        categoria,
        data_transacao: dateStr,
        taxa_cambio_dia: 1.0,
        descricao: desc,
      });
    }
  }

  return transactions;
}
