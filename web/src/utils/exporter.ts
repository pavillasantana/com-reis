import type { Transacao, Conta } from '../store/useStore';
import { convertCurrency } from './currency';

const COLUMNS = [
  'Data',
  'Tipo',
  'Categoria',
  'Descrição',
  'Valor Original',
  'Moeda',
  'Valor (Moeda Base)',
  'Conta',
];

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function formatDateISO(data: string): string {
  const d = new Date(data + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}

export function exportTransactionsToCSV(
  transacoes: Transacao[],
  contas: Conta[],
  moedaBase: string,
  rates: Record<string, number>,
): Blob {
  const rows: string[] = [];

  rows.push(COLUMNS.map(escapeCSV).join(','));

  const sorted = [...transacoes].sort(
    (a, b) => new Date(b.data_transacao + 'T12:00:00').getTime() - new Date(a.data_transacao + 'T12:00:00').getTime(),
  );

  for (const tx of sorted) {
    const conta = contas.find((c) => c.id === tx.id_conta);
    const valorBase = tx.moeda_transacao && tx.moeda_transacao !== moedaBase
      ? convertCurrency(tx.valor, tx.moeda_transacao, moedaBase, rates)
      : tx.valor;

    rows.push([
      formatDateISO(tx.data_transacao),
      tx.tipo === 'receita' ? 'Receita' : 'Despesa',
      tx.categoria,
      tx.descricao || '',
      tx.valor.toString(),
      tx.moeda_transacao || moedaBase,
      valorBase.toFixed(2),
      conta?.nome_instituicao || '',
    ].map(escapeCSV).join(','));
  }

  const bom = '\uFEFF';
  return new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
