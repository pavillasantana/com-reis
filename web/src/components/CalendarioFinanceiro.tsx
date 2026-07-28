import React, { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CalendarDays, X
} from 'lucide-react';
import type { Transacao, Conta } from '../store/useStore';
import { Card } from './Card';
import { formatCurrency, convertCurrency } from '../utils/currency';
import { useI18n } from '../i18n';

interface Props {
  transacoes: Transacao[];
  contas: Conta[];
  moedaBase: string;
  rates: Record<string, number>;
}

const normalizeDate = (d: string): string => {
  if (!d) return '';
  if (d.includes('/')) {
    return `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}`;
  }
  return d;
};

export const CalendarioFinanceiro: React.FC<Props> = ({ transacoes, contas, moedaBase, rates }) => {
  const { t } = useI18n();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const meses = useMemo(() => [
    t('month_january'), t('month_february'), t('month_march'), t('month_april'),
    t('month_may'), t('month_june'), t('month_july'), t('month_august'),
    t('month_september'), t('month_october'), t('month_november'), t('month_december'),
  ], [t]);

  const diasSemana = useMemo(() => [
    t('web_calendar_sun'), t('web_calendar_mon'), t('web_calendar_tue'),
    t('web_calendar_wed'), t('web_calendar_thu'), t('web_calendar_fri'),
    t('web_calendar_sat'),
  ], [t]);

  const converterValor = (tx: Transacao) => {
    const conta = contas.find(c => c.id === tx.id_conta);
    const moedaTx = conta?.moeda_conta || moedaBase;
    return convertCurrency(tx.valor, moedaTx, moedaBase, rates);
  };

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const diaSemanaInicio = primeiroDia.getDay();

  const mesStr = `${ano}-${String(mes + 1).padStart(2, '0')}`;

  const txsDoMes = useMemo(() =>
    transacoes.filter(t => {
      if (t.categoria === 'Transferência') return false;
      const nd = normalizeDate(t.data_transacao);
      return nd.startsWith(mesStr);
    }),
    [transacoes, mesStr]
  );

  const txsPorDia = useMemo(() => {
    const map: Record<string, Transacao[]> = {};
    txsDoMes.forEach(t => {
      const nd = normalizeDate(t.data_transacao);
      const dia = nd.split('-')[2];
      if (!map[dia]) map[dia] = [];
      map[dia].push(t);
    });
    return map;
  }, [txsDoMes]);

  const totalReceitas = txsDoMes.filter(t => t.tipo === 'receita').reduce((s, t) => s + converterValor(t), 0);
  const totalDespesas = txsDoMes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + converterValor(t), 0);

  const selectedDayTxs = useMemo(() => {
    if (selectedDay === null) return [];
    const dia = String(selectedDay).padStart(2, '0');
    return txsPorDia[dia] || [];
  }, [selectedDay, txsPorDia]);

  const selectedDayTotal = useMemo(
    () => selectedDayTxs.reduce((s, t) => s + (t.tipo === 'despesa' ? -converterValor(t) : converterValor(t)), 0),
    [selectedDayTxs, contas, moedaBase, rates]
  );

  const navegar = (dir: number) => {
    setSelectedDay(null);
    const novaData = new Date(ano, mes + dir, 1);
    setAno(novaData.getFullYear());
    setMes(novaData.getMonth());
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px'}}>
          <CalendarDays size={24} style={{ verticalAlign: 'middle', marginRight: '12px' }} />
          {t('web_calendar_title')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>
          {t('web_calendar_subtitle')}
        </p>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={() => navegar(-1)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={20} />
          </button>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{meses[mes]} {ano}</h3>
          <button onClick={() => navegar(1)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--card-border)', padding: '12px 16px', borderRadius: '12px' }}>
            <TrendingUp size={18} color="var(--accent-green)" />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('revenues')}</span>
              <strong style={{ color: 'var(--accent-green)' }}>{formatCurrency(totalReceitas, moedaBase)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--card-border)', padding: '12px 16px', borderRadius: '12px' }}>
            <TrendingDown size={18} color="#FF5252" />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('expenses')}</span>
              <strong style={{ color: '#FF5252' }}>{formatCurrency(totalDespesas, moedaBase)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--card-border)', padding: '12px 16px', borderRadius: '12px' }}>
            <CalendarDays size={18} color="var(--accent-blue)" />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('current_balance')}</span>
              <strong style={{ color: totalReceitas - totalDespesas >= 0 ? 'var(--accent-green)' : '#FF5252' }}>
                {formatCurrency(totalReceitas - totalDespesas, moedaBase)}
              </strong>
            </div>
          </div>
        </div>

        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {diasSemana.map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              {d}
            </div>
          ))}
          {Array.from({ length: diaSemanaInicio }).map((_, i) => (
            <div key={`empty-${i}`} style={{ padding: '4px' }} />
          ))}
          {Array.from({ length: diasNoMes }).map((_, i) => {
            const dia = String(i + 1).padStart(2, '0');
            const txs = txsPorDia[dia] || [];
            const receitas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + converterValor(t), 0);
            const despesas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + converterValor(t), 0);
            const isToday = i + 1 === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
            const isSelected = selectedDay === i + 1;

            return (
              <div
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : i + 1)}
                style={{
                  padding: '6px', minHeight: '70px', borderRadius: '8px',
                  background: isSelected ? 'rgba(16,69,161,0.08)' : txs.length > 0 ? 'rgba(0,229,255,0.03)' : 'transparent',
                  border: isSelected ? '1px solid var(--accent-blue)' : isToday ? '1px solid var(--accent-blue)' : '1px solid transparent',
                  position: 'relative', cursor: txs.length > 0 ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: isToday || isSelected ? 800 : 600, color: isToday || isSelected ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                  {i + 1}
                </span>
                {receitas > 0 && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)', fontWeight: 600, lineHeight: 1.2, marginTop: '2px' }}>
                    +{formatCurrency(receitas, moedaBase)}
                  </div>
                )}
                {despesas > 0 && (
                  <div style={{ fontSize: '0.65rem', color: '#FF5252', fontWeight: 600, lineHeight: 1.2 }}>
                    -{formatCurrency(despesas, moedaBase)}
                  </div>
                )}
                {txs.length > 0 && (
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {txs.length} {t('transactions').toLowerCase()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Day Detail Panel */}
      {selectedDay !== null && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {selectedDay} {meses[mes]} {ano}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '1rem', fontWeight: 800,
                color: selectedDayTotal >= 0 ? 'var(--accent-green)' : '#FF5252',
              }}>
                {formatCurrency(Math.abs(selectedDayTotal), moedaBase)}
              </span>
              <button
                onClick={() => setSelectedDay(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {selectedDayTxs.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
              {t('web_dashboard_register_expenses')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDayTxs.map((tx) => {
                const converted = converterValor(tx);
                return (
                  <div key={tx.id} style={{
                    display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: '8px',
                    background: 'var(--bg-secondary, #f8fafc)', gap: '12px',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: tx.tipo === 'receita' ? 'var(--accent-green)' : '#FF5252',
                    }} />
                    <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {tx.descricao || tx.categoria}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {tx.categoria}
                    </span>
                    <span style={{
                      fontWeight: 700, fontSize: '0.9rem',
                      color: tx.tipo === 'receita' ? 'var(--accent-green)' : '#FF5252',
                    }}>
                      {tx.tipo === 'receita' ? '+' : '-'}{formatCurrency(converted, moedaBase)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
