import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Receipt, Sparkles, FileDown, Copy, Check, Info,
  CalendarDays, Landmark, ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useToast } from './Toast';
import { usePremium } from '../hooks/usePremium';
import { fetchTransacoesAtivos } from '../services/supabaseService';
import type { TransacaoAtivo } from '../services/supabaseService';
import {
  apurarRendaVariavel, gerarDARFs, computarIsentometro,
  LIMITE_ISENCAO_ACOES, type SiloFiscal,
} from '../utils/fiscalBR';
import { formatCurrency } from '../utils/currency';
import {
  exportApuracoesCSV, exportDARFsCSV, exportFiscalJSON, downloadBlob,
} from '../utils/exporter';

interface FiscalBRViewProps {
  onUpgrade: () => void;
}

const ACCENT_BLUE = '#1045A1';
const ACCENT_GREEN = '#10B981';
const ACCENT_RED = '#EF4444';
const ACCENT_CYAN = '#0EA5E9';
const CLEAN_TEXT_SECONDARY = '#64748B';
const CLEAN_TEXT_MUTED = '#94A3B8';
const CLEAN_BORDER = '#E2E8F0';

const SILO_CARDS: { key: SiloFiscal; labelKey: string; color: string }[] = [
  { key: 'acoes', labelKey: 'web_fiscal_silo_acoes', color: ACCENT_BLUE },
  { key: 'fiis', labelKey: 'web_fiscal_silo_fiis', color: '#8B5CF6' },
  { key: 'outros', labelKey: 'web_fiscal_silo_outros', color: ACCENT_CYAN },
  { key: 'daytrade', labelKey: 'web_fiscal_silo_daytrade', color: ACCENT_RED },
];

