import type { Transacao, Conta } from '../store/useStore';
import type { ApuracaoMes, DARF } from './fiscalBR';
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

// ─── Exportações fiscais BR ─────────────────────────────────────────────

export function exportApuracoesCSV(meses: ApuracaoMes[]): Blob {
  const header = [
    'Mês', 'Vendas Ações', 'Ganho Isento', 'Resultado Ações', 'Base Ações',
    'IR Ações', 'Resultado FII', 'IR FII', 'Resultado Outros', 'IR Outros',
    'Resultado Day Trade', 'IR Day Trade', 'Total Vendas', 'Total DARF',
  ];
  const rows = meses.map((m) => [
    m.mes,
    m.acoes.vendas.toFixed(2),
    m.ganho_isento.toFixed(2),
    m.acoes.resultado.toFixed(2),
    m.acoes.base.toFixed(2),
    m.acoes.imposto.toFixed(2),
    m.fiis.resultado.toFixed(2),
    m.fiis.imposto.toFixed(2),
    m.outros.resultado.toFixed(2),
    m.outros.imposto.toFixed(2),
    m.daytrade.resultado.toFixed(2),
    m.daytrade.imposto.toFixed(2),
    m.total_vendas.toFixed(2),
    m.total_darf.toFixed(2),
  ]);
  const bom = '\uFEFF';
  return new Blob([bom + [header, ...rows].map((r) => r.map(escapeCSV).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
}

export function exportDARFsCSV(darfs: DARF[]): Blob {
  const header = ['Mês de Apuração', 'Código', 'Valor (R$)', 'Vencimento'];
  const rows = darfs.map((d) => [d.mes, d.codigo, d.valor.toFixed(2), formatDateISO(d.vencimento)]);
  const bom = '\uFEFF';
  return new Blob([bom + [header, ...rows].map((r) => r.map(escapeCSV).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
}

export function exportFiscalJSON(apuracao: ApuracaoMes[], darfs: DARF[]): Blob {
  return new Blob([JSON.stringify({ apuracao, darfs, gerado_em: new Date().toISOString() }, null, 2)], { type: 'application/json;charset=utf-8;' });
}
