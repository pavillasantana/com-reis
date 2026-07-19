/**
 * ─── Camada de Configuração — Android (Expo) ──────────────────────────────
 * Centraliza o acesso a variáveis de ambiente do Expo (prefixo EXPO_PUBLIC_).
 * Os componentes NÃO devem chamar process.env diretamente; importe daqui.
 *
 * Variáveis são lidas do .env na raiz do monorepo (/ComRéis/.env).
 * O Expo injeta automaticamente todas as variáveis EXPO_PUBLIC_* em runtime.
 * ─────────────────────────────────────────────────────────────────────────
 */

const env = process.env;

// ─── Supabase ──────────────────────────────────────────────────────────────
export const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ─── Brapi (cotações de ativos) ────────────────────────────────────────────
// Token movido para Edge Function brapi-proxy (HIGH-02 fix)
// O token não deve estar no bundle do client.

// ─── Mercado Pago ──────────────────────────────────────────────────────────
// O token do Mercado Pago deve permanecer no servidor. Não exponha segredos
// com o prefixo EXPO_PUBLIC_ em builds do cliente.

// ─── AdMob (Mobile — apenas em builds nativos, não no Expo Go) ────────────
/** ID do banner AdMob para produção. Em __DEV__ use TestIds.BANNER do SDK. */
export const ADMOB_BANNER_ID = env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? '';

// ─── Validação em desenvolvimento ─────────────────────────────────────────
if (__DEV__) {
  const required: Record<string, string> = {
    EXPO_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  };
  Object.entries(required).forEach(([key, val]) => {
    if (!val) {
      console.warn(`[config] ⚠️  Variável de ambiente ausente: ${key}`);
    }
  });
}
