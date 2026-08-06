import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useI18n } from '../i18n';

const DISMISS_KEY = 'comreis_profile_banner_dismissed_v1';

interface BannerState {
  nome_usuario: string | null;
  sobrenome: string | null;
  profissao: string | null;
  fonte_renda: string | null;
  data_nascimento: string | null;
  documento: string | null;
  endereco: string | null;
  telefone: string | null;
  sexo: string | null;
  nacionalidade: string | null;
  renda_principal: number;
  transacoes: { tipo: 'receita' | 'despesa' }[];
}

function selectBannerState(s: ReturnType<typeof useStore.getState>): BannerState {
  return {
    nome_usuario: s.nome_usuario,
    sobrenome: s.sobrenome,
    profissao: s.profissao,
    fonte_renda: s.fonte_renda,
    data_nascimento: s.data_nascimento,
    documento: s.documento,
    endereco: s.endereco,
    telefone: s.telefone,
    sexo: s.sexo,
    nacionalidade: s.nacionalidade,
    renda_principal: s.renda_principal,
    transacoes: s.transacoes,
  };
}

interface ProfileCompletionBannerProps {
  onGoSettings?: () => void;
}

export function ProfileCompletionBanner({ onGoSettings }: ProfileCompletionBannerProps) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const state = useStore(useShallow(selectBannerState));

  const { completion, checks } = useMemo(() => {
    const personal = [
      !!state.nome_usuario,
      !!state.sobrenome,
      !!state.profissao,
      !!state.fonte_renda,
      !!state.data_nascimento,
      !!state.documento,
      !!state.endereco,
      !!state.telefone,
      !!state.sexo,
      !!state.nacionalidade,
      state.renda_principal > 0,
    ];
    const personalDone = personal.filter(Boolean).length;
    const hasDespesas = state.transacoes.some((tx) => tx.tipo === 'despesa');
    const hasReceitas = state.transacoes.some((tx) => tx.tipo === 'receita');
    const areasDone = (personalDone / personal.length) + (hasDespesas ? 1 : 0) + (hasReceitas ? 1 : 0);
    return {
      completion: Math.min(100, Math.round((areasDone / 3) * 100)),
      checks: {
        personal: personalDone / personal.length >= 0.5,
        despesas: hasDespesas,
        receitas: hasReceitas,
      },
    };
  }, [state]);

  if (dismissed || completion >= 100) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  const goToSettings = () => {
    if (onGoSettings) {
      onGoSettings();
      return;
    }
    const sidebarBtn = document.querySelector<HTMLButtonElement>('[data-nav-view="configuracoes"]');
    sidebarBtn?.click();
  };

  return (
    <div
      className="card-mangos"
      style={{
        position: 'relative',
        padding: '16px 20px',
        marginBottom: '24px',
        border: '1px solid var(--card-border)',
        background: 'var(--card-bg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            {t('profile_completion_title')}
          </span>
          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {t('profile_completion_desc')}
          </span>
        </div>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-blue)', whiteSpace: 'nowrap' }}>
          {completion}%
        </span>
      </div>

      <div style={{ height: '8px', borderRadius: '4px', background: 'var(--card-border)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${completion}%`,
            borderRadius: '4px',
            background: 'var(--accent-blue)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
        {[
          { done: checks.personal, label: t('profile_completion_personal') },
          { done: checks.despesas, label: t('profile_completion_expenses') },
          { done: checks.receitas, label: t('profile_completion_incomes') },
        ].map((item) => (
          <span
            key={item.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: item.done ? 'var(--text-main)' : 'var(--text-secondary)',
            }}
          >
            <span
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 800,
                color: '#fff',
                background: item.done ? 'var(--success, #22c55e)' : 'var(--card-border)',
              }}
            >
              {item.done ? '✓' : '•'}
            </span>
            {item.label}
          </span>
        ))}

        <button
          type="button"
          onClick={goToSettings}
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: 'var(--accent-blue)',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          {t('profile_completion_go_settings')}
        </button>
      </div>

      <button
        type="button"
        onClick={dismiss}
        style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.75rem',
          padding: '6px 8px',
        }}
        aria-label={t('profile_completion_dismiss')}
      >
        ✕
      </button>
    </div>
  );
}
