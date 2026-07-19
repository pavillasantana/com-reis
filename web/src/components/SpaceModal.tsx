import React from 'react';
import { Card } from './Card';
import { TextInput } from './TextInput';
import { PrimaryButton } from './PrimaryButton';
import { useI18n } from '../i18n';

interface SpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceName: string;
  setSpaceName: (v: string) => void;
  spaceType: 'PF' | 'PJ';
  setSpaceType: (v: 'PF' | 'PJ') => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SpaceModal: React.FC<SpaceModalProps> = ({
  isOpen,
  onClose,
  spaceName,
  setSpaceName,
  spaceType,
  setSpaceType,
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
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>{t('web_space_title')}</h3>
        
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('web_space_name_label')}</label>
            <TextInput value={spaceName} onChange={e => setSpaceName(e.target.value)} placeholder={t('web_space_name_placeholder')} required />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('web_space_type_label')}</label>
            <select className="select-input" value={spaceType} onChange={e => setSpaceType(e.target.value as 'PF' | 'PJ')}>
              <option value="PF">{t('web_space_type_pf')}</option>
              <option value="PJ">{t('web_space_type_pj')}</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '18px', marginTop: '10px'}}>
            <button type="button" onClick={onClose} style={{
              flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
              padding: '18px, borderRadius: 16px, cursor: pointer, fontWeight: 600',
            }}>
              {t('cancel')}
            </button>
            <PrimaryButton type="submit" style={{ flex: 1 }}>
              {t('web_space_create_button')}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
};
