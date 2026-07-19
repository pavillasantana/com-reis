import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, RotateCcw } from 'lucide-react';

interface ConfigItem {
  key: string;
  label: string;
  description: string;
  type: 'toggle' | 'number' | 'text';
  defaultValue: string | boolean;
  value: string | boolean;
}

const DEFAULT_CONFIG: ConfigItem[] = [
  { key: 'premium_enabled', label: 'Premium Habilitado', description: 'Permitir novas assinaturas premium', type: 'toggle', defaultValue: true, value: true },
  { key: 'max_caixinhas_free', label: 'Caixinhas Máx. (Free)', description: 'Limite de caixinhas para usuários gratuitos', type: 'number', defaultValue: '3', value: '3' },
  { key: 'max_caixinhas_premium', label: 'Caixinhas Máx. (Premium)', description: 'Limite de caixinhas para premium (0 = ilimitado)', type: 'number', defaultValue: '0', value: '0' },
  { key: 'max_espacos_free', label: 'Espaços Máx. (Free)', description: 'Número máximo de espaços PF/PJ para free', type: 'number', defaultValue: '1', value: '1' },
  { key: 'max_espacos_premium', label: 'Espaços Máx. (Premium)', description: 'Número máximo de espaços para premium (0 = ilimitado)', type: 'number', defaultValue: '0', value: '0' },
  { key: 'cotacoes_enabled', label: 'Cotações ao Vivo', description: 'Habilitar cotações de moedas em tempo real', type: 'toggle', defaultValue: true, value: true },
  { key: 'explorer_enabled', label: 'Explorador de Custo de Vida', description: 'Mostrar Explorador de Custo de Vida no app', type: 'toggle', defaultValue: true, value: true },
  { key: 'investimentos_enabled', label: 'Investimentos', description: 'Habilitar aba de investimentos', type: 'toggle', defaultValue: true, value: true },
  { key: 'fluxo_pj_enabled', label: 'Fluxo PJ', description: 'Habilitar aba Fluxo PJ para espaços empresariais', type: 'toggle', defaultValue: true, value: true },
  { key: 'blog_enabled', label: 'Blog / Educação', description: 'Mostrar aba Blog e Educação Financeira', type: 'toggle', defaultValue: true, value: true },
  { key: 'premium_preco', label: 'Preço Premium Mensal (R$)', description: 'Preço mensal da assinatura premium', type: 'number', defaultValue: '9.90', value: '9.90' },
  { key: 'premium_preco_anual', label: 'Preço Premium Anual (R$)', description: 'Preço anual da assinatura premium (pacote 12 meses)', type: 'number', defaultValue: '99.00', value: '99.00' },
  { key: 'app_version', label: 'Versão do App', description: 'Versão exibida no painel do usuário', type: 'text', defaultValue: '1.0.0', value: '1.0.0' },
];

export function AdminConfig() {
  const [config, setConfig] = useState<ConfigItem[]>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    setLoadingConfig(true);
    try {
      const { data, error } = await supabase.from('app_config').select('*').single();
      if (error) {
        // Table might not exist
        setLoadingConfig(false);
        return;
      }
      if (data && data.config_json) {
        const parsed = typeof data.config_json === 'string'
          ? JSON.parse(data.config_json)
          : data.config_json;
        setConfig(prev => prev.map(item => ({
          ...item,
          value: parsed[item.key] ?? item.defaultValue,
        })));
      }
    } catch {
      // app_config table might not exist — use defaults
    }
    setLoadingConfig(false);
  }

  async function saveConfig() {
    setSaving(true);
    setSaveError('');
    const configObj: Record<string, string | boolean> = {};
    config.forEach(item => { configObj[item.key] = item.value; });

    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({
          id: 'main',
          config_json: configObj,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        setSaveError(`Erro ao salvar: ${error.message}. Verifique se a tabela app_config existe.`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err: any) {
      setSaveError(`Erro: ${err?.message || 'Falha ao salvar'}`);
    }
    setSaving(false);
  }

  function resetDefaults() {
    setConfig(prev => prev.map(item => ({ ...item, value: item.defaultValue })));
  }

  function updateValue(key: string, value: string | boolean) {
    setConfig(prev => prev.map(item => item.key === key ? { ...item, value } : item));
  }

  if (loadingConfig) {
    return <div className="admin-loading"><div className="admin-spinner" /> Carregando configurações...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Configurações</h2>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Ajuste global do aplicativo
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={resetDefaults} className="admin-btn admin-btn-secondary" style={{ gap: '6px' }}>
            <RotateCcw size={14} /> Padrões
          </button>
          <button onClick={saveConfig} disabled={saving} className="admin-btn admin-btn-primary" style={{ gap: '6px' }}>
            <Save size={14} /> {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {saveError && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', background: 'var(--admin-red-light)',
          color: 'var(--admin-red)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px',
        }}>{saveError}</div>
      )}

      <div className="admin-config-grid">
        <div className="admin-config-card">
          <h4>Features & Limites</h4>
          {config.filter(c => c.type === 'toggle').map(item => (
            <div key={item.key} className="admin-config-item">
              <div className="info">
                <div className="title">{item.label}</div>
                <div className="desc">{item.description}</div>
              </div>
              <button
                className={`admin-toggle ${item.value ? 'on' : 'off'}`}
                onClick={() => updateValue(item.key, !item.value)}
              />
            </div>
          ))}
        </div>

        <div className="admin-config-card">
          <h4>Limites & Valores</h4>
          {config.filter(c => c.type === 'number' || c.type === 'text').map(item => (
            <div key={item.key} className="admin-config-item">
              <div className="info">
                <div className="title">{item.label}</div>
                <div className="desc">{item.description}</div>
              </div>
              <input
                className="admin-input"
                type={item.type === 'number' ? 'number' : 'text'}
                value={String(item.value)}
                onChange={e => updateValue(item.key, e.target.value)}
                style={{ width: '120px', textAlign: 'right', padding: '6px 10px', fontSize: '0.82rem' }}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: '24px', padding: '16px 20px', borderRadius: '12px',
        background: 'var(--admin-accent-light)', fontSize: '0.82rem', color: 'var(--admin-text-secondary)',
      }}>
        <strong style={{ color: 'var(--admin-accent)' }}>Nota:</strong> As configurações são salvas na tabela <code>app_config</code> do Supabase.
        Se a tabela não existir, crie-a manualmente ou as configurações serão aplicadas apenas visualmente.
      </div>
    </div>
  );
}
