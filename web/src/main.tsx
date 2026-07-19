import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import { I18nProvider } from './i18n';
import { initSentry } from './lib/sentry';
import './index.css';
import './GlobalStyles.css';
import App from './App.tsx';


// Inicia Sentry antes de tudo (captura erros desde o início)
initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>
);