const formatMes = (mes: string): string =>
  new Date(mes + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const formatData = (iso: string): string =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');

const fmt = (v: number): string => formatCurrency(v, 'BRL');

export const FiscalBRView: React.FC<FiscalBRViewProps> = ({ onUpgrade }) => {
  const { t } = useI18n();
  const toast = useToast();
  const { isPremium, triggerPaywall } = usePremium();

  const [txs, setTxs] = useState<TransacaoAtivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selMes, setSelMes] = useState('');
  const [copied, setCopied] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchTransacoesAtivos();
    if (data && !error) setTxs(data);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const { meses } = useMemo(() => apurarRendaVariavel(txs), [txs]);
  const darfs = useMemo(() => gerarDARFs(meses), [meses]);

  const mesesDisponiveis = useMemo(
    () => [...new Set(meses.map((m) => m.mes))].sort((a, b) => b.localeCompare(a)),
    [meses],
  );

  useEffect(() => {
    if (!selMes && mesesDisponiveis.length > 0) {
      const atual = new Date().toISOString().slice(0, 7);
      setSelMes(mesesDisponiveis.includes(atual) ? atual : mesesDisponiveis[0]);
    }
  }, [mesesDisponiveis, selMes]);

  const mesAp = useMemo(() => meses.find((m) => m.mes === selMes) ?? null, [meses, selMes]);
  const iso = useMemo(
    () => (selMes ? computarIsentometro(mesAp?.acoes.vendas ?? 0, selMes) : null),
    [mesAp, selMes],
  );
  const darfDoMes = useMemo(
    () => darfs.find((d) => d.mes === selMes) ?? null,
    [darfs, selMes],
  );

  const garantirPremium = (): boolean => {
    if (!isPremium) {
      triggerPaywall(t('web_fiscal_premium_desc'));
      return false;
    }
    return true;
  };

  const copiarDARF = async () => {
    if (!darfDoMes) return;
    const texto = [
      `DARF — ${t('web_fiscal_darf_desc')}`,
      `Código: ${darfDoMes.codigo}`,
      `Período de apuração: ${darfDoMes.mes}`,
      `Valor: R$ ${darfDoMes.valor.toFixed(2)}`,
      `Vencimento: ${darfDoMes.vencimento}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      toast.success(t('web_fiscal_copiar_ok'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('web_fiscal_copiar_fail'));
    }
  };

  const exportar = (tipo: 'apuracao' | 'darf' | 'json') => {
    if (!garantirPremium()) return;
    const hoje = new Date().toISOString().slice(0, 10);
    if (tipo === 'apuracao') downloadBlob(exportApuracoesCSV(meses), `apuracao-ir-${hoje}.csv`);
    else if (tipo === 'darf') downloadBlob(exportDARFsCSV(darfs), `darf-${hoje}.csv`);
    else downloadBlob(exportFiscalJSON(meses, darfs), `fiscal-${hoje}.json`);
  };

  if (loading) {
    return (
      <div style={{ padding: '0 0 40px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(16,69,161,0.15)', borderTopColor: ACCENT_BLUE, animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (meses.length === 0) {
    return (
      <div style={{ padding: '0 0 40px 0', maxWidth: 900, margin: '0 auto' }}>
        <Header isPremium={isPremium} t={t} />
        <div style={{
          background: '#fff', border: `1px solid ${CLEAN_BORDER}`, borderRadius: 16,
          padding: '48px 24px', textAlign: 'center', color: CLEAN_TEXT_MUTED,
        }}>
          <Receipt size={40} color={CLEAN_TEXT_MUTED} style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>{t('web_fiscal_empty')}</p>
        </div>
        <Disclaimer t={t} />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px 0', maxWidth: 980, margin: '0 auto' }}>
      <Header isPremium={isPremium} t={t} />

      {!isPremium && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 18px',
          borderRadius: 14, border: '1px solid rgba(255,184,0,0.35)',
          background: 'linear-gradient(135deg, rgba(255,184,0,0.08), rgba(255,184,0,0.02))',
        }}>
          <Sparkles size={20} color="#FFB800" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.85rem', color: CLEAN_TEXT_SECONDARY }}>
            {t('web_fiscal_premium_title')}
          </div>
          <button
            onClick={onUpgrade}
            style={{
              border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              background: 'linear-gradient(135deg,#00D2FF,#6366F1)', color: '#fff',
              fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
            }}
          >
            {t('web_fiscal_upgrade')}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, color: CLEAN_TEXT_SECONDARY }}>
          <CalendarDays size={16} />
          {t('web_fiscal_mes')}
        </label>
        <select
          value={selMes}
          onChange={(e) => setSelMes(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 10, border: `1px solid ${CLEAN_BORDER}`,
            fontSize: '0.9rem', fontWeight: 700, background: '#fff', cursor: 'pointer',
          }}
        >
          {mesesDisponiveis.map((m) => (
            <option key={m} value={m}>{formatMes(m)}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
        <IsentometroCard iso={iso} t={t} />
        <DarfCard darfDoMes={darfDoMes} mesLabel={selMes ? formatMes(selMes) : ''} copiar={copiarDARF} copied={copied} t={t} />
      </div>

      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '8px 0 12px', color: '#1A2744', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Landmark size={18} color={ACCENT_BLUE} />
        {t('web_fiscal_aprovacao_title')}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: 12, marginBottom: 24 }}>
        {SILO_CARDS.map(({ key, labelKey, color }) => {
          const ap = mesAp ? mesAp[key] : null;
          return (
            <div key={key} style={{
              background: '#fff', border: `1px solid ${CLEAN_BORDER}`, borderRadius: 16, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1A2744' }}>{t(labelKey)}</span>
                {ap?.isento && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, color: ACCENT_GREEN, background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 8 }}>
                    {t('web_fiscal_isento')}
                  </span>
                )}
              </div>
              {!ap ? (
                <div style={{ fontSize: '0.8rem', color: CLEAN_TEXT_MUTED }}>—</div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: CLEAN_TEXT_SECONDARY, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Row label={t('web_fiscal_vendas')} value={fmt(ap.vendas)} />
                  <Row label={t('web_fiscal_resultado')} value={fmt(ap.resultado)} color={ap.resultado >= 0 ? ACCENT_GREEN : ACCENT_RED} />
                  <Row label={t('web_fiscal_prejuizo')} value={fmt(ap.prejuizo_restante)} />
                  <Row label={t('web_fiscal_base')} value={fmt(ap.base)} />
                  <Row label={t('web_fiscal_irrf')} value={fmt(ap.irrf)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '0.78rem', color: CLEAN_TEXT_MUTED }}>{t('web_fiscal_darf')}</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: ap.darf > 0 ? ACCENT_RED : ACCENT_GREEN }}>
                      {ap.darf > 0 ? fmt(ap.darf) : 'R$ 0,00'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        background: '#fff', border: `1px solid ${CLEAN_BORDER}`, borderRadius: 16, padding: 20, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#1A2744' }}>{t('web_fiscal_tabela_mensal')}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ExportBtn label={t('web_fiscal_export_apuracao')} onClick={() => exportar('apuracao')} />
            <ExportBtn label={t('web_fiscal_export_darf')} onClick={() => exportar('darf')} />
            <ExportBtn label={t('web_fiscal_export_json')} onClick={() => exportar('json')} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ color: CLEAN_TEXT_MUTED, textAlign: 'left', borderBottom: `1px solid ${CLEAN_BORDER}` }}>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>{t('web_fiscal_mes')}</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>{t('web_fiscal_vendas')}</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>{t('web_fiscal_ganho_isento')}</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>{t('web_fiscal_silo_acoes')}</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>{t('web_fiscal_silo_fiis')}</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>{t('web_fiscal_silo_daytrade')}</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>{t('web_fiscal_darf')}</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m.mes} style={{ borderBottom: `1px solid ${CLEAN_BORDER}`, color: '#1A2744' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatMes(m.mes)}</td>
                  <td style={{ padding: '9px 10px' }}>{fmt(m.total_vendas)}</td>
                  <td style={{ padding: '9px 10px', color: ACCENT_GREEN }}>{fmt(m.ganho_isento)}</td>
                  <td style={{ padding: '9px 10px' }}>{fmt(m.acoes.imposto)}</td>
                  <td style={{ padding: '9px 10px' }}>{fmt(m.fiis.imposto)}</td>
                  <td style={{ padding: '9px 10px' }}>{fmt(m.daytrade.imposto)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: m.total_darf > 0 ? ACCENT_RED : ACCENT_GREEN }}>
                    {m.total_darf > 0 ? fmt(m.total_darf) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Disclaimer t={t} />
    </div>
  );
};

function Header({ isPremium, t }: { isPremium: boolean; t: (k: string) => string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.5px', color: '#1A2744', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', width: 38, height: 38, borderRadius: 12, background: 'rgba(16,69,161,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={22} color="#1045A1" />
          </span>
          {t('web_fiscal_title')}
        </h2>
        <p style={{ margin: 0, fontSize: '0.88rem', color: CLEAN_TEXT_SECONDARY }}>{t('web_fiscal_subtitle')}</p>
      </div>
      {isPremium && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700,
          color: '#B8860B', background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.3)',
          padding: '6px 12px', borderRadius: 10,
        }}>
          <Sparkles size={13} /> {t('web_fiscal_premium_badge')}
        </span>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ color: CLEAN_TEXT_MUTED }}>{label}</span>
      <span style={{ fontWeight: 700, color: color ?? '#1A2744' }}>{value}</span>
    </div>
  );
}

function IsentometroCard({ iso, t }: { iso: { vendas: number; limite: number; restante: number; isento: boolean; percentual: number } | null; t: (k: string) => string }) {
  const fill = Math.min(100, iso?.percentual ?? 0);
  return (
    <div style={{
      background: '#fff', border: `1px solid ${CLEAN_BORDER}`, borderRadius: 16, padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color={iso?.isento ? ACCENT_GREEN : ACCENT_RED} />
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A2744' }}>{t('web_fiscal_isentometro')}</span>
        </div>
        <span style={{
          fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: 8,
          background: iso?.isento ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: iso?.isento ? ACCENT_GREEN : ACCENT_RED,
        }}>
          {iso?.isento ? t('web_fiscal_isento') : t('web_fiscal_tributavel')}
        </span>
      </div>

      <div style={{ marginBottom: 8, fontSize: '0.8rem', color: CLEAN_TEXT_MUTED }}>
        {t('web_fiscal_isentometro_desc')}
      </div>

      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1A2744', marginBottom: 12 }}>
        {iso ? fmt(iso.vendas) : fmt(0)}
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: CLEAN_TEXT_MUTED }}> / {fmt(LIMITE_ISENCAO_ACOES)}</span>
      </div>

      <div style={{ height: 10, borderRadius: 6, background: 'rgba(16,69,161,0.08)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          width: `${fill}%`, height: '100%', borderRadius: 6,
          background: iso?.isento ? `linear-gradient(90deg, ${ACCENT_GREEN}, #34D399)` : `linear-gradient(90deg, ${ACCENT_RED}, #F87171)`,
          transition: 'width 0.4s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: CLEAN_TEXT_SECONDARY }}>
        <span>{t('web_fiscal_restante')}: <b style={{ color: iso?.isento ? ACCENT_GREEN : ACCENT_RED }}>{iso ? fmt(iso.restante) : fmt(LIMITE_ISENCAO_ACOES)}</b></span>
        <span style={{ color: CLEAN_TEXT_MUTED }}>{iso?.percentual ?? 0}%</span>
      </div>
    </div>
  );
}

function DarfCard({ darfDoMes, mesLabel, copiar, copied, t }: {
  darfDoMes: { mes: string; codigo: string; valor: number; vencimento: string } | null;
  mesLabel: string; copiar: () => void; copied: boolean; t: (k: string) => string;
}) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${CLEAN_BORDER}`, borderRadius: 16, padding: 20,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Receipt size={18} color={darfDoMes ? ACCENT_RED : CLEAN_TEXT_MUTED} />
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A2744' }}>{t('web_fiscal_darf_title')}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: CLEAN_TEXT_MUTED }}>{mesLabel}</span>
      </div>

      {!darfDoMes ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CLEAN_TEXT_MUTED, fontSize: '0.85rem', textAlign: 'center' }}>
          {t('web_fiscal_darf_sem_valor')}
        </div>
      ) : (
        <>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: ACCENT_RED, marginBottom: 12 }}>
            {fmt(darfDoMes.valor)}
          </div>
          <Row label={t('web_fiscal_darf_codigo')} value={darfDoMes.codigo} />
          <Row label={t('web_fiscal_darf_valor')} value={fmt(darfDoMes.valor)} />
          <Row label={t('web_fiscal_darf_vencimento')} value={formatData(darfDoMes.vencimento)} />
          <div style={{ marginTop: 12 }}>
            <button
              onClick={copiar}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${CLEAN_BORDER}`,
                background: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 700, color: '#1A2744',
              }}
            >
              {copied ? <Check size={14} color={ACCENT_GREEN} /> : <Copy size={14} />}
              {copied ? t('web_fiscal_copiar_ok') : t('web_fiscal_copiar')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${CLEAN_BORDER}`,
        background: '#fff', borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
        fontSize: '0.78rem', fontWeight: 700, color: '#1A2744',
      }}
    >
      <FileDown size={14} />
      {label}
    </button>
  );
}

function Disclaimer({ t }: { t: (k: string) => string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.75rem', color: CLEAN_TEXT_MUTED, marginTop: 8 }}>
      <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
      <p style={{ margin: 0, lineHeight: 1.5 }}>
        {t('web_fiscal_disclaimer')}
      </p>
    </div>
  );
}
