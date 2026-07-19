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
  moedaBase,
  onSubmit,
  title = 'Criar Nova Caixinha (Meta)',
  submitText = 'Criar Meta'
}) => {
  if (!isOpen) return null;

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

