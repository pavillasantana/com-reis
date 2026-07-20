import { Layout } from './Layout';
import { useI18n } from '../i18n';

export function TermosPage() {
  const { t } = useI18n();

  return (
    <Layout meta={{
      title: `${t('terms_of_use')} — Com Réis`,
      description: t('web_terms_intro'),
      canonical: 'https://comreis.com/termos',
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>{t('terms_of_use')}</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>
        {t('web_privacy_last_updated')} 20/07/2026
      </p>

      <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '28px' }}>
        {t('web_terms_intro')}
      </p>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{t('web_terms_acceptance_title')}</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          {t('web_terms_acceptance')}
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{t('web_terms_account_title')}</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          {t('web_terms_account')}
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{t('web_terms_usage_title')}</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          {t('web_terms_usage')}
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{t('web_terms_ip_title')}</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          {t('web_terms_ip')}
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{t('web_terms_liability_title')}</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          {t('web_terms_liability')}
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{t('web_terms_changes_title')}</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          {t('web_terms_changes')}
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{t('web_terms_contact_title')}</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          {t('web_terms_contact')}
        </p>
      </section>
    </Layout>
  );
}
