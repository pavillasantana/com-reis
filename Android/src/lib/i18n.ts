import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

import ptBR from '../locales/pt-BR.json';
import enUS from '../locales/en-US.json';
import esAR from '../locales/es-AR.json';
import ptPT from '../locales/pt-PT.json';
import esES from '../locales/es-ES.json';
import frFR from '../locales/fr-FR.json';
import itIT from '../locales/it-IT.json';

const translations = {
  'pt-BR': ptBR,
  'pt': ptBR,
  'pt-PT': ptPT,
  'en-US': enUS,
  'en': enUS,
  'es-AR': esAR,
  'es': esAR,
  'es-ES': esES,
  'fr-FR': frFR,
  'fr': frFR,
  'it-IT': itIT,
  'it': itIT
};

export const i18n = new I18n(translations);

// Detecta o idioma do sistema
const locales = Localization.getLocales();
if (locales && locales.length > 0) {
  const languageTag = locales[0].languageTag;
  i18n.locale = languageTag;
} else {
  i18n.locale = 'pt-BR'; // Fallback
}

i18n.enableFallback = true;
i18n.defaultLocale = 'pt-BR';

export const t = (key: string, options?: any) => i18n.t(key, options);

// Função para mapear mensagens de erro do Supabase para mensagens amigáveis localizadas
export const translateAuthError = (message: string): string => {
  if (!message) return t('auth_error_unknown');
  
  const msg = message.toLowerCase();
  
  // Usuário já cadastrado
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique constraint')) {
    return t('auth_error_user_exists');
  }
  
  // Credenciais inválidas
  if (
    msg.includes('invalid grant') || 
    msg.includes('invalid credentials') || 
    msg.includes('email not confirmed') ||
    msg.includes('invalid email') || 
    msg.includes('invalid password') ||
    msg.includes('invalid login credentials') ||
    msg.includes('credentials')
  ) {
    return t('auth_error_invalid_credentials');
  }
  
  // Limite de requisições / Rate limit
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Muitas tentativas seguidas. Por favor, aguarde alguns minutos.';
  }

  // Falha de rede ou conexão
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
    return 'Erro de conexão com o servidor. Verifique sua internet.';
  }
  
  // Se for outro erro, exibe a própria mensagem traduzida ou a original
  return message;
};
