import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Trash2,
  ChevronDown,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import type { Transacao } from '../store/useStore';
import { PrimaryButton } from './PrimaryButton';

const CATEGORIAS = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Lazer',
  'Salário',
  'Freelance',
  'Assinaturas',
  'Saúde',
  'Educação',
  'Investimentos',
  'Outros',
];

export type PendingTransaction = Omit<Transacao, 'id'> & { _key: string };

interface ImportReviewModalProps {
  isOpen: boolean;
  transactions: PendingTransaction[];
  accountName: string;
  format: string;
  onConfirm: (selected: PendingTransaction[]) => void;
  onClose: () => void;
}

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({
  isOpen,
  transactions,
  accountName,
  format,
  onConfirm,
  onClose,
}) => {
  const [rows, setRows] = useState<PendingTransaction[]>(() => transactions);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(transactions.map(t => t._key)));
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  // Reset when new transactions come in
  React.useEffect(() => {
    setRows(transactions);
    setSelected(new Set(transactions.map(t => t._key)));
    setEditingCategory(null);
  }, [transactions]);

  const toggleSelected = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map(r => r._key)));
    }
  };

  const updateRow = (key: string, changes: Partial<PendingTransaction>) => {
    setRows(prev => prev.map(r => r._key === key ? { ...r, ...changes } : r));
  };

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r._key !== key));
    setSelected(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  const summary = useMemo(() => {
    const sel = rows.filter(r => selected.has(r._key));
    const receitas = sel.filter(r => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);
    const despesas = sel.filter(r => r.tipo === 'despesa').reduce((s, r) => s + r.valor, 0);
    return { count: sel.length, receitas, despesas };
  }, [rows, selected]);

  if (!isOpen) return null;

  const formatVal = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const allSelected = selected.size === rows.length && rows.length > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--modal-overlay)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200, padding: '16px',
    }}>
      <div className="import-review-modal" style={{
        background: 'var(--modal-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '20px',
        width: '100%', maxWidth: '820px',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-glass)',
        overflow: 'hidden',
      }}>
        {/* ── HEADER ── */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--card-border)',
          background: 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--modal-text)' }}>
                Revisar Importação
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Conta: <strong style={{ color: 'var(--accent-cyan)' }}>{accountName}</strong>
                &nbsp;·&nbsp;Formato: <strong style={{ color: 'var(--accent-cyan)' }}>{format.toUpperCase()}</strong>
                &nbsp;·&nbsp;{rows.length} transações detectadas
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                    color: 'var(--text-secondary)', borderRadius: '10px', padding: '6px 12px',
                cursor: 'pointer', fontSize: '0.82rem', flexShrink: 0,
              }}
            >
              Cancelar
            </button>
          </div>

          {/* Summary bar */}
          <div style={{
            display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.15)',
              borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem',
            }}>
              <CheckSquare size={14} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-secondary)' }}>{summary.count} selecionadas</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.15)',
              borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem',
            }}>
              <TrendingUp size={14} color="var(--accent-green)" />
              <span style={{ color: 'var(--accent-green)' }}>+ R$ {formatVal(summary.receitas)}</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,82,82,0.07)', border: '1px solid rgba(255,82,82,0.15)',
              borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem',
            }}>
              <TrendingDown size={14} color="var(--color-danger)" />
              <span style={{ color: 'var(--color-danger)' }}>- R$ {formatVal(summary.despesas)}</span>
            </div>
            {rows.length === 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,180,0,0.07)', border: '1px solid rgba(255,180,0,0.15)',
                borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem',
              }}>
                <AlertTriangle size={14} color="#FFB400" />
                <span style={{ color: '#FFB400' }}>Nenhuma transação restante</span>
              </div>
            )}
          </div>
        </div>

        {/* ── TABLE HEADER ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '36px 90px 1fr 130px 100px 80px 36px',
          gap: '0 8px',
          padding: '10px 20px',
          background: 'var(--bg-color)',
          borderBottom: '1px solid var(--card-border)',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          <button
            onClick={toggleAll}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {allSelected
              ? <CheckSquare size={16} color="var(--accent-cyan)" />
              : <Square size={16} color="var(--text-muted)" />
            }
          </button>
          <span>Data</span>
          <span>Descrição</span>
          <span>Categoria</span>
          <span style={{ textAlign: 'right' }}>Valor</span>
          <span style={{ textAlign: 'center' }}>Tipo</span>
          <span />
        </div>

        {/* ── ROWS ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <AlertTriangle size={32} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <p style={{ margin: 0 }}>Todas as transações foram removidas.</p>
            </div>
          ) : (
            rows.map(row => {
              const isChecked = selected.has(row._key);
              const isEditingCat = editingCategory === row._key;
              return (
                <div
                  key={row._key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 90px 1fr 130px 100px 80px 36px',
                    gap: '0 8px',
                    alignItems: 'center',
                    padding: '9px 8px',
                    borderRadius: '10px',
                    marginBottom: '4px',
                    background: isChecked ? 'var(--bg-color)' : 'transparent',
                    opacity: isChecked ? 1 : 0.45,
                    transition: 'background 0.15s, opacity 0.15s',
                    borderLeft: `3px solid ${isChecked
                      ? (row.tipo === 'receita' ? 'rgba(0,230,118,0.5)' : 'rgba(255,82,82,0.5)')
                      : 'transparent'}`,
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelected(row._key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {isChecked
                      ? <CheckCircle2 size={18} color="var(--accent-cyan)" />
                      : <Circle size={18} color="var(--text-muted)" />
                    }
                  </button>

                  {/* Date */}
                  <input
                    type="date"
                    value={row.data_transacao}
                    onChange={e => updateRow(row._key, { data_transacao: e.target.value })}
                    style={{
                      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                      borderRadius: '7px', padding: '5px 6px', color: 'var(--modal-text)',
                      fontSize: '0.75rem', width: '100%', cursor: 'pointer',
                    }}
                  />

                  {/* Description */}
                  <input
                    type="text"
                    value={row.descricao ?? ''}
                    onChange={e => updateRow(row._key, { descricao: e.target.value })}
                    maxLength={80}
                    style={{
                      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                      borderRadius: '7px', padding: '5px 8px', color: 'var(--modal-text)',
                      fontSize: '0.8rem', width: '100%',
                    }}
                  />

                  {/* Category */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setEditingCategory(isEditingCat ? null : row._key)}
                      style={{
                        width: '100%', background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '7px', padding: '5px 8px',
                        color: 'var(--text-secondary)', fontSize: '0.78rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: '4px',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.categoria}</span>
                      <ChevronDown size={12} style={{ flexShrink: 0 }} />
                    </button>
                    {isEditingCat && (
                      <div style={{
                        position: 'absolute', top: '110%', left: 0, zIndex: 50,
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        borderRadius: '10px', padding: '6px', minWidth: '150px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      }}>
                        {CATEGORIAS.map(cat => (
                          <button
                            key={cat}
                            onClick={() => { updateRow(row._key, { categoria: cat }); setEditingCategory(null); }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '7px 10px', background: row.categoria === cat ? 'rgba(0,229,255,0.12)' : 'transparent',
                              border: 'none', color: row.categoria === cat ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                              cursor: 'pointer', borderRadius: '6px', fontSize: '0.8rem',
                              fontWeight: row.categoria === cat ? 700 : 400,
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Value */}
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.valor}
                    onChange={e => updateRow(row._key, { valor: Math.abs(parseFloat(e.target.value) || 0) })}
                    style={{
                      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                      borderRadius: '7px', padding: '5px 8px',
                      color: row.tipo === 'receita' ? 'var(--accent-green)' : 'var(--color-danger)',
                      fontWeight: 700, fontSize: '0.82rem', width: '100%', textAlign: 'right',
                    }}
                  />

                  {/* Type toggle */}
                  <button
                    onClick={() => updateRow(row._key, { tipo: row.tipo === 'receita' ? 'despesa' : 'receita' })}
                    style={{
                      background: row.tipo === 'receita' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${row.tipo === 'receita' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      borderRadius: '7px', padding: '5px 0', cursor: 'pointer',
                      color: row.tipo === 'receita' ? 'var(--accent-green)' : 'var(--color-danger)',
                      fontSize: '0.72rem', fontWeight: 700, width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    }}
                  >
                    {row.tipo === 'receita'
                      ? <><TrendingUp size={12} /> + </>
                      : <><TrendingDown size={12} /> - </>
                    }
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => removeRow(row._key)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      color: 'var(--text-muted)', borderRadius: '6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Remover esta linha"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--card-border)',
          background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {summary.count === 0
              ? 'Nenhuma transação selecionada para importar.'
              : `${summary.count} de ${rows.length} transações serão importadas.`
            }
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: '1px solid var(--card-border)',
                color: 'var(--text-secondary)', padding: '10px 20px',
                borderRadius: '10px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Cancelar
            </button>
            <PrimaryButton
              onClick={() => onConfirm(rows.filter(r => selected.has(r._key)))}
              disabled={summary.count === 0}
            >
              Importar {summary.count > 0 ? `${summary.count} transações` : ''}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};
