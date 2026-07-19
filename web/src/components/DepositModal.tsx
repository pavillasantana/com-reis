import React, { useState } from 'react';
import { TextInput } from './TextInput';
import { PrimaryButton } from './PrimaryButton';

interface DepositModalProps {
  goalName: string;
  currentSaved: number;
  target: number;
  currencySymbol?: string;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}

/**
 * DepositModal — Substitui o window.prompt() ao depositar em caixinhas.
 * Modal glassmorphism inline, consistente com o design system dark mode.
 */
export function DepositModal({
  goalName,
  currentSaved,
  target,
  currencySymbol = 'R$',
  onConfirm,
  onClose,
}: DepositModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const remaining = Math.max(0, target - currentSaved);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(value.replace(',', '.'));

    if (isNaN(num) || num <= 0) {
      setError('Digite um valor maior que zero.');
      return;
    }
    if (num > remaining + 0.01) {
      setError(`Valor excede o restante da meta (${currencySymbol} ${remaining.toFixed(2)}).`);
      return;
    }

    onConfirm(num);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deposit-title"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--modal-overlay)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '1500, padding: 24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-card fade-in"
        style={{ maxWidth: '380px', width: '100%' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px'}}>
          <div style={{
            width: '36px, height: 36px, borderRadius: 50%',
            background: 'rgba(0, 245, 160, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>
            🐷
          </div>
          <div>
            <h3 id="deposit-title" style={{ margin: 0, fontSize: '1.1rem' }}>
              Depositar na Caixinha
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {goalName}
            </p>
          </div>
        </div>

        {/* Progresso resumido */}
        <div style={{
          padding: '18px, background: rgba(255,255,255,0.02)',
          borderRadius: '10px, marginBottom: 20px',
          display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem',
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Guardado: <strong style={{ color: 'var(--accent-green)' }}>
              {currencySymbol} {currentSaved.toFixed(2)}
            </strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Falta: <strong style={{ color: 'var(--text-primary)' }}>
              {currencySymbol} {remaining.toFixed(2)}
            </strong>
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
          <div>
            <label htmlFor="deposit-amount" style={{
              fontSize: '0.8rem', color: 'var(--text-secondary)',
              display: 'block', marginBottom: '6px',
            }}>
              Quanto deseja depositar? ({currencySymbol})
            </label>
            <TextInput
              id="deposit-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              autoFocus
              required
            />
            {error && (
              <p role="alert" style={{
                margin: '6px 0 0, fontSize: 0.78rem',
                color: 'var(--color-danger)',
              }}>
                {error}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '15px'}}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-secondary)',
                padding: '18px, borderRadius: 14px',
                cursor: 'pointer', fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
            <PrimaryButton type="submit" style={{ flex: 1 }}>
              Depositar
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
