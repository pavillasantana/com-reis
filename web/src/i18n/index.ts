import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import ptBR from './locales/pt-BR.json';
import ptPT from './locales/pt-PT.json';
import enUS from './locales/en-US.json';
import esES from './locales/es-ES.json';
import esAR from './locales/es-AR.json';
import frFR from './locales/fr-FR.json';
import itIT from './locales/it-IT.json';

export type Locale = 'pt-BR' | 'pt-PT' | 'en-US' | 'es-ES' | 'es-AR' | 'fr-FR' | 'it-IT';

const translations: Record<Locale, Record<string, string>> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  'en-US': enUS,
  'es-ES': esES,
  'es-AR': esAR,
  'fr-FR': frFR,
  'it-IT': itIT,
};

const STORAGE_KEY = 'comreis-locale';

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'pt-BR' || stored === 'pt-PT' || stored === 'en-US' || stored === 'es-ES' || stored === 'es-AR' || stored === 'fr-FR' || stored === 'it-IT')) {
      return stored;
    }
  } catch {}
  return 'pt-BR';
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'pt-BR',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = translations[locale]?.[key] ?? translations['pt-BR']?.[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return value;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português (BR)',
  'pt-PT': 'Português (PT)',
  'en-US': 'English (US)',
  'es-ES': 'Español (ES)',
  'es-AR': 'Español (AR)',
  'fr-FR': 'Français',
  'it-IT': 'Italiano',
};

export const LOCALES: Locale[] = ['pt-BR', 'pt-PT', 'en-US', 'es-ES', 'es-AR', 'fr-FR', 'it-IT'];