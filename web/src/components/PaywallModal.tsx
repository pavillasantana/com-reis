import React from 'react';
import { Check, Lock, Sparkles, X, Zap } from 'lucide-react';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { useAppConfig } from '../hooks/useAppConfig';

const PREMIUM_FEATURES = [
  'Metas de poupança ilimitadas com progresso visual',
  'Importação de extratos bancários (PDF, CSV, OFX, XLSX)',
  'Espaços PF + PJ separados no mesmo app',
  'Explorador de Custo de Vida com mapa interativo do IBGE',
  'Cotações de moedas em tempo real (USD, EUR, GBP...)',
  'Experiência sem anúncios',
];

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  onUpgrade: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, reason, onUpgrade }) => {
  const { premium_preco, premium_preco_anual } = useAppConfig();
  const precoMensal = premium_preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const precoAnual = premium_preco_anual.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const economia = (premium_preco * 12) - premium_preco_anual;
  const economiaPercent = Math.round((economia / (premium_preco * 12)) * 100);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card
        style={{
          maxWidth: '440px', width: '100%',
          border: '1px solid var(--accent-blue)',
          position: 'relative', overflow: 'visible',
        }}
        className="fade-in"
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.05)', border: 'none',
            borderRadius: '50%', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', padding: '8px 0 0' }}>
          <div
            style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.15), rgba(99, 102, 241, 0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 20px rgba(0, 210, 255, 0.15)',
            }}
          >
            <Sparkles size={32} color="var(--accent-blue)" />
          </div>

          <Lock size={20} color="#FFB800" style={{ marginBottom: '8px' }} />

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>
            Desbloqueie o Com Réis Premium
          </h3>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
            {reason}
          </p>

          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Com Premium você ganha:
            </div>
            {PREMIUM_FEATURES.map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div
                  style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'rgba(74, 222, 128, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Check size={12} color="var(--accent-green)" />
                </div>
                {feat}
              </div>
            ))}
          </div>

          {/* Plan options */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{
              flex: 1, padding: '14px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Mensal</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>R$ {precoMensal}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/mês</div>
            </div>
            <div style={{
              flex: 1, padding: '14px 8px', borderRadius: '12px', border: '2px solid var(--accent-green)',
              background: 'rgba(74, 222, 128, 0.06)', textAlign: 'center', position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--accent-green)', color: '#000', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '8px' }}>
                -{economiaPercent}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                Anual <Zap size={10} />
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>R$ {precoAnual}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ano</div>
            </div>
          </div>

          <PrimaryButton onClick={onUpgrade} style={{ width: '100%', marginBottom: '12px' }}>
            Assinar Premium
          </PrimaryButton>

          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, padding: '12px',
            }}
          >
            Continuar no Plano Gratuito
          </button>
        </div>
      </Card>
    </div>
  );
};
