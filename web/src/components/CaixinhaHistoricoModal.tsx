import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Trash2, Pencil,
  X, Check, PiggyBank, AlertTriangle,
} from 'lucide-react';
import { useI18n } from '../i18n';

export interface MovimentoCaixinha {
  id: string;
  tipo: 'aporte' | 'resgate';
  valor: number;
  descricao: string;
  data: string;
}

const LOCAL_PREFIX = 'mangos_caixinha_hist_';

export function loadHistorico(caixinhaId: string): MovimentoCaixinha[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_PREFIX + caixinhaId) || '[]'); } catch { return []; }
}

export function saveHistorico(caixinhaId: string, hist: MovimentoCaixinha[]) {
  localStorage.setItem(LOCAL_PREFIX + caixinhaId, JSON.stringify(hist));
}

export function calcSaldoFromHistorico(hist: MovimentoCaixinha[], saldoInicial = 0): number {
  return hist.reduce((acc, m) => m.tipo === 'aporte' ? acc + m.valor : acc - m.valor, saldoInicial);
}

interface Props {
  isOpen: boolean;
  caixinhaId: string;
  caixinhaNome: string;
  valorAlvo: number;
  saldoAtual: number;
  moedaBase: string;
  onClose: () => void;
  onSaldoChange: (novoSaldo: number) => void;
  onAddMovimento?: (mov: Omit<MovimentoCaixinha, 'id'> & { caixinha_id: string }) => Promise<string | null>;
  onEditMovimento?: (id: string, updates: { valor?: number; descricao?: string }) => Promise<void>;
  onDeleteMovimento?: (id: string) => Promise<void>;
}

