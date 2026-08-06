import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Plus, Trash2, Pencil,
  Search, Filter, BarChart3, DollarSign, Calendar,
  X, Check, RefreshCw, ChevronDown, ChevronRight,
  CheckSquare, Square, PieChart, Target, Award, Globe,
  TrendingUp as TrendingUpIcon, Wallet, Upload, Package,
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const formatQtd = (q: number): string =>
  q.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
import {
  fetchTransacoesAtivos, createTransacaoAtivo,
  updateTransacaoAtivo, deleteTransacaoAtivo,
  createTransacao,
  createTransacoesAtivosBulk,
  fetchDividendos,
} from '../services/supabaseService';
import type { TransacaoAtivo, Dividendo } from '../services/supabaseService';
import type { Conta, Transacao } from '../store/useStore';
import { Logo } from './Logo';
import { useToast } from './Toast';
import {
  CATEGORIAS_INVESTIMENTO, getCategoriaByTicker,
  getNomeSubcategoria,
  getCategoriaInfo, searchTickers, getTickerName,
  getTodasCategoriasComTickers,
  isCategoriaDomestica, getCategoriasDomesticas,
  formatIndexacao, INDICES_RENDA_FIXA,
} from '../utils/investmentCategories';
import { useI18n } from '../i18n';
import { useQuotes, useMarketQuotesByCategory, calcularMetricas, calcularMarketRanking } from '../hooks/useInvestments';
import { AssetDetailModal } from './AssetDetailModal';
import { ConfirmModal } from './ConfirmModal';
import { parseInvestmentFile } from '../utils/investmentImporter';
import type { PendingAporte, PendingAtivo } from '../utils/investmentImporter';
import { InvestImportReviewModal } from './InvestImportReviewModal';

type Tab = 'overview' | 'carteira' | 'ranking' | 'operacoes';

interface InvestimentosViewProps {
  moedaBase: string;
  onUpgrade: () => void;
  id_usuario: string | null;
  contas: Conta[];
  addTransacao: (transacao: Transacao) => void;
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

export const InvestimentosView: React.FC<InvestimentosViewProps> = ({ moedaBase, id_usuario, contas, addTransacao }) => {
  const { t } = useI18n();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('overview');
  const [txs, setTxs] = useState<TransacaoAtivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dividendos, setDividendos] = useState<Dividendo[]>([]);

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
  const [fIndice, setFIndice] = useState('');
  const [fPercentual, setFPercentual] = useState('');
  const [fVencimento, setFVencimento] = useState('');
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [rowDeleteConfirm, setRowDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fContaDestino, setFContaDestino] = useState('');

  const [detailTicker, setDetailTicker] = useState<string | null>(null);
  const [dividendoModal, setDividendoModal] = useState(false);
  const [fDivTicker, setFDivTicker] = useState('');
  const [fDivValor, setFDivValor] = useState('');
  const [fDivData, setFDivData] = useState(new Date().toISOString().split('T')[0]);
  const [fDivTipo, setFDivTipo] = useState<string>('dividendo');

