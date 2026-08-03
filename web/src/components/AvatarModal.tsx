import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../i18n';
import { PrimaryButton } from './PrimaryButton';
import { TextInput } from './TextInput';

interface AvatarModalProps {
  open: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  idUsuario: string | null;
  onSave: (url: string | null) => void;
}

const PRESETS = ['🐱', '🐵', '🐶', '🦁', '🐼', '🦝', '🦊', '🐰'];

export function AvatarModal({ open, onClose, currentAvatar, idUsuario, onSave }: AvatarModalProps) {
  const { t } = useI18n();
  const [selectedPreset, setSelectedPreset] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedPreset('');
      setFile(null);
      setCustomUrl('');
    }
  }, [open]);

  if (!open) return null;

  const previewUrl = selectedPreset || (file ? '' : customUrl) || (currentAvatar && currentAvatar.startsWith('http') ? currentAvatar : '');
  const previewEmoji = selectedPreset || (file ? '' : customUrl) || (currentAvatar && !currentAvatar.startsWith('http') ? currentAvatar : '');

  const handleSave = async () => {
    if (isUploading) return;
    let finalUrl = selectedPreset || customUrl || currentAvatar || null;

    if (file) {
      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${idUsuario || 'anon'}_${Date.now()}.${fileExt}`;
        const filePath = `${idUsuario || 'anon'}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalUrl = data.publicUrl;
      } catch (err) {
        console.error(err);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    onSave(finalUrl);
    onClose();
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
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)', boxSizing: 'border-box',
        maxHeight: '92vh', overflowY: 'auto'
      }} className="fade-in">
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          {t('web_avatar_title') || 'Foto de Perfil'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 24px' }}>
          {t('web_avatar_subtitle') || 'Escolha um avatar, envie uma foto ou use uma URL personalizada.'}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden',
            background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-green) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: '1px solid var(--card-border)'
          }}>
            {previewEmoji ? (
              <span style={{ fontSize: '30px' }}>{previewEmoji}</span>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Foto atual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span className="text-dark-mangos" style={{ fontSize: '26px', fontWeight: 'bold' }}>M</span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {t('web_avatar_current') || 'Foto atual'}
            </div>
            {t('web_avatar_current_hint') || 'Selecione abaixo como deseja atualizar.'}
          </div>
        </div>

        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {t('web_avatar_presets') || 'Escolha um Avatar (Preset)'}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
          {PRESETS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { setSelectedPreset(emoji); setFile(null); setCustomUrl(''); }}
              style={{
                background: selectedPreset === emoji ? 'rgba(0, 210, 255, 0.15)' : 'var(--card-border)',
                border: selectedPreset === emoji ? '2px solid var(--accent-blue)' : '1px solid var(--card-border)',
                borderRadius: '14px', padding: '14px', fontSize: '1.4rem', cursor: 'pointer',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {t('web_avatar_upload') || 'Fazer Upload de Foto'}
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              setFile(e.target.files[0]);
              setSelectedPreset('');
              setCustomUrl('');
            }
          }}
          style={{
            width: '100%', padding: '12px 14px', background: 'var(--bg-color)',
            border: '1px solid var(--card-border)', borderRadius: '12px',
            color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer',
            boxSizing: 'border-box'
          }}
        />
        {file && (
          <p style={{ color: 'var(--accent-green)', fontSize: '0.8rem', marginTop: '6px' }}>
            {t('web_avatar_file_selected') || 'Arquivo selecionado:'} {file.name}
          </p>
        )}

        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '16px', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {t('web_avatar_custom_url') || 'Ou use uma URL de Imagem'}
        </label>
        <TextInput
          type="url"
          placeholder="https://exemplo.com/suafoto.jpg"
          value={customUrl}
          onChange={(e) => {
            setCustomUrl(e.target.value);
            setFile(null);
            setSelectedPreset('');
          }}
        />

        <div style={{ display: 'flex', gap: '18px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, background: 'var(--card-border)', border: '1px solid var(--card-border)',
              color: 'var(--text-primary)', padding: '16px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {t('web_logout_cancel') || 'Cancelar'}
          </button>
          <PrimaryButton type="button" onClick={handleSave} style={{ flex: 1, borderRadius: '12px' }} disabled={isUploading}>
            {isUploading ? (t('web_avatar_uploading') || 'Enviando...') : (t('web_save') || 'Salvar')}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
