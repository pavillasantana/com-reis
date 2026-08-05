import type { AuthError } from '../hooks/useAuth';

type TranslateFn = (key: string) => string;

// Mapeia o código de erro do Supabase para uma chave i18n de mensagem amigável.
// Fallbacks manuais cobrem variações de mensagem quando o code não vem preenchido.
const CODE_TO_KEY: Record<string, string> = {
  invalid_credentials: 'auth_error_invalid_credentials',
  email_exists: 'auth_error_user_exists',
  user_already_exists: 'auth_error_user_exists',
  email_not_confirmed: 'auth_error_email_not_confirmed',
  weak_password: 'auth_error_password_too_short',
  password_too_weak: 'auth_error_password_too_short',
  over_request_rate_limit: 'auth_error_rate_limit',
  over_email_send_rate_limit: 'auth_error_rate_limit',
  signup_disabled: 'auth_error_signup_disabled',
  validation_failed: 'auth_error_invalid_email',
};

const MESSAGE_HINTS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /invalid login credentials/i, key: 'auth_error_invalid_credentials' },
  { pattern: /already registered|already exists|user_already_exists/i, key: 'auth_error_user_exists' },
  { pattern: /confirm your email|email not confirmed/i, key: 'auth_error_email_not_confirmed' },
  { pattern: /password should be|at least 6 characters|weak_password/i, key: 'auth_error_password_too_short' },
  { pattern: /rate limit|too many requests/i, key: 'auth_error_rate_limit' },
  { pattern: /signup.*disabled|signups not allowed/i, key: 'auth_error_signup_disabled' },
  { pattern: /invalid email|invalid_email|isn't a valid email/i, key: 'auth_error_invalid_email' },
];

// Retorna a mensagem amigável (traduzida) para um erro de autenticação.
export function getAuthErrorMessage(t: TranslateFn, err: AuthError | null | undefined): string {
  if (!err) return t('auth_error_unknown');

  if (err.code) {
    const key = CODE_TO_KEY[err.code];
    if (key) return t(key);
  }

  for (const hint of MESSAGE_HINTS) {
    if (hint.pattern.test(err.message)) return t(hint.key);
  }

  return err.message;
}

// Validação client-side antes de chamar a API.
export interface AuthFieldErrors {
  email?: string;
  password?: string;
}

export function validateEmail(email: string, t: TranslateFn): string | undefined {
  if (!email.trim()) return t('auth_error_email_required');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return t('auth_error_invalid_email');
  return undefined;
}

export function validatePassword(password: string, t: TranslateFn): string | undefined {
  if (!password) return t('auth_error_password_required');
  if (password.length < 6) return t('auth_error_password_too_short');
  return undefined;
}
