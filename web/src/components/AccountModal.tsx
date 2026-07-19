import React from 'react';
import { Card } from './Card';
import { TextInput } from './TextInput';
import { PrimaryButton } from './PrimaryButton';
import { useI18n } from '../i18n';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  acName: string;
  setAcName: (v: string) => void;
  acCurrency: string;
  setAcCurrency: (v: string) => void;
  acBalance: string;
  setAcBalance: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  acName,
  setAcName,
  acCurrency,
  setAcCurrency,
  acBalance,
  setAcBalance,
  onSubmit
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)',
      display: 'flex, alignItems: center, justifyContent: center, zIndex: 1000, padding: 24px',
    }}>
      <Card style={{ maxWidth: '400px', width: '100%' }} className="fade-in">
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>{t('web_account_title')}</h3>
        
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('web_account_name_label')}</label>
            <TextInput value={acName} onChange={e => setAcName(e.target.value)} placeholder={t('web_account_name_placeholder')} required />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('web_account_currency_label')}</label>
            <select className="select-input" value={acCurrency} onChange={e => setAcCurrency(e.target.value)}>
              <option value="BRL">{t('brazilian_real')} (BRL)</option>
              <option value="USD">{t('us_dollar')} (USD)</option>
              <option value="EUR">{t('euro')} (EUR)</option>
              <option value="GBP">{t('british_pound')} (GBP)</option>
              <option value="JPY">{t('japanese_yen')} (JPY)</option>
              <option value="CAD">{t('canadian_dollar')} (CAD)</option>
              <option value="CHF">{t('swiss_franc')} (CHF)</option>
              <option value="AUD">{t('australian_dollar')} (AUD)</option>
              <option value="CNY">{t('chinese_yuan')} (CNY)</option>
              <option value="MXN">{t('mexican_peso')} (MXN)</option>
              <option value="ARS">{t('argentine_peso')} (ARS)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('web_account_balance_label')}</label>
            <TextInput type="number" step="0.01" value={acBalance} onChange={e => setAcBalance(e.target.value)} placeholder="0.00" />
          </div>

          <div style={{ display: 'flex', gap: '18px', marginTop: '10px'}}>
            <button type="button" onClick={onClose} style={{
              flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
              padding: '18px, borderRadius: 16px, cursor: pointer, fontWeight: 600',
            }}>
              {t('cancel')}
            </button>
            <PrimaryButton type="submit" style={{ flex: 1 }}>
              {t('web_account_create_button')}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
};
