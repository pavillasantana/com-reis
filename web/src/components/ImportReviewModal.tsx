import React, { useState, useMemo, useCallback, useRef } from 'react';
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
  Users,
  User,
  Briefcase,
  ShoppingCart,
  BadgeDollarSign,
} from 'lucide-react';
import type { Transacao } from '../store/useStore';
import { PrimaryButton } from './PrimaryButton';
import { useI18n } from '../i18n';
import type { InvestimentoSubtipo } from '../utils/importer';

const CATEGORIAS_GASTOS = [
  'Alimentação', 'Moradia', 'Transporte', 'Lazer',
  'Salário', 'Freelance', 'Assinaturas', 'Saúde',
  'Educação', 'Transferência', 'Outros',
];

const SUBTIPOS_INVEST: { key: InvestimentoSubtipo; label: string; icon: React.ReactNode }[] = [
  { key: 'compra', label: 'Compra', icon: <ShoppingCart size={11} /> },
  { key: 'venda', label: 'Venda', icon: <TrendingUp size={11} /> },
  { key: 'proventos', label: 'Proventos', icon: <BadgeDollarSign size={11} /> },
  { key: 'juros', label: 'Juros', icon: <BadgeDollarSign size={11} /> },
];

export type PendingTransaction = Omit<Transacao, 'id'> & {
  _key: string;
  _subtipoInvestimento?: InvestimentoSubtipo;
};

interface ImportReviewModalProps {
  isOpen: boolean;
  transactions: PendingTransaction[];
  accountName: string;
  format: string;
  isLoading?: boolean;
  onConfirm: (selected: PendingTransaction[]) => void;
  onClose: () => void;
}

