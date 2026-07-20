import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Layout } from './Layout';
import { useI18n } from '../i18n';

const TELEGRAM_URL = 'https://t.me/comreisbot';

export function LandingFAQPage() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const FAQ_ITEMS = [
    { q: t('web_faq_q1'), a: t('web_faq_a1') },
    { q: t('web_faq_q2'), a: t('web_faq_a2') },
    { q: t('web_faq_q3'), a: t('web_faq_a3') },
    { q: t('web_faq_q4'), a: t('web_faq_a4') },
    { q: t('web_faq_q5'), a: t('web_faq_a5') },
    { q: t('web_faq_q6'), a: t('web_faq_a6') },
  ];

  return (
    <Layout meta={{
      title: `Perguntas Frequentes — Com Réis`,
      description: t('web_faq_meta_desc'),
      canonical: 'https://comreis.com/faq',
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>{t('web_faq_title')}</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '40px', textAlign: 'center' }}>
        {t('web_faq_subtitle')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '680px', margin: '0 auto' }}>
        {FAQ_ITEMS.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--card-bg)',
              border: openIndex === idx ? '1px solid var(--accent-blue)' : '1px solid var(--card-border)',
              borderRadius: '16px',
              overflow: 'hidden',
              transition: 'border-color 0.2s',
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
                gap: '12px',
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
                lineHeight: '1.7',
              }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <p style={{ marginTop: '32px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        {t('web_faq_contact')}{' '}
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
          @comreisbot
        </a>
      </p>
    </Layout>
  );
}
