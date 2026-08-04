import React from 'react';
import { Card } from './Card';
import { TextInput } from './TextInput';
import { PrimaryButton } from './PrimaryButton';

interface CaixinhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalName: string;
  setGoalName: (v: string) => void;
  goalTarget: string;
  setGoalTarget: (v: string) => void;
  goalPrazo: string;
  setGoalPrazo: (v: string) => void;
  moedaBase: string;
  onSubmit: (e: React.FormEvent) => void;
  title?: string;
  submitText?: string;
}

export const CaixinhaModal: React.FC<CaixinhaModalProps> = ({
  isOpen,
  onClose,
  goalName,
  setGoalName,
  goalTarget,
  setGoalTarget,
  goalPrazo,
  setGoalPrazo,
  moedaBase,
  onSubmit,
  title = 'Criar Nova Caixinha (Meta)',
  submitText = 'Criar Meta'
}) => {
  if (!isOpen) return null;

  const targetNum = parseFloat(goalTarget);
  const prazoNum = parseInt(goalPrazo, 10);
  const mensal = (!isNaN(targetNum) && targetNum > 0 && !isNaN(prazoNum) && prazoNum > 0)
    ? targetNum / prazoNum
    : null;

  return (
    <div className="modal-overlay-mangos">
      <Card className="modal-content-mangos fade-in">
        <h3 className="modal-title-mangos">{title}</h3>
        
        <form onSubmit={onSubmit} className="modal-form-mangos">
          <div className="form-group-mangos">
            <label className="form-label-mangos">Nome do Objetivo</label>
            <TextInput value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Ex: Comprar Notebook, Viagem" required />
          </div>

          <div className="form-group-mangos">
            <label className="form-label-mangos">Valor Alvo ({moedaBase})</label>
            <TextInput type="number" step="0.01" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="0.00" required />
          </div>

          <div className="form-group-mangos">
            <label className="form-label-mangos">Prazo (meses)</label>
            <TextInput type="number" min="1" step="1" value={goalPrazo} onChange={e => setGoalPrazo(e.target.value)} placeholder="Ex: 12" />
            {mensal !== null && (
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--accent-green)' }}>
                Guarde {mensal.toLocaleString('pt-BR', { style: 'currency', currency: moedaBase === 'USD' ? 'USD' : moedaBase === 'EUR' ? 'EUR' : 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })} por mês para atingir a meta em {prazoNum} {prazoNum === 1 ? 'mês' : 'meses'}.
              </p>
            )}
          </div>

          <div className="modal-actions-mangos">
            <button type="button" onClick={onClose} className="btn-secondary-mangos">
              Cancelar
            </button>
            <PrimaryButton type="submit" className="flex-1-mangos">
              {submitText}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
};

