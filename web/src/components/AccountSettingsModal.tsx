import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { PrimaryButton } from './PrimaryButton';
import { TextInput } from './TextInput';

export interface AccountSettingsData {
  email: string;
  nome: string;
  sobrenome: string;
  data_nascimento: string;
  documento: string;
  endereco: string;
  telefone: string;
  sexo: string;
  nacionalidade: string;
}

interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
  initial: AccountSettingsData;
  onSave: (data: AccountSettingsData) => Promise<void> | void;
  saving?: boolean;
}

export function AccountSettingsModal({ open, onClose, initial, onSave, saving }: AccountSettingsModalProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState(initial.email);
  const [nome, setNome] = useState(initial.nome);
  const [sobrenome, setSobrenome] = useState(initial.sobrenome);
  const [dataNascimento, setDataNascimento] = useState(initial.data_nascimento);
  const [documento, setDocumento] = useState(initial.documento);
  const [endereco, setEndereco] = useState(initial.endereco);
  const [telefone, setTelefone] = useState(initial.telefone);
  const [sexo, setSexo] = useState(initial.sexo);
  const [nacionalidade, setNacionalidade] = useState(initial.nacionalidade);

  useEffect(() => {
    if (open) {
      setEmail(initial.email);
      setNome(initial.nome);
      setSobrenome(initial.sobrenome);
      setDataNascimento(initial.data_nascimento);
      setDocumento(initial.documento);
      setEndereco(initial.endereco);
      setTelefone(initial.telefone);
      setSexo(initial.sexo);
      setNacionalidade(initial.nacionalidade);
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ email, nome, sobrenome, data_nascimento: dataNascimento, documento, endereco, telefone, sexo, nacionalidade });
  };

  const labelStyle: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(18, 26, 47, 0.85)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)', padding: '24px'
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: '24px', padding: '36px', maxWidth: '520px', width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)', boxSizing: 'border-box',
        maxHeight: '92vh', overflowY: 'auto'
      }} className="fade-in">
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          {t('web_account_settings_title') || 'Configurações de Conta'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 24px' }}>
          {t('web_account_settings_subtitle') || 'Seus dados pessoais e de contato.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>{t('web_account_settings_email') || 'Email'}</label>
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>{t('web_account_settings_nome') || 'Nome'}</label>
              <TextInput type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{t('web_account_settings_sobrenome') || 'Sobrenome'}</label>
              <TextInput type="text" value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>{t('web_account_settings_nascimento') || 'Data de Nascimento'}</label>
              <TextInput type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{t('web_account_settings_documento') || 'Documento'}</label>
              <TextInput type="text" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="CPF / RG / DNI" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('web_account_settings_endereco') || 'Endereço'}</label>
            <TextInput type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>{t('web_account_settings_telefone') || 'Telefone'}</label>
              <TextInput type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{t('web_account_settings_nacionalidade') || 'Nacionalidade'}</label>
              <TextInput type="text" value={nacionalidade} onChange={(e) => setNacionalidade(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('web_account_settings_sexo') || 'Sexo'}</label>
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              style={{
                width: '100%', padding: '14px', background: 'var(--bg-color)',
                border: '1px solid var(--card-border)', borderRadius: '12px',
                color: 'var(--text-primary)', fontSize: '0.95rem', boxSizing: 'border-box'
              }}
            >
              <option value="">{t('web_account_settings_sexo_choose') || 'Selecione...'}</option>
              <option value="masculino">{t('web_account_settings_sexo_masculino') || 'Masculino'}</option>
              <option value="feminino">{t('web_account_settings_sexo_feminino') || 'Feminino'}</option>
              <option value="outro">{t('web_account_settings_sexo_outro') || 'Outro'}</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '18px', marginTop: '12px' }}>
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
            <PrimaryButton type="submit" style={{ flex: 1, borderRadius: '12px' }} disabled={saving}>
              {saving ? (t('web_avatar_uploading') || 'Salvando...') : (t('web_save_changes') || 'Salvar Alterações')}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
