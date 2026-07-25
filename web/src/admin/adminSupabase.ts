/**
 * adminSupabase.ts — Cliente Supabase isolado para o Painel Admin
 *
 * Usa storageKey diferente para NÃO compartilhar sessão com o portal do cliente.
 * Mesmo domínio, mesmas credenciais de auth, mas localStorage separado.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storageKey: 'sb-comreis-admin',
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : (null as any);
