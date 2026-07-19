import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { TextInput } from './TextInput';
import { PrimaryButton } from './PrimaryButton';
import type { Cartao } from '../store/useStore';
import { useI18n } from '../i18n';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit: Cartao | null;
  onSubmit: (nome: string, limite: number, fatura_atual: number) => void;
  onDelete?: (id: string) => void;
}

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  cardToEdit,
  onSubmit,
  onDelete
}) => {
  const { t } = useI18n();
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');
  const [faturaAtual, setFaturaAtual] = useState('');

  useEffect(() => {
    if (cardToEdit) {
      setNome(cardToEdit.nome);
      setLimite(cardToEdit.limite.toString());
      setFaturaAtual(cardToEdit.fatura_atual.toString());
    } else {
      setNome('');
      setLimite('');
      setFaturaAtual('0');
    }
  }, [cardToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNome = nome.trim();
    if (!cleanNome) return;
    const limitVal = parseFloat(limite) || 0;
    const faturaVal = parseFloat(faturaAtual) || 0;
    onSubmit(cleanNome, limitVal, faturaVal);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px',
    }}>
      <Card style={{ maxWidth: '400px', width: '100%' }} className="fade-in">
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>
          {cardToEdit ? t('web_card_edit_title') : t('web_card_new_title')}
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {t('web_card_name_label')}
            </label>
            <TextInput value={nome} onChange={e => setNome(e.target.value)} placeholder={t('web_card_name_placeholder')} required />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {t('web_card_limit_label')}
            </label>
            <TextInput type="number" step="0.01" value={limite} onChange={e => setLimite(e.target.value)} placeholder="0.00" required />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {t('web_card_invoice_label')}
            </label>
            <TextInput type="number" step="0.01" value={faturaAtual} onChange={e => setFaturaAtual(e.target.value)} placeholder="0.00" />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px'}}>
            {cardToEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t('web_card_delete_confirm', { name: cardToEdit.nome }))) {
                    onDelete(cardToEdit.id);
                  }
                }}
                style={{
                  background: 'var(--color-danger)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  flex: 1
                }}
              >
                {t('web_card_delete_button')}
              </button>
            )}
            <button type="button" onClick={onClose} style={{
              flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
              padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
            }}>
              {t('cancel')}
            </button>
            <PrimaryButton type="submit" style={{ flex: 1 }}>
              {cardToEdit ? t('save') : t('web_card_create_button')}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
};
