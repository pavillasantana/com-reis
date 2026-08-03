import { useI18n } from '../i18n';

interface ConfiguracoesViewProps {
  nome: string | null;
  email: string | null;
  avatarUrl: string | null;
  plano: string;
  onOpenEditProfile: () => void;
  onOpenAccountSettings: () => void;
  onOpenChangePassword: () => void;
  onOpenTagsManager: () => void;
  onOpenExport: () => void;
}

export function ConfiguracoesView({
  nome, email, avatarUrl, plano,
  onOpenEditProfile, onOpenAccountSettings, onOpenChangePassword, onOpenTagsManager, onOpenExport,
}: ConfiguracoesViewProps) {
  const { t } = useI18n();

  const cardStyle = (icon: string, title: string, desc: string, onClick: () => void, danger = false) => ({
    card: (
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '16px', padding: '18px',
          background: 'var(--bg-color)', border: '1px solid var(--card-border)',
          borderRadius: '16px', cursor: 'pointer', width: '100%', textAlign: 'left',
          transition: 'all 0.2s', color: danger ? 'var(--color-danger)' : 'var(--text-primary)'
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(0,210,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: danger ? 'var(--color-danger)' : 'var(--accent-blue)' }}>{icon}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{desc}</div>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>chevron_right</span>
      </button>
    )
  });

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-green) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          border: '1px solid var(--card-border)'
        }}>
          {avatarUrl && avatarUrl.startsWith('http') ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span className="text-dark-mangos" style={{ fontSize: '30px', fontWeight: 'bold' }}>
              {(nome || 'M').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            {t('web_settings_title') || 'Configuração e Gestão da Conta'}
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {nome || 'Usuário'}{email ? ` · ${email}` : ''}
          </div>
          <span style={{
            display: 'inline-block', marginTop: '8px', fontSize: '0.7rem',
            background: plano === 'premium' ? 'var(--accent-green-glow)' : 'var(--card-border)',
            color: plano === 'premium' ? 'var(--accent-green)' : 'var(--text-secondary)',
            padding: '3px 10px', borderRadius: '8px', fontWeight: 700
          }}>
            {plano.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {cardStyle('edit', t('web_settings_edit_profile') || 'Editar Perfil', t('web_settings_edit_profile_desc') || 'Nome, renda mensal, profissão e fonte de renda.', onOpenEditProfile).card}
        {cardStyle('badge', t('web_settings_account') || 'Configurações de Conta', t('web_settings_account_desc') || 'Dados pessoais: nascimento, documento, endereço, telefone e mais.', onOpenAccountSettings).card}
        {cardStyle('key', t('web_settings_password') || 'Alterar Senha', t('web_settings_password_desc') || 'Atualize sua senha de acesso ao Com Réis.', onOpenChangePassword).card}
        {cardStyle('sell', t('web_settings_tags') || 'Tags de Gastos', t('web_settings_tags_desc') || 'Crie e organize tags para categorizar lançamentos.', onOpenTagsManager).card}
        {cardStyle('download', t('web_settings_export') || 'Exportar Relatórios', t('web_settings_export_desc') || 'Exporte suas transações em CSV ou JSON.', onOpenExport).card}
      </div>
    </div>
  );
}
