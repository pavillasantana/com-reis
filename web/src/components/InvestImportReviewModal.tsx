import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare, Square, CheckCircle2, Circle, Trash2, AlertTriangle,
  TrendingUp, TrendingDown, Package, DollarSign, Upload,
} from 'lucide-react';
import type { PendingAporte, PendingAtivo } from '../utils/investmentImporter';
import { getCategoriaByTicker, getCategoriaInfo, INDICES_RENDA_FIXA } from '../utils/investmentCategories';

const CLEAN_CARD = '#FFFFFF';
const CLEAN_TEXT = '#1A2744';
const CLEAN_TEXT_SECONDARY = '#64748B';
const CLEAN_TEXT_MUTED = '#94A3B8';
const CLEAN_BORDER = '#E2E8F0';
const ACCENT_BLUE = '#1045A1';
const ACCENT_GREEN = '#10B981';
const ACCENT_RED = '#EF4444';

interface InvestImportReviewModalProps {
  isOpen: boolean;
  mode: 'ativos' | 'aportes';
  rows: PendingAporte[] | PendingAtivo[];
  isLoading?: boolean;
  onConfirm: (rows: PendingAporte[] | PendingAtivo[]) => void;
  onClose: () => void;
}

function rederivar(rows: any[], mode: 'ativos' | 'aportes') {
  return rows.map((r: any) => {
    const info = getCategoriaByTicker(r.ticker) || null;
    const base = { ...r, categoria: info?.categoria || r.categoria, subcategoria: info?.subcategoria || r.subcategoria };
    return mode === 'ativos'
      ? { ...base, ticker: (r.ticker || '').toUpperCase() }
      : { ...base, ticker: (r.ticker || '').toUpperCase() };
  });
}

