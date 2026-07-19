/**
 * FAQTermos.tsx — Telas estáticas de Ajuda/FAQ e Política de Privacidade (LGPD)
 * Phase 1: Infraestrutura e Segurança
 */
import { useState } from 'react';

import { ChevronDown, ChevronUp, Shield, HelpCircle, X } from 'lucide-react';
import { useI18n } from '../i18n';

// ─── FAQ ────────────────────────────────────────────────────────────────────

export function FAQModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const FAQ_ITEMS = [
    {
      q: t('web_faq_q1'),
      a: t('web_faq_a1')
    },
    {
      q: t('web_faq_q2'),
      a: t('web_faq_a2')
    },
    {
      q: t('web_faq_q3'),
      a: t('web_faq_a3')
    },
    {
      q: t('web_faq_q4'),
      a: t('web_faq_a4')
    },
    {
      q: t('web_faq_q5'),
      a: t('web_faq_a5')
    },
    {
      q: t('web_faq_q6'),
      a: t('web_faq_a6')
    }
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-glass)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', fontWeight: 800 }}>
            <HelpCircle size={24} color="var(--accent-blue)" />
            {t('web_faq_title')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--card-border)',
                borderRadius: '16px',
                overflow: 'hidden',
                border: openIndex === idx ? '1px solid var(--accent-blue)' : '1px solid transparent',
                transition: 'border-color 0.2s'
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textAlign: 'left',
                  gap: '12px'
                }}
              >
                <span>{item.q}</span>
                {openIndex === idx
                  ? <ChevronUp size={18} color="var(--accent-blue)" />
                  : <ChevronDown size={18} color="var(--text-muted)" />
                }
              </button>
              {openIndex === idx && (
                <div style={{
                  padding: '0 20px 20px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  lineHeight: '1.7'
                }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <p style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {t('web_faq_contact')}
        </p>
      </div>
    </div>
  );
}

// ─── TERMOS DE PRIVACIDADE ───────────────────────────────────────────────────

export function TermosModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  const PRIVACY_SECTIONS = [
    {
      title: t('web_privacy_data_collected'),
      body: t('web_privacy_data_collected_desc')
    },
    {
      title: t('web_privacy_data_usage'),
      body: t('web_privacy_data_usage_desc')
    },
    {
      title: t('web_privacy_data_security'),
      body: t('web_privacy_data_security_desc')
    },
    {
      title: t('web_privacy_user_rights'),
      body: t('web_privacy_user_rights_desc')
    },
    {
      title: t('web_privacy_data_sharing'),
      body: t('web_privacy_data_sharing_desc')
    },
    {
      title: t('web_privacy_contact'),
      body: t('web_privacy_contact_desc')
    }
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '720px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-glass)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', fontWeight: 800 }}>
            <Shield size={24} color="var(--accent-green)" />
            {t('web_privacy_title')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={22} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          {t('web_privacy_last_updated')}
        </p>

        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.title} style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              {section.title}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
