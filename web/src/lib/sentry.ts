
import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN não configurado. Monitoramento de erros desativado.');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' | 'production'
    release: import.meta.env.VITE_APP_VERSION || '0.1.0',

    // Rastreia 100% dos erros em produção
    sampleRate: 1.0,

    // Rastreia 10% das sessões de performance (Core Web Vitals)
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,    // Privacidade: mascara texto sensível
        blockAllMedia: false,
      }),
    ],

    // Não captura erros de extensões do browser
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ChunkLoadError',
    ],
  });
}

/**
 * Captura um erro manualmente com contexto adicional.
 * Use em blocos catch de chamadas de API externas.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.setContext('extra', context);
  }
  Sentry.captureException(error);
}
