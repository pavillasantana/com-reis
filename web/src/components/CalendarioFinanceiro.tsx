import React, { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CalendarDays
} from 'lucide-react';
import type { Transacao } from '../store/useStore';
import { Card } from './Card';
import { formatCurrency } from '../utils/currency';
import { useI18n } from '../i18n';

interface Props {
  transacoes: Transacao[];
  moedaBase: string;
}

export const CalendarioFinanceiro: React.FC<Props> = ({ transacoes, moedaBase }) => {
  const { t } = useI18n();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

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

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const diaSemanaInicio = primeiroDia.getDay();

  const mesStr = `${ano}-${String(mes + 1).padStart(2, '0')}`;

  const txsDoMes = useMemo(() =>
    transacoes.filter(t => t.data_transacao.startsWith(mesStr)),
    [transacoes, mesStr]
  );

  const txsPorDia = useMemo(() => {
    const map: Record<string, Transacao[]> = {};
    txsDoMes.forEach(t => {
      const dia = t.data_transacao.split('-')[2];
      if (!map[dia]) map[dia] = [];
      map[dia].push(t);
    });
    return map;
  }, [txsDoMes]);

  const totalReceitas = txsDoMes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
  const totalDespesas = txsDoMes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);

  const navegar = (dir: number) => {
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
            const receitas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
            const despesas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
            const isToday = i + 1 === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();

            return (
              <div key={i} style={{
                padding: '6px', minHeight: '70px', borderRadius: '8px', background: txs.length > 0 ? 'rgba(0,229,255,0.03)' : 'transparent',
                border: isToday ? '1px solid var(--accent-blue)' : '1px solid transparent',
                position: 'relative'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
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
    </div>
  );
};
