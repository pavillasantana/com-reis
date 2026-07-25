import { useState, useMemo } from 'react';
import { useI18n } from '../i18n';
import { formatCurrency, convertCurrency } from '../utils/currency';
import type { Transacao, Conta } from '../store/useStore';
import { AdBanner } from './AdBanner';

interface GastosCompartilhadosProps {
  transacoes: Transacao[];
  contas: Conta[];
  moedaBase: string;
  rates: Record<string, number>;
  onUpdateTx?: (txId: string, updates: Partial<Transacao>) => void;
  onDeleteTx?: (txId: string) => void;
}

type FilterPeriod = 'all' | 'month' | 'week';

export const GastosCompartilhados = ({
  transacoes,
  contas,
  moedaBase,
  rates,
  onUpdateTx,
  onDeleteTx,
}: GastosCompartilhadosProps) => {
  const { t } = useI18n();
  const [period, setPeriod] = useState<FilterPeriod>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pago' | 'pendente'>('all');

  const sharedTransactions = useMemo(() => {
    return transacoes.filter((tx) => {
      if (!tx.is_compartilhada) return false;
      if (tx.tipo !== 'despesa') return false;
      const d = tx.data_transacao;
      if (!d) return false;
      const dateStr = d.includes('/') ? `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}` : d;
      const now = new Date();
      if (period === 'month') {
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        if (dateStr < monthStart || dateStr > monthEnd) return false;
      } else if (period === 'week') {
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        if (dateStr < monday.toISOString().slice(0, 10) || dateStr > sunday.toISOString().slice(0, 10)) return false;
      }
      return true;
    }).sort((a, b) => b.data_transacao.localeCompare(a.data_transacao));
  }, [transacoes, period]);

  const converterValor = (tx: Transacao) => {
    const conta = contas.find(c => c.id === tx.id_conta);
    const moedaTx = conta?.moeda_conta || moedaBase;
    return convertCurrency(tx.valor, moedaTx, moedaBase, rates);
  };

  const isPaid = (tx: Transacao): boolean => {
    const desc = (tx.descricao || '').toLowerCase();
    return desc.includes('[pago]') || desc.includes('[paid]');
  };

  const totalShared = useMemo(
    () => sharedTransactions.reduce((acc, tx) => acc + converterValor(tx), 0),
    [sharedTransactions, contas, moedaBase, rates]
  );

  const totalPaid = useMemo(
    () => sharedTransactions.filter(isPaid).reduce((acc, tx) => acc + converterValor(tx), 0),
    [sharedTransactions, contas, moedaBase, rates]
  );

  const totalPending = totalShared - totalPaid;

  const participants = useMemo(() => {
    const map: Record<string, { email: string; total: number; paid: number; pending: number }> = {};
    sharedTransactions.forEach((tx) => {
      const email = tx.participante_email || t('gastos_compartilhados_quem_deve');
      if (!map[email]) map[email] = { email, total: 0, paid: 0, pending: 0 };
      const val = converterValor(tx);
      map[email].total += val;
      if (isPaid(tx)) {
        map[email].paid += val;
      } else {
        map[email].pending += val;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [sharedTransactions, contas, moedaBase, rates, t]);

  const filteredTransactions = useMemo(() => {
    if (filterStatus === 'all') return sharedTransactions;
    return sharedTransactions.filter(tx =>
      filterStatus === 'pago' ? isPaid(tx) : !isPaid(tx)
    );
  }, [sharedTransactions, filterStatus]);

  const markAsPaid = (txId: string, descricao: string) => {
    if (onUpdateTx) {
      const cleanDesc = descricao.replace(/\[(?:pago|paid)\]/gi, '').trim();
      onUpdateTx(txId, { descricao: `[Pago] ${cleanDesc}`.trim() });
    }
  };

  const markAsUnpaid = (txId: string, descricao: string) => {
    if (onUpdateTx) {
      const cleanDesc = descricao.replace(/\[(?:pago|paid)\]/gi, '').trim();
      onUpdateTx(txId, { descricao: cleanDesc });
    }
  };

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <AdBanner adSlot="gastos_compartilhados_topo" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
            🤝 {t('gastos_compartilhados_title')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            {sharedTransactions.length} {t('web_analise_transactions')}
          </p>
        </div>
      </div>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['all', 'month', 'week'] as FilterPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              flex: 1, padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
              background: period === p ? 'var(--accent-blue)' : 'var(--bg-secondary, #f1f5f9)',
              color: period === p ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {p === 'all' ? t('web_analise_monthly').replace(t('month_january'), 'Total') : p === 'month' ? t('web_analise_monthly') : t('web_analise_weekly')}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['all', 'pago', 'pendente'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s',
              background: filterStatus === s
                ? (s === 'pago' ? 'rgba(16, 185, 129, 0.2)' : s === 'pendente' ? 'rgba(239, 68, 68, 0.2)' : 'var(--accent-blue)')
                : 'rgba(255,255,255,0.05)',
              color: filterStatus === s
                ? (s === 'pago' ? '#10B981' : s === 'pendente' ? '#EF4444' : 'var(--accent-blue)')
                : 'var(--text-secondary)',
            }}
          >
            {s === 'all' ? t('web_analise_monthly').split('/')[0].trim() : s === 'pago' ? t('gastos_compartilhados_pago') : t('gastos_compartilhados_pendente')}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '20px',
          border: '1px solid var(--border-color, #e2e8f0)', textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
            {t('gastos_compartilhados_total')}
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 0 0' }}>
            {formatCurrency(totalShared, moedaBase)}
          </p>
        </div>
        <div style={{
          background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '20px',
          border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <p style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
            {t('gastos_compartilhados_pago')}
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981', margin: '8px 0 0 0' }}>
            {formatCurrency(totalPaid, moedaBase)}
          </p>
        </div>
        <div style={{
          background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '20px',
          border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <p style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
            {t('gastos_compartilhados_pendente')}
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#EF4444', margin: '8px 0 0 0' }}>
            {formatCurrency(totalPending, moedaBase)}
          </p>
        </div>
      </div>

      {/* Participant Balance */}
      {participants.length > 0 && (
        <div style={{
          background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '24px',
          border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('gastos_compartilhados_saldo')} {t('gastos_compartilhados_quem_deve')}
          </h3>
          {participants.map((p) => (
            <div key={p.email} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color, #e2e8f0)', gap: '12px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#fff', flexShrink: 0,
              }}>
                {p.email.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>{p.email}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  {t('gastos_compartilhados_pago')}: {formatCurrency(p.paid, moedaBase)} | {t('gastos_compartilhados_pendente')}: {formatCurrency(p.pending, moedaBase)}
                </p>
              </div>
              <span style={{
                fontWeight: 700, fontSize: '0.9rem',
                color: p.pending > 0 ? '#EF4444' : '#10B981',
              }}>
                {p.pending > 0 ? `-${formatCurrency(p.pending, moedaBase)}` : formatCurrency(0, moedaBase)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Transaction List */}
      <div style={{
        background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '24px',
        border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {t('gastos_compartilhados_title')}
        </h3>
        {filteredTransactions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            {t('gastos_compartilhados_empty')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredTransactions.map((tx) => {
              const paid = isPaid(tx);
              return (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '10px',
                  border: `1px solid ${paid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  background: paid ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  gap: '12px',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: paid ? '#10B981' : '#EF4444', flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.descricao?.replace(/\[(?:pago|paid)\]/gi, '').trim() || tx.categoria}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      {tx.participante_email || t('gastos_compartilhados_quem_deve')} · {tx.data_transacao}
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {formatCurrency(converterValor(tx), moedaBase)}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {onUpdateTx && (
                      <button
                        onClick={() => paid ? markAsUnpaid(tx.id, tx.descricao || '') : markAsPaid(tx.id, tx.descricao || '')}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.75rem',
                          background: paid ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: paid ? '#EF4444' : '#10B981',
                        }}
                      >
                        {paid ? t('gastos_compartilhados_pendente') : t('gastos_compartilhados_marcar_pago')}
                      </button>
                    )}
                    {onDeleteTx && (
                      <button
                        onClick={() => {
                          if (confirm(t('web_analise_confirm_delete'))) onDeleteTx(tx.id);
                        }}
                        style={{
                          padding: '6px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontWeight: 600, fontSize: '0.75rem',
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdBanner adSlot="gastos_compartilhados_rodape" />
    </div>
  );
};
