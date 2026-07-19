import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../hooks/useI18n';
import { Logo } from '../components/Logo';
import { useStore } from '../store/useStore';
import { theme } from '../lib/theme';

export const AddTransactionScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const { contas, getContasEspacoAtivo, addTransacao, tags } = useStore();
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [categoria, setCategoria] = useState('');
  const [idTagSelecionada, setIdTagSelecionada] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [participantEmail, setParticipantEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const activeAccounts = getContasEspacoAtivo();

  const handleSave = async () => {
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) {
      Alert.alert(t('error'), t('invalid_value'));
      return;
    }
    if (!categoria.trim()) {
      Alert.alert(t('error'), t('category_empty_alert'));
      return;
    }
    if (activeAccounts.length === 0) {
      Alert.alert(t('error'), t('no_accounts_in_space'));
      return;
    }
    if (isShared && !participantEmail.trim()) {
      Alert.alert(t('error'), t('shared_email_required'));
      return;
    }

    setSaving(true);
    try {
      const valorTotal = parseFloat(valor);
      const valorCota = isShared ? valorTotal / 2 : valorTotal;

      const rawEmail = participantEmail.trim().toLowerCase();
      let finalEmail = rawEmail;
      if (rawEmail === 'mangos') {
        finalEmail = 'mangos@mangos.com';
      } else if (rawEmail.length > 0 && !rawEmail.includes('@')) {
        finalEmail = `${rawEmail}@mangos.com`;
      }

      const newTransaction = {
        id: Math.random().toString(36).substring(2, 9),
        id_conta: activeAccounts[0].id,
        tipo,
        valor: valorCota,
        categoria: categoria.trim(),
        id_tag: idTagSelecionada || null,
        data_transacao: new Date().toISOString().split('T')[0],
        taxa_cambio_dia: 1.0,
        descricao: isShared 
          ? `[Rateio 50/50] ${descricao.trim() || categoria.trim()}`
          : (descricao.trim() || undefined),
        is_compartilhada: isShared,
        participante_email: isShared ? finalEmail : undefined,
      };

      await addTransacao(newTransaction);
      Alert.alert(t('success'), t('transaction_registered'), [
        { text: 'OK', onPress: () => navigation.navigate('Início') }
      ]);
    } catch (error: any) {
      Alert.alert(t('error_registering_transaction'), error.message || t('unknown_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              <Logo variant="horizontal" size="sm" withLeaf style={{ marginBottom: 16 }} />
              <Text style={styles.title}>{t('new_transaction')}</Text>

              {/* Tipo Selector */}
              <View style={styles.tipoRow}>
                <TouchableOpacity
                  style={[styles.tipoButton, tipo === 'despesa' && styles.tipoActiveDespesa]}
                  onPress={() => {
                    setTipo('despesa');
                  }}
                >
                  <Text style={[styles.tipoButtonText, tipo === 'despesa' && styles.tipoActiveText]}>{t('expense_label')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoButton, tipo === 'receita' && styles.tipoActiveReceita]}
                  onPress={() => {
                    setTipo('receita');
                    setIsShared(false);
                  }}
                >
                  <Text style={[styles.tipoButtonText, tipo === 'receita' && styles.tipoActiveText]}>{t('income_label')}</Text>
                </TouchableOpacity>
              </View>

              {/* Inputs */}
              <Text style={styles.label}>{t('value_label')}</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={valor}
                onChangeText={setValor}
              />

              <Text style={styles.label}>{t('category_label')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('category_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
                value={categoria}
                onChangeText={setCategoria}
              />

              {tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  <Text style={styles.tagsLabel}>{t('tag_optional_label')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
                    {tags.map(tag => (
                      <TouchableOpacity
                        key={tag.id}
                        style={[
                          styles.tagBadge, 
                          { borderColor: tag.cor }, 
                          idTagSelecionada === tag.id && { backgroundColor: tag.cor }
                        ]}
                        onPress={() => {
                          if (idTagSelecionada === tag.id) {
                            setIdTagSelecionada(null);
                          } else {
                            setIdTagSelecionada(tag.id);
                            setCategoria(tag.nome);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.tagBadgeText, 
                          idTagSelecionada === tag.id && { color: theme.colors.white, fontWeight: 'bold' }
                        ]}>
                          {tag.nome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>{t('description_optional_label')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('description_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
                value={descricao}
                onChangeText={setDescricao}
              />

              {/* Rateio (Somente se for Despesa) */}
              {tipo === 'despesa' && (
                <View style={styles.sharingCard}>
                  <View style={styles.sharingRow}>
                    <View>
                      <Text style={styles.sharingTitle}>{t('split_expense_title')}</Text>
                      <Text style={styles.sharingSub}>{t('split_expense_sub')}</Text>
                    </View>
                    <Switch
                      value={isShared}
                      onValueChange={setIsShared}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                      thumbColor={isShared ? theme.colors.white : theme.colors.textMuted}
                    />
                  </View>

                  {isShared && (
                    <View style={styles.emailContainer}>
                      <Text style={styles.label}>{t('participant_id_or_email')}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={t('participant_placeholder')}
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={participantEmail}
                        onChangeText={setParticipantEmail}
                      />
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.disabledButton]} 
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? t('registering') : t('register_transaction')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 30,
  },
  form: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 36,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  tipoRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  tipoButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tipoButtonText: {
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  tipoActiveDespesa: {
    backgroundColor: theme.colors.negative,
    borderColor: theme.colors.negative,
  },
  tipoActiveReceita: {
    backgroundColor: theme.colors.positive,
    borderColor: theme.colors.positive,
  },
  tipoActiveText: {
    color: theme.colors.white,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 24,
    color: theme.colors.text,
    marginBottom: 16,
  },
  sharingCard: {
    backgroundColor: theme.colors.bg,
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  sharingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharingTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  sharingSub: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  emailContainer: {
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: theme.colors.border,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  tagsContainer: {
    marginBottom: 16,
  },
  tagsLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginBottom: 6,
  },
  tagsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  tagBadge: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  tagBadgeText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
});

export default AddTransactionScreen;
