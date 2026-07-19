import React from 'react';
import { Card } from './Card';
import { TextInput } from './TextInput';
import { PrimaryButton } from './PrimaryButton';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  txDesc: string;
  setTxDesc: (v: string) => void;
  txVal: string;
  setTxVal: (v: string) => void;
  txDate: string;
  setTxDate: (v: string) => void;
  txTipo: 'receita' | 'despesa';
  setTxTipo: (v: 'receita' | 'despesa') => void;
  txContaId: string;
  setTxContaId: (v: string) => void;
  txMoeda: string;
  setTxMoeda: (v: string) => void;
  txCat: string;
  setTxCat: (v: string) => void;
  activeAccounts: any[];
  activeCartoes: any[];
  txCartaoId: string;
  setTxCartaoId: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  txDesc,
  setTxDesc,
  txVal,
  setTxVal,
  txDate,
  setTxDate,
  txTipo,
  setTxTipo,
  txContaId,
  setTxContaId,
  txMoeda,
  setTxMoeda,
  txCat,
  setTxCat,
  activeAccounts,
  activeCartoes,
  txCartaoId,
  setTxCartaoId,
  onSubmit
}) => {
  if (!isOpen) return null;

  const selectedAccount = activeAccounts.find(a => a.id === txContaId);
  const showConversionNotice = selectedAccount && selectedAccount.moeda_conta !== txMoeda;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px',
    }}>
      <Card style={{ maxWidth: '450px', width: '100%' }} className="fade-in">
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Registrar Nova Transação</h3>
        
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Tipo</label>
            <div style={{ display: 'flex', background: 'rgba(30, 39, 61, 0.5)', padding: '6px', borderRadius: '12px'}}>
              <button
                type="button"
                onClick={() => setTxTipo('receita')}
                style={{
                  flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                  background: txTipo === 'receita' ? 'var(--accent-green)' : 'transparent',
                  color: txTipo === 'receita' ? '#000' : 'var(--text-secondary)'
                }}
              >
                Receita
              </button>
              <button
                type="button"
                onClick={() => setTxTipo('despesa')}
                style={{
                  flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                  background: txTipo === 'despesa' ? 'var(--color-danger)' : 'transparent',
                  color: txTipo === 'despesa' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Despesa
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Descrição</label>
            <TextInput value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="Ex: Supermercado PegMais" required />
          </div>

          <div className="rg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px'}}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Valor</label>
              <TextInput type="number" step="0.01" value={txVal} onChange={e => setTxVal(e.target.value)} placeholder="0.00" required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Data</label>
              <TextInput type="date" value={txDate} onChange={e => setTxDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Moeda da Transação</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF', 'AUD', 'CNY', 'MXN', 'ARS'].map(m => {
                const isSelected = txMoeda === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTxMoeda(m)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {showConversionNotice && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '-8px', opacity: 0.9 }}>
              * Será convertida de <strong>{txMoeda}</strong> para <strong>{selectedAccount.moeda_conta}</strong> na conta destino.
            </div>
          )}

          <div className="rg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px'}}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Conta / Carteira</label>
              <select className="select-input" value={txContaId} onChange={e => setTxContaId(e.target.value)}>
                {activeAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.nome_instituicao}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Categoria</label>
              <select className="select-input" value={txCat} onChange={e => setTxCat(e.target.value)}>
                <option value="Alimentação">Alimentação</option>
                <option value="Moradia">Moradia</option>
                <option value="Transporte">Transporte</option>
                <option value="Lazer">Lazer</option>
                <option value="Salário">Salário</option>
                <option value="Freelance">Freelance</option>
                <option value="Assinaturas">Assinaturas</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          {txTipo === 'despesa' && activeCartoes && activeCartoes.length > 0 && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Forma de Pagamento (Cartão de Crédito)
              </label>
              <select
                className="select-input"
                value={txCartaoId}
                onChange={e => setTxCartaoId(e.target.value)}
              >
                <option value="">Saldo da Conta (Dinheiro/Débito)</option>
                {activeCartoes.map(c => (
                  <option key={c.id} value={c.id}>
                    Cartão: {c.nome} (Fatura: BRL {c.fatura_atual.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '18px', marginTop: '10px'}}>
            <button type="button" onClick={onClose} style={{
              flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
              padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
            }}>
              Cancelar
            </button>
            <PrimaryButton type="submit" style={{ flex: 1 }}>
              Salvar
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
};
