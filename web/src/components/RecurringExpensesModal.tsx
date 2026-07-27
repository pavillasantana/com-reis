import React, { useState } from 'react';
import { Repeat, Plus, Pencil, Trash2, X, Check, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useI18n } from '../i18n';
import { useStore } from '../store/useStore';
import { useSupabaseSync } from '../hooks/useSupabaseSync';
import { useToast } from './Toast';
import type { TransacaoRecorrente } from '../store/useStore';

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
  'Transferência',
  'Outros',
];

const FREQUENCIAS: TransacaoRecorrente['frequencia'][] = [
  'semanal',
  'quinzenal',
  'mensal',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
];

const FREQUENCY_KEYS: Record<string, string> = {
  semanal: 'web_recurring_weekly',
  quinzenal: 'web_recurring_biweekly',
  mensal: 'web_recurring_monthly',
  bimestral: 'web_recurring_bimonthly',
  trimestral: 'web_recurring_quarterly',
  semestral: 'web_recurring_semiannual',
  anual: 'web_recurring_annual',
};

const FREQUENCY_FALLBACKS: Record<string, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

type Mode = 'list' | 'form';

interface RecurringExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultForm: Omit<TransacaoRecorrente, 'id' | 'id_usuario' | 'id_espaco'> = {
  id_conta: '',
  tipo: 'despesa',
  valor: 0,
  categoria: 'Outros',
  moeda_transacao: 'BRL',
  descricao: '',
  frequencia: 'mensal',
  dia_vencimento: 1,
  data_inicio: new Date().toISOString().slice(0, 10),
  data_fim: undefined,
  ativo: true,
};

