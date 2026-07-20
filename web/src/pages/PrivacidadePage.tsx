import { Layout } from './Layout';
import { useI18n } from '../i18n';

export function PrivacidadePage() {
  const { t } = useI18n();

  const sections = [
    { title: t('web_privacy_data_collected'), body: t('web_privacy_data_collected_desc') },
    { title: t('web_privacy_data_usage'), body: t('web_privacy_data_usage_desc') },
    { title: t('web_privacy_data_security'), body: t('web_privacy_data_security_desc') },
    { title: t('web_privacy_user_rights'), body: t('web_privacy_user_rights_desc') },
    { title: t('web_privacy_data_sharing'), body: t('web_privacy_data_sharing_desc') },
    { title: t('web_privacy_contact'), body: t('web_privacy_contact_desc') },
  ];

  return (
    <Layout meta={{
      title: `${t('web_privacy_title')} — Com Réis`,
      description: t('web_privacy_intro'),
      canonical: 'https://comreis.com/privacidade',
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>{t('web_privacy_title')}</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>
        {t('web_privacy_last_updated')} 20/07/2026
      </p>

      <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '32px' }}>
        {t('web_privacy_intro')}
      </p>

      {sections.map((section) => (
        <section key={section.title} style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
            {section.title}
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            {section.body}
          </p>
        </section>
      ))}
    </Layout>
  );
}
