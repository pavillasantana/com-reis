/**
 * ─── Camada de Configuração — Web (Vite) ──────────────────────────────────
 * Centraliza o acesso a variáveis de ambiente do Vite.
 * Os componentes NÃO devem chamar import.meta.env diretamente; importe daqui.
 *
 * O Vite está configurado com `envDir: '../'` em vite.config.ts, portanto
 * lê o .env na RAIZ do monorepo (/ComRéis/.env) — fonte única de verdade.
 *
 * IMPORTANTE: O Vite exige que variáveis expostas ao cliente comecem com
 * VITE_ por padrão. Como as nossas usam EXPO_PUBLIC_, adicionamos o prefixo
 * à lista de prefixos permitidos via `envPrefix` no vite.config.ts.
 * ─────────────────────────────────────────────────────────────────────────
 */

const env = import.meta.env;

// ─── Supabase ──────────────────────────────────────────────────────────────
export const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ─── Brapi (cotações de ativos) ────────────────────────────────────────────
// Token movido para Edge Function brapi-proxy (HIGH-02 fix)
// O token não deve estar no bundle do client.

// ─── Mercado Pago ──────────────────────────────────────────────────────────
// ⚠️ SEGURANÇA: O token do Mercado Pago NUNCA deve estar no bundle do client.
// Use-o apenas em Edge Functions (mercadopago-webhook, mercadopago-create-payment).
// Se precisar validá-lo no client, faça via uma Edge Function de proxy.
// export const MP_ACCESS_TOKEN = env.MP_ACCESS_TOKEN ?? ''; // SERVER-ONLY — NÃO EXPOR

// ─── Sentry (monitoramento de erros) ──────────────────────────────────────
// Sentry e App Version ainda usam VITE_ (específicos da web, sem paralelo mobile)
export const SENTRY_DSN = env.VITE_SENTRY_DSN ?? '';
export const APP_VERSION = env.VITE_APP_VERSION ?? '0.1.0';

// ─── AdSense (Web) — desativado até configurar publisher ID real ───────────
export const ADSENSE_CLIENT_ID = env.VITE_ADSENSE_CLIENT_ID ?? '';

// ─── Validação em desenvolvimento ─────────────────────────────────────────
if (env.DEV) {
  const required: Record<string, string> = {
    EXPO_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  };
  Object.entries(required).forEach(([key, val]) => {
    if (!val) {
      console.warn(`[config] ⚠️  Variável de ambiente ausente: ${key}`);
    }
  });

  // ⚠️ Alerta de segurança: verificar que segredos reais não estão com EXPO_PUBLIC_
  if (env.EXPO_PUBLIC_MP_ACCESS_TOKEN) {
    console.warn(
      '[config] 🚨 SEGURANÇA: EXPO_PUBLIC_MP_ACCESS_TOKEN detectado! ' +
      'Remova esta variável — o token do Mercado Pago não deve estar no bundle do client.'
    );
  }
}