export const RecurringExpensesModal: React.FC<RecurringExpensesModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const toast = useToast();
  const { contas, id_espaco_ativo, moeda_base, id_usuario } = useStore();
  const { addTransacaoRecorrente, updateTransacaoRecorrente, removeTransacaoRecorrente } = useSupabaseSync();

  const [mode, setMode] = useState<Mode>('list');
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const transacoesRecorrentes = useStore(s => s.transacoesRecorrentes);

  const contasEspacoAtivo = contas.filter(c => c.id_espaco === id_espaco_ativo);

  const formatVal = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getContaName = (idConta: string) => {
    const conta = contas.find(c => c.id === idConta);
    return conta?.nome_instituicao ?? '—';
  };

  const resetForm = () => {
    setForm({ ...defaultForm, moeda_transacao: moeda_base });
    setEditingId(null);
    setErrors({});
  };

  const openCreate = () => {
    resetForm();
    setMode('form');
  };

  const openEdit = (rec: TransacaoRecorrente) => {
    setForm({
      id_conta: rec.id_conta,
      tipo: rec.tipo,
      valor: rec.valor,
      categoria: rec.categoria,
      moeda_transacao: rec.moeda_transacao,
      descricao: rec.descricao ?? '',
      frequencia: rec.frequencia,
      dia_vencimento: rec.dia_vencimento,
      data_inicio: rec.data_inicio,
      data_fim: rec.data_fim,
      ativo: rec.ativo,
    });
    setEditingId(rec.id);
    setMode('form');
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.valor || form.valor <= 0) e.valor = 'Valor deve ser maior que 0';
    if (!form.categoria) e.categoria = 'Categoria obrigatória';
    if (!form.id_conta) e.id_conta = 'Selecione uma conta';
    if (form.dia_vencimento < 1 || form.dia_vencimento > 31) e.dia_vencimento = 'Dia deve ser entre 1 e 31';
    if (!form.data_inicio) e.data_inicio = 'Data de início obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (editingId) {
      await updateTransacaoRecorrente(editingId, form);
      toast.success(t('web_recurring_save'));
    } else {
      if (!id_usuario || !id_espaco_ativo) return;
      await addTransacaoRecorrente({
        ...form,
        id_usuario,
        id_espaco: id_espaco_ativo,
      });
      toast.success(t('web_recurring_save'));
    }

    resetForm();
    setMode('list');
  };

  const handleDelete = async (id: string) => {
    await removeTransacaoRecorrente(id);
    toast.success(t('web_recurring_delete'));
  };

  const toggleAtivo = async (rec: TransacaoRecorrente) => {
    await updateTransacaoRecorrente(rec.id, { ativo: !rec.ativo });
  };

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: '6px',
    fontWeight: 600,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    color: 'var(--color-danger)',
    marginTop: '4px',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--modal-overlay)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200, padding: '16px',
    }}>
      <div style={{
        background: 'var(--modal-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '20px',
        width: '100%', maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-glass)',
        overflow: 'hidden',
      }}>
        {/* HEADER */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--card-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Repeat size={20} color="var(--accent-cyan)" />
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('web_recurring_title') || 'Despesas Recorrentes'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)', borderRadius: '10px', padding: '8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: mode === 'list' ? '0' : '24px 28px' }}>

          {/* ── LIST MODE ── */}
          {mode === 'list' && (
            <>
              <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={openCreate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)',
                    color: 'var(--accent-cyan)', borderRadius: '10px',
                    padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                  }}
                >
                  <Plus size={16} />
                  {t('web_recurring_add_new') || 'Nova recorrência'}
                </button>
              </div>

              {transacoesRecorrentes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 28px', color: 'var(--text-muted)' }}>
                  <Repeat size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {t('web_recurring_empty') || 'Nenhuma despesa recorrente cadastrada'}
                  </p>
                </div>
              ) : (
                <div style={{ padding: '0 12px 16px' }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 90px 100px 80px 90px',
                    gap: '0 8px',
                    padding: '8px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}>
                    <span />
                    <span>{t('web_import_review_category') || 'Categoria'}</span>
                    <span style={{ textAlign: 'right' }}>Valor</span>
                    <span style={{ textAlign: 'center' }}>Frequência</span>
                    <span style={{ textAlign: 'center' }}>Dia</span>
                    <span />
                  </div>

                  {transacoesRecorrentes.map(rec => (
                    <div
                      key={rec.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 90px 100px 80px 90px',
                        gap: '0 8px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        marginBottom: '4px',
                        background: rec.ativo ? 'var(--bg-color)' : 'transparent',
                        opacity: rec.ativo ? 1 : 0.4,
                        transition: 'background 0.15s, opacity 0.15s',
                        borderLeft: `3px solid ${
                          rec.tipo === 'receita' ? 'rgba(0,230,118,0.5)' : 'rgba(255,82,82,0.5)'
                        }`,
                      }}
                    >
                      {/* Tipo icon */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {rec.tipo === 'receita'
                          ? <TrendingUp size={16} color="var(--accent-green)" />
                          : <TrendingDown size={16} color="var(--color-danger)" />
                        }
                      </div>

                      {/* Categoria + conta */}
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {rec.categoria}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {getContaName(rec.id_conta)}
                        </div>
                      </div>

                      {/* Valor */}
                      <div style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: rec.tipo === 'receita' ? 'var(--accent-green)' : 'var(--color-danger)',
                      }}>
                        {rec.tipo === 'despesa' ? '-' : '+'} {formatVal(rec.valor)}
                      </div>

                      {/* Frequência badge */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{
                          background: 'rgba(0,229,255,0.1)',
                          border: '1px solid rgba(0,229,255,0.2)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: 'var(--accent-cyan)',
                          whiteSpace: 'nowrap',
                        }}>
                          {t(FREQUENCY_KEYS[rec.frequencia]) || FREQUENCY_FALLBACKS[rec.frequencia]}
                        </span>
                      </div>

                      {/* Dia vencimento */}
                      <div style={{
                        textAlign: 'center',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}>
                        {rec.dia_vencimento}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        {/* Ativo toggle */}
                        <button
                          onClick={() => toggleAtivo(rec)}
                          style={{
                            background: rec.ativo ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${rec.ativo ? 'rgba(0,230,118,0.3)' : 'var(--card-border)'}`,
                            borderRadius: '8px', padding: '4px 8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          title={rec.ativo ? 'Ativo' : 'Inativo'}
                        >
                          <Check size={12} color={rec.ativo ? 'var(--accent-green)' : 'var(--text-muted)'} />
                        </button>

                        <button
                          onClick={() => openEdit(rec)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                            color: 'var(--text-muted)', borderRadius: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          onClick={() => handleDelete(rec.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                            color: 'var(--text-muted)', borderRadius: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── FORM MODE ── */}
          {mode === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Tipo */}
              <div>
                <label style={labelStyle}>{t('web_tx_type_label') || 'Tipo'}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['receita', 'despesa'] as const).map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setField('tipo', tipo)}
                      style={{
                        flex: 1,
                        background: form.tipo === tipo
                          ? (tipo === 'receita' ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)')
                          : 'var(--card-bg)',
                        border: `1px solid ${
                          form.tipo === tipo
                            ? (tipo === 'receita' ? 'rgba(0,230,118,0.35)' : 'rgba(255,82,82,0.35)')
                            : 'var(--card-border)'
                        }`,
                        borderRadius: '10px', padding: '10px',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        color: form.tipo === tipo
                          ? (tipo === 'receita' ? 'var(--accent-green)' : 'var(--color-danger)')
                          : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}
                    >
                      {tipo === 'receita'
                        ? <><TrendingUp size={14} /> {t('web_tx_type_revenue') || 'Receita'}</>
                        : <><TrendingDown size={14} /> {t('web_tx_type_expense') || 'Despesa'}</>
                      }
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor + Moeda */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>{t('web_import_review_value') || 'Valor'}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.valor || ''}
                    onChange={e => setField('valor', Math.abs(parseFloat(e.target.value) || 0))}
                    placeholder="0,00"
                    style={{
                      ...inputStyle,
                      color: form.tipo === 'receita' ? 'var(--accent-green)' : 'var(--color-danger)',
                      fontWeight: 700,
                      borderColor: errors.valor ? 'var(--color-danger)' : undefined,
                    }}
                  />
                  {errors.valor && <p style={errorStyle}>{errors.valor}</p>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Moeda</label>
                  <input
                    type="text"
                    value={form.moeda_transacao}
                    onChange={e => setField('moeda_transacao', e.target.value.toUpperCase())}
                    maxLength={3}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Categoria */}
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>{t('web_import_review_category') || 'Categoria'}</label>
                <select
                  value={form.categoria}
                  onChange={e => setField('categoria', e.target.value)}
                  style={{
                    ...inputStyle,
                    cursor: 'pointer',
                    borderColor: errors.categoria ? 'var(--color-danger)' : undefined,
                  }}
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.categoria && <p style={errorStyle}>{errors.categoria}</p>}
              </div>

              {/* Descrição */}
              <div>
                <label style={labelStyle}>{t('web_tx_desc_label') || 'Descrição'}</label>
                <input
                  type="text"
                  value={form.descricao ?? ''}
                  onChange={e => setField('descricao', e.target.value)}
                  maxLength={80}
                  placeholder="Ex: Aluguel, Netflix..."
                  style={inputStyle}
                />
              </div>

              {/* Frequência */}
              <div>
                <label style={labelStyle}>{t('web_recurring_frequency') || 'Frequência'}</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={form.frequencia}
                    onChange={e => setField('frequencia', e.target.value as TransacaoRecorrente['frequencia'])}
                    style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', paddingRight: '32px' }}
                  >
                    {FREQUENCIAS.map(freq => (
                      <option key={freq} value={freq}>
                        {t(FREQUENCY_KEYS[freq]) || FREQUENCY_FALLBACKS[freq]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              {/* Dia vencimento */}
              <div>
                <label style={labelStyle}>{t('web_recurring_due_day') || 'Dia de vencimento'}</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dia_vencimento}
                  onChange={e => setField('dia_vencimento', parseInt(e.target.value) || 1)}
                  style={{
                    ...inputStyle,
                    borderColor: errors.dia_vencimento ? 'var(--color-danger)' : undefined,
                  }}
                />
                {errors.dia_vencimento && <p style={errorStyle}>{errors.dia_vencimento}</p>}
              </div>

              {/* Conta */}
              <div>
                <label style={labelStyle}>{t('web_tx_account_label') || 'Conta'}</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={form.id_conta}
                    onChange={e => setField('id_conta', e.target.value)}
                    style={{
                      ...inputStyle, cursor: 'pointer', appearance: 'none', paddingRight: '32px',
                      borderColor: errors.id_conta ? 'var(--color-danger)' : undefined,
                    }}
                  >
                    <option value="">Selecione...</option>
                    {contasEspacoAtivo.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_instituicao} ({c.moeda_conta})</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}
                  />
                </div>
                {errors.id_conta && <p style={errorStyle}>{errors.id_conta}</p>}
              </div>

              {/* Data início + Data fim */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t('web_recurring_start_date') || 'Data início'}</label>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={e => setField('data_inicio', e.target.value)}
                    style={{
                      ...inputStyle,
                      borderColor: errors.data_inicio ? 'var(--color-danger)' : undefined,
                    }}
                  />
                  {errors.data_inicio && <p style={errorStyle}>{errors.data_inicio}</p>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t('web_recurring_end_date') || 'Data fim (opcional)'}</label>
                  <input
                    type="date"
                    value={form.data_fim ?? ''}
                    onChange={e => setField('data_fim', e.target.value || undefined)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Ativo toggle */}
              <div>
                <label style={labelStyle}>{t('web_recurring_active') || 'Ativo'}</label>
                <button
                  onClick={() => setField('ativo', !form.ativo)}
                  style={{
                    background: form.ativo ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.ativo ? 'rgba(0,230,118,0.35)' : 'var(--card-border)'}`,
                    borderRadius: '10px', padding: '10px 18px',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    color: form.ativo ? 'var(--accent-green)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  {form.ativo ? <Check size={14} /> : <X size={14} />}
                  {form.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {mode === 'form' && (
          <div style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--card-border)',
            display: 'flex', justifyContent: 'flex-end', gap: '10px',
          }}>
            <button
              onClick={() => { resetForm(); setMode('list'); }}
              style={{
                background: 'transparent', border: '1px solid var(--card-border)',
                color: 'var(--text-secondary)', padding: '10px 20px',
                borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              }}
            >
              {t('cancel') || 'Cancelar'}
            </button>
            <button
              onClick={handleSave}
              style={{
                background: 'var(--accent-cyan)', color: '#000',
                border: 'none', padding: '10px 28px',
                borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Check size={16} />
              {t('web_recurring_save') || 'Salvar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
