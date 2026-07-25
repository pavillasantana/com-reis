import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { useI18n } from '../i18n';

const TELEGRAM_URL = 'https://t.me/comreisbot';

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
}

export function Layout({ children, meta }: { children: React.ReactNode; meta: PageMeta }) {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={meta.canonical} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={meta.canonical} />
        <meta property="og:type" content="website" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <header style={{
        borderBottom: '1px solid var(--card-border)',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            com<span style={{ color: 'var(--accent-blue)' }}>réis</span>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-blue)', marginLeft: '4px' }}></div>
          </div>
        </Link>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/precos" style={{
            color: location.pathname === '/precos' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
          }}>{t('web_landing_footer_pricing')}</Link>
          <Link to="/faq" style={{
            color: location.pathname === '/faq' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
          }}>FAQ</Link>
          <Link to="/privacidade" style={{
            color: location.pathname === '/privacidade' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
          }}>{t('web_landing_footer_privacy')}</Link>
          <Link to="/termos" style={{
            color: location.pathname === '/termos' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
          }}>{t('web_landing_footer_terms')}</Link>
          <Link to="/" style={{
            background: 'var(--accent-green)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}>{t('web_landing_create_free')}</Link>
        </nav>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {children}
      </main>

      <footer style={{
        borderTop: '1px solid var(--card-border)',
        padding: '32px 40px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <Link to="/privacidade" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t('web_landing_footer_privacy')}</Link>
          <Link to="/termos" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t('web_landing_footer_terms')}</Link>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t('web_landing_footer_contact')}</a>
        </div>
        <div>&copy; 2026 {t('web_landing_footer_copyright')}</div>
        <div style={{ marginTop: '6px', fontSize: '0.7rem', opacity: 0.5 }}>
          Desenvolvido por <a href="https://pstec.pavilasantana.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>PSTec</a>
        </div>
      </footer>
    </div>
  );
}
