import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Plus, Trash2, Pencil,
  Search, Filter, BarChart3, DollarSign, Calendar,
  X, Check, RefreshCw, ChevronDown, ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import {
  fetchTransacoesAtivos, createTransacaoAtivo,
  updateTransacaoAtivo, deleteTransacaoAtivo,
} from '../services/supabaseService';
import type { TransacaoAtivo } from '../services/supabaseService';
import { Logo } from './Logo';
import {
  CATEGORIAS_INVESTIMENTO, getCategoriaByTicker,
  getNomeSubcategoria,
  getCategoriaInfo, searchTickers, getTickerName,
} from '../utils/investmentCategories';

interface InvestimentosViewProps {
  moedaBase: string;
  onUpgrade: () => void;
  id_usuario: string | null;
}

const CLEAN_BG = '#F4F7FE';
const CLEAN_CARD = '#FFFFFF';
const CLEAN_TEXT = '#1A2744';
const CLEAN_TEXT_SECONDARY = '#64748B';
const CLEAN_TEXT_MUTED = '#94A3B8';
const CLEAN_BORDER = '#E2E8F0';
const ACCENT_BLUE = '#1045A1';
const ACCENT_GREEN = '#10B981';
const ACCENT_RED = '#EF4444';
const ACCENT_CYAN = '#0EA5E9';

