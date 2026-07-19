import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';

interface AppConfig {
  premium_preco: number;
  premium_preco_anual: number;
}

const DEFAULT_CONFIG: AppConfig = {
  premium_preco: 9.90,
  premium_preco_anual: 99.00,
};

let cachedConfig: AppConfig | null = null;

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(cachedConfig || DEFAULT_CONFIG);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (cachedConfig) return;

    const fetchConfig = async () => {
      const { data } = await supabase.from('app_config').select('config_json').single();
      if (data?.config_json) {
        const parsed: AppConfig = {
          premium_preco: Number(data.config_json.premium_preco) || DEFAULT_CONFIG.premium_preco,
          premium_preco_anual: Number(data.config_json.premium_preco_anual) || DEFAULT_CONFIG.premium_preco_anual,
        };
        cachedConfig = parsed;
        setConfig(parsed);
      }
    };
    fetchConfig();
  }, []);

  return config;
}
