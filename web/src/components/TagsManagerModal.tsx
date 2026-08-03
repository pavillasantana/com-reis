import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { PrimaryButton } from './PrimaryButton';
import { TextInput } from './TextInput';

export interface TagManagerItem {
  id: string;
  nome: string;
  cor: string;
}

interface TagsManagerModalProps {
  open: boolean;
  onClose: () => void;
  tags: TagManagerItem[];
  onCreate: (nome: string, cor: string) => Promise<void> | void;
  onUpdate: (id: string, nome: string, cor: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

const COLORS = ['#6B7280', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'];

export function TagsManagerModal({ open, onClose, tags, onCreate, onUpdate, onDelete }: TagsManagerModalProps) {
  const { t } = useI18n();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState(COLORS[0]);

  if (!open) return null;

  const resetForm = () => {
    setNome('');
    setCor(COLORS[0]);
    setEditId(null);
    setEditNome('');
    setEditCor(COLORS[0]);
  };

  const handleCreate = () => {
    if (!nome.trim()) return;
    onCreate(nome.trim(), cor);
    resetForm();
  };

  const handleUpdate = (id: string) => {
    if (!editNome.trim()) return;
    onUpdate(id, editNome.trim(), editCor);
    setEditId(null);
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
          {t('web_tags_manager_title') || 'Tags de Gastos'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 24px' }}>
          {t('web_tags_manager_subtitle') || 'Crie e organize suas tags para categorizar lançamentos.'}
        </p>

        <label style={labelStyle}>{t('web_tags_manager_new') || 'Nova Tag'}</label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <TextInput
              type="text"
              placeholder={t('web_tags_manager_name_placeholder') || 'Ex: Mercado, Saúde, Lazer...'}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                style={{
                  width: '26px', height: '26px', borderRadius: '8px', background: c, border: 'none',
                  cursor: 'pointer', outline: cor === c ? '2px solid var(--accent-blue)' : '1px solid var(--card-border)',
                  outlineOffset: '2px'
                }}
              />
            ))}
          </div>
          <PrimaryButton type="button" onClick={handleCreate} style={{ borderRadius: '12px', padding: '12px 18px' }}>
            {t('web_tags_manager_add') || 'Adicionar'}
          </PrimaryButton>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {tags.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
              {t('web_tags_manager_empty') || 'Nenhuma tag cadastrada ainda.'}
            </p>
          ) : tags.map((tag) => (
            <div
              key={tag.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '12px'
              }}
            >
              <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: tag.cor, flexShrink: 0 }} />
              {editId === tag.id ? (
                <>
                  <div style={{ flex: 1 }}>
                    <TextInput type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditCor(c)}
                        style={{
                          width: '20px', height: '20px', borderRadius: '6px', background: c, border: 'none', cursor: 'pointer',
                          outline: editCor === c ? '2px solid var(--accent-blue)' : '1px solid var(--card-border)', outlineOffset: '1px'
                        }}
                      />
                    ))}
                  </div>
                  <button type="button" onClick={() => handleUpdate(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check</span>
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', flex: 1 }}>{tag.nome}</span>
                  <button
                    type="button"
                    onClick={() => { setEditId(tag.id); setEditNome(tag.nome); setEditCor(tag.cor); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    title={t('web_tags_manager_edit') || 'Editar'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(tag.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                    title={t('web_tags_manager_delete') || 'Excluir'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => { onClose(); resetForm(); }}
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