  const [importTypeOpen, setImportTypeOpen] = useState(false);
  const [importMode, setImportMode] = useState<'ativos' | 'aportes'>('aportes');
  const [pendingImport, setPendingImport] = useState<PendingAporte[] | PendingAtivo[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const [selectedAssetTickers, setSelectedAssetTickers] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [rankingCategory, setRankingCategory] = useState<string | null>(null);
  const [rankingFilter, setRankingFilter] = useState<'todos' | 'domestico' | 'internacional'>('todos');
  const [searchMarket, setSearchMarket] = useState('');

  const carregarTransacoes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchTransacoesAtivos();
    if (data && !error) setTxs(data);
    setLoading(false);
  }, []);

  const carregarDividendos = useCallback(async () => {
    const { data, error } = await fetchDividendos();
    if (data && !error) setDividendos(data);
  }, []);

  useEffect(() => { carregarTransacoes(); carregarDividendos(); }, [carregarTransacoes, carregarDividendos]);

  const uniqueTickers = useMemo(() => {
    const s = new Set(txs.map(t => t.ticker.toUpperCase()));
    return [...s];
  }, [txs]);

  const { data: quotes = [] } = useQuotes(uniqueTickers, uniqueTickers.length > 0);

  const dividendosPorTicker = useMemo(() => {
    const map: Record<string, number> = {};
    dividendos.forEach(d => {
      const key = d.ticker.toUpperCase();
      map[key] = (map[key] || 0) + d.valor;
    });
    return map;
  }, [dividendos]);

  const totalDividendos = useMemo(() => dividendos.reduce((s, d) => s + d.valor, 0), [dividendos]);

  const posicoes = useMemo(() => {
    const map: Record<string, { ticker: string; qtd: number; custoTotal: number; qtdCompra: number; qtdVenda: number; categoria?: string; subcategoria?: string; indice?: string; percentual_indexacao?: number; data_vencimento?: string }> = {};
    txs.forEach(t => {
      if (!map[t.ticker]) map[t.ticker] = { ticker: t.ticker, qtd: 0, custoTotal: 0, qtdCompra: 0, qtdVenda: 0, categoria: t.categoria, subcategoria: t.subcategoria, indice: t.indice, percentual_indexacao: t.percentual_indexacao, data_vencimento: t.data_vencimento };
      const vol = t.quantidade * t.preco_unitario;
      if (t.tipo === 'compra') { map[t.ticker].qtd += t.quantidade; map[t.ticker].custoTotal += vol; map[t.ticker].qtdCompra += t.quantidade; }
      else { map[t.ticker].qtd -= t.quantidade; map[t.ticker].custoTotal -= vol; map[t.ticker].qtdVenda += t.quantidade; }
    });
    return Object.values(map).filter(p => p.qtd > 0);
  }, [txs]);

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

  const metricas = useMemo(() => calcularMetricas(posicoes, quotes, totalDividendos), [posicoes, quotes, totalDividendos]);

  const { data: marketQuotes = [], isLoading: marketLoading } = useMarketQuotesByCategory(rankingCategory);

  const allCategoriasComTickers = useMemo(() => getTodasCategoriasComTickers(), []);

  const marketRanking = useMemo(() => {
    if (!rankingCategory) return [];
    const cat = allCategoriasComTickers.find(c => c.categoria.id === rankingCategory);
    if (!cat) return [];
    return calcularMarketRanking(cat.tickers, marketQuotes)
      .filter(r => !searchMarket || r.ticker.includes(searchMarket.toUpperCase()) || r.nome.toUpperCase().includes(searchMarket.toUpperCase()))
      .sort((a, b) => b.changePercent - a.changePercent);
  }, [rankingCategory, allCategoriasComTickers, marketQuotes, searchMarket]);

  const openAdd = () => {
    setEditId(null); setFTicker(''); setFTipo('compra');
    setFQtd(''); setFPreco(''); setFData(new Date().toISOString().split('T')[0]);
    setFCategoria(''); setFSubcategoria('');
    setFIndice(''); setFPercentual(''); setFVencimento('');
    setSugestoes([]); setFContaDestino(''); setModalOpen(true);
  };

  const openEdit = (tx: TransacaoAtivo) => {
    setEditId(tx.id); setFTicker(tx.ticker); setFTipo(tx.tipo);
    setFQtd(String(tx.quantidade)); setFPreco(String(tx.preco_unitario));
    setFData(tx.data_transacao);
    setFCategoria(tx.categoria || '');
    setFSubcategoria(tx.subcategoria || '');
    setFIndice(tx.indice || '');
    setFPercentual(tx.percentual_indexacao != null ? String(tx.percentual_indexacao) : '');
    setFVencimento(tx.data_vencimento || '');
    setSugestoes([]); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditId(null); setSugestoes([]); };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: t('web_invest_tab_overview'), icon: <PieChart size={15} /> },
    { key: 'carteira', label: t('web_invest_tab_portfolio'), icon: <Wallet size={15} /> },
    { key: 'ranking', label: t('web_invest_tab_ranking'), icon: <Award size={15} /> },
    { key: 'operacoes', label: t('web_invest_tab_ops'), icon: <BarChart3 size={15} /> },
  ];

  const inputStyle: React.CSSProperties = {
    background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
    borderRadius: '10px', padding: '10px 14px', color: CLEAN_TEXT,
    fontSize: '0.88rem', width: '100%', outline: 'none',
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: CLEAN_BG, minHeight: '100vh' }}>
        <p style={{ color: CLEAN_TEXT_SECONDARY }}>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div style={{ background: CLEAN_BG, minHeight: '100vh', padding: '0 0 60px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ padding: '24px 0 8px' }}>
          <Logo variant="full" size="md" />
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px', color: CLEAN_TEXT }}>{t('web_invest_title')}</h2>
            <p style={{ margin: '4px 0 0', color: CLEAN_TEXT_SECONDARY, fontSize: '0.95rem' }}>
              {t('web_invest_subtitle')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setImportTypeOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
              background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
              borderRadius: '12px', color: CLEAN_TEXT_SECONDARY, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}>
              <Upload size={16} /> Importar planilha
            </button>
            <button onClick={() => setDividendoModal(true)} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
              background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
              borderRadius: '12px', color: CLEAN_TEXT_SECONDARY, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}>
              <DollarSign size={16} /> {t('web_invest_dividend_btn')}
            </button>
            <button onClick={openAdd} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
              background: ACCENT_BLUE, border: 'none',
              borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
            }}>
              <Plus size={16} /> {t('web_invest_register_op')}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', gap: '4px', background: CLEAN_CARD, borderRadius: '14px', padding: '4px', border: `1px solid ${CLEAN_BORDER}` }}>
          {tabs.map(tabItem => (
            <button key={tabItem.key} onClick={() => setTab(tabItem.key)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: tab === tabItem.key ? ACCENT_BLUE : 'transparent',
              color: tab === tabItem.key ? '#fff' : CLEAN_TEXT_SECONDARY,
            }}>
              {tabItem.icon}
              {tabItem.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: t('web_invest_overview_total_invested'), value: formatCurrency(metricas.totalInvestido, moedaBase), icon: <BarChart3 size={18} />, color: ACCENT_BLUE },
                { label: t('web_invest_overview_current_value'), value: formatCurrency(metricas.totalAtual, moedaBase), icon: <TrendingUpIcon size={18} />, color: ACCENT_GREEN },
                { label: t('web_invest_overview_return'), value: `${metricas.rentabilidadePercent >= 0 ? '+' : ''}${metricas.rentabilidadePercent.toFixed(2)}%`, icon: <Target size={18} />, color: metricas.rentabilidadePercent >= 0 ? ACCENT_GREEN : ACCENT_RED },
                { label: t('web_invest_overview_dividends_total'), value: formatCurrency(metricas.totalDividendos, moedaBase), icon: <DollarSign size={18} />, color: ACCENT_CYAN },
                { label: t('web_invest_overview_assets_count'), value: String(metricas.quantidadeAtivos), icon: <Globe size={18} />, color: '#F59E0B' },
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

            <div style={{ marginBottom: '28px', background: CLEAN_CARD, borderRadius: '16px', padding: '20px', border: `1px solid ${CLEAN_BORDER}` }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: CLEAN_TEXT, margin: '0 0 16px' }}>{t('web_invest_overview_distribution')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {Object.entries(posicoesPorCategoria).map(([catId, subs]) => {
                  const catInfo = getCategoriaInfo(catId);
                  const total = Object.values(subs).flat().reduce((s, p) => s + p.custoTotal, 0);
                  const percent = metricas.totalInvestido > 0 ? (total / metricas.totalInvestido) * 100 : 0;
                  return (
                    <div key={catId} style={{
                      padding: '16px', background: '#F8FAFC', borderRadius: '12px',
                      border: `1px solid ${CLEAN_BORDER}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: catInfo?.cor || CLEAN_TEXT_MUTED }} />
                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: CLEAN_TEXT }}>{catInfo?.nome || catId}</span>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: CLEAN_TEXT }}>{formatCurrency(total, moedaBase)}</div>
                      <div style={{ fontSize: '0.78rem', color: CLEAN_TEXT_MUTED }}>{t('web_invest_overview_percent_portfolio', { percent: percent.toFixed(1) })}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: CLEAN_CARD, borderRadius: '16px', padding: '20px', border: `1px solid ${CLEAN_BORDER}` }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: CLEAN_TEXT, margin: '0 0 16px' }}>{t('web_invest_overview_latest_dividends')}</h3>
              {dividendos.length === 0 ? (
                <p style={{ color: CLEAN_TEXT_MUTED, fontSize: '0.85rem' }}>{t('web_invest_dividend_no_data')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dividendos.slice(0, 5).map(d => (
                    <div key={d.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px',
                    }}>
                      <div>
                        <span style={{ fontWeight: 700, color: ACCENT_BLUE, fontSize: '0.85rem' }}>{d.ticker}</span>
                        <span style={{ fontSize: '0.78rem', color: CLEAN_TEXT_MUTED, marginLeft: '8px' }}>{d.tipo}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: ACCENT_GREEN, fontSize: '0.85rem' }}>+ {formatCurrency(d.valor, moedaBase)}</div>
                        <div style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={10} /> {d.data_recebimento}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'carteira' && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setVizualizacao('categorias')} style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700,
                cursor: 'pointer', border: vizualizacao === 'categorias' ? 'none' : `1px solid ${CLEAN_BORDER}`,
                background: vizualizacao === 'categorias' ? ACCENT_BLUE : CLEAN_CARD,
                color: vizualizacao === 'categorias' ? '#fff' : CLEAN_TEXT_SECONDARY,
              }}>{t('web_invest_category')}</button>
              <button onClick={() => setVizualizacao('lista')} style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700,
                cursor: 'pointer', border: vizualizacao === 'lista' ? 'none' : `1px solid ${CLEAN_BORDER}`,
                background: vizualizacao === 'lista' ? ACCENT_BLUE : CLEAN_CARD,
                color: vizualizacao === 'lista' ? '#fff' : CLEAN_TEXT_SECONDARY,
              }}>Lista</button>
              <button onClick={() => {
                const allKeys = new Set<string>();
                Object.entries(posicoesPorCategoria).forEach(([catId, subs]) => {
                  allKeys.add(catId);
                  Object.keys(subs).forEach(subId => allKeys.add(`${catId}/${subId}`));
                });
                setGruposExpandidos(prev => prev.size > 0 ? new Set() : allKeys);
              }} style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${CLEAN_BORDER}`,
                background: CLEAN_CARD, color: CLEAN_TEXT_SECONDARY,
              }}>
                {gruposExpandidos.size > 0 ? t('web_invest_portfolio_collapse') : t('web_invest_portfolio_expand')}
              </button>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: CLEAN_TEXT_MUTED, fontWeight: 600, marginRight: '4px' }}>{t('web_invest_portfolio_filter')}</span>
              {CATEGORIAS_INVESTIMENTO.map(cat => (
                <button key={cat.id} onClick={() => setFiltroCategoria(filtroCategoria === cat.id ? 'todas' : cat.id)} style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700,
                  cursor: 'pointer',
                  background: filtroCategoria === cat.id ? cat.cor : 'transparent',
                  color: filtroCategoria === cat.id ? '#fff' : CLEAN_TEXT_SECONDARY,
                  border: filtroCategoria === cat.id ? 'none' : `1px solid ${CLEAN_BORDER}`,
                }}>{cat.nome}</button>
              ))}
            </div>

            {selectedAssetTickers.size > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 18px', marginBottom: '16px',
                background: 'rgba(239,68,68,0.05)', borderRadius: '12px',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <span style={{ fontSize: '0.85rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 600 }}>
                  {selectedAssetTickers.size} ativo(s) selecionado(s)
                </span>
                <button onClick={() => {
                  if (selectedAssetTickers.size === 0) return;
                  const total = selectedAssetTickers.size;
                  setDeleteConfirm({
                    title: 'Excluir Ativos',
                    message: `Excluir permanentemente TODOS os lotes de ${total} ativo(s)?`,
                    onConfirm: async () => {
                      let erros = 0;
                      for (const ticker of selectedAssetTickers) {
                        const txsToDelete = txs.filter(t => t.ticker.toUpperCase() === ticker);
                        for (const tx of txsToDelete) {
                          if (!tx.id.startsWith('local-')) {
                            const { error } = await deleteTransacaoAtivo(tx.id);
                            if (error) erros++;
                          }
                        }
                      }
                      setSelectedAssetTickers(new Set());
                      await carregarTransacoes();
                      if (erros > 0) toast.error(`Falha ao excluir ${erros} lote(s).`);
                      else toast.success(`${total} ativo(s) excluído(s)!`);
                    },
                  });
                }} style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                  color: ACCENT_RED, fontWeight: 700, fontSize: '0.8rem',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <Trash2 size={14} /> {t('web_invest_bulk_delete_assets')} ({selectedAssetTickers.size})
                </button>
                <button onClick={() => setSelectedAssetTickers(new Set())} style={{
                  background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
                  borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
                  color: CLEAN_TEXT_SECONDARY, fontSize: '0.8rem',
                }}>{t('web_invest_cancel')}</button>
              </div>
            )}

            {posicoes.length === 0 && (
              <div style={{ padding: '64px 24px', textAlign: 'center', color: CLEAN_TEXT_MUTED }}>
                <Wallet size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '0.95rem' }}>{t('web_invest_portfolio_no_assets')}</p>
              </div>
            )}

            {posicoes.length > 0 && vizualizacao === 'categorias' && (
              <div style={{ marginBottom: '28px' }}>
                {Object.entries(posicoesPorCategoria).filter(([catId]) => filtroCategoria === 'todas' || catId === filtroCategoria).map(([catId, subs]) => {
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
                      <button
                        onClick={() => {
                          const next = new Set(gruposExpandidos);
                          if (next.has(catId)) next.delete(catId); else next.add(catId);
                          setGruposExpandidos(next);
                        }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '14px 18px', background: 'transparent', border: 'none',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        {catExpanded ? <ChevronDown size={16} color={CLEAN_TEXT_MUTED} /> : <ChevronRight size={16} color={CLEAN_TEXT_MUTED} />}
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: catInfo?.cor || CLEAN_TEXT_MUTED, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, color: CLEAN_TEXT, fontSize: '0.9rem' }}>{catInfo?.nome || catId}</span>
                          <span style={{ fontSize: '0.75rem', color: CLEAN_TEXT_MUTED, marginLeft: '8px' }}>{catPosicoes.length} ativo(s)</span>
                        </div>
                        <span style={{ fontWeight: 700, color: ACCENT_BLUE, fontSize: '0.9rem' }}>{formatCurrency(catTotal, moedaBase)}</span>
                      </button>

                      {catExpanded && (
                        <div style={{ borderTop: `1px solid ${CLEAN_BORDER}` }}>
                          {Object.entries(subs).map(([subId, subPosicoes]) => {
                            const subExpanded = gruposExpandidos.has(`${catId}/${subId}`);
                            const subTotal = subPosicoes.reduce((s, p) => s + p.custoTotal, 0);
                            return (
                              <div key={subId}>
                                <button
                                  onClick={() => {
                                    const next = new Set(gruposExpandidos);
                                    const key = `${catId}/${subId}`;
                                    if (next.has(key)) next.delete(key); else next.add(key);
                                    setGruposExpandidos(next);
                                  }}
                                  style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 18px 10px 42px', background: '#F8FAFC', border: 'none',
                                    cursor: 'pointer', textAlign: 'left', borderTop: `1px solid ${CLEAN_BORDER}`,
                                  }}
                                >
                                  {subExpanded ? <ChevronDown size={13} color={CLEAN_TEXT_MUTED} /> : <ChevronRight size={13} color={CLEAN_TEXT_MUTED} />}
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 600, color: CLEAN_TEXT_SECONDARY, fontSize: '0.82rem' }}>
                                      {getNomeSubcategoria(catId, subId)}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: CLEAN_TEXT_MUTED, marginLeft: '6px' }}>{subPosicoes.length}</span>
                                  </div>
                                  <span style={{ fontWeight: 600, color: CLEAN_TEXT_SECONDARY, fontSize: '0.82rem' }}>
                                    {formatCurrency(subTotal, moedaBase)}
                                  </span>
                                </button>

                                {subExpanded && subPosicoes.map(p => {
                                  const q = quotes.find(q => q.symbol.toUpperCase() === p.ticker.toUpperCase());
                                  const currentVal = q ? q.regularMarketPrice * p.qtd : null;
                                  const ret = (currentVal && p.custoTotal > 0) ? ((currentVal - p.custoTotal) / p.custoTotal) * 100 : null;
                                  const isSelected = selectedAssetTickers.has(p.ticker.toUpperCase());
                                  return (
                                    <div key={p.ticker} style={{
                                      display: 'flex', alignItems: 'center', gap: '10px',
                                      padding: '8px 18px 8px 60px', borderTop: `1px solid ${CLEAN_BORDER}`,
                                      cursor: 'pointer', transition: 'background 0.12s',
                                      background: isSelected ? 'rgba(16,69,161,0.04)' : 'transparent',
                                    }}
                                      onClick={() => setDetailTicker(p.ticker)}
                                      onMouseEnter={e => e.currentTarget.style.background = isSelected ? 'rgba(16,69,161,0.04)' : '#F8FAFC'}
                                      onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(16,69,161,0.04)' : 'transparent'}
                                    >
                                      <div onClick={e => { e.stopPropagation(); setSelectedAssetTickers(prev => { const n = new Set(prev); n.has(p.ticker.toUpperCase()) ? n.delete(p.ticker.toUpperCase()) : n.add(p.ticker.toUpperCase()); return n; }); }} style={{
                                        width: '18px', height: '18px', borderRadius: '4px',
                                        border: isSelected ? 'none' : `2px solid ${CLEAN_TEXT_MUTED}`,
                                        background: isSelected ? ACCENT_BLUE : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', flexShrink: 0,
                                      }}>
                                        {isSelected && <Check size={10} color="#fff" />}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: ACCENT_BLUE }}>{p.ticker}</div>
                                        <div style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED }}>{q?.longName || getTickerName(p.ticker) || p.ticker}</div>
                                        {p.indice && (
                                          <div style={{
                                            fontSize: '0.66rem', fontWeight: 700, marginTop: '2px',
                                            color: ACCENT_BLUE, background: 'rgba(16,69,161,0.08)',
                                            display: 'inline-block', padding: '1px 7px', borderRadius: '9px',
                                          }}>
                                            {formatIndexacao(p.indice, p.percentual_indexacao, p.data_vencimento)}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: CLEAN_TEXT }}>{formatQtd(p.qtd)}</div>
                                        <div style={{ fontSize: '0.72rem', color: ACCENT_GREEN }}>PM {formatCurrency(p.custoTotal / p.qtd, moedaBase)}</div>
                                      </div>
                                      <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                        {currentVal !== null && (
                                          <>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: CLEAN_TEXT }}>
                                              {formatCurrency(currentVal, moedaBase)}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: ret !== null && ret >= 0 ? ACCENT_GREEN : ACCENT_RED }}>
                                              {ret !== null ? `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%` : ''}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <div style={{ fontWeight: 700, color: ACCENT_BLUE, fontSize: '0.85rem', minWidth: '100px', textAlign: 'right' }}>
                                        {formatCurrency(p.custoTotal, moedaBase)}
                                      </div>
                                    </div>
                                  );
                                })}
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

            {posicoes.length > 0 && vizualizacao === 'lista' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginBottom: '28px' }}>
                {posicoes.filter(p => filtroCategoria === 'todas' || p.categoria === filtroCategoria).map(p => {
                  const q = quotes.find(q => q.symbol.toUpperCase() === p.ticker.toUpperCase());
                  const currentVal = q ? q.regularMarketPrice * p.qtd : null;
                  const ret = (currentVal && p.custoTotal > 0) ? ((currentVal - p.custoTotal) / p.custoTotal) * 100 : null;
                  const isSelected = selectedAssetTickers.has(p.ticker.toUpperCase());
                  return (
                    <div key={p.ticker} style={{
                      background: isSelected ? 'rgba(16,69,161,0.04)' : CLEAN_CARD,
                      border: `1px solid ${isSelected ? ACCENT_BLUE + '30' : CLEAN_BORDER}`,
                      borderRadius: '14px', padding: '16px', cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div onClick={e => { e.stopPropagation(); setSelectedAssetTickers(prev => { const n = new Set(prev); n.has(p.ticker.toUpperCase()) ? n.delete(p.ticker.toUpperCase()) : n.add(p.ticker.toUpperCase()); return n; }); }} style={{
                          width: '18px', height: '18px', borderRadius: '4px',
                          border: isSelected ? 'none' : `2px solid ${CLEAN_TEXT_MUTED}`,
                          background: isSelected ? ACCENT_BLUE : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0,
                        }}>
                          {isSelected && <Check size={10} color="#fff" />}
                        </div>
                        <div style={{ flex: 1 }} onClick={() => setDetailTicker(p.ticker)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: ACCENT_BLUE }}>{p.ticker}</div>
                            {ret !== null && (
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: ret >= 0 ? ACCENT_GREEN : ACCENT_RED }}>
                                {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: CLEAN_TEXT_MUTED, marginTop: '2px' }}>{q?.longName || getTickerName(p.ticker) || p.ticker}</div>
                        </div>
                      </div>
                      <div onClick={() => setDetailTicker(p.ticker)}>
                        {p.categoria && (
                          <div style={{ fontSize: '0.7rem', color: CLEAN_TEXT_MUTED, marginBottom: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getCategoriaInfo(p.categoria)?.cor || CLEAN_TEXT_MUTED }} />
                            {getNomeSubcategoria(p.categoria, p.subcategoria || '')}
                          </div>
                        )}
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: CLEAN_TEXT }}>{formatQtd(p.qtd)} cotas</div>
                        <div style={{ fontSize: '0.8rem', color: ACCENT_GREEN }}>PM {formatCurrency(p.custoTotal / p.qtd, moedaBase)}</div>
                        {currentVal !== null && (
                          <div style={{ fontSize: '0.8rem', color: CLEAN_TEXT, marginTop: '4px' }}>
                            Atual: {formatCurrency(currentVal, moedaBase)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'ranking' && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: CLEAN_TEXT_MUTED }} />
                <input
                  value={searchMarket} onChange={e => setSearchMarket(e.target.value)}
                  placeholder={t('web_invest_ranking_search')}
                  style={{ ...inputStyle, paddingLeft: '34px' }}
                />
              </div>
              <button onClick={() => setRankingFilter('todos')} style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer',
                background: rankingFilter === 'todos' ? ACCENT_BLUE : 'transparent',
                color: rankingFilter === 'todos' ? '#fff' : CLEAN_TEXT_SECONDARY,
                border: rankingFilter === 'todos' ? 'none' : `1px solid ${CLEAN_BORDER}`,
              }}>{t('web_invest_ranking_all')}</button>
              <button onClick={() => setRankingFilter('domestico')} style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer',
                background: rankingFilter === 'domestico' ? ACCENT_GREEN : 'transparent',
                color: rankingFilter === 'domestico' ? '#fff' : CLEAN_TEXT_SECONDARY,
                border: rankingFilter === 'domestico' ? 'none' : `1px solid ${CLEAN_BORDER}`,
              }}>{t('web_invest_ranking_domestic')}</button>
              <button onClick={() => setRankingFilter('internacional')} style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer',
                background: rankingFilter === 'internacional' ? '#8B5CF6' : 'transparent',
                color: rankingFilter === 'internacional' ? '#fff' : CLEAN_TEXT_SECONDARY,
                border: rankingFilter === 'internacional' ? 'none' : `1px solid ${CLEAN_BORDER}`,
              }}>{t('web_invest_ranking_international')}</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {allCategoriasComTickers
                .filter(({ categoria }) => {
                  const domesticas = getCategoriasDomesticas(moedaBase);
                  if (rankingFilter === 'domestico') return domesticas.includes(categoria.id);
                  if (rankingFilter === 'internacional') return !domesticas.includes(categoria.id);
                  return true;
                })
                .filter(({ tickers }) => !searchMarket || tickers.some(t =>
                  t.ticker.includes(searchMarket.toUpperCase()) ||
                  t.nome.toUpperCase().includes(searchMarket.toUpperCase())
                ))
                .map(({ categoria: cat, tickers }) => {
                  const isSelected = rankingCategory === cat.id;
                  const isDomestica = isCategoriaDomestica(cat.id, moedaBase);
                  return (
                    <div key={cat.id} style={{
                      background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
                      borderRadius: '16px', overflow: 'hidden',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                    }}>
                      <button
                        onClick={() => setRankingCategory(isSelected ? null : cat.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '14px 18px', background: isSelected ? '#F8FAFC' : 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.cor, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: CLEAN_TEXT }}>{cat.nome}</span>
                          <span style={{ fontSize: '0.7rem', color: CLEAN_TEXT_MUTED, marginLeft: '6px' }}>
                            {tickers.length} ativos
                          </span>
                        </div>
                        {isDomestica ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff', background: ACCENT_GREEN, padding: '2px 8px', borderRadius: '10px' }}>{t('web_invest_ranking_domestic')}</span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: CLEAN_TEXT_SECONDARY, background: '#F1F5F9', padding: '2px 8px', borderRadius: '10px' }}>{t('web_invest_ranking_international')}</span>
                        )}
                        {isSelected ? <ChevronDown size={14} color={CLEAN_TEXT_MUTED} /> : <ChevronRight size={14} color={CLEAN_TEXT_MUTED} />}
                      </button>

                      {isSelected && (
                        <div style={{ borderTop: `1px solid ${CLEAN_BORDER}`, padding: '12px 14px', maxHeight: '400px', overflowY: 'auto' }}>
                          {marketLoading && (
                            <p style={{ color: CLEAN_TEXT_MUTED, fontSize: '0.78rem', textAlign: 'center', padding: '20px' }}>{t('loading')}...</p>
                          )}
                          {!marketLoading && marketRanking.length === 0 && !searchMarket && (
                            <p style={{ color: CLEAN_TEXT_MUTED, fontSize: '0.78rem', textAlign: 'center', padding: '20px' }}>{t('web_invest_ranking_no_data')}</p>
                          )}
                          {!marketLoading && marketRanking.length === 0 && searchMarket && (
                            <p style={{ color: CLEAN_TEXT_MUTED, fontSize: '0.78rem', textAlign: 'center', padding: '20px' }}>{t('web_invest_ranking_no_results')}</p>
                          )}
                          {!marketLoading && marketRanking.slice(0, 50).map((r, i) => {
                            const quote = marketQuotes.find(q => q.symbol.toUpperCase() === r.ticker.toUpperCase());
                            const changePct = r.changePercent;
                            return (
                              <div key={r.ticker} onClick={() => setDetailTicker(r.ticker)} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '7px 10px', borderRadius: '8px', cursor: 'pointer',
                                transition: 'background 0.12s', marginBottom: '2px',
                              }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: CLEAN_TEXT_MUTED, width: '22px' }}>#{i + 1}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: ACCENT_BLUE }}>{r.ticker}</div>
                                  <div style={{ fontSize: '0.68rem', color: CLEAN_TEXT_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  {r.preco > 0 && (
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: CLEAN_TEXT }}>
                                      {formatCurrency(r.preco, moedaBase)}
                                    </div>
                                  )}
                                  {quote && (
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: changePct >= 0 ? ACCENT_GREEN : ACCENT_RED }}>
                                      {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {tab === 'operacoes' && (
          <>
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
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder={t('web_invest_search')} style={{ ...inputStyle, paddingLeft: '34px' }} />
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: t('web_invest_all'), key: 'todos' as const, color: ACCENT_BLUE },
                    { label: t('web_invest_buys'), key: 'compra' as const, color: ACCENT_RED },
                    { label: t('web_invest_sells'), key: 'venda' as const, color: ACCENT_GREEN },
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
                  <Filter size={13} /> {sortDir === 'desc' ? t('web_invest_newest') : t('web_invest_oldest')}
                </button>
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '0 24px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: CLEAN_TEXT_MUTED, fontWeight: 600, marginRight: '4px' }}>{t('web_invest_category')}:</span>
                <button onClick={() => setFiltroCategoria('todas')} style={{
                  padding: '5px 12px', borderRadius: '16px', fontSize: '0.72rem', fontWeight: 700,
                  cursor: 'pointer',
                  background: filtroCategoria === 'todas' ? ACCENT_BLUE : 'transparent',
                  color: filtroCategoria === 'todas' ? '#fff' : CLEAN_TEXT_SECONDARY,
                  border: filtroCategoria === 'todas' ? 'none' : `1px solid ${CLEAN_BORDER}`,
                }}>{t('web_invest_all')}</button>
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

              {(() => {
                const filtered = txs
                  .filter(t => {
                    if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;
                    if (!t.ticker.includes(busca.toUpperCase())) return false;
                    if (filtroCategoria !== 'todas' && t.categoria !== filtroCategoria) return false;
                    return true;
                  })
                  .sort((a, b) => sortDir === 'desc' ? b.data_transacao.localeCompare(a.data_transacao) : a.data_transacao.localeCompare(b.data_transacao));

                return (
                  <>
                    {filtered.length === 0 ? (
                      <div style={{ padding: '64px 24px', textAlign: 'center', color: CLEAN_TEXT_MUTED }}>
                        <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                        <p style={{ margin: 0 }}>{t('web_invest_no_ops')}<br />Clique em "Nova Operação" para começar.</p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        {selectedIds.size > 0 && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px 16px', margin: '0 16px 12px',
                            background: 'rgba(239,68,68,0.05)', borderRadius: '12px',
                            border: '1px solid rgba(239,68,68,0.2)',
                          }}>
                            <span style={{ fontSize: '0.85rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 600 }}>
                              {selectedIds.size} selecionada(s)
                            </span>
                            <button onClick={() => {
                              if (selectedIds.size === 0) return;
                              const total = selectedIds.size;
                              setDeleteConfirm({
                                title: 'Excluir Operações',
                                message: `Excluir permanentemente ${total} operação(ões)?`,
                                onConfirm: async () => {
                                  let erros = 0;
                                  for (const id of selectedIds) {
                                    if (!id.startsWith('local-')) {
                                      const { error } = await deleteTransacaoAtivo(id);
                                      if (error) erros++;
                                    }
                                  }
                                  setTxs(prev => prev.filter(t => !selectedIds.has(t.id)));
                                  setSelectedIds(new Set());
                                  if (erros > 0) toast.error(`Falha ao excluir ${erros} operação(ões).`);
                                  else toast.success(`${total} operação(ões) excluída(s)!`);
                                },
                              });
                            }} style={{
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                              color: ACCENT_RED, fontWeight: 700, fontSize: '0.8rem',
                              display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                              <Trash2 size={14} /> Excluir ({selectedIds.size})
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} style={{
                              background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
                              borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
                              color: CLEAN_TEXT_SECONDARY, fontSize: '0.8rem',
                            }}>Cancelar</button>
                          </div>
                        )}

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: '#F8FAFC' }}>
                              <th style={{ padding: '12px 16px', width: '40px' }}>
                                <button onClick={() => {
                                  if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                                  else setSelectedIds(new Set(filtered.map(tx => tx.id)));
                                }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                  {selectedIds.size === filtered.length && filtered.length > 0 ? (
                                    <CheckSquare size={16} color={ACCENT_BLUE} />
                                  ) : (
                                    <Square size={16} color={CLEAN_TEXT_MUTED} />
                                  )}
                                </button>
                              </th>
                              {['Tipo', t('web_invest_ticker'), t('web_invest_category'), t('quantity_label'), t('unit_price_label'), 'Total', 'Data', ''].map(h => (
                                <th key={h} style={{
                                  padding: '12px 16px', textAlign: h === 'Total' || h === t('unit_price_label') ? 'right' : 'left',
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
                                  <td style={{ padding: '14px 16px', width: '40px' }}>
                                    <button onClick={() => {
                                      const next = new Set(selectedIds);
                                      if (next.has(tx.id)) next.delete(tx.id); else next.add(tx.id);
                                      setSelectedIds(next);
                                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                      {selectedIds.has(tx.id) ? <CheckSquare size={16} color={ACCENT_BLUE} /> : <Square size={16} color={CLEAN_TEXT_MUTED} />}
                                    </button>
                                  </td>
                                  <td style={{ padding: '14px 16px' }}>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                                      padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                                      background: isCompra ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                      color: isCompra ? ACCENT_RED : ACCENT_GREEN,
                                    }}>
                                      {isCompra ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                                      {isCompra ? t('web_invest_buy') : t('web_invest_sell')}
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
                                    ) : <span style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED }}>—</span>}
                                    {tx.indice && (
                                      <span style={{
                                        display: 'block', marginTop: '3px', fontSize: '0.66rem', fontWeight: 700,
                                        color: ACCENT_BLUE, background: 'rgba(16,69,161,0.08)',
                                        padding: '1px 7px', borderRadius: '9px', width: 'fit-content',
                                      }}>
                                        {formatIndexacao(tx.indice, tx.percentual_indexacao, tx.data_vencimento)}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '14px 16px', color: CLEAN_TEXT }}>{formatQtd(tx.quantidade)}</td>
                                  <td style={{ padding: '14px 16px', textAlign: 'right', color: CLEAN_TEXT }}>{formatCurrency(tx.preco_unitario, moedaBase)}</td>
                                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: isCompra ? ACCENT_RED : ACCENT_GREEN }}>
                                    {isCompra ? '-' : '+'} {formatCurrency(total, moedaBase)}
                                  </td>
                                  <td style={{ padding: '14px 16px', color: CLEAN_TEXT_MUTED, whiteSpace: 'nowrap' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={11} />{tx.data_transacao}</span>
                                  </td>
                                  <td style={{ padding: '14px 12px' }}>
                                    {rowDeleteConfirm === tx.id ? (
                                      <span style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={async () => {
                                          if (!tx.id.startsWith('local-')) await deleteTransacaoAtivo(tx.id);
                                          setTxs(prev => prev.filter(t => t.id !== tx.id));
                                          setRowDeleteConfirm(null);
                                        }} style={{
                                          background: 'rgba(239,68,68,0.15)', border: 'none',
                                          borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: ACCENT_RED,
                                        }}><Check size={12} /></button>
                                        <button onClick={() => setRowDeleteConfirm(null)} style={{
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
                                        <button onClick={() => setRowDeleteConfirm(tx.id)} style={{
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
                  </>
                );
              })()}
            </div>
          </>
        )}

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
                  {editId ? t('edit_operation') : t('web_invest_register_op')}
                </h3>
                <button onClick={closeModal} style={{
                  background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
                  borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: CLEAN_TEXT_MUTED,
                }}><X size={16} /></button>
              </div>

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('asset_ticker_label')}</label>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input value={fTicker} onChange={e => {
                  const v = e.target.value.toUpperCase();
                  setFTicker(v);
                  if (v.length >= 2) setSugestoes(searchTickers(v, 6).map(r => r.ticker));
                  else setSugestoes([]);
                  const cat = getCategoriaByTicker(v);
                  if (cat) { setFCategoria(cat.categoria); setFSubcategoria(cat.subcategoria); }
                }} placeholder="PETR4, BTC, MXRF11, SAN..." style={inputStyle} />
                {sugestoes.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '110%', left: 0, right: 0, background: CLEAN_CARD,
                    border: `1px solid ${CLEAN_BORDER}`, borderRadius: '10px', padding: '6px',
                    zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  }}>
                    {sugestoes.map(s => (
                      <button key={s} onClick={() => {
                        setFTicker(s);
                        setSugestoes([]);
                        const cat = getCategoriaByTicker(s);
                        if (cat) { setFCategoria(cat.categoria); setFSubcategoria(cat.subcategoria); }
                      }} style={{
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

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>{t('operation_type_label')}</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['compra', 'venda'] as const).map(tipo => (
                  <button key={tipo} onClick={() => setFTipo(tipo)} style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${CLEAN_BORDER}`,
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                    background: fTipo === tipo ? (tipo === 'compra' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)') : CLEAN_CARD,
                    color: fTipo === tipo ? (tipo === 'compra' ? ACCENT_RED : ACCENT_GREEN) : CLEAN_TEXT_SECONDARY,
                    transition: 'all 0.15s',
                  }}>
                    {tipo === 'compra' ? <><TrendingDown size={16} /> {t('web_invest_buy')}</> : <><TrendingUp size={16} /> {t('web_invest_sell')}</>}
                  </button>
                ))}
              </div>

              {fTipo === 'venda' && (
                <>
                  <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('web_invest_account_destination')}</label>
                  <select value={fContaDestino} onChange={e => setFContaDestino(e.target.value)} style={{ ...inputStyle, marginBottom: '16px', cursor: 'pointer' }}>
                    <option value="">{t('web_invest_select_account')}</option>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome_instituicao}</option>)}
                  </select>
                </>
              )}

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('web_invest_category')}</label>
              <select value={fCategoria} onChange={e => { setFCategoria(e.target.value); setFSubcategoria(''); }} style={{ ...inputStyle, marginBottom: '12px', cursor: 'pointer' }}>
                <option value="">Selecione a categoria...</option>
                {CATEGORIAS_INVESTIMENTO.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
              </select>

              {fCategoria && (
                <>
                  <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('web_invest_subcategory')}</label>
                  <select value={fSubcategoria} onChange={e => setFSubcategoria(e.target.value)} style={{ ...inputStyle, marginBottom: '16px', cursor: 'pointer' }}>
                    <option value="">Selecione a subcategoria...</option>
                    {getCategoriaInfo(fCategoria)?.subcategorias.map(sub => <option key={sub.id} value={sub.id}>{sub.nome} — {sub.descricao}</option>)}
                  </select>
                </>
              )}

              {fCategoria === 'renda_fixa_br' && (
                <>
                  <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('web_invest_indexacao_label')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <select value={fIndice} onChange={e => setFIndice(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">{t('web_invest_index_select')}</option>
                      {INDICES_RENDA_FIXA.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                    </select>
                    <input
                      type="number" step="0.01" min="0"
                      placeholder={fIndice === 'ipca' || fIndice === 'prefixado' ? t('web_invest_index_rate_aa') : t('web_invest_index_percent')}
                      value={fPercentual}
                      onChange={e => setFPercentual(e.target.value)}
                      style={inputStyle}
                    />
                    <input type="date" value={fVencimento} onChange={e => setFVencimento(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} />
                  </div>
                  {fIndice && formatIndexacao(fIndice, fPercentual === '' ? null : parseFloat(fPercentual.replace(',', '.')), fVencimento) && (
                    <div style={{ marginBottom: '14px', fontSize: '0.8rem', color: ACCENT_BLUE, fontWeight: 700 }}>
                      {formatIndexacao(fIndice, fPercentual === '' ? null : parseFloat(fPercentual.replace(',', '.')), fVencimento)}
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('quantity_label')}</label>
                  <input type="number" min="0" step="0.01" value={fQtd} onChange={e => setFQtd(e.target.value)} placeholder="100" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('unit_price_label')}</label>
                  <input type="number" min="0" step="0.01" value={fPreco} onChange={e => setFPreco(e.target.value)} placeholder="34.50" style={inputStyle} />
                </div>
              </div>

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('data_operacao_label')}</label>
              <input type="date" value={fData} onChange={e => setFData(e.target.value)} style={{ ...inputStyle, marginBottom: '24px' }} />

              {fQtd && fPreco && (
                <div style={{
                  marginBottom: '20px', padding: '12px 16px',
                  background: 'rgba(16,69,161,0.06)', borderRadius: '10px',
                  fontSize: '0.82rem', color: CLEAN_TEXT_SECONDARY,
                }}>
                  {t('total_prefix')} <strong style={{ color: ACCENT_BLUE }}>{formatCurrency(parseFloat(fQtd || '0') * parseFloat(fPreco || '0'), moedaBase)}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={closeModal} style={{
                  flex: 1, padding: '12px', background: 'transparent',
                  border: `1px solid ${CLEAN_BORDER}`, borderRadius: '12px',
                  cursor: 'pointer', color: CLEAN_TEXT_SECONDARY, fontWeight: 600,
                }}>{t('cancel')}</button>
                <button onClick={async () => {
                  if (!fTicker.trim()) return;
                  const qtd = parseFloat(fQtd.replace(',', '.'));
                  const preco = parseFloat(fPreco.replace(',', '.'));
                  if (isNaN(qtd) || qtd <= 0 || isNaN(preco) || preco <= 0) return;
                  if (fTipo === 'venda' && !fContaDestino) return;
                  setSaving(true);

                  if (editId) {
                    const { error } = await updateTransacaoAtivo(editId, {
                      quantidade: qtd, preco_unitario: preco, data_transacao: fData,
                      categoria: fCategoria || undefined, subcategoria: fSubcategoria || undefined,
                      indice: fIndice || undefined,
                      percentual_indexacao: fPercentual !== '' ? parseFloat(fPercentual.replace(',', '.')) : undefined,
                      data_vencimento: fVencimento || undefined,
                    });
                    if (!error) {
                      setTxs(prev => prev.map(t => t.id === editId
                        ? { ...t, ticker: fTicker.trim(), tipo: fTipo, quantidade: qtd, preco_unitario: preco, data_transacao: fData, categoria: fCategoria || undefined, subcategoria: fSubcategoria || undefined, indice: fIndice || undefined, percentual_indexacao: fPercentual !== '' ? parseFloat(fPercentual.replace(',', '.')) : undefined, data_vencimento: fVencimento || undefined }
                        : t
                      ));
                    }
                  } else {
                    const { data, error } = await createTransacaoAtivo({
                      id_usuario: id_usuario || '',
                      ticker: fTicker.trim(), tipo: fTipo, quantidade: qtd,
                      preco_unitario: preco, data_transacao: fData,
                      categoria: fCategoria || undefined, subcategoria: fSubcategoria || undefined,
                      indice: fIndice || undefined,
                      percentual_indexacao: fPercentual !== '' ? parseFloat(fPercentual.replace(',', '.')) : undefined,
                      data_vencimento: fVencimento || undefined,
                    });
                    if (data && !error) {
                      setTxs(prev => [...prev, data]);
                      if (fTipo === 'venda') {
                        const total = qtd * preco;
                        const novaTransacao: Omit<Transacao, 'id'> = {
                          id_conta: fContaDestino, tipo: 'receita', valor: total,
                          categoria: 'Investimentos', data_transacao: fData, taxa_cambio_dia: 1,
                          descricao: `Resgate ${fTicker.trim()} — ${qtd} un. × ${formatCurrency(preco, moedaBase)}`,
                          moeda_transacao: moedaBase,
                        };
                        const { data: txData, error: txError } = await createTransacao(novaTransacao);
                        if (txData && !txError) addTransacao({ ...txData, id: txData.id || `local-${Date.now()}` });
                      }
                    }
                  }
                  setSaving(false);
                  closeModal();
                }} disabled={saving || !fTicker || !fQtd || !fPreco || (fTipo === 'venda' && !fContaDestino)} style={{
                  flex: 1.5, padding: '12px', background: ACCENT_BLUE, border: 'none',
                  borderRadius: '12px', cursor: 'pointer', color: '#fff', fontWeight: 700,
                  opacity: saving ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  {saving ? <RefreshCw size={14} className="spin" /> : null}
                  {saving ? t('saving') : (editId ? t('save_changes') : t('web_invest_register_op'))}
                </button>
              </div>
            </div>
          </div>
        )}

        {dividendoModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px',
          }}>
            <div style={{
              background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
              borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: CLEAN_TEXT }}>{t('web_invest_dividend_register')}</h3>
                <button onClick={() => setDividendoModal(false)} style={{
                  background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
                  borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: CLEAN_TEXT_MUTED,
                }}><X size={16} /></button>
              </div>

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Ativo (Ticker)</label>
              <input value={fDivTicker} onChange={e => setFDivTicker(e.target.value.toUpperCase())} placeholder="PETR4, MXRF11..." style={{ ...inputStyle, marginBottom: '16px' }} />

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('web_invest_dividend_type')}</label>
              <select value={fDivTipo} onChange={e => setFDivTipo(e.target.value)} style={{ ...inputStyle, marginBottom: '16px', cursor: 'pointer' }}>
                <option value="dividendo">{t('web_invest_dividend_types_dividendo')}</option>
                <option value="juros">{t('web_invest_dividend_types_juros')}</option>
                <option value="cupom">{t('web_invest_dividend_types_cupom')}</option>
                <option value="rendimento">{t('web_invest_dividend_types_rendimento')}</option>
              </select>

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('web_invest_dividend_value')}</label>
              <input type="number" min="0" step="0.01" value={fDivValor} onChange={e => setFDivValor(e.target.value)} placeholder="150.00" style={{ ...inputStyle, marginBottom: '16px' }} />

              <label style={{ fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('web_invest_dividend_date')}</label>
              <input type="date" value={fDivData} onChange={e => setFDivData(e.target.value)} style={{ ...inputStyle, marginBottom: '24px' }} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setDividendoModal(false)} style={{
                  flex: 1, padding: '12px', background: 'transparent',
                  border: `1px solid ${CLEAN_BORDER}`, borderRadius: '12px',
                  cursor: 'pointer', color: CLEAN_TEXT_SECONDARY, fontWeight: 600,
                }}>Cancelar</button>
                <button onClick={async () => {
                  const { createDividendo } = await import('../services/supabaseService');
                  const { data, error } = await createDividendo({
                    id_usuario: id_usuario || '',
                    ticker: fDivTicker.toUpperCase(),
                    tipo: fDivTipo as any,
                    valor: parseFloat(fDivValor),
                    data_recebimento: fDivData,
                    descricao: '',
                  });
                  if (data && !error) {
                    setDividendos(prev => [...prev, data]);
                    toast.success('Provento registrado!');
                    setDividendoModal(false);
                    setFDivTicker(''); setFDivValor(''); setFDivData(new Date().toISOString().split('T')[0]);
                  } else {
                    toast.error(error || 'Erro ao registrar.');
                  }
                }} disabled={!fDivTicker || !fDivValor} style={{
                  flex: 1.5, padding: '12px', background: ACCENT_BLUE, border: 'none',
                  borderRadius: '12px', cursor: 'pointer', color: '#fff', fontWeight: 700,
                  opacity: (!fDivTicker || !fDivValor) ? 0.6 : 1,
                }}>
                  Registrar
                </button>
              </div>
            </div>
          </div>
        )}

        {detailTicker && (
          <AssetDetailModal
            ticker={detailTicker}
            txs={txs}
            quotes={quotes}
            moedaBase={moedaBase}
            dividendosTotal={dividendosPorTicker[detailTicker.toUpperCase()] || 0}
            onClose={() => setDetailTicker(null)}
            onUpdate={() => { carregarTransacoes(); carregarDividendos(); }}
          />
        )}

        {/* ── Modal de escolha do tipo de importação ── */}
        {importTypeOpen && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '16px',
          }}>
            <div style={{
              background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
              borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '520px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: CLEAN_TEXT }}>Importar planilha</h3>
                <button onClick={() => setImportTypeOpen(false)} style={{
                  background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
                  borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: CLEAN_TEXT_MUTED,
                }}><X size={16} /></button>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: CLEAN_TEXT_SECONDARY }}>
                Escolha o que deseja importar. Formatos aceitos: <strong>.xlsx, .xls, .csv, .tsv</strong>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => { setImportMode('ativos'); setImportTypeOpen(false); importFileRef.current?.click(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
                    padding: '16px', borderRadius: '14px', cursor: 'pointer',
                    background: '#F8FAFC', border: `1px solid ${CLEAN_BORDER}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: 'rgba(16,69,161,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Package size={20} color={ACCENT_BLUE} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: CLEAN_TEXT, fontSize: '0.95rem' }}>Importar Ativos</div>
                    <div style={{ fontSize: '0.78rem', color: CLEAN_TEXT_SECONDARY, marginTop: '2px' }}>
                      Posição atual: ticker, quantidade e preço médio de cada ativo.
                    </div>
                  </div>
                  <ChevronRight size={18} color={CLEAN_TEXT_MUTED} />
                </button>

                <button
                  onClick={() => { setImportMode('aportes'); setImportTypeOpen(false); importFileRef.current?.click(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
                    padding: '16px', borderRadius: '14px', cursor: 'pointer',
                    background: '#F8FAFC', border: `1px solid ${CLEAN_BORDER}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Upload size={20} color={ACCENT_GREEN} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: CLEAN_TEXT, fontSize: '0.95rem' }}>Importar Aportes</div>
                    <div style={{ fontSize: '0.78rem', color: CLEAN_TEXT_SECONDARY, marginTop: '2px' }}>
                      Histórico de compras/vendas: ticker, quantidade, preço unitário e data.
                    </div>
                  </div>
                  <ChevronRight size={18} color={CLEAN_TEXT_MUTED} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input de arquivo SEMPRE montado: precisa ficar fora do modal para o
            diálogo nativo abrir (remover do DOM ao clicar cancela o file picker). */}
        <input
          ref={importFileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.txt"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              const buffer = await file.arrayBuffer();
              const parsed = parseInvestmentFile(buffer, file.name, importMode);
              if (parsed.length === 0) {
                toast.error('Nenhum registro reconhecido. Verifique se as colunas estão nomeadas (ex: ticker, quantidade, preço).');
                return;
              }
              setPendingImport(parsed);
              setImportOpen(true);
            } catch (err) {
              console.warn('Erro ao ler planilha:', err);
              toast.error('Não foi possível ler o arquivo.');
            }
          }}
        />

        {/* ── Modal de revisão da importação ── */}
        <InvestImportReviewModal
          isOpen={importOpen}
          mode={importMode}
          rows={pendingImport}
          isLoading={importSaving}
          onClose={() => { setImportOpen(false); setPendingImport([]); }}
          onConfirm={async (rows) => {
            setImportSaving(true);
            try {
              const txs: Omit<TransacaoAtivo, 'id'>[] = rows.map((r: any) => {
                const base = {
                  id_usuario: id_usuario || '',
                  ticker: r.ticker,
                  data_transacao: r.dataTransacao,
                  categoria: r.categoria || undefined,
                  subcategoria: r.subcategoria || undefined,
                  indice: r.indice || undefined,
                  percentual_indexacao: r.percentual_indexacao ?? undefined,
                  data_vencimento: r.data_vencimento || undefined,
                };
                if (importMode === 'aportes') {
                  return {
                    ...base,
                    tipo: r.tipo,
                    quantidade: r.quantidade,
                    preco_unitario: r.precoUnitario,
                  };
                }
                return {
                  ...base,
                  tipo: 'compra',
                  quantidade: r.quantidade,
                  preco_unitario: r.precoMedio,
                  data_transacao: r.dataTransacao || new Date().toISOString().split('T')[0],
                };
              });
              const { error } = await createTransacoesAtivosBulk(txs);
              if (error) {
                toast.error(error);
              } else {
                toast.success(`Importação concluída: ${txs.length} registro(s).`);
                setImportOpen(false);
                setPendingImport([]);
                await carregarTransacoes();
              }
            } finally {
              setImportSaving(false);
            }
          }}
        />

      {deleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title={deleteConfirm.title}
          message={deleteConfirm.message}
          onConfirm={() => { deleteConfirm.onConfirm(); setDeleteConfirm(null); }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      </div>
    </div>
  );
};
