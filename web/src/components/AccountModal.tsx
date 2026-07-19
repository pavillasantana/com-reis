import React from 'react';
import { Card } from './Card';
import { TextInput } from './TextInput';
import { PrimaryButton } from './PrimaryButton';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  acName: string;
  setAcName: (v: string) => void;
  acCurrency: string;
  setAcCurrency: (v: string) => void;
  acBalance: string;
  setAcBalance: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  acName,
  setAcName,
  acCurrency,
  setAcCurrency,
  acBalance,
  setAcBalance,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)',
      display: 'flex, alignItems: center, justifyContent: center, zIndex: 1000, padding: 24px',
    }}>
      <Card style={{ maxWidth: '400px', width: '100%' }} className="fade-in">
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Criar Nova Conta Bancária</h3>
        
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Nome da Instituição</label>
            <TextInput value={acName} onChange={e => setAcName(e.target.value)} placeholder="Ex: Banco Itaú, Wise USD" required />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Moeda da Conta</label>
            <select className="select-input" value={acCurrency} onChange={e => setAcCurrency(e.target.value)}>
              <option value="BRL">Real Brasileiro (BRL)</option>
              <option value="USD">Dólar Americano (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">Libra Esterlina (GBP)</option>
              <option value="JPY">Iene Japonês (JPY)</option>
              <option value="CAD">Dólar Canadense (CAD)</option>
              <option value="CHF">Franco Suíço (CHF)</option>
              <option value="AUD">Dólar Australiano (AUD)</option>
              <option value="CNY">Yuan Chinês (CNY)</option>
              <option value="MXN">Peso Mexicano (MXN)</option>
              <option value="ARS">Peso Argentino (ARS)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Saldo Inicial</label>
            <TextInput type="number" step="0.01" value={acBalance} onChange={e => setAcBalance(e.target.value)} placeholder="0.00" />
          </div>

          <div style={{ display: 'flex', gap: '18px', marginTop: '10px'}}>
            <button type="button" onClick={onClose} style={{
              flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
              padding: '18px, borderRadius: 16px, cursor: pointer, fontWeight: 600',
            }}>
              Cancelar
            </button>
            <PrimaryButton type="submit" style={{ flex: 1 }}>
              Criar Conta
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
};
