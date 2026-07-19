/**
 * analytics.ts — Camada de rastreamento centralizada (GA4 via GTM + dataLayer)
 *
 * Uso:
 *   import { trackEvent, trackPageView } from './analytics';
 *   trackEvent('transaction_created', { type: 'despesa', category: 'Alimentação' });
 */

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

/** Garante que o dataLayer exista mesmo sem GTM carregado */
function getDataLayer(): unknown[] {
  if (typeof window === 'undefined') return [];
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

/**
 * Envia um evento genérico para o dataLayer (GTM / GA4).
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  getDataLayer().push({ event: eventName, ...params });
}

// ─── Eventos Específicos do Funil ────────────────────────────────────────────

/** Onboarding concluído (primeiro acesso real) */
export function trackOnboardingCompleted(currency: string): void {
  trackEvent('onboarding_completed', { currency });
}

/** Primeira transação registrada */
export function trackTransactionCreated(params: {
  type: 'receita' | 'despesa';
  category: string;
  currency: string;
}): void {
  trackEvent('transaction_created', params);
}

/** CSV/OFX/XLSX/PDF importado */
export function trackImportCompleted(count: number, format: 'csv' | 'ofx' | 'xlsx' | 'pdf'): void {
  trackEvent('import_completed', { count, format });
}

/** Usuário atingiu um paywall */
export function trackPaywallHit(feature: 'caixinhas' | 'multi_space' | 'explorer' | 'investments'): void {
  trackEvent('paywall_hit', { feature });
}

/** Checkout aberto */
export function trackCheckoutInitiated(method: 'card' | 'pix'): void {
  trackEvent('begin_checkout', {
    method,
    currency: 'BRL',
    value: 19.9,
    items: [{ item_id: 'comreis_premium_anual', item_name: 'Com Réis Premium Anual', price: 19.9 }],
  });
}

/** Upgrade Premium concluído */
export function trackPurchaseCompleted(method: 'card' | 'pix'): void {
  trackEvent('purchase', {
    method,
    transaction_id: `MNG-PRM-${Date.now()}`,
    currency: 'BRL',
    value: 19.9,
    items: [{ item_id: 'comreis_premium_anual', item_name: 'Com Réis Premium Anual', price: 19.9 }],
  });
}

/** Explorador de Custo de Vida consultado */
export function trackExplorerSearch(city: string, isPremium: boolean): void {
  trackEvent('explorer_search', { city, plan: isPremium ? 'premium' : 'free' });
}

/** Demo data carregado */
export function trackDemoLoaded(): void {
  trackEvent('demo_data_loaded');
}
