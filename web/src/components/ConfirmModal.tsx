import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const confirmColor = variant === 'danger' ? '#EF4444' : variant === 'warning' ? '#FFB400' : 'var(--accent-blue)';
  const confirmBg = variant === 'danger' ? 'rgba(239,68,68,0.15)' : variant === 'warning' ? 'rgba(255,180,0,0.15)' : 'rgba(0,210,255,0.15)';

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '16px',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--modal-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '20px',
          width: '100%', maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '24px 28px 20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--modal-text)' }}>
            {title}
          </h3>
          <p style={{ margin: '12px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--card-border)',
          display: 'flex', gap: '12px', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)',
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: confirmBg,
              border: 'none',
              color: confirmColor,
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
