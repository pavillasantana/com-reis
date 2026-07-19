/**
 * useAuth.ts — Hook de autenticação com Supabase Auth
 *
 * Gerencia: sign up, sign in, sign out e sincronização de sessão.
 * Escuta mudanças de sessão via onAuthStateChange e sincroniza o Zustand store.
 *
 * Em modo offline (sem VITE_SUPABASE_URL), retorna métodos dummy para
 * manter a aplicação funcionando em modo local/demo.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { fetchPerfil } from '../services/supabaseService';
import { captureError } from '../lib/sentry';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
}

export interface UseAuthReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, nomeCompleto: string, moedaBase?: string) => Promise<AuthError | null>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signInWithProvider: (provider: 'google' | 'azure') => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthError | null>;
  updatePassword: (newPassword: string) => Promise<AuthError | null>;
}

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(true);
  const { id_usuario, setUsuario, clearSession, setAuthLoading } = useStore();

  // ─── Sincroniza sessão ativa no refresh da página ───────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Modo offline: considera "autenticado" se houver id no store (localStorage)
      setAuthLoading(false);
      setIsLoading(false);
      return;
    }

    // Verifica sessão existente (caso o usuário já estava logado)
    supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      const session = data?.session;
      if (session?.user) {
        await syncUserToStore(session.user.id, session.user.email ?? '');
      } else {
        setAuthLoading(false);
      }
      setIsLoading(false);
    }).catch((err: any) => {
      console.warn('Erro ao obter sessão em useAuth:', err);
      setAuthLoading(false);
      setIsLoading(false);
    });

    // Escuta mudanças de autenticação (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await syncUserToStore(session.user.id, session.user.email ?? '');
        } else if (event === 'SIGNED_OUT') {
          clearSession();
          setAuthLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [clearSession, setAuthLoading]);

  // Carrega dados do perfil (plano, moeda, nome) do banco e popula o store
  const syncUserToStore = async (userId: string, email: string) => {
    try {
      const { data: perfil, error } = await fetchPerfil(userId);
      if (perfil) {
        // Avatar: tentar DB primeiro, fallback para auth metadata
        let avatar = perfil.avatar_url ?? null;
        if (!avatar) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            avatar = user?.user_metadata?.avatar_url ?? null;
          } catch {}
        }
        setUsuario(
          perfil.id,
          email,
          perfil.nome_completo ?? email.split('@')[0],
          perfil.plano,
          perfil.moeda_base,
          avatar
        );
      } else {
        // Se fetchPerfil falhou (coluna avatar_url pode não existir), ler do auth metadata
        let avatar = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          avatar = user?.user_metadata?.avatar_url ?? null;
        } catch {}
        setUsuario(userId, email, email.split('@')[0], 'free', 'BRL', avatar);
      }
    } catch (err) {
      console.warn('Erro ao buscar perfil em syncUserToStore:', err);
      let avatar = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        avatar = user?.user_metadata?.avatar_url ?? null;
      } catch {}
      setUsuario(userId, email, email.split('@')[0], 'free', 'BRL', avatar);
    } finally {
      setAuthLoading(false);
    }
  };

  // ─── SIGN UP ──────────────────────────────────────────────────────────────────
  const signUp = useCallback(async (
    email: string,
    password: string,
    nomeCompleto: string,
    moedaBase = 'BRL'
  ): Promise<AuthError | null> => {
    if (!isSupabaseConfigured) {
      // Modo offline: simula criação de usuário no store
      const fakeId = 'local-' + Math.random().toString(36).substr(2, 9);
      setUsuario(fakeId, email, nomeCompleto, 'free', moedaBase);
      return null;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: nomeCompleto,   // Mapeado pelo trigger handle_new_user
            moeda_base: moedaBase,
          },
        },
      });
      if (error) return { message: error.message };

      // O trigger do banco cria automaticamente o registro em public.usuarios + espaço PF
      // onAuthStateChange cuidará da sincronização com o store
      return null;
    } catch (e) {
      captureError(e, { action: 'signUp', email });
      return { message: 'Erro inesperado ao criar conta.' };
    } finally {
      setIsLoading(false);
    }
  }, [setUsuario]);

  // ─── SIGN IN ──────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<AuthError | null> => {
    if (!isSupabaseConfigured) {
      return { message: 'Login com Supabase não configurado. Use o modo demonstração.' };
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { message: error.message };
      // onAuthStateChange cuida da sincronização
      return null;
    } catch (e) {
      captureError(e, { action: 'signIn', email });
      return { message: 'Erro inesperado ao fazer login.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── SIGN IN WITH PROVIDER ────────────────────────────────────────────────────
  const signInWithProvider = useCallback(async (
    provider: 'google' | 'azure'
  ): Promise<AuthError | null> => {
    if (!isSupabaseConfigured) {
      return { message: 'Login com Supabase não configurado. Use o modo demonstração.' };
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) return { message: error.message };
      return null;
    } catch (e) {
      captureError(e, { action: `signInWith${provider}` });
      return { message: 'Erro inesperado ao fazer login.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── SIGN OUT ─────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    clearSession();
  }, [clearSession]);

  // ─── PASSWORD RECOVERY ───────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string): Promise<AuthError | null> => {
    if (!isSupabaseConfigured) return { message: 'Supabase não configurado.' };
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Callback URL
      });
      if (error) return { message: error.message };
      return null;
    } catch (e) {
      captureError(e, { action: 'resetPassword', email });
      return { message: 'Erro inesperado ao solicitar recuperação de senha.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthError | null> => {
    if (!isSupabaseConfigured) return { message: 'Supabase não configurado.' };
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { message: error.message };
      return null;
    } catch (e) {
      captureError(e, { action: 'updatePassword' });
      return { message: 'Erro inesperado ao atualizar a senha.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    isAuthenticated: Boolean(id_usuario),
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword
  };
}