type GroupFilter = 'todos' | 'investimentos' | 'gastos';

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({
  isOpen,
  transactions,
  accountName,
  format,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const { t } = useI18n();
  const [rows, setRows] = useState<PendingTransaction[]>(() => transactions);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(transactions.map(t => t._key)));
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [catDropDirection, setCatDropDirection] = useState<Record<string, 'up' | 'down'>>({});
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('todos');
  const catBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const measureCatDrop = useCallback((key: string) => {
    const el = catBtnRefs.current[key];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 340;
    setCatDropDirection(prev => ({ ...prev, [key]: spaceBelow < dropdownHeight ? 'up' : 'down' }));
  }, []);

  React.useEffect(() => {
    setRows(transactions);
    setSelected(new Set(transactions.map(t => t._key)));
    setEditingCategory(null);
    setGroupFilter('todos');
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
    const visibleKeys = filteredRows.map(r => r._key);
    if (visibleKeys.every(k => selected.has(k))) {
      setSelected(prev => { const n = new Set(prev); visibleKeys.forEach(k => n.delete(k)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); visibleKeys.forEach(k => n.add(k)); return n; });
    }
  };

  const updateRow = (key: string, changes: Partial<PendingTransaction>) => {
    setRows(prev => prev.map(r => r._key === key ? { ...r, ...changes } : r));
  };

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r._key !== key));
    setSelected(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  const getGroup = (row: PendingTransaction): 'investimentos' | 'gastos' =>
    row.categoria === 'Investimentos' ? 'investimentos' : 'gastos';

  const filteredRows = useMemo(() => {
    if (groupFilter === 'todos') return rows;
    return rows.filter(r => getGroup(r) === groupFilter);
  }, [rows, groupFilter]);

  const counts = useMemo(() => {
    const inv = rows.filter(r => r.categoria === 'Investimentos');
    const gas = rows.filter(r => r.categoria !== 'Investimentos');
    const invSel = inv.filter(r => selected.has(r._key));
    const gasSel = gas.filter(r => selected.has(r._key));
    return {
      investimentos: { total: inv.length, sel: invSel.length },
      gastos: { total: gas.length, sel: gasSel.length },
    };
  }, [rows, selected]);

  const summary = useMemo(() => {
    const sel = rows.filter(r => selected.has(r._key));
    const receitas = sel.filter(r => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);
    const despesas = sel.filter(r => r.tipo === 'despesa').reduce((s, r) => s + r.valor, 0);
    return { count: sel.length, receitas, despesas };
  }, [rows, selected]);

  if (!isOpen) return null;

  const formatVal = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selected.has(r._key));

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
        width: '100%', maxWidth: '860px',
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-glass)',
        overflow: 'hidden',
      }}>
        {/* ── HEADER ── */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--card-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--modal-text)' }}>
                {t('web_import_review_title')}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {t('web_import_review_account_label')} <strong style={{ color: 'var(--accent-cyan)' }}>{accountName}</strong>
                &nbsp;·&nbsp;{t('web_import_review_format_label')} <strong style={{ color: 'var(--accent-cyan)' }}>{format.toUpperCase()}</strong>
                &nbsp;·&nbsp;{rows.length} {t('web_import_review_detected')}
              </p>
            </div>
            <button onClick={onClose} style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)', borderRadius: '10px', padding: '6px 12px',
              cursor: 'pointer', fontSize: '0.82rem', flexShrink: 0,
            }}>
              {t('cancel')}
            </button>
          </div>

          {/* Summary bar */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.15)',
              borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem',
            }}>
              <CheckSquare size={14} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-secondary)' }}>{summary.count} {t('web_import_review_selected')}</span>
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
          </div>
        </div>

        {/* ── GROUP TABS ── */}
        <div style={{
          display: 'flex', gap: '6px', padding: '12px 28px',
          borderBottom: '1px solid var(--card-border)',
        }}>
          {([
            { key: 'todos' as const, label: t('web_import_group_all'), count: rows.length },
            { key: 'investimentos' as const, label: 'Investimentos', count: counts.investimentos.total, selCount: counts.investimentos.sel },
            { key: 'gastos' as const, label: t('web_import_group_expenses'), count: counts.gastos.total, selCount: counts.gastos.sel },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setGroupFilter(tab.key)} style={{
              padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
              background: groupFilter === tab.key ? 'var(--accent-blue)' : 'transparent',
              color: groupFilter === tab.key ? '#fff' : 'var(--text-secondary)',
              border: groupFilter === tab.key ? 'none' : '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {tab.key === 'investimentos' && <Briefcase size={13} />}
              {tab.key === 'gastos' && <ShoppingCart size={13} />}
              {tab.label}
              <span style={{
                fontSize: '0.72rem', padding: '2px 7px', borderRadius: '12px',
                background: groupFilter === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--bg-color)',
                color: groupFilter === tab.key ? '#fff' : 'var(--text-muted)',
              }}>
                {tab.selCount !== undefined ? `${tab.selCount}/${tab.count}` : tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── TABLE HEADER ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '36px 85px 1fr 120px 100px 80px 70px 36px',
          gap: '0 8px',
          padding: '10px 20px',
          background: 'var(--bg-color)',
          borderBottom: '1px solid var(--card-border)',
          fontSize: '0.70rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {allVisibleSelected
              ? <CheckSquare size={16} color="var(--accent-cyan)" />
              : <Square size={16} color="var(--text-muted)" />
            }
          </button>
          <span>{t('web_import_review_date')}</span>
          <span>{t('web_import_review_desc')}</span>
          <span>{t('web_import_review_category')}</span>
          <span style={{ textAlign: 'right' }}>{t('web_import_review_value')}</span>
          <span style={{ textAlign: 'center' }}>{t('web_import_review_type')}</span>
          <span style={{ textAlign: 'center' }}>{t('web_import_review_shared')}</span>
          <span />
        </div>

        {/* ── ROWS ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {filteredRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <AlertTriangle size={32} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <p style={{ margin: 0 }}>{groupFilter === 'todos' ? t('web_import_review_all_removed') : t('web_import_review_no_remaining')}</p>
            </div>
          ) : (
            filteredRows.map(row => {
              const isChecked = selected.has(row._key);
              const isEditingCat = editingCategory === row._key;
              const isInvest = row.categoria === 'Investimentos';
              return (
                <div
                  key={row._key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 85px 1fr 120px 100px 80px 70px 36px',
                    gap: '0 8px',
                    alignItems: 'center',
                    padding: '9px 8px',
                    borderRadius: '10px',
                    marginBottom: '4px',
                    background: isChecked ? 'var(--bg-color)' : 'transparent',
                    opacity: isChecked ? 1 : 0.45,
                    transition: 'background 0.15s, opacity 0.15s',
                    borderLeft: `3px solid ${isChecked
                      ? (isInvest ? 'rgba(100,120,255,0.5)' : row.tipo === 'receita' ? 'rgba(0,230,118,0.5)' : 'rgba(255,82,82,0.5)')
                      : 'transparent'}`,
                  }}
                >
                  {/* Checkbox */}
                  <button onClick={() => toggleSelected(row._key)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

                  {/* Category + Subtype */}
                  <div style={{ position: 'relative' }}>
                    {isInvest ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Briefcase size={10} /> Investimentos
                        </span>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {SUBTIPOS_INVEST.map(st => (
                            <button key={st.key} onClick={() => updateRow(row._key, { _subtipoInvestimento: st.key })} style={{
                              display: 'flex', alignItems: 'center', gap: '3px',
                              padding: '2px 6px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                              cursor: 'pointer', transition: 'all 0.12s',
                              background: (row._subtipoInvestimento || 'compra') === st.key ? 'rgba(100,120,255,0.15)' : 'transparent',
                              color: (row._subtipoInvestimento || 'compra') === st.key ? 'var(--accent-blue)' : 'var(--text-muted)',
                              border: (row._subtipoInvestimento || 'compra') === st.key ? '1px solid rgba(100,120,255,0.3)' : '1px solid transparent',
                            }}>
                              {st.icon} {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          ref={(el) => { catBtnRefs.current[row._key] = el; }}
                          onClick={() => {
                            if (!isEditingCat) measureCatDrop(row._key);
                            setEditingCategory(isEditingCat ? null : row._key);
                          }}
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
                            position: 'absolute', left: 0, zIndex: 50,
                            ...(catDropDirection[row._key] === 'up' ? { bottom: '110%' } : { top: '110%' }),
                            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                            borderRadius: '10px', padding: '6px', minWidth: '150px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxHeight: '220px', overflowY: 'auto',
                          }}>
                            {CATEGORIAS_GASTOS.map(cat => (
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
                            <div style={{ borderTop: '1px solid var(--card-border)', margin: '4px 0' }} />
                            <button
                              onClick={() => { updateRow(row._key, { categoria: 'Investimentos', _subtipoInvestimento: 'compra' }); setEditingCategory(null); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                width: '100%', textAlign: 'left',
                                padding: '7px 10px', background: 'transparent',
                                border: 'none', color: 'var(--accent-blue)',
                                cursor: 'pointer', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700,
                              }}
                            >
                              <Briefcase size={12} /> Investimentos
                            </button>
                          </div>
                        )}
                      </>
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
                      color: isInvest ? 'var(--accent-blue)' : row.tipo === 'receita' ? 'var(--accent-green)' : 'var(--color-danger)',
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

                  {/* Shared toggle */}
                  <button
                    onClick={() => updateRow(row._key, { is_compartilhada: !row.is_compartilhada })}
                    style={{
                      background: row.is_compartilhada ? 'rgba(255,180,0,0.1)' : 'transparent',
                      border: `1px solid ${row.is_compartilhada ? 'rgba(255,180,0,0.3)' : 'var(--card-border)'}`,
                      borderRadius: '7px', padding: '5px 0', cursor: 'pointer',
                      color: row.is_compartilhada ? '#FFB400' : 'var(--text-muted)',
                      fontSize: '0.65rem', fontWeight: 700, width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                    }}
                    title={row.is_compartilhada ? t('web_import_shared') : t('web_import_personal')}
                  >
                    {row.is_compartilhada ? <Users size={12} /> : <User size={12} />}
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => removeRow(row._key)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      color: 'var(--text-muted)', borderRadius: '6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title={t('web_import_review_remove_row')}
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {summary.count === 0
              ? t('web_import_review_none_selected')
              : t('web_import_review_will_import', { count: String(summary.count), total: String(rows.length) })
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
              {t('cancel')}
            </button>
            <PrimaryButton
              onClick={() => onConfirm(rows.filter(r => selected.has(r._key)))}
              disabled={summary.count === 0 || isLoading}
            >
              {isLoading ? t('saving') : `Importar ${summary.count > 0 ? t('web_import_review_import', { count: String(summary.count) }) : t('web_import_review_import_empty')}`}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};
