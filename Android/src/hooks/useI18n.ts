import { useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import ptBR from '../locales/pt-BR.json';
import enUS from '../locales/en-US.json';
import esES from '../locales/es-ES.json';
import esAR from '../locales/es-AR.json';
import ptPT from '../locales/pt-PT.json';
import frFR from '../locales/fr-FR.json';
import itIT from '../locales/it-IT.json';

const locales: Record<string, Record<string, string>> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  'en-US': enUS,
  'es-ES': esES,
  'es-AR': esAR,
  'fr-FR': frFR,
  'it-IT': itIT,
};

const fallback = 'pt-BR';

function detectLanguage(): string {
  try {
    const deviceLang = Localization.getLocales?.()?.[0]?.languageCode || 'pt';
    const deviceRegion = Localization.getLocales?.()?.[0]?.regionCode || '';

    if (deviceLang === 'en') return 'en-US';
    if (deviceLang === 'pt' && deviceRegion === 'PT') return 'pt-PT';
    if (deviceLang === 'pt') return 'pt-BR';
    if (deviceLang === 'es' && deviceRegion === 'AR') return 'es-AR';
    if (deviceLang === 'es') return 'es-ES';
    if (deviceLang === 'fr') return 'fr-FR';
    if (deviceLang === 'it') return 'it-IT';

    const full = Localization.getLocales?.()?.[0]?.languageTag || 'pt-BR';
    if (locales[full]) return full;
  } catch {}
  return fallback;
}

let currentLang = detectLanguage();

export function setLanguage(lang: string) {
  if (locales[lang]) currentLang = lang;
}

export function getLanguage() {
  return currentLang;
}

export function t(key: string): string {
  const dict = locales[currentLang] || locales[fallback];
  return dict[key] || locales[fallback][key] || key;
}

export function useI18n() {
  const [lang, setLang] = useState(currentLang);

  useEffect(() => {
    const detected = detectLanguage();
    if (detected !== currentLang) {
      currentLang = detected;
      setLang(detected);
    }
  }, []);

  const changeLanguage = (newLang: string) => {
    setLanguage(newLang);
    setLang(newLang);
  };

  return { t, lang, changeLanguage, availableLanguages: Object.keys(locales) };
}
