import React from 'react';
import { Card } from './Card';
import { TextInput } from './TextInput';
import { PrimaryButton } from './PrimaryButton';
import { useI18n } from '../i18n';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  txDesc: string;
  setTxDesc: (v: string) => void;
  txVal: string;
  setTxVal: (v: string) => void;
  txDate: string;
  setTxDate: (v: string) => void;
  txTipo: 'receita' | 'despesa';
  setTxTipo: (v: 'receita' | 'despesa') => void;
  txContaId: string;
  setTxContaId: (v: string) => void;
  txMoeda: string;
  setTxMoeda: (v: string) => void;
  txCat: string;
  setTxCat: (v: string) => void;
  activeAccounts: any[];
  activeCartoes: any[];
  txCartaoId: string;
  setTxCartaoId: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  txDesc,
  setTxDesc,
  txVal,
  setTxVal,
  txDate,
  setTxDate,
  txTipo,
  setTxTipo,
  txContaId,
  setTxContaId,
  txMoeda,
  setTxMoeda,
  txCat,
  setTxCat,
  activeAccounts,
  activeCartoes,
  txCartaoId,
  setTxCartaoId,
  onSubmit
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const selectedAccount = activeAccounts.find(a => a.id === txContaId);
  const showConversionNotice = selectedAccount && selectedAccount.moeda_conta !== txMoeda;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px',
    }}>
      <Card style={{ maxWidth: '450px', width: '100%' }} className="fade-in">
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>{t('web_tx_modal_title')}</h3>
        
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('web_tx_type_label')}</label>
            <div style={{ display: 'flex', background: 'rgba(30, 39, 61, 0.5)', padding: '6px', borderRadius: '12px'}}>
              <button
                type="button"
                onClick={() => setTxTipo('receita')}
                style={{
                  flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                  background: txTipo === 'receita' ? 'var(--accent-green)' : 'transparent',
                  color: txTipo === 'receita' ? '#000' : 'var(--text-secondary)'
                }}
              >
                {t('income_label')}
              </button>
              <button
                type="button"
                onClick={() => setTxTipo('despesa')}
                style={{
                  flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                  background: txTipo === 'despesa' ? 'var(--color-danger)' : 'transparent',
                  color: txTipo === 'despesa' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {t('expense_label')}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('description_label')}</label>
            <TextInput value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder={t('description_placeholder')} required />
          </div>

          <div className="rg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px'}}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('value_label')}</label>
              <TextInput type="number" step="0.01" value={txVal} onChange={e => setTxVal(e.target.value)} placeholder="0.00" required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('date_label')}</label>
              <TextInput type="date" value={txDate} onChange={e => setTxDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('web_tx_currency_label')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF', 'AUD', 'CNY', 'MXN', 'ARS'].map(m => {
                const isSelected = txMoeda === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTxMoeda(m)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {showConversionNotice && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '-8px', opacity: 0.9 }}>
              {t('web_tx_conversion_notice', { from: txMoeda, to: selectedAccount.moeda_conta })}
            </div>
          )}

          <div className="rg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px'}}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('web_tx_account_label')}</label>
              <select className="select-input" value={txContaId} onChange={e => setTxContaId(e.target.value)}>
                {activeAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.nome_instituicao}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('category_label')}</label>
              <select className="select-input" value={txCat} onChange={e => setTxCat(e.target.value)}>
                <option value="Alimentação">{t('cat_alimentacao')}</option>
                <option value="Moradia">{t('cat_moradia')}</option>
                <option value="Transporte">{t('cat_transporte')}</option>
                <option value="Lazer">{t('cat_lazer')}</option>
                <option value="Salário">{t('income_label')}</option>
                <option value="Freelance">Freelance</option>
                <option value="Assinaturas">{t('cat_assinaturas')}</option>
                <option value="Outros">{t('cat_outros')}</option>
              </select>
            </div>
          </div>

          {txTipo === 'despesa' && activeCartoes && activeCartoes.length > 0 && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {t('web_tx_payment_method_label')}
              </label>
              <select
                className="select-input"
                value={txCartaoId}
                onChange={e => setTxCartaoId(e.target.value)}
              >
                <option value="">{t('web_tx_account_balance_option')}</option>
                {activeCartoes.map(c => (
                  <option key={c.id} value={c.id}>
                    {t('web_tx_card_option', { name: c.nome, value: c.fatura_atual.toFixed(2) })}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '18px', marginTop: '10px'}}>
            <button type="button" onClick={onClose} style={{
              flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
              padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
            }}>
              {t('cancel')}
            </button>
            <PrimaryButton type="submit" style={{ flex: 1 }}>
              {t('save')}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
};
