import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Check if the user opted to remember credentials
const storage = window.localStorage.getItem('lembrar_credenciais') === 'true'
  ? window.localStorage
  : window.sessionStorage;

// Inicializa o cliente se as variáveis estiverem disponíveis. Caso contrário, exporta um cliente dummy.
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : (null as any);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase não configurado. O aplicativo funcionará em modo demonstração local (Offline/Local State).'
  );
}
