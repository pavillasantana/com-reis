import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Lock } from 'lucide-react-native';
import { theme } from '../lib/theme';
import { supabase } from '../lib/supabase';

import { useStore } from '../store/useStore';

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

export const BiometricLock = ({ children }: { children: React.ReactNode }) => {
  const { biometria_ativada } = useStore();
  const [isLocked, setIsLocked] = useState(false);
  const [hasHardware, setHasHardware] = useState(false);
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasHardware(hardware && enrolled);
    })();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // Returning to foreground
      if (backgroundTime.current) {
        const timeAway = Date.now() - backgroundTime.current;
        if (timeAway >= INACTIVITY_LIMIT_MS) {
          if (biometria_ativada) {
            setIsLocked(true);
          } else {
            // Force re-login if biometrics are not enabled to unlock seamlessly
            supabase.auth.signOut().then(() => {
              useStore.getState().clearSession();
            });
          }
        }
      }
      backgroundTime.current = null;
    } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      // Going to background
      backgroundTime.current = Date.now();
    }
    appState.current = nextAppState;

    if (nextAppState === 'active' && isLocked) {
      await authenticate();
    }
  };

  const authenticate = async () => {
    if (!hasHardware) {
      setIsLocked(false);
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear Com Réis',
        fallbackLabel: 'Usar senha',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    if (isLocked) {
      authenticate();
    }
  }, [isLocked]);

  if (isLocked) {
    return (
      <View style={styles.container}>
        <Lock size={64} color={theme.colors.primary} />
        <Text style={styles.title}>Aplicativo Bloqueado</Text>
        <Text style={styles.subtitle}>Desbloqueie para continuar acessando suas finanças de forma segura.</Text>
        <TouchableOpacity style={styles.button} onPress={authenticate} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Desbloquear</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.layout.paddingLg * 2,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.ink,
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.layout.paddingLg,
    paddingVertical: theme.layout.paddingMd,
    borderRadius: theme.layout.radiusMd,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.bg,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

