import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { useI18n } from '../i18n';
import { formatCurrency, convertCurrency } from '../utils/currency';
import type { Transacao, Conta } from '../store/useStore';
import { fetchTransacoesAtivos } from '../services/supabaseService';
import type { TransacaoAtivo } from '../services/supabaseService';
import { useQuotes } from '../hooks/useInvestments';
import { RecurringExpensesModal } from './RecurringExpensesModal';
import { AdBanner } from './AdBanner';

interface AnaliseGastosProps {
  transacoes: Transacao[];
  contas: Conta[];
  moedaBase: string;
  rates: Record<string, number>;
  onEditTx?: (tx: Transacao) => void;
  onDeleteTx?: (txId: string) => void;
}

const COLORS = [
  '#1045A1', '#FFB800', '#10B981', '#EF4444', '#8B5CF6',
  '#F59E0B', '#EC4899', '#06B6D4', '#84CC16', '#F97316',
  '#6366F1', '#14B8A6', '#E11D48', '#A855F7', '#22D3EE',
];

type PeriodType = 'month' | 'week' | 'year';
type TipoFilter = 'despesa' | 'receita' | 'todas';

export const AnaliseGastos = ({ transacoes, contas, moedaBase, rates, onEditTx, onDeleteTx }: AnaliseGastosProps) => {
  const { t } = useI18n();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('despesa');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [drillDown, setDrillDown] = useState<string | null>(null);

  // ─── Ativos (lista opcional) ────────────────────────────────────────────────
  const [showAtivos, setShowAtivos] = useState(false);
  const [ativosTxs, setAtivosTxs] = useState<TransacaoAtivo[]>([]);
  const [ativosLoading, setAtivosLoading] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);

  useEffect(() => {
    if (!showAtivos) return;
    let cancelled = false;
    (async () => {
      setAtivosLoading(true);
      const { data } = await fetchTransacoesAtivos();
      if (!cancelled) {
        setAtivosTxs(data || []);
        setAtivosLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showAtivos]);

  const ativosPosicoes = useMemo(() => {
    const map: Record<string, { ticker: string; qtd: number; custoTotal: number; categoria: string; subcategoria: string }> = {};
    ativosTxs.forEach((t) => {
      const vol = t.quantidade * t.preco_unitario;
      if (!map[t.ticker]) {
        map[t.ticker] = { ticker: t.ticker, qtd: 0, custoTotal: 0, categoria: t.categoria || 'Outros', subcategoria: t.subcategoria || '' };
      }
      if (t.tipo === 'compra') {
        map[t.ticker].qtd += t.quantidade;
        map[t.ticker].custoTotal += vol;
      } else {
        map[t.ticker].qtd -= t.quantidade;
        map[t.ticker].custoTotal -= vol;
      }
    });
    return Object.values(map).filter(p => Math.abs(p.qtd) > 0.0001);
  }, [ativosTxs]);

  const ativosTickers = useMemo(() => ativosPosicoes.map(p => p.ticker), [ativosPosicoes]);
  const { data: ativosQuotes = [] } = useQuotes(ativosTickers, showAtivos && ativosTickers.length > 0);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (periodType === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { start, end };
    }
    if (periodType === 'week') {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
    }
    const y = now.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }, [periodType, selectedMonth]);

  const converterValor = (t: Transacao) => {
    const conta = contas.find(c => c.id === t.id_conta);
    const moedaTx = conta?.moeda_conta || moedaBase;
    return convertCurrency(t.valor, moedaTx, moedaBase, rates);
  };

  const filteredTransactions = useMemo(() => {
    return transacoes.filter((t) => {
      if (tipoFilter !== 'todas' && t.tipo !== tipoFilter) return false;
      if (t.categoria === 'Transferência') return false;
      const d = t.data_transacao;
      if (!d) return false;
      const dateStr = d.includes('/') ? `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}` : d;
      return dateStr >= dateRange.start && dateStr <= dateRange.end;
    });
  }, [transacoes, dateRange, tipoFilter]);

  const totalDespesas = useMemo(
    () => filteredTransactions.reduce((acc, t) => acc + converterValor(t), 0),
    [filteredTransactions, contas, moedaBase, rates]
  );

  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      map[t.categoria] = (map[t.categoria] || 0) + converterValor(t);
    });
    return Object.entries(map)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [filteredTransactions, totalDespesas, contas, moedaBase, rates]);

  const sharedExpenses = useMemo(() => {
    return filteredTransactions.filter((t) => {
      const isComp = (t as any).is_compartilhada;
      return Boolean(isComp) && String(isComp).toLowerCase() !== 'false' && String(isComp) !== '0';
    });
  }, [filteredTransactions]);

  const totalCompartilhado = useMemo(
    () => sharedExpenses.reduce((acc, t) => acc + converterValor(t), 0),
    [sharedExpenses, contas, moedaBase, rates]
  );

  const categoriaDrillDown = useMemo(() => {
    if (!drillDown) return [];
    return filteredTransactions
      .filter((t) => t.categoria === drillDown)
      .sort((a, b) => converterValor(b) - converterValor(a));
  }, [filteredTransactions, drillDown, contas, moedaBase, rates]);

  const chartData = useMemo(
    () => porCategoria.map((c) => ({ name: c.categoria, value: c.valor })),
    [porCategoria]
  );

  const obterNomeMes = (mesRef: string) => {
    const meses = [
      t('month_january'), t('month_february'), t('month_march'), t('month_april'),
      t('month_may'), t('month_june'), t('month_july'), t('month_august'),
      t('month_september'), t('month_october'), t('month_november'), t('month_december'),
    ];
    const partes = mesRef.split('-');
    if (partes.length === 2) {
      const index = parseInt(partes[1], 10) - 1;
      return `${meses[index]} / ${partes[0]}`;
    }
    return mesRef;
  };

  const getPeriodLabel = () => {
    if (periodType === 'month') return obterNomeMes(selectedMonth);
    if (periodType === 'week') return t('web_analise_this_week');
    return `${new Date().getFullYear()}`;
  };

  const navigateMonth = (dir: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const tipoLabel = tipoFilter === 'despesa' ? t('web_dashboard_despesas') : tipoFilter === 'receita' ? t('web_dashboard_receitas') : t('web_import_group_all');
  const tipoColor = tipoFilter === 'receita' ? 'var(--accent-green, #10B981)' : 'var(--negative, #EF4444)';

  const shareReport = async () => {
    let text = `📊 *${t('web_analise_title')}*\n`;
    text += `📅 ${getPeriodLabel()}\n`;
    text += `💰 ${tipoLabel}: ${formatCurrency(totalDespesas, moedaBase)}\n\n`;
    text += `*${t('web_analise_by_category')}*\n`;
    porCategoria.forEach((c) => {
      text += `• ${c.categoria}: ${formatCurrency(c.valor, moedaBase)} (${c.percentual.toFixed(1)}%)\n`;
    });
    text += `\n${t('web_analise_auto_generated')}`;
    try {
      await navigator.clipboard.writeText(text);
      alert(t('web_analise_copied'));
    } catch {
      alert(text);
    }
  };

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <AdBanner adSlot="analise_gastos_topo" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
            📊 {t('web_analise_title')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            {getPeriodLabel()}
          </p>
        </div>
        <button
          onClick={shareReport}
          style={{
            padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--accent-blue)',
            background: 'transparent', color: 'var(--accent-blue)', fontWeight: 600,
            fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          📋 {t('web_analise_share_report')}
        </button>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['month', 'week', 'year'] as PeriodType[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodType(p)}
            style={{
              flex: 1, padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
              background: periodType === p ? 'var(--accent-blue)' : 'var(--bg-secondary, #f1f5f9)',
              color: periodType === p ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {p === 'month' ? t('web_analise_monthly') : p === 'week' ? t('web_analise_weekly') : t('web_analise_yearly')}
          </button>
        ))}
      </div>

      {/* Month Navigation */}
      {periodType === 'month' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
          <button onClick={() => navigateMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--accent-blue)' }}>◀</button>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{obterNomeMes(selectedMonth)}</span>
          <button onClick={() => navigateMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--accent-blue)' }}>▶</button>
        </div>
      )}

      {/* Toggle Ativos */}
      <button
        onClick={() => setShowAtivos(s => !s)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px',
          border: '1px solid var(--accent-blue)', background: showAtivos ? 'var(--accent-blue)' : 'transparent',
          color: showAtivos ? '#fff' : 'var(--accent-blue)', fontWeight: 700, fontSize: '0.85rem',
          cursor: 'pointer', marginBottom: '24px', transition: 'all 0.2s',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>show_chart</span>
        {showAtivos ? t('web_analise_hide_assets') : t('web_analise_show_assets')}
      </button>

      {/* Lançamentos Recorrentes */}
      <button
        onClick={() => setShowRecurring(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px',
          border: '1px solid var(--accent-cyan)', background: 'transparent',
          color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem',
          cursor: 'pointer', marginBottom: '24px', marginLeft: '12px', transition: 'all 0.2s',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>repeat</span>
        {t('web_recurring_title') || 'Lançamentos Recorrentes'}
      </button>

      {/* Total Card */}
      <div style={{
        background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '24px',
        border: '1px solid var(--border-color, #e2e8f0)', textAlign: 'center', marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
          {tipoLabel}
        </p>
        <p style={{ fontSize: '2rem', fontWeight: 900, color: tipoColor, margin: '8px 0 4px 0' }}>
          {formatCurrency(totalDespesas, moedaBase)}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
          {filteredTransactions.length} {t('web_analise_transactions')}
        </p>
      </div>

      {/* Type Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {([
          { key: 'despesa' as const, label: t('web_dashboard_despesas') },
          { key: 'receita' as const, label: t('web_dashboard_receitas') },
          { key: 'todas' as const, label: t('web_import_group_all') },
        ]).map(opt => (
          <button
            key={opt.key}
            onClick={() => { setTipoFilter(opt.key); setDrillDown(null); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
              background: tipoFilter === opt.key ? (opt.key === 'receita' ? 'var(--accent-green, #10B981)' : opt.key === 'despesa' ? 'var(--negative, #EF4444)' : 'var(--accent-blue)') : 'var(--bg-secondary, #f1f5f9)',
              color: tipoFilter === opt.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Bar Chart */}
        <div style={{
          background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '24px',
          border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('web_analise_by_category')}
          </h3>
          {chartData.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
              {t('web_dashboard_register_expenses')}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e2e8f0)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(v) => formatCurrency(v, moedaBase)} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <RechartsTooltip
                  formatter={(value: any) => formatCurrency(Number(value), moedaBase)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.85rem' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div style={{
          background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '24px',
          border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('web_dashboard_expense_division')}
          </h3>
          {chartData.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
              {t('web_dashboard_register_expenses')}
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value), moedaBase)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {porCategoria.slice(0, 8).map((c, i) => (
                  <div key={c.categoria} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{c.categoria}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.percentual.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Detail List */}
      <div style={{
        background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '24px',
        border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {t('web_analise_category_detail')}
        </h3>
        {porCategoria.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
            {t('web_dashboard_register_expenses')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {porCategoria.map((cat, idx) => (
              <div key={cat.categoria}>
                <button
                  onClick={() => setDrillDown(drillDown === cat.categoria ? null : cat.categoria)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                    padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: drillDown === cat.categoria ? 'var(--bg-secondary, #f1f5f9)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {cat.categoria}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {formatCurrency(cat.valor, moedaBase)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '45px', textAlign: 'right' }}>
                    {cat.percentual.toFixed(1)}%
                  </span>
                  <span style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: drillDown === cat.categoria ? 'rotate(90deg)' : 'none' }}>›</span>
                </button>

                {/* Bar */}
                <div style={{ height: 6, background: 'var(--border-color, #e2e8f0)', borderRadius: 3, margin: '0 12px 4px 32px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${cat.percentual}%`, background: COLORS[idx % COLORS.length], borderRadius: 3, minWidth: 4 }} />
                </div>

                {/* Drill Down */}
                {drillDown === cat.categoria && (
                  <div style={{ marginLeft: '32px', marginTop: '8px', borderLeft: '2px solid var(--border-color, #e2e8f0)', paddingLeft: '12px' }}>
                    {categoriaDrillDown.slice(0, 15).map((tx) => (
                      <div key={tx.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', gap: '12px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                        <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)' }} title={tx.descricao || tx.categoria}>
                          {tx.descricao || tx.categoria}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tx.data_transacao}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: tx.tipo === 'receita' ? 'var(--accent-green, #10B981)' : 'var(--negative, #EF4444)' }}>
                          {tx.tipo === 'receita' ? '+' : '-'}{formatCurrency(converterValor(tx), moedaBase)}
                        </span>
                        {(onEditTx || onDeleteTx) && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {onEditTx && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onEditTx(tx); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--accent-blue)', padding: '2px 4px' }}
                                title={t('edit')}
                              >
                                ✏️
                              </button>
                            )}
                            {onDeleteTx && (
                              <button
                                onClick={(e) => { e.stopPropagation(); if (confirm(t('web_analise_confirm_delete'))) onDeleteTx(tx.id); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--color-danger)', padding: '2px 4px' }}
                                title={t('delete')}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {categoriaDrillDown.length > 15 && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '8px 0' }}>
                        +{categoriaDrillDown.length - 15} {t('web_analise_more_items')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assets List (optional) */}
      {showAtivos && (
        <div style={{
          background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '24px',
          border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📈 {t('web_analise_assets_title')}
          </h3>
          {ativosLoading ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>
              {t('web_analise_loading_assets')}
            </p>
          ) : ativosPosicoes.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>
              {t('web_analise_no_assets')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                <span style={{ flex: 1 }}>{t('web_analise_asset_ticker')}</span>
                <span style={{ width: 80, textAlign: 'right' }}>{t('web_analise_asset_qty')}</span>
                <span style={{ width: 100, textAlign: 'right' }}>{t('web_analise_asset_avg')}</span>
                <span style={{ width: 110, textAlign: 'right' }}>{t('web_analise_asset_total')}</span>
                <span style={{ width: 90, textAlign: 'right' }}>{t('web_analise_asset_ret')}</span>
              </div>
              {ativosPosicoes.map((p) => {
                const q = ativosQuotes.find(qu => qu.symbol.toUpperCase() === p.ticker.toUpperCase());
                const precoAtual = q?.regularMarketPrice || (p.qtd > 0 ? p.custoTotal / p.qtd : 0);
                const totalAtual = precoAtual * p.qtd;
                const ret = p.custoTotal > 0 ? ((totalAtual - p.custoTotal) / p.custoTotal) * 100 : 0;
                const pm = p.qtd > 0 ? p.custoTotal / p.qtd : 0;
                return (
                  <div key={p.ticker} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-secondary, #f1f5f9)' }}>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }} title={p.categoria}>
                      {p.ticker}
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {p.categoria}{p.subcategoria ? ` · ${p.subcategoria}` : ''}
                      </span>
                    </span>
                    <span style={{ width: 80, textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.qtd.toFixed(2)}</span>
                    <span style={{ width: 100, textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatCurrency(pm, moedaBase)}</span>
                    <span style={{ width: 110, textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(p.custoTotal, moedaBase)}</span>
                    <span style={{ width: 90, textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: ret >= 0 ? 'var(--accent-green, #10B981)' : 'var(--negative, #EF4444)' }}>
                      {ret.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Shared Expenses */}
      {totalCompartilhado > 0 && (
        <div style={{
          background: 'var(--card-bg, #fff)', borderRadius: '16px', padding: '24px',
          border: '1px solid var(--accent-blue, #1045A1)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-blue)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🤝 {t('web_dashboard_shared_only')} — {t('web_analise_shared_expenses')}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{t('web_analise_total_shared')}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                {formatCurrency(totalCompartilhado, moedaBase)}
              </p>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--border-color, #e2e8f0)' }} />
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{t('web_analise_each_share')}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-blue)', margin: '4px 0 0 0' }}>
                {formatCurrency(totalCompartilhado / 2, moedaBase)}
              </p>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--border-color, #e2e8f0)' }} />
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{t('web_analise_items')}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                {sharedExpenses.length}
              </p>
            </div>
          </div>
        </div>
      )}

      <AdBanner adSlot="analise_gastos_rodape" />

      <RecurringExpensesModal
        isOpen={showRecurring}
        onClose={() => setShowRecurring(false)}
      />
    </div>
  );
};
