import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  ScrollView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Linking,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { Logo } from '../components/Logo';
import { translateAuthError } from '../lib/i18n';
import { useI18n } from '../hooks/useI18n';
import { theme } from '../lib/theme';
import { Check } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

export const AuthScreen = () => {
  const { t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { setUsuario, showToast } = useStore();

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url;
        if (!url) return;

        if (url.includes('access_token=') && url.includes('refresh_token=')) {
          let accessToken = '';
          let refreshToken = '';

          const matchAccess = url.match(/access_token=([^&]+)/);
          const matchRefresh = url.match(/refresh_token=([^&]+)/);
          if (matchAccess) accessToken = matchAccess[1];
          if (matchRefresh) refreshToken = matchRefresh[1];

          if (accessToken && refreshToken) {
            setLoading(true);
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;

            if (sessionData?.user) {
              setUsuario(
                sessionData.user.id,
                sessionData.user.email ?? '',
                sessionData.user.user_metadata?.nome_completo ?? sessionData.user.user_metadata?.full_name ?? t('user_fallback'),
                'free'
              );
              showToast(t('social_auth_success'), 'success');
            }
          }
        }
      } catch (err: any) {
        console.error('Erro ao processar Deep Link:', err);
      } finally {
        setLoading(false);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !nome)) {
      showToast(t('fill_fields'), 'error');
      return;
    }

    if (!isLogin && !termsAccepted) {
      showToast(t('terms_required'), 'error');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Fluxo de Login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data?.user) {
          setUsuario(
            data.user.id,
            data.user.email ?? '',
            data.user.user_metadata?.nome_completo ?? data.user.user_metadata?.full_name ?? t('user_fallback'),
            'free'
          );
          showToast(t('login_success'), 'success');

          // Verifica se usuário tem exclusão pendente
          try {
            const { data: statusData } = await supabase.rpc('verificar_status_exclusao');
            if (statusData?.status === 'pendente_exclusao') {
              Alert.alert(
                t('deletion_pending_title'),
                t('deletion_pending_msg').replace('{days}', String(statusData.dias_restantes ?? '...')),
                [
                  { text: t('keep_deletion'), style: 'destructive' },
                  {
                    text: t('cancel_deletion'),
                    onPress: async () => {
                      const { data: cancelData, error: cancelError } = await supabase.rpc('cancelar_exclusao');
                      if (cancelError) throw cancelError;
                      if (cancelData === 'OK') {
                        showToast(t('deletion_cancelled'), 'success');
                      }
                    }
                  }
                ]
              );
            }
          } catch (err) {
            console.warn('Erro ao verificar status de exclusão:', err);
          }
        }
      } else {
        // Fluxo de Cadastro
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nome_completo: nome }
          }
        });
        if (error) throw error;
        showToast(t('signup_success'), 'success');
        setIsLogin(true);
      }
    } catch (error: any) {
      const friendlyMsg = translateAuthError(error.message);
      showToast(friendlyMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      showToast(t('reset_password_email_required'), 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'mangos://reset-password', // Pode precisar de ajuste de acordo com deep links
      });
      if (error) throw error;
      showToast(t('reset_email_sent'), 'success');
    } catch (error: any) {
      showToast(translateAuthError(error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'azure') => {
    setLoading(true);
    try {
      const redirectUrl = QueryParams.makeRedirectUri({
        scheme: 'mangos',
        path: 'auth'
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error(t('redirect_url_error'));

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (res.type === 'success' && res.url) {
        let accessToken = '';
        let refreshToken = '';

        const matchAccess = res.url.match(/access_token=([^&]+)/);
        const matchRefresh = res.url.match(/refresh_token=([^&]+)/);
        if (matchAccess) accessToken = matchAccess[1];
        if (matchRefresh) refreshToken = matchRefresh[1];

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;

          if (sessionData?.user) {
            setUsuario(
              sessionData.user.id,
              sessionData.user.email ?? '',
              sessionData.user.user_metadata?.nome_completo ?? sessionData.user.user_metadata?.full_name ?? t('user_fallback'),
              'free'
            );
            showToast(t('social_auth_success'), 'success');
          }
        } else {
          throw new Error(t('auth_tokens_not_found'));
        }
      }
    } catch (error: any) {
      showToast(error.message || t('social_login_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.innerContainer}>
              <View style={styles.logoContainer}>
                <Logo size="xl" />
              </View>
              <Text style={styles.subtitle}>{t('app_subtitle')}</Text>

              <Card style={styles.card}>
                {!isLogin && (
                  <InputField
                    placeholder={t('full_name')}
                    value={nome}
                    onChangeText={setNome}
                  />
                )}
                
                <InputField
                  placeholder={t('email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <InputField
                  placeholder={t('password')}
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                />

                {!isLogin && (
                  <TouchableOpacity 
                    style={styles.checkboxContainer} 
                    onPress={() => setTermsAccepted(!termsAccepted)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
                      {termsAccepted && <Check size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      {t('agree_terms_privacy')}
                    </Text>
                  </TouchableOpacity>
                )}

                {isLogin && (
                  <TouchableOpacity onPress={handleResetPassword} style={styles.forgotPasswordContainer}>
                    <Text style={styles.forgotPasswordText}>{t('forgot_password')}</Text>
                  </TouchableOpacity>
                )}

                <PrimaryButton 
                  title={loading ? t('loading') : (isLogin ? t('login') : t('signup'))} 
                  onPress={handleAuth} 
                  disabled={loading || (!isLogin && !termsAccepted)}
                />

                {/* LOGIN SOCIAL (Google e Microsoft) */}
                <View style={styles.socialDividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('or_continue_with')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtonsRow}>
                  <TouchableOpacity 
                    style={styles.socialBtn} 
                    onPress={() => handleOAuthLogin('google')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.socialBtnText}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.socialBtn} 
                    onPress={() => handleOAuthLogin('azure')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.socialBtnText}>Microsoft</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleButton}>
                  <Text style={styles.toggleText}>
                    {isLogin ? t('create_new_account') : t('already_have_account')}
                  </Text>
                </TouchableOpacity>
              </Card>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    padding: theme.layout.paddingLg * 1.25,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  logoText: {
    fontSize: 28,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: { 
    color: theme.colors.textMuted, 
    textAlign: 'center', 
    marginBottom: 30 
  },
  card: { 
    backgroundColor: theme.colors.cardBg, 
    padding: theme.layout.paddingLg * 1.5, 
    borderRadius: theme.layout.radiusLg,
    shadowColor: theme.colors.bg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  socialDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginHorizontal: 10,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  socialBtn: {
    flex: 1,
    height: 44,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.layout.radiusMd / 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnText: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleButton: { 
    marginTop: 15, 
    padding: 15 
  },
  toggleText: { 
    color: theme.colors.primary, 
    textAlign: 'center', 
    fontWeight: 'bold' 
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5,
    paddingHorizontal: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: theme.layout.radiusMd / 3,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.positive,
    borderColor: theme.colors.positive,
  },
  checkboxLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  }
});

export default AuthScreen;
