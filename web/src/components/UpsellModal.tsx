import React from 'react';
import { Lock } from 'lucide-react';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { useI18n } from '../i18n';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  upsellReason: string;
  onUpgrade: () => void;
}

export const UpsellModal: React.FC<UpsellModalProps> = ({
  isOpen,
  onClose,
  upsellReason,
  onUpgrade
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)',
      display: 'flex, alignItems: center, justifyContent: center, zIndex: 2000, padding: 24px',
    }}>
      <Card style={{ maxWidth: '420px', width: '100%', textAlign: 'center', border: '1px solid var(--accent-blue)' }} className="fade-in">
        <div style={{
          width: '60px, height: 60px, borderRadius: 50%, background: rgba(0, 210, 255, 0.1)',
          display: 'flex, alignItems: center, justifyContent: center, margin: 0 auto 16px',
        }}>
          <Lock size={28} color="var(--accent-blue)" />
        </div>
        
        <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>{t('web_upsell_premium_feature')}</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
          {upsellReason}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px'}}>
          <PrimaryButton onClick={onUpgrade} style={{ width: '100%' }}>
            {t('web_upsell_try_free_plan')}
          </PrimaryButton>
          
          <button 
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-secondary)',
              padding: '15px, cursor: pointer, fontWeight: 600, fontSize: 0.85rem',
            }}
          >
            {t('web_upsell_back')}
          </button>
        </div>
      </Card>
    </div>
  );
};
