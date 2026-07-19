import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from './src/store/useStore';
import { TabNavigator } from './src/navigation/TabNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AddTransactionModal } from './src/components/AddTransactionModal';
import { CheckoutModal } from './src/components/CheckoutModal';
import { ToastNotification } from './src/components/ToastNotification';
import { BiometricLock } from './src/components/BiometricLock';
import { supabase } from './src/lib/supabase';
import { Logo } from './src/components/Logo';

import { useExchangeRates } from './src/hooks/useExchangeRates';

const queryClient = new QueryClient();

function MainAppContent() {
  const { id_usuario, renda_principal, hasHydrated, isAuthLoading, setUsuario, clearSession, setAuthLoading, isCheckoutModalVisible, toggleCheckoutModal } = useStore();

  useExchangeRates(); // Inicializa a busca e o cache global de câmbio

  // O controle de inatividade (5 minutos) está agora no BiometricLock.tsx
  // que bloqueia o app usando biometria ao retornar do background.

  React.useEffect(() => {
    if (!hasHydrated) return;

    let isMounted = true;

    // 1. Verifica a sessão existente no Supabase ao inicializar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        setUsuario(
          session.user.id,
          session.user.email ?? '',
          session.user.user_metadata?.nome_completo ?? session.user.user_metadata?.full_name ?? 'Usuário',
          'free'
        );
      } else {
        setAuthLoading(false);
      }
    }).catch((err) => {
      console.warn('Erro ao obter sessão no App:', err);
      if (isMounted) setAuthLoading(false);
    });

    // 2. Escuta centralmente as mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUsuario(
          session.user.id,
          session.user.email ?? '',
          session.user.user_metadata?.nome_completo ?? session.user.user_metadata?.full_name ?? 'Usuário',
          'free'
        );
      } else if (event === 'SIGNED_OUT') {
        clearSession();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hasHydrated, setUsuario, clearSession, setAuthLoading]);

  if (!hasHydrated || isAuthLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FE' }}>
        <Logo size="xl" withLeaf style={{ marginBottom: 24 }} />
        <ActivityIndicator size="large" color="#1045A1" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {id_usuario ? (
        renda_principal === 0 ? (
          <OnboardingScreen />
        ) : (
          <>
            <TabNavigator />
            <AddTransactionModal />
          </>
        )
      ) : (
        <AuthScreen />
      )}
      <CheckoutModal visible={isCheckoutModalVisible} onClose={() => toggleCheckoutModal(false)} />
      <ToastNotification />
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
          <NavigationContainer theme={{
            ...DefaultTheme,
            colors: {
              ...DefaultTheme.colors,
              primary: '#1045A1',
              background: '#F4F7FE',
              card: '#FFFFFF',
              text: '#121A2F',
              border: '#E2E8F0',
              notification: '#1045A1',
            }
          }}>
            <BiometricLock>
              <MainAppContent />
            </BiometricLock>
            <StatusBar style="dark" />
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
