import React from 'react';
import { Check, Copy, RefreshCw, Zap } from 'lucide-react';
import { Card } from './Card';
import { TextInput } from './TextInput';
import { PrimaryButton } from './PrimaryButton';
import { useStore } from '../store/useStore';
import { useAppConfig } from '../hooks/useAppConfig';
import { useI18n } from '../i18n';

function crc16Ccitt(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPixPayload(amount: string): string {
  const id = (tag: string, value: string) => `${tag}${value.length.toString().padStart(2, '0')}${value}`;
  const merchantAccount = id('00', 'br.gov.bcb.pix') + id('01', 'e053cb3f-5d46-4a41-aa61-e0c2f6d2f32f');
  const body = '000201' + id('26', merchantAccount) + '52040000' + '5303986' + id('54', amount)
    + '5802BR' + id('59', 'COM REIS PREMIUM') + id('60', 'SAO PAULO') + '62070503***' + '6304';
  return body + crc16Ccitt(body);
}

interface CheckoutModalProps {
  visible?: boolean;
  onClose?: () => void;
  checkoutSuccess: boolean;
  checkoutProcessing: boolean;
  checkoutMethod: 'card' | 'pix';
  setCheckoutMethod: (v: 'card' | 'pix') => void;
  cardNumber: string;
  setCardNumber: (v: string) => void;
  cardHolder: string;
  setCardHolder: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  cardCvv: string;
  setCardCvv: (v: string) => void;
  copiedPix: boolean;
  setCopiedPix: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onConfirmPix: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  onClose: onCloseProp,
  checkoutSuccess,
  checkoutProcessing,
  checkoutMethod,
  setCheckoutMethod,
  cardNumber,
  setCardNumber,
  cardHolder,
  setCardHolder,
  cardExpiry,
  setCardExpiry,
  cardCvv,
  setCardCvv,
  copiedPix,
  setCopiedPix,
  onSubmit,
  onConfirmPix
}) => {
  const { t } = useI18n();
  const storeVisible = useStore((s) => s.isCheckoutModalVisible);
  const toggleCheckoutModal = useStore((s) => s.toggleCheckoutModal);
  const isOpen = visible !== undefined ? visible : storeVisible;
  const onClose = onCloseProp || (() => toggleCheckoutModal(false));

  const [_receiptId] = React.useState(() => `MNG-PRM-${Math.floor(100000 + Math.random() * 900000)}`);
  const { premium_preco, premium_preco_anual } = useAppConfig();
  const [billingType, setBillingType] = React.useState<'monthly' | 'annual'>('monthly');
  const [installments, setInstallments] = React.useState(1);

  const precoMensal = premium_preco;
  const precoAnual = premium_preco_anual;
  const precoAnualMensal = precoAnual / 12;
  const economiaAnual = (precoMensal * 12) - precoAnual;
  const economiaPercent = Math.round((economiaAnual / (precoMensal * 12)) * 100);

  const activePrice = billingType === 'monthly' ? precoMensal : precoAnual;
  const activePriceFormatted = activePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const perMonthFormatted = (billingType === 'annual' ? precoAnualMensal : precoMensal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const pixPayload = React.useMemo(() => buildPixPayload(activePrice.toFixed(2)), [activePrice]);

  const maxInstallments = billingType === 'annual' ? 12 : 1;
  const installmentValue = activePrice / installments;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px',
    }}>
      <Card style={{ maxWidth: '480px', width: '100%', border: '1px solid var(--card-border)' }} className="fade-in">
        {checkoutSuccess ? (
          <div style={{ textAlign: 'center', padding: '30px 10px'}} className="scale-in">
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              boxShadow: '0 0 20px rgba(74, 222, 128, 0.2)'
            }}>
              <Check size={36} color="var(--accent-green)" />
            </div>
            
            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: '#fff' }}>{t('web_checkout_payment_confirmed')}</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              {t('web_checkout_congratulations')} <strong>{t('web_checkout_com_reis_premium')} {billingType === 'annual' ? t('web_checkout_annual') : t('web_checkout_monthly')}</strong>
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('web_checkout_product')}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{t('web_checkout_com_reis_premium')} — {billingType === 'annual' ? t('web_checkout_annual') : t('web_checkout_monthly')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('status')}</span>
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{t('web_checkout_status_approved')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('value_label')}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>R$ {activePriceFormatted}</span>
              </div>
            </div>

            <PrimaryButton onClick={onClose} style={{ width: '100%' }}>
              {t('web_checkout_start_premium')}
            </PrimaryButton>
          </div>
        ) : checkoutProcessing ? (
          <div style={{ textAlign: 'center', padding: '60px 20px'}}>
            <div style={{ marginBottom: '24px' }}>
              <RefreshCw size={48} className="spin" color="var(--accent-blue)" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 210, 255, 0.4))' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#fff' }}>{t('web_checkout_processing')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('web_checkout_waiting_gateway')}
            </p>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', fontWeight: 700 }}>{t('web_checkout_com_reis_premium')}</h3>

            {/* Plan selector: Monthly / Annual */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setBillingType('monthly'); setInstallments(1); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid',
                  borderColor: billingType === 'monthly' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.08)',
                  background: billingType === 'monthly' ? 'rgba(0, 210, 255, 0.08)' : 'transparent',
                  color: billingType === 'monthly' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontWeight: billingType === 'monthly' ? 700 : 500,
                  fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div>{t('web_checkout_monthly')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '4px', color: '#fff' }}>
                  R$ {precoMensal.toFixed(2).replace('.', ',')}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{t('web_checkout_per_month')}</div>
              </button>
              <button
                type="button"
                onClick={() => { setBillingType('annual'); setInstallments(1); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid',
                  borderColor: billingType === 'annual' ? 'var(--accent-green)' : 'rgba(255,255,255,0.08)',
                  background: billingType === 'annual' ? 'rgba(74, 222, 128, 0.08)' : 'transparent',
                  color: billingType === 'annual' ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontWeight: billingType === 'annual' ? 700 : 500,
                  fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  {t('web_checkout_annual')} <Zap size={12} color="var(--accent-green)" />
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '4px', color: '#fff' }}>
                  R$ {precoAnual.toFixed(2).replace('.', ',')}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{t('web_checkout_per_year')}</div>
                {economiaAnual > 0 && (
                  <div style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    background: 'var(--accent-green)', color: '#000',
                    fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px',
                    borderRadius: '8px', whiteSpace: 'nowrap',
                  }}>
                    -{economiaPercent}%
                  </div>
                )}
              </button>
            </div>

            {/* Price display */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              {billingType === 'annual' && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  R$ {(precoMensal * 12).toFixed(2).replace('.', ',')}
                </span>
              )}
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: billingType === 'annual' ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                R$ {activePriceFormatted}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {billingType === 'annual' ? t('web_checkout_per_year') : t('web_checkout_per_month')}
              </span>
            </div>

            {billingType === 'annual' && economiaAnual > 0 && (
              <div style={{
                background: 'rgba(74, 222, 128, 0.08)',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '0.75rem',
                color: 'var(--accent-green)',
                fontWeight: 600,
                textAlign: 'center',
              }}>
                {t('web_checkout_save_annual')} R$ {economiaAnual.toFixed(2).replace('.', ',')} {t('web_checkout_per_year')} ({economiaPercent}% OFF) — {t('web_checkout_by_year')} R$ {perMonthFormatted}{t('web_checkout_per_month')}
              </div>
            )}

            {billingType === 'monthly' && (
              <div style={{
                background: 'rgba(0, 210, 255, 0.06)',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '0.75rem',
                color: 'var(--accent-blue)',
                fontWeight: 600,
                textAlign: 'center',
              }}>
                {t('web_checkout_cancel_anytime')}
              </div>
            )}

            {/* Feature benefits */}
            <div style={{ marginBottom: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>✓ {t('web_checkout_feature_pf_pj')}</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>✓ {t('web_checkout_feature_goals')}</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>✓ {t('web_checkout_feature_import')}</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>✓ {t('web_checkout_feature_quotes')}</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>✓ {t('web_checkout_feature_explorer')}</div>
            </div>
            
            {/* Payment method tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }}>
              <div 
                className={`checkout-tab ${checkoutMethod === 'card' ? 'active' : ''}`}
                onClick={() => setCheckoutMethod('card')}
              >
                {t('web_checkout_credit_card')}
              </div>
              <div 
                className={`checkout-tab ${checkoutMethod === 'pix' ? 'active' : ''}`}
                onClick={() => setCheckoutMethod('pix')}
              >
                PIX
              </div>
            </div>

            {checkoutMethod === 'card' ? (
              <form onSubmit={onSubmit}>
                {/* Virtual credit card */}
                <div className="virtual-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="card-chip"></div>
                    <span style={{ 
                      fontSize: '0.9rem', fontWeight: 800,
                      color: cardNumber.startsWith('4') ? '#00e2ff' : cardNumber.startsWith('5') ? '#ff5f00' : 'var(--text-muted)'
                    }}>
                      {cardNumber.startsWith('4') ? 'VISA' : cardNumber.startsWith('5') ? 'MASTERCARD' : 'COM REIS PAY'}
                    </span>
                  </div>
                  
                  <div className="card-number">
                    {cardNumber.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim()}
                  </div>

                  <div className="card-footer">
                    <div className="card-holder">
                      {cardHolder || t('web_checkout_card_holder_placeholder')}
                    </div>
                    <div className="card-expiry">
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>VALID THRU</div>
                      {cardExpiry || 'MM/YY'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px'}}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{t('web_checkout_card_number')}</label>
                    <TextInput 
                      value={cardNumber} 
                      onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))} 
                      placeholder="0000 0000 0000 0000" 
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{t('web_checkout_card_holder')}</label>
                    <TextInput 
                      value={cardHolder} 
                      onChange={e => setCardHolder(e.target.value.toUpperCase())} 
                      placeholder={t('web_checkout_card_holder_placeholder')} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px'}}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{t('web_checkout_expiry')}</label>
                      <TextInput 
                        value={cardExpiry} 
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                          setCardExpiry(val.substring(0, 5));
                        }} 
                        placeholder="MM/YY" 
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>CVV</label>
                      <TextInput 
                        type="password"
                        value={cardCvv} 
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))} 
                        placeholder="123" 
                        required 
                      />
                    </div>
                  </div>

                  {/* Installments selector (only for annual plan) */}
                  {billingType === 'annual' && maxInstallments > 1 && (
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{t('web_checkout_installments')}</label>
                      <select
                        value={installments}
                        onChange={e => setInstallments(Number(e.target.value))}
                        style={{
                          width: '100%', padding: '14px 16px', borderRadius: '14px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.03)', color: '#fff',
                          fontSize: '0.9rem', fontWeight: 600, outline: 'none',
                        }}
                      >
                        {Array.from({ length: maxInstallments }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n} style={{ background: '#1a1a2e', color: '#fff' }}>
                            {n}x de R$ {(activePrice / n).toFixed(2).replace('.', ',')} {n === 1 ? '(à vista)' : `sem juros`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '18px', marginTop: '16px'}}>
                    <button type="button" onClick={onClose} style={{
                      flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
                      padding: '18px', borderRadius: '16px', cursor: 'pointer', fontWeight: 600,
                    }}>
                      {t('web_checkout_cancel')}
                    </button>
                    <PrimaryButton type="submit" style={{ flex: 1 }}>
                      {installments > 1
                        ? `${t('web_checkout_subscribe')} ${installments}x R$ ${installmentValue.toFixed(2).replace('.', ',')}`
                        : `${t('web_checkout_subscribe')} R$ ${activePriceFormatted}`
                      }
                    </PrimaryButton>
                  </div>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {t('web_checkout_scan_qr')}
                </p>

                <div className="qr-container">
                  <div className="scanner-line"></div>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ shapeRendering: 'crispEdges' }}>
                    <rect width="100" height="100" fill="#ffffff" />
                    <rect x="5" y="5" width="25" height="25" fill="#000000" />
                    <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                    <rect x="13" y="13" width="9" height="9" fill="#000000" />
                    <rect x="70" y="5" width="25" height="25" fill="#000000" />
                    <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                    <rect x="78" y="13" width="9" height="9" fill="#000000" />
                    <rect x="5" y="70" width="25" height="25" fill="#000000" />
                    <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                    <rect x="13" y="78" width="9" height="9" fill="#000000" />
                    <rect x="35" y="5" width="5" height="5" fill="#000000" /><rect x="45" y="10" width="5" height="10" fill="#000000" />
                    <rect x="55" y="5" width="10" height="5" fill="#000000" /><rect x="40" y="20" width="15" height="5" fill="#000000" />
                    <rect x="35" y="30" width="5" height="5" fill="#000000" /><rect x="45" y="35" width="10" height="5" fill="#000000" />
                    <rect x="5" y="35" width="5" height="10" fill="#000000" /><rect x="15" y="45" width="5" height="5" fill="#000000" />
                    <rect x="25" y="35" width="5" height="5" fill="#000000" /><rect x="20" y="55" width="10" height="5" fill="#000000" />
                    <rect x="35" y="50" width="10" height="10" fill="#000000" /><rect x="50" y="45" width="5" height="15" fill="#000000" />
                    <rect x="65" y="35" width="5" height="5" fill="#000000" /><rect x="75" y="35" width="15" height="5" fill="#000000" />
                    <rect x="80" y="45" width="5" height="10" fill="#000000" /><rect x="70" y="55" width="10" height="5" fill="#000000" />
                    <rect x="60" y="65" width="5" height="5" fill="#000000" /><rect x="55" y="75" width="5" height="10" fill="#000000" />
                    <rect x="45" y="70" width="5" height="5" fill="#000000" /><rect x="35" y="80" width="10" height="5" fill="#000000" />
                    <rect x="50" y="85" width="15" height="5" fill="#000000" /><rect x="70" y="80" width="5" height="15" fill="#000000" />
                    <rect x="80" y="70" width="15" height="5" fill="#000000" /><rect x="85" y="80" width="5" height="10" fill="#000000" />
                  </svg>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', padding: '12px', marginBottom: '16px'
                }}>
                  <div style={{ 
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace', textAlign: 'left'
                  }}>
                    {pixPayload}
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pixPayload);
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2000);
                    }}
                    style={{
                      background: 'rgba(0, 210, 255, 0.1)', border: 'none', color: 'var(--accent-blue)',
                      borderRadius: '8px', padding: '9px 10px', fontSize: '0.75rem', cursor: 'pointer',
                      marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700
                    }}
                  >
                    {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                    {copiedPix ? t('web_checkout_copied') : t('web_checkout_copy')}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px'}}>
                  <PrimaryButton onClick={onConfirmPix} style={{ width: '100%' }}>
                    {t('web_checkout_confirm_payment')} — R$ {activePriceFormatted}
                  </PrimaryButton>
                  
                  <button 
                    type="button" onClick={onClose}
                    style={{
                      background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                      padding: '15px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    }}
                  >
                    {t('web_checkout_back')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