export const CaixinhaHistoricoModal: React.FC<Props> = ({
  isOpen, caixinhaId, caixinhaNome, valorAlvo, saldoAtual,
  moedaBase, onClose, onSaldoChange,
  onAddMovimento, onEditMovimento, onDeleteMovimento,
}) => {
  const { t } = useI18n();
  const [hist, setHist] = useState<MovimentoCaixinha[]>(() => loadHistorico(caixinhaId));
  const [modo, setModo] = useState<'extrato' | 'aporte' | 'resgate'>('extrato');

  // Form fields
  const [fValor, setFValor] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fData, setFData] = useState(new Date().toISOString().split('T')[0]);

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ─── Reset when caixinha changes ─────────────────────────────────────────
  React.useEffect(() => {
    const h = loadHistorico(caixinhaId);
    setHist(h);
    setModo('extrato');
    setFValor(''); setFDesc(''); setDeleteConfirm(null); setEditId(null);
  }, [caixinhaId]);

  const saldoComputado = useMemo(() => calcSaldoFromHistorico(hist, saldoAtual), [hist, saldoAtual]);
  const pct = valorAlvo > 0 ? Math.min(Math.round((saldoComputado / valorAlvo) * 100), 100) : 0;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: moedaBase === 'USD' ? 'USD' : moedaBase === 'EUR' ? 'EUR' : 'BRL', minimumFractionDigits: 2 });

  const persistAndNotify = useCallback((updated: MovimentoCaixinha[]) => {
    saveHistorico(caixinhaId, updated);
    setHist(updated);
    const newSaldo = calcSaldoFromHistorico(updated, saldoAtual);
    onSaldoChange(newSaldo);
  }, [caixinhaId, saldoAtual, onSaldoChange]);

  const handleRegistrar = async () => {
    const val = parseFloat(fValor.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    if (modo === 'resgate' && val > saldoComputado) return;
    const novoId = onAddMovimento
      ? await onAddMovimento({
          caixinha_id: caixinhaId,
          tipo: modo as 'aporte' | 'resgate',
          valor: val,
          descricao: fDesc.trim() || (modo === 'aporte' ? t('web_jar_history_deposit') : t('web_jar_history_withdrawal')),
          data: fData,
        }) || `mov_${Date.now()}`
      : `mov_${Date.now()}`;
    const novo: MovimentoCaixinha = {
      id: novoId,
      tipo: modo as 'aporte' | 'resgate',
      valor: val,
      descricao: fDesc.trim() || (modo === 'aporte' ? t('web_jar_history_deposit') : t('web_jar_history_withdrawal')),
      data: fData,
    };
    persistAndNotify([novo, ...hist]);
    setFValor(''); setFDesc(''); setModo('extrato');
  };

  const handleDelete = async (id: string) => {
    if (onDeleteMovimento) await onDeleteMovimento(id);
    persistAndNotify(hist.filter(m => m.id !== id));
    setDeleteConfirm(null);
  };

  const handleEditSave = async (id: string) => {
    const val = parseFloat(editValor.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    if (onEditMovimento) await onEditMovimento(id, { valor: val, descricao: editDesc });
    persistAndNotify(hist.map(m => m.id === id ? { ...m, valor: val, descricao: editDesc || m.descricao } : m));
    setEditId(null);
  };

  if (!isOpen) return null;

  const inputSt: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
    borderRadius: '10px', padding: '10px 14px', color: 'var(--modal-text)',
    fontSize: '0.88rem', width: '100%', outline: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '16px' }}>
      <div style={{ background: 'var(--modal-bg)', border: '1px solid var(--card-border)', borderRadius: '22px', width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-glass)', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <PiggyBank size={18} color="var(--accent-cyan)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{caixinhaNome}</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {t('web_jar_history_balance_label')} <strong style={{ color: 'var(--accent-cyan)' }}>{fmt(saldoComputado)}</strong>
                &nbsp;·&nbsp;{t('web_jar_history_goal')} <strong>{fmt(valorAlvo)}</strong>
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: '14px', height: '6px', background: 'var(--bg-color)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#00E676' : 'linear-gradient(90deg,#00E5FF,#0070FF)', borderRadius: '10px', transition: 'width 0.4s ease' }} />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('web_jar_history_goal_pct', { pct: String(pct) })}</p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {(['extrato', 'aporte', 'resgate'] as const).map(m => (
              <button key={m} onClick={() => setModo(m)} style={{
                flex: 1, padding: '9px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
background: modo === m
  ? (m === 'aporte' ? 'rgba(16,185,129,0.08)' : m === 'resgate' ? 'rgba(239,68,68,0.08)' : 'rgba(14,165,233,0.08)')
  : 'var(--bg-color)',
                color: modo === m
                  ? (m === 'aporte' ? '#00E676' : m === 'resgate' ? '#FF5252' : 'var(--accent-cyan)')
                  : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}>
                {m === 'extrato' ? t('web_jar_history_tab_statement') : m === 'aporte' ? t('web_jar_history_tab_deposit') : t('web_jar_history_tab_withdraw')}
              </button>
            ))}
          </div>
        </div>

        {/* ── Form (aporte / resgate) ── */}
        {modo !== 'extrato' && (
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--card-border)' }}>
            {modo === 'resgate' && saldoComputado <= 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFB400', fontSize: '0.82rem', marginBottom: '14px' }}>
                <AlertTriangle size={14} /> {t('web_jar_history_insufficient_balance')}
              </div>
            )}
            <div className="rg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>{t('web_jar_history_amount')}</label>
                <input type="number" min="0.01" step="0.01" value={fValor} onChange={e => setFValor(e.target.value)} placeholder="0,00" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>{t('web_jar_history_date')}</label>
                <input type="date" value={fData} onChange={e => setFData(e.target.value)} style={inputSt} />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>{t('web_jar_history_desc_optional')}</label>
              <input type="text" value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder={modo === 'aporte' ? t('web_jar_history_desc_deposit_placeholder') : t('web_jar_history_desc_withdraw_placeholder')} style={inputSt} />
            </div>
            <button
              onClick={handleRegistrar}
              disabled={!fValor || (modo === 'resgate' && parseFloat(fValor) > saldoComputado)}
              style={{ width: '100%', padding: '12px', background: modo === 'aporte' ? 'linear-gradient(135deg,#00E676,#00BFA5)' : 'linear-gradient(135deg,#FF5252,#FF1744)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', opacity: (!fValor || (modo === 'resgate' && parseFloat(fValor) > saldoComputado)) ? 0.5 : 1 }}
            >
              {modo === 'aporte' ? `${t('web_jar_history_save_button')} ${fValor ? fmt(parseFloat(fValor.replace(',', '.'))) : ''}` : `${t('web_jar_history_withdraw_button')} ${fValor ? fmt(parseFloat(fValor.replace(',', '.'))) : ''}`}
            </button>
          </div>
        )}

        {/* ── Extrato (lista) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {hist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <PiggyBank size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>{t('web_jar_history_no_movements_hint')}</p>
            </div>
          ) : (
            hist.map(m => {
              const isAporte = m.tipo === 'aporte';
              const isEdit = editId === m.id;
              return (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center', padding: '10px 12px', borderRadius: '12px', marginBottom: '4px', background: 'transparent', borderLeft: `3px solid ${isAporte ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}` }}>
                  {isEdit ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="number" value={editValor} onChange={e => setEditValor(e.target.value)} style={{ ...inputSt, width: '100px', padding: '6px 10px' }} />
                      <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ ...inputSt, flex: 1, padding: '6px 10px', minWidth: '80px' }} />
                      <button onClick={() => handleEditSave(m.id)} style={{ background: 'rgba(0,230,118,0.15)', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', color: '#00E676' }}><Check size={13} /></button>
                      <button onClick={() => setEditId(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={13} /></button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        {isAporte ? <TrendingUp size={13} color="#00E676" /> : <TrendingDown size={13} color="#FF5252" />}
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isAporte ? '#00E676' : '#FF5252' }}>
                          {isAporte ? '+' : '-'} {fmt(m.valor)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.data}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', paddingLeft: '20px' }}>{m.descricao}</div>
                    </div>
                  )}
                  {!isEdit && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {deleteConfirm === m.id ? (
                        <>
                          <button onClick={() => handleDelete(m.id)} style={{ background: 'rgba(255,82,82,0.15)', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: '#FF5252' }}><Check size={12} /></button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={12} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(m.id); setEditValor(String(m.valor)); setEditDesc(m.descricao); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}><Pencil size={12} /></button>
                          <button onClick={() => setDeleteConfirm(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