export const InvestimentosView: React.FC<InvestimentosViewProps> = ({ moedaBase, id_usuario }) => {

  const [txs, setTxs] = useState<TransacaoAtivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'compra' | 'venda'>('todos');
  const [busca, setBusca] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set());
  const [vizualizacao, setVizualizacao] = useState<'categorias' | 'lista'>('categorias');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fTicker, setFTicker] = useState('');
  const [fTipo, setFTipo] = useState<'compra' | 'venda'>('compra');
  const [fQtd, setFQtd] = useState('');
  const [fPreco, setFPreco] = useState('');
  const [fData, setFData] = useState(new Date().toISOString().split('T')[0]);
  const [fCategoria, setFCategoria] = useState('');
  const [fSubcategoria, setFSubcategoria] = useState('');
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const carregarTransacoes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchTransacoesAtivos();
    if (data && !error) {
      setTxs(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarTransacoes();
  }, [carregarTransacoes]);

  const openAdd = () => {
    setEditId(null); setFTicker(''); setFTipo('compra');
    setFQtd(''); setFPreco(''); setFData(new Date().toISOString().split('T')[0]);
    setFCategoria(''); setFSubcategoria('');
    setSugestoes([]); setModalOpen(true);
  };

  const openEdit = (tx: TransacaoAtivo) => {
    setEditId(tx.id); setFTicker(tx.ticker); setFTipo(tx.tipo);
    setFQtd(String(tx.quantidade)); setFPreco(String(tx.preco_unitario));
    setFData(tx.data_transacao);
    setFCategoria(tx.categoria || '');
    setFSubcategoria(tx.subcategoria || '');
    setSugestoes([]); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditId(null); setSugestoes([]); };

  const handleTickerChange = (v: string) => {
    setFTicker(v.toUpperCase());
    if (v.length >= 2) {
      setSugestoes(searchTickers(v, 6).map(r => r.ticker));
    } else { setSugestoes([]); }

    const cat = getCategoriaByTicker(v);
    if (cat) {
      setFCategoria(cat.categoria);
      setFSubcategoria(cat.subcategoria);
    }
  };

  const handleSave = async () => {
    if (!fTicker.trim()) return;
    const qtd = parseFloat(fQtd.replace(',', '.'));
    const preco = parseFloat(fPreco.replace(',', '.'));
    if (isNaN(qtd) || qtd <= 0 || isNaN(preco) || preco <= 0) return;
    setSaving(true);

    if (editId) {
      const { error } = await updateTransacaoAtivo(editId, {
        quantidade: qtd, preco_unitario: preco, data_transacao: fData,
        categoria: fCategoria || undefined, subcategoria: fSubcategoria || undefined,
      });
      if (!error) {
        setTxs(prev => prev.map(t => t.id === editId
          ? { ...t, ticker: fTicker.trim(), tipo: fTipo, quantidade: qtd, preco_unitario: preco, data_transacao: fData, categoria: fCategoria || undefined, subcategoria: fSubcategoria || undefined }
          : t
        ));
      }
    } else {
      const { data, error } = await createTransacaoAtivo({
        id_usuario: id_usuario || '',
        ticker: fTicker.trim(),
        tipo: fTipo,
        quantidade: qtd,
        preco_unitario: preco,
        data_transacao: fData,
        categoria: fCategoria || undefined,
        subcategoria: fSubcategoria || undefined,
      });
      if (data && !error) {
        setTxs(prev => [...prev, data]);
      }
    }

    setSaving(false);
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (!id.startsWith('local-')) {
      await deleteTransacaoAtivo(id);
    }
    setTxs(prev => prev.filter(t => t.id !== id));
    setDeleteConfirm(null);
  };

  const filtered = useMemo(() =>
    txs
      .filter(t => {
        if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;
        if (!t.ticker.includes(busca.toUpperCase())) return false;
        if (filtroCategoria !== 'todas' && t.categoria !== filtroCategoria) return false;
        return true;
      })
      .sort((a, b) => sortDir === 'desc' ? b.data_transacao.localeCompare(a.data_transacao) : a.data_transacao.localeCompare(b.data_transacao)),
    [txs, filtroTipo, busca, sortDir, filtroCategoria]
  );

  const posicoes = useMemo(() => {
    const map: Record<string, { ticker: string; qtd: number; custoTotal: number; qtdCompra: number; qtdVenda: number; categoria?: string; subcategoria?: string }> = {};
    txs.forEach(t => {
      if (!map[t.ticker]) map[t.ticker] = { ticker: t.ticker, qtd: 0, custoTotal: 0, qtdCompra: 0, qtdVenda: 0, categoria: t.categoria, subcategoria: t.subcategoria };
      const vol = t.quantidade * t.preco_unitario;
      if (t.tipo === 'compra') { map[t.ticker].qtd += t.quantidade; map[t.ticker].custoTotal += vol; map[t.ticker].qtdCompra += t.quantidade; }
      else { map[t.ticker].qtd -= t.quantidade; map[t.ticker].custoTotal -= vol; map[t.ticker].qtdVenda += t.quantidade; }
    });
    return Object.values(map).filter(p => p.qtd > 0);
  }, [txs]);

  // ─── Agrupamento por Categoria → Subcategoria ───────────────────
  const posicoesPorCategoria = useMemo(() => {
    const grupos: Record<string, Record<string, typeof posicoes>> = {};

    posicoes.forEach(p => {
      const catId = p.categoria || 'sem_categoria';
      const subId = p.subcategoria || 'sem_subcategoria';
      if (!grupos[catId]) grupos[catId] = {};
      if (!grupos[catId][subId]) grupos[catId][subId] = [];
      grupos[catId][subId].push(p);
    });

    return grupos;
  }, [posicoes]);

  const toggleGrupo = (key: string) => {
    setGruposExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const expandirTodos = () => {
    const allKeys = new Set<string>();
    Object.entries(posicoesPorCategoria).forEach(([catId, subs]) => {
      allKeys.add(catId);
      Object.keys(subs).forEach(subId => allKeys.add(`${catId}/${subId}`));
    });
    setGruposExpandidos(allKeys);
  };

  const patrimonioTotal = posicoes.reduce((s, p) => s + p.custoTotal, 0);

  const inputStyle: React.CSSProperties = {
    background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
    borderRadius: '10px', padding: '10px 14px', color: CLEAN_TEXT,
    fontSize: '0.88rem', width: '100%', outline: 'none',
  };


  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: CLEAN_BG, minHeight: '100vh' }}>
        <p style={{ color: CLEAN_TEXT_SECONDARY }}>Carregando investimentos...</p>
      </div>
    );
  }

  return (
    <div style={{ background: CLEAN_BG, minHeight: '100vh', padding: '0 0 60px 0' }}>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

        <div style={{ padding: '24px 0 8px' }}>
          <Logo variant="full" size="md" />
        </div>

        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px', color: CLEAN_TEXT }}>Investimentos</h2>
            <p style={{ margin: '4px 0 0', color: CLEAN_TEXT_SECONDARY, fontSize: '0.95rem' }}>
              Registro de operações e acompanhamento de carteira
            </p>
          </div>
          <button onClick={openAdd} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
            background: ACCENT_BLUE, border: 'none',
            borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          }}>
            <Plus size={16} /> Nova Operação
          </button>
        </div>

        {/* ── Métricas Resumo ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Patrimônio Investido', value: formatCurrency(patrimonioTotal, moedaBase), icon: <BarChart3 size={18} />, color: ACCENT_BLUE },
            { label: 'Total de Operações', value: String(txs.length), icon: <DollarSign size={18} />, color: ACCENT_GREEN },
            { label: 'Posições Abertas', value: String(posicoes.length), icon: <TrendingUp size={18} />, color: ACCENT_CYAN },
            { label: 'Preço Médio (geral)', value: posicoes.length > 0 ? formatCurrency(patrimonioTotal / posicoes.reduce((s, p) => s + p.qtd, 0), moedaBase) : 'R$ 0,00', icon: <Filter size={18} />, color: '#F59E0B' },
          ].map((c, i) => (
            <div key={i} style={{
              background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
              borderRadius: '16px', padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: c.color }}>
                {c.icon}
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: CLEAN_TEXT_SECONDARY }}>{c.label}</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: CLEAN_TEXT }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* ── Toggle Visualização ── */}
        {posicoes.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <button onClick={() => setVizualizacao('categorias')} style={{
              padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer', border: vizualizacao === 'categorias' ? 'none' : `1px solid ${CLEAN_BORDER}`,
              background: vizualizacao === 'categorias' ? ACCENT_BLUE : CLEAN_CARD,
              color: vizualizacao === 'categorias' ? '#fff' : CLEAN_TEXT_SECONDARY,
            }}>Por Categoria</button>
            <button onClick={() => setVizualizacao('lista')} style={{
              padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer', border: vizualizacao === 'lista' ? 'none' : `1px solid ${CLEAN_BORDER}`,
              background: vizualizacao === 'lista' ? ACCENT_BLUE : CLEAN_CARD,
              color: vizualizacao === 'lista' ? '#fff' : CLEAN_TEXT_SECONDARY,
            }}>Lista</button>
          </div>
        )}

        {/* ── Posições Agrupadas por Categoria ── */}
        {posicoes.length > 0 && vizualizacao === 'categorias' && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: CLEAN_TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Carteira por Categoria</h3>
              <button onClick={expandirTodos} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: ACCENT_BLUE, fontSize: '0.78rem', fontWeight: 700,
              }}>
                {gruposExpandidos.size > 0 ? 'Recolher todas' : 'Expandir todas'}
              </button>
            </div>

            {Object.entries(posicoesPorCategoria).map(([catId, subs]) => {
              const catInfo = catId !== 'sem_categoria' ? getCategoriaInfo(catId) : null;
              const catPosicoes = Object.values(subs).flat();
              const catTotal = catPosicoes.reduce((s, p) => s + p.custoTotal, 0);
              const catExpanded = gruposExpandidos.has(catId);

              return (
                <div key={catId} style={{
                  background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
                  borderRadius: '14px', marginBottom: '10px', overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}>
                  {/* Header da Categoria */}
                  <button
                    onClick={() => toggleGrupo(catId)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 18px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {catExpanded ? <ChevronDown size={16} color={CLEAN_TEXT_MUTED} /> : <ChevronRight size={16} color={CLEAN_TEXT_MUTED} />}
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: catInfo?.cor || CLEAN_TEXT_MUTED, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: CLEAN_TEXT, fontSize: '0.9rem' }}>
                        {catInfo?.nome || (catId === 'sem_categoria' ? 'Sem Categoria' : catId)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: CLEAN_TEXT_MUTED, marginLeft: '8px' }}>
                        {catPosicoes.length} posição(ões)
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: ACCENT_BLUE, fontSize: '0.9rem' }}>
                      {formatCurrency(catTotal, moedaBase)}
                    </span>
                  </button>

                  {/* Subcategorias */}
                  {catExpanded && (
                    <div style={{ borderTop: `1px solid ${CLEAN_BORDER}` }}>
                      {Object.entries(subs).map(([subId, subPosicoes]) => {
                        const subExpanded = gruposExpandidos.has(`${catId}/${subId}`);
                        const subTotal = subPosicoes.reduce((s, p) => s + p.custoTotal, 0);

                        return (
                          <div key={subId}>
                            {/* Header da Subcategoria */}
                            <button
                              onClick={() => toggleGrupo(`${catId}/${subId}`)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 18px 10px 42px', background: '#F8FAFC', border: 'none',
                                cursor: 'pointer', textAlign: 'left', borderTop: `1px solid ${CLEAN_BORDER}`,
                              }}
                            >
                              {subExpanded ? <ChevronDown size={13} color={CLEAN_TEXT_MUTED} /> : <ChevronRight size={13} color={CLEAN_TEXT_MUTED} />}
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 600, color: CLEAN_TEXT_SECONDARY, fontSize: '0.82rem' }}>
                                  {catId !== 'sem_categoria' ? getNomeSubcategoria(catId, subId) : (subId === 'sem_subcategoria' ? 'Sem Subcategoria' : subId)}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: CLEAN_TEXT_MUTED, marginLeft: '6px' }}>
                                  {subPosicoes.length}
                                </span>
                              </div>
                              <span style={{ fontWeight: 600, color: CLEAN_TEXT_SECONDARY, fontSize: '0.82rem' }}>
                                {formatCurrency(subTotal, moedaBase)}
                              </span>
                            </button>

                            {/* Tickers da Subcategoria */}
                            {subExpanded && subPosicoes.map(p => (
                              <div key={p.ticker} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '10px 18px 10px 60px', borderTop: `1px solid ${CLEAN_BORDER}`,
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: ACCENT_BLUE }}>{p.ticker}</div>
                                  <div style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED }}>{getTickerName(p.ticker) || p.ticker}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: CLEAN_TEXT }}>{p.qtd.toFixed(2)} cotas</div>
                                  <div style={{ fontSize: '0.72rem', color: ACCENT_GREEN }}>PM: {formatCurrency(p.custoTotal / p.qtd, moedaBase)}</div>
                                </div>
                                <div style={{ fontWeight: 700, color: ACCENT_BLUE, fontSize: '0.85rem', minWidth: '100px', textAlign: 'right' }}>
                                  {formatCurrency(p.custoTotal, moedaBase)}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Posições Abertas (Lista simples) ── */}
        {posicoes.length > 0 && vizualizacao === 'lista' && (
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: CLEAN_TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posições Abertas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {posicoes.map(p => (
                <div key={p.ticker} style={{
                  background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
                  borderRadius: '14px', padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: ACCENT_BLUE, marginBottom: '4px' }}>{p.ticker}</div>
                  <div style={{ fontSize: '0.78rem', color: CLEAN_TEXT_MUTED }}>{getTickerName(p.ticker) || p.ticker}</div>
                  {p.categoria && (
                    <div style={{ fontSize: '0.7rem', color: CLEAN_TEXT_MUTED, marginTop: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: getCategoriaInfo(p.categoria)?.cor || CLEAN_TEXT_MUTED,
                      }} />
                      {getNomeSubcategoria(p.categoria, p.subcategoria || '')}
                    </div>
                  )}
                  <div style={{ marginTop: '10px', fontSize: '0.88rem', fontWeight: 700, color: CLEAN_TEXT }}>{p.qtd.toFixed(2)} cotas</div>
                  <div style={{ fontSize: '0.8rem', color: ACCENT_GREEN, marginTop: '2px' }}>PM: {formatCurrency(p.custoTotal / p.qtd, moedaBase)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filtros de Categoria (chips) ── */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: CLEAN_TEXT_MUTED, fontWeight: 600, marginRight: '4px' }}>Categoria:</span>
          <button onClick={() => setFiltroCategoria('todas')} style={{
            padding: '5px 12px', borderRadius: '16px', fontSize: '0.72rem', fontWeight: 700,
            cursor: 'pointer',
            background: filtroCategoria === 'todas' ? ACCENT_BLUE : 'transparent',
            color: filtroCategoria === 'todas' ? '#fff' : CLEAN_TEXT_SECONDARY,
            border: filtroCategoria === 'todas' ? 'none' : `1px solid ${CLEAN_BORDER}`,
          }}>Todas</button>
          {CATEGORIAS_INVESTIMENTO.map(cat => (
            <button key={cat.id} onClick={() => setFiltroCategoria(filtroCategoria === cat.id ? 'todas' : cat.id)} style={{
              padding: '5px 12px', borderRadius: '16px', fontSize: '0.72rem', fontWeight: 700,
              cursor: 'pointer',
              background: filtroCategoria === cat.id ? cat.cor : 'transparent',
              color: filtroCategoria === cat.id ? '#fff' : CLEAN_TEXT_SECONDARY,
              border: filtroCategoria === cat.id ? 'none' : `1px solid ${CLEAN_BORDER}`,
            }}>{cat.nome}</button>
          ))}
        </div>

        {/* ── Tabela de Operações ── */}
        <div style={{
          background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
          borderRadius: '20px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: `1px solid ${CLEAN_BORDER}`,
            display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: CLEAN_TEXT_MUTED }} />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ticker..." style={{ ...inputStyle, paddingLeft: '34px' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: 'Todas', key: 'todos' as const, color: ACCENT_BLUE },
                { label: 'Compras', key: 'compra' as const, color: ACCENT_RED },
                { label: 'Vendas', key: 'venda' as const, color: ACCENT_GREEN },
              ].map(chip => (
                <button key={chip.key} onClick={() => setFiltroTipo(chip.key)} style={{
                  padding: '7px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                  cursor: 'pointer',
                  background: filtroTipo === chip.key ? chip.color : 'transparent',
                  color: filtroTipo === chip.key ? '#fff' : CLEAN_TEXT_SECONDARY,
                  border: filtroTipo === chip.key ? 'none' : `1px solid ${CLEAN_BORDER}`,
                  transition: 'all 0.15s',
                }}>{chip.label}</button>
              ))}
            </div>
            <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{
              background: 'transparent', border: `1px solid ${CLEAN_BORDER}`, borderRadius: '10px',
              padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: '6px', color: CLEAN_TEXT_SECONDARY, fontSize: '0.78rem',
            }}>
              <Filter size={13} /> {sortDir === 'desc' ? 'Mais Recentes' : 'Mais Antigas'}
            </button>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: CLEAN_TEXT_MUTED }}>
              <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0 }}>Nenhuma operação encontrada.<br />Clique em "Nova Operação" para começar.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Tipo', 'Ticker', 'Categoria', 'Quantidade', 'Preço Unit.', 'Total', 'Data', ''].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: h === 'Total' || h === 'Preço Unit.' ? 'right' : 'left',
                        color: CLEAN_TEXT_SECONDARY, fontWeight: 700, fontSize: '0.72rem',
                        textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tx => {
                    const isCompra = tx.tipo === 'compra';
                    const total = tx.quantidade * tx.preco_unitario;
                    const catInfo = tx.categoria ? getCategoriaInfo(tx.categoria) : null;
                    return (
                      <tr key={tx.id} style={{ borderTop: `1px solid ${CLEAN_BORDER}`, transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                            background: isCompra ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            color: isCompra ? ACCENT_RED : ACCENT_GREEN,
                          }}>
                            {isCompra ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                            {isCompra ? 'Compra' : 'Venda'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: ACCENT_BLUE }}>
                          {tx.ticker}
                          <div style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED, fontWeight: 400 }}>{getTickerName(tx.ticker)}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {catInfo ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: CLEAN_TEXT_SECONDARY }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: catInfo.cor, flexShrink: 0 }} />
                              {getNomeSubcategoria(tx.categoria!, tx.subcategoria || '')}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', color: CLEAN_TEXT }}>{tx.quantidade}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: CLEAN_TEXT }}>{formatCurrency(tx.preco_unitario, moedaBase)}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: isCompra ? ACCENT_RED : ACCENT_GREEN }}>
                          {isCompra ? '-' : '+'} {formatCurrency(total, moedaBase)}
                        </td>
                        <td style={{ padding: '14px 16px', color: CLEAN_TEXT_MUTED, whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={11} />{tx.data_transacao}</span>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          {deleteConfirm === tx.id ? (
                            <span style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleDelete(tx.id)} style={{
                                background: 'rgba(239,68,68,0.15)', border: 'none',
                                borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: ACCENT_RED,
                              }}><Check size={12} /></button>
                              <button onClick={() => setDeleteConfirm(null)} style={{
                                background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
                                borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: CLEAN_TEXT_MUTED,
                              }}><X size={12} /></button>
                            </span>
                          ) : (
                            <span style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openEdit(tx)} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: CLEAN_TEXT_MUTED, padding: '4px', borderRadius: '6px',
                              }}><Pencil size={13} /></button>
                              <button onClick={() => setDeleteConfirm(tx.id)} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: CLEAN_TEXT_MUTED, padding: '4px', borderRadius: '6px',
                              }}><Trash2 size={13} /></button>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Modal Nova Operação ── */}
        {modalOpen && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px',
          }}>
            <div style={{
              background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
              borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '460px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
              maxHeight: '90vh', overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: CLEAN_TEXT }}>
                  {editId ? 'Editar Operação' : 'Registrar Operação'}
                </h3>
                <button onClick={closeModal} style={{
                  background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
                  borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: CLEAN_TEXT_MUTED,
                }}><X size={16} /></button>
              </div>

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Ticker do Ativo</label>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input value={fTicker} onChange={e => handleTickerChange(e.target.value)} placeholder="PETR4, BTC, MXRF11..." style={inputStyle} />
                {sugestoes.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '110%', left: 0, right: 0, background: CLEAN_CARD,
                    border: `1px solid ${CLEAN_BORDER}`, borderRadius: '10px', padding: '6px',
                    zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  }}>
                    {sugestoes.map(s => (
                      <button key={s} onClick={() => { setFTicker(s); setSugestoes([]); handleTickerChange(s); }} style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        borderRadius: '6px', color: CLEAN_TEXT_SECONDARY, fontSize: '0.83rem',
                      }}>
                        <strong style={{ color: ACCENT_BLUE }}>{s}</strong>&nbsp;&nbsp;{getTickerName(s)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Tipo</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['compra', 'venda'] as const).map(t => (
                  <button key={t} onClick={() => setFTipo(t)} style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${CLEAN_BORDER}`,
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                    background: fTipo === t ? (t === 'compra' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)') : CLEAN_CARD,
                    color: fTipo === t ? (t === 'compra' ? ACCENT_RED : ACCENT_GREEN) : CLEAN_TEXT_SECONDARY,
                    transition: 'all 0.15s',
                  }}>
                    {t === 'compra' ? '📉 Compra' : '📈 Venda'}
                  </button>
                ))}
              </div>

              {/* ── Categoria ── */}
              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Categoria</label>
              <select
                value={fCategoria}
                onChange={e => { setFCategoria(e.target.value); setFSubcategoria(''); }}
                style={{ ...inputStyle, marginBottom: '12px', cursor: 'pointer' }}
              >
                <option value="">Selecione a categoria...</option>
                {CATEGORIAS_INVESTIMENTO.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>

              {fCategoria && (
                <>
                  <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Subcategoria</label>
                  <select
                    value={fSubcategoria}
                    onChange={e => setFSubcategoria(e.target.value)}
                    style={{ ...inputStyle, marginBottom: '16px', cursor: 'pointer' }}
                  >
                    <option value="">Selecione a subcategoria...</option>
                    {getCategoriaInfo(fCategoria)?.subcategorias.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.nome} — {sub.descricao}</option>
                    ))}
                  </select>
                </>
              )}

              <div className="rg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Quantidade</label>
                  <input type="number" min="0" step="0.01" value={fQtd} onChange={e => setFQtd(e.target.value)} placeholder="100" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Preço Unit.</label>
                  <input type="number" min="0" step="0.01" value={fPreco} onChange={e => setFPreco(e.target.value)} placeholder="34.50" style={inputStyle} />
                </div>
              </div>

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Data da Operação</label>
              <input type="date" value={fData} onChange={e => setFData(e.target.value)} style={{ ...inputStyle, marginBottom: '24px' }} />

              {fQtd && fPreco && (
                <div style={{
                  marginBottom: '20px', padding: '12px 16px',
                  background: 'rgba(16,69,161,0.06)', borderRadius: '10px',
                  fontSize: '0.82rem', color: CLEAN_TEXT_SECONDARY,
                }}>
                  Total: <strong style={{ color: ACCENT_BLUE }}>{formatCurrency(parseFloat(fQtd || '0') * parseFloat(fPreco || '0'), moedaBase)}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={closeModal} style={{
                  flex: 1, padding: '12px', background: 'transparent',
                  border: `1px solid ${CLEAN_BORDER}`, borderRadius: '12px',
                  cursor: 'pointer', color: CLEAN_TEXT_SECONDARY, fontWeight: 600,
                }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving || !fTicker || !fQtd || !fPreco} style={{
                  flex: 1.5, padding: '12px', background: ACCENT_BLUE, border: 'none',
                  borderRadius: '12px', cursor: 'pointer', color: '#fff', fontWeight: 700,
                  opacity: saving ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  {saving ? <RefreshCw size={14} className="spin" /> : null}
                  {saving ? 'Salvando...' : (editId ? 'Atualizar' : 'Registrar')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
