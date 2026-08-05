import { describe, it, expect } from 'vitest';
import { getAuthErrorMessage, validateEmail, validatePassword } from '../lib/authErrors';
import type { AuthError } from '../hooks/useAuth';

const ptBR = {
  auth_error_invalid_credentials: 'E-mail ou senha incorretos.',
  auth_error_user_exists: 'Este e-mail já está cadastrado.',
  auth_error_email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  auth_error_password_too_short: 'A senha deve ter pelo menos 6 caracteres.',
  auth_error_rate_limit: 'Muitas tentativas.',
  auth_error_signup_disabled: 'Cadastro temporariamente desativado.',
  auth_error_invalid_email: 'Digite um e-mail válido.',
  auth_error_email_required: 'Digite seu e-mail.',
  auth_error_password_required: 'Digite sua senha.',
  auth_error_unknown: 'Erro inesperado.',
};
const t = (k: string) => (ptBR as Record<string, string>)[k] ?? k;

describe('getAuthErrorMessage', () => {
  it('mapeia code invalid_credentials', () => {
    expect(getAuthErrorMessage(t, { message: 'Invalid login credentials', code: 'invalid_credentials' }))
      .toBe('E-mail ou senha incorretos.');
  });

  it('mapeia code email_not_confirmed', () => {
    expect(getAuthErrorMessage(t, { message: 'Email not confirmed', code: 'email_not_confirmed' }))
      .toBe('Confirme seu e-mail antes de entrar.');
  });

  it('mapeia code user_already_exists e email_exists', () => {
    expect(getAuthErrorMessage(t, { message: 'User already registered', code: 'user_already_exists' }))
      .toBe('Este e-mail já está cadastrado.');
    expect(getAuthErrorMessage(t, { message: 'User already registered', code: 'email_exists' }))
      .toBe('Este e-mail já está cadastrado.');
  });

  it('usa hint da mensagem quando code é ausente', () => {
    const err: AuthError = { message: 'Invalid login credentials' };
    expect(getAuthErrorMessage(t, err)).toBe('E-mail ou senha incorretos.');
  });

  it('retorna a mensagem crua quando não há mapeamento', () => {
    const err: AuthError = { message: 'something else entirely' };
    expect(getAuthErrorMessage(t, err)).toBe('something else entirely');
  });

  it('retorna auth_error_unknown quando err é nulo', () => {
    expect(getAuthErrorMessage(t, null)).toBe('Erro inesperado.');
  });
});

describe('validateEmail', () => {
  it('valida formato e requerimento', () => {
    expect(validateEmail('', t)).toBe('Digite seu e-mail.');
    expect(validateEmail('  ', t)).toBe('Digite seu e-mail.');
    expect(validateEmail('nao-e-email', t)).toBe('Digite um e-mail válido.');
    expect(validateEmail('a@b', t)).toBe('Digite um e-mail válido.');
    expect(validateEmail('user@example.com', t)).toBeUndefined();
  });
});

describe('validatePassword', () => {
  it('valida requerimento e tamanho mínimo', () => {
    expect(validatePassword('', t)).toBe('Digite sua senha.');
    expect(validatePassword('abc', t)).toBe('A senha deve ter pelo menos 6 caracteres.');
    expect(validatePassword('abcdef', t)).toBeUndefined();
  });
});
