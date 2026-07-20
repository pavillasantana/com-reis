import { Layout } from './Layout';
import { useI18n } from '../i18n';

const TELEGRAM_URL = 'https://t.me/comreisbot';

export function PrecosPage() {
  const { t } = useI18n();

  return (
    <Layout meta={{
      title: `Planos e Preços — Com Réis`,
      description: t('web_pricing_meta_desc'),
      canonical: 'https://comreis.com/precos',
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>{t('web_pricing_title')}</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '48px', textAlign: 'center', maxWidth: '520px', margin: '0 auto 48px' }}>
        {t('web_pricing_subtitle')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '700px', margin: '0 auto' }}>
        {/* FREE */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '20px',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>Free</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>{t('web_pricing_free_desc')}</p>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '24px' }}>
            R$ 0 <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {t('web_pricing_month')}</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {[
              t('web_pricing_free_f1'),
              t('web_pricing_free_f2'),
              t('web_pricing_free_f3'),
              t('web_pricing_free_f4'),
            ].map((f, i) => (
              <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <a href="/" style={{
            display: 'block', textAlign: 'center', marginTop: '24px',
            padding: '14px', borderRadius: '12px',
            border: '1px solid var(--card-border)',
            color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem',
            textDecoration: 'none', transition: 'background 0.2s',
          }}>{t('web_pricing_free_cta')}</a>
        </div>

        {/* PREMIUM */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(0,210,255,0.08) 100%)',
          border: '2px solid var(--accent-green)',
          borderRadius: '20px',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--accent-green)', color: '#fff', fontSize: '0.7rem', fontWeight: 700,
            padding: '4px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>{t('web_pricing_popular')}</div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px', color: 'var(--accent-green)' }}>Premium</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>{t('web_pricing_premium_desc')}</p>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '4px' }}>
            R$ 9,90 <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {t('web_pricing_month')}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {t('web_pricing_annual')} R$ 99,00 ({t('web_pricing_annual_save')})
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {[
              t('web_pricing_premium_f1'),
              t('web_pricing_premium_f2'),
              t('web_pricing_premium_f3'),
              t('web_pricing_premium_f4'),
              t('web_pricing_premium_f5'),
              t('web_pricing_premium_f6'),
            ].map((f, i) => (
              <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <a href="/" style={{
            display: 'block', textAlign: 'center', marginTop: '24px',
            padding: '14px', borderRadius: '12px',
            background: 'var(--accent-green)', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            textDecoration: 'none', transition: 'opacity 0.2s',
          }}>{t('web_pricing_premium_cta')}</a>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {t('web_pricing_question')}{' '}
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
          {t('web_pricing_contact_telegram')}
        </a>
      </p>
    </Layout>
  );
}
