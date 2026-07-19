import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../store/useStore';
import { Coins, CheckCircle } from 'lucide-react-native';
import { theme } from '../lib/theme';

export const OnboardingScreen = () => {
  const { t } = useI18n();
  const { inicializarOnboarding, showToast, onboarding_completo } = useStore();
  const [renda, setRenda] = useState('');

  // Se o onboarding já foi concluído, exibe mensagem enquanto o sistema redireciona
  if (onboarding_completo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.innerContainer}>
          <View style={styles.content}>
            <CheckCircle size={48} color={theme.colors.positive} />
            <Text style={[styles.title, { marginTop: 16 }]}>{t('all_set')}</Text>
            <Text style={styles.subtitle}>{t('profile_configured_redirect')}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleStart = async () => {
    const valorRenda = parseFloat(renda);
    if (!renda || isNaN(valorRenda) || valorRenda <= 0) {
      showToast(t('invalid_income_value'), 'error');
      return;
    }

    try {
      await inicializarOnboarding(valorRenda);
      showToast(t('onboarding_complete'), 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('db_sync_error'), 'error');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.innerContainer}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Coins size={48} color={theme.colors.primary} />
            </View>

            <Text style={styles.title}>{t('welcome_mangos')}</Text>
            
            <Text style={styles.subtitle}>
              {t('income_prompt')}
            </Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.cifrao}>{t('currency_symbol')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('income_placeholder_value')}
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={renda}
                onChangeText={setRenda}
                autoFocus
              />
            </View>

            <Text style={styles.infoText}>
              {t('emergency_jar_info')}
            </Text>

            <TouchableOpacity style={styles.button} onPress={handleStart} activeOpacity={0.8}>
              <Text style={styles.buttonText}>{t('start_using')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 36,
  },
  content: {
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    paddingBottom: 12,
    marginBottom: 24,
    width: '100%',
  },
  cifrao: {
    color: theme.colors.textMuted,
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  input: {
    color: theme.colors.ink,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    paddingVertical: 0,
  },
  infoText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 40,
    paddingHorizontal: 15,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    width: '100%',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
