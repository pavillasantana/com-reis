import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { exportTransactionsToCSV, downloadBlob } from '../utils/exporter';
import type { Transacao, Conta } from '../store/useStore';

interface ExportarRelatoriosModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transacao[];
  accounts: Conta[];
  moedaBase: string;
  rates: Record<string, number>;
}

export function ExportarRelatoriosModal({ open, onClose, transactions, accounts, moedaBase, rates }: ExportarRelatoriosModalProps) {
  const { t } = useI18n();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  if (!open) return null;

  const exportCSV = (filterMonth?: string) => {
    const data = filterMonth
      ? transactions.filter((tx) => tx.data_transacao.startsWith(filterMonth))
      : transactions;
    const blob = exportTransactionsToCSV(data, accounts, moedaBase, rates);
    const suffix = filterMonth || new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `relatorio-comreis-${suffix}.csv`);
    onClose();
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `relatorio-comreis-${new Date().toISOString().slice(0, 10)}.json`);
    onClose();
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
    background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '12px',
    cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.2s'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(18, 26, 47, 0.85)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)', padding: '24px'
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: '24px', padding: '36px', maxWidth: '440px', width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)', boxSizing: 'border-box'
      }} className="fade-in">
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          {t('web_export_title') || 'Exportar Relatórios'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 24px' }}>
          {t('web_export_subtitle') || 'Exporte suas transações do espaço ativo para um arquivo.'}
        </p>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {t('web_export_month_label') || 'Mês'}
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg-color)', border: '1px solid var(--card-border)',
              color: 'var(--text-primary)', padding: '12px 14px', borderRadius: '10px',
              fontSize: '0.9rem', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <button type="button" onClick={() => exportCSV(month)} style={cardStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--accent-green)' }}>calendar_month</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {t('web_export_monthly') || 'CSV Mensal'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('web_export_monthly_hint', { month }) || `Somente as transações de ${month}.`}
              </div>
            </div>
          </button>
          <button type="button" onClick={() => exportCSV()} style={cardStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--accent-cyan)' }}>download</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>CSV</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('web_export_csv_hint') || 'Compatível com Excel, Google Sheets e importadores bancários.'}
              </div>
            </div>
          </button>
          <button type="button" onClick={exportJSON} style={cardStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--accent-green)' }}>code</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>JSON</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('web_export_json_hint') || 'Dados brutos para backup e integrações.'}
              </div>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', background: 'var(--card-border)', border: '1px solid var(--card-border)',
            color: 'var(--text-primary)', padding: '16px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer'
          }}
        >
          {t('web_logout_cancel') || 'Cancelar'}
        </button>
      </div>
    </div>
  );
}