export const InvestImportReviewModal: React.FC<InvestImportReviewModalProps> = ({
  isOpen,
  mode,
  rows,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const [data, setData] = useState<PendingAporte[] | PendingAtivo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setData(rows);
      setSelected(new Set(rows.map((r: any) => r._key)));
    }
  }, [isOpen, rows]);

  const update = (key: string, changes: Record<string, unknown>) => {
    setData(prev => rederivar(prev.map((r: any) => (r._key === key ? { ...r, ...changes } : r)), mode));
  };

  const toggle = (key: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const toggleAll = () => {
    const keys = (data as any[]).map(r => r._key);
    const all = keys.every(k => selected.has(k));
    setSelected(prev => {
      const n = new Set(prev);
      keys.forEach(k => all ? n.delete(k) : n.add(k));
      return n;
    });
  };

  const remove = (key: string) => {
    setData(prev => (prev as any[]).filter((r: any) => r._key !== key) as PendingAporte[] | PendingAtivo[]);
    setSelected(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  const summary = useMemo(() => {
    let count = 0, total = 0;
    for (const r of data as any[]) {
      if (!selected.has(r._key)) continue;
      count++;
      total += mode === 'aportes' ? (r.quantidade * r.precoUnitario) : (r.quantidade * r.precoMedio);
    }
    return { count, total };
  }, [data, selected, mode]);

  if (!isOpen) return null;

  const allSelected = (data as any[]).length > 0 && (data as any[]).every(r => selected.has(r._key));
  const fmtNum = (v: number, dec = 4) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: dec });
  const fmtMoeda = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const inputStyle: React.CSSProperties = {
    background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
    borderRadius: '7px', padding: '5px 8px', color: CLEAN_TEXT,
    fontSize: '0.78rem', width: '100%',
  };

  const headStyle: React.CSSProperties = {
    fontSize: '0.68rem', fontWeight: 700, color: CLEAN_TEXT_MUTED,
    letterSpacing: '0.04em', textTransform: 'uppercase',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(11,16,29,0.55)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200, padding: '16px',
    }}>
      <div style={{
        background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
        borderRadius: '20px', width: '100%', maxWidth: '960px',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {/* HEADER */}
        <div style={{ padding: '22px 26px 16px', borderBottom: `1px solid ${CLEAN_BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'rgba(16,69,161,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {mode === 'ativos' ? <Package size={20} color={ACCENT_BLUE} /> : <Upload size={20} color={ACCENT_BLUE} />}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: CLEAN_TEXT }}>
                  {mode === 'ativos' ? 'Importar Ativos' : 'Importar Aportes'}
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: CLEAN_TEXT_SECONDARY }}>
                  {(data as any[]).length} registros detectados · confira e ajuste antes de salvar
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
              color: CLEAN_TEXT_SECONDARY, borderRadius: '10px', padding: '7px 14px',
              cursor: 'pointer', fontSize: '0.82rem', flexShrink: 0,
            }}>Fechar</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(16,69,161,0.06)', border: `1px solid rgba(16,69,161,0.15)`,
              borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem',
            }}>
              <CheckSquare size={14} color={ACCENT_BLUE} />
              <span style={{ color: CLEAN_TEXT_SECONDARY }}>{summary.count} selecionado(s)</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(16,185,129,0.06)', border: `1px solid rgba(16,185,129,0.15)`,
              borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem',
            }}>
              <DollarSign size={14} color={ACCENT_GREEN} />
              <span style={{ color: ACCENT_GREEN, fontWeight: 700 }}>R$ {fmtMoeda(summary.total)}</span>
              <span style={{ color: CLEAN_TEXT_MUTED }}>em {mode === 'aportes' ? 'aportes' : 'posição'}</span>
            </div>
          </div>
        </div>

        {/* HEADER ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: mode === 'aportes'
            ? '34px 120px 1fr 96px 92px 110px 110px 140px 36px'
            : '34px 120px 1fr 100px 120px 120px 140px 36px',
          gap: '0 8px', padding: '10px 20px',
          background: '#F8FAFC', borderBottom: `1px solid ${CLEAN_BORDER}`,
        }}>
          <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            {allSelected ? <CheckSquare size={16} color={ACCENT_BLUE} /> : <Square size={16} color={CLEAN_TEXT_MUTED} />}
          </button>
          <span style={headStyle}>Ticker</span>
          <span style={headStyle}>Nome / Categoria</span>
          {mode === 'aportes' && <span style={{ ...headStyle, textAlign: 'center' }}>Tipo</span>}
          <span style={{ ...headStyle, textAlign: 'right' }}>Quantidade</span>
          <span style={{ ...headStyle, textAlign: 'right' }}>{mode === 'aportes' ? 'Preço Unit.' : 'Preço Médio'}</span>
          <span style={{ ...headStyle, textAlign: 'right' }}>Total</span>
          <span style={{ ...headStyle, textAlign: 'center' }}>Data</span>
          <span />
        </div>

        {/* ROWS */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
          {(data as any[]).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: CLEAN_TEXT_MUTED }}>
              <AlertTriangle size={32} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <p style={{ margin: 0 }}>Nenhum registro restante.</p>
            </div>
          ) : (
            (data as any[]).map(row => {
              const isChecked = selected.has(row._key);
              const total = mode === 'aportes' ? row.quantidade * row.precoUnitario : row.quantidade * row.precoMedio;
              const catMap = getCategoriaByTicker(row.ticker);
              const catInfo = catMap ? getCategoriaInfo(catMap.categoria) : undefined;
              return (
                <div key={row._key} style={{
                  padding: '8px', borderRadius: '10px', marginBottom: '4px',
                  background: isChecked ? '#F8FAFC' : 'transparent',
                  opacity: isChecked ? 1 : 0.45,
                  transition: 'background 0.15s, opacity 0.15s',
                  borderLeft: `3px solid ${isChecked ? (row.tipo === 'venda' ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)') : 'transparent'}`,
                }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: mode === 'aportes'
                    ? '34px 120px 1fr 96px 92px 110px 110px 140px 36px'
                    : '34px 120px 1fr 100px 120px 120px 140px 36px',
                  gap: '0 8px', alignItems: 'center',
                }}>
                  <button onClick={() => toggle(row._key)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    {isChecked ? <CheckCircle2 size={18} color={ACCENT_BLUE} /> : <Circle size={18} color={CLEAN_TEXT_MUTED} />}
                  </button>

                  <input
                    type="text"
                    value={row.ticker}
                    onChange={e => update(row._key, { ticker: e.target.value.toUpperCase() })}
                    style={{ ...inputStyle, fontWeight: 700, color: ACCENT_BLUE }}
                  />

                  <div style={{ minWidth: 0 }}>
                    {row.nome && <div style={{ fontSize: '0.72rem', color: CLEAN_TEXT_SECONDARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.nome}</div>}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: '10px',
                        background: catInfo ? catInfo.cor + '18' : 'rgba(100,116,139,0.1)',
                        color: catInfo ? catInfo.cor : CLEAN_TEXT_SECONDARY,
                      }}>
                        {catInfo?.nome || 'Não categorizado'}
                      </span>
                    </div>
                  </div>

                  {mode === 'aportes' && (
                    <button
                      onClick={() => update(row._key, { tipo: row.tipo === 'compra' ? 'venda' : 'compra' })}
                      style={{
                        background: row.tipo === 'compra' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${row.tipo === 'compra' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        borderRadius: '7px', padding: '6px 0', cursor: 'pointer',
                        color: row.tipo === 'compra' ? ACCENT_GREEN : ACCENT_RED,
                        fontSize: '0.72rem', fontWeight: 700, width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      }}
                      title="Alternar compra/venda"
                    >
                      {row.tipo === 'compra' ? <><TrendingUp size={12} /> COMPRA</> : <><TrendingDown size={12} /> VENDA</>}
                    </button>
                  )}

                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={Number(row.quantidade)}
                    onChange={e => update(row._key, { quantidade: Math.abs(parseFloat(e.target.value) || 0) })}
                    style={{ ...inputStyle, textAlign: 'right' }}
                  />

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={Number(mode === 'aportes' ? row.precoUnitario : row.precoMedio)}
                    onChange={e => update(row._key, mode === 'aportes'
                      ? { precoUnitario: Math.abs(parseFloat(e.target.value) || 0) }
                      : { precoMedio: Math.abs(parseFloat(e.target.value) || 0) })}
                    style={{ ...inputStyle, textAlign: 'right' }}
                  />

                  <div style={{ textAlign: 'right', fontWeight: 800, color: CLEAN_TEXT, fontSize: '0.8rem' }}>
                    {fmtNum(total)}
                  </div>

                  <input
                    type="date"
                    value={row.dataTransacao}
                    onChange={e => update(row._key, { dataTransacao: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  />

                  <button onClick={() => remove(row._key)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: CLEAN_TEXT_MUTED, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {catMap?.categoria === 'renda_fixa_br' && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: '34px 120px 1fr 96px 92px 110px 110px 140px 36px',
                    gap: '0 8px', alignItems: 'center', marginTop: '6px',
                  }}>
                    <span />
                    <span style={headStyle}>Indexação</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <select
                        value={row.indice || ''}
                        onChange={e => update(row._key, { indice: e.target.value })}
                        style={{ ...inputStyle, width: '110px', cursor: 'pointer' }}
                      >
                        <option value="">Índice...</option>
                        {INDICES_RENDA_FIXA.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="%"
                        value={row.percentual_indexacao ?? ''}
                        onChange={e => update(row._key, { percentual_indexacao: e.target.value === '' ? null : parseFloat(e.target.value) })}
                        style={{ ...inputStyle, width: '90px' }}
                      />
                      <input
                        type="date"
                        value={row.data_vencimento || ''}
                        onChange={e => update(row._key, { data_vencimento: e.target.value })}
                        style={{ ...inputStyle, width: '150px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${CLEAN_BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: CLEAN_TEXT_MUTED }}>
            {mode === 'ativos'
              ? 'Cada ativo será registrado como uma compra (posição inicial).'
              : 'As operações serão adicionadas ao histórico de investimentos.'}
            {' '}Ticker, categoria e subtipo são derivados automaticamente.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{
              background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
              color: CLEAN_TEXT_SECONDARY, padding: '10px 20px', borderRadius: '10px',
              cursor: 'pointer', fontWeight: 600,
            }}>Cancelar</button>
            <button
              onClick={() => onConfirm((data as any[]).filter((r: any) => selected.has(r._key)) as PendingAporte[] | PendingAtivo[])}
              disabled={summary.count === 0 || isLoading}
              style={{
                background: ACCENT_BLUE, border: 'none', color: '#fff',
                padding: '10px 22px', borderRadius: '10px', cursor: 'pointer',
                fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                opacity: summary.count === 0 || isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? 'Salvando...' : `Importar ${summary.count} registro(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
