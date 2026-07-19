import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  Share,
  Modal,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { translateAuthError } from '../lib/i18n';
import { ArrowLeft, User, Mail, ShieldAlert, KeyRound, AlertTriangle, Camera, UploadCloud, FileText, Download } from 'lucide-react-native';
import { Logo } from '../components/Logo';
import { useI18n } from '../hooks/useI18n';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../lib/theme';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

// Conversão de DD/MM/AAAA para YYYY-MM-DD
const deBrParaIso = (dataBr: string): string => {
  if (!dataBr) return '';
  const partes = dataBr.split('/');
  if (partes.length === 3) {
    const dia = partes[0].padStart(2, '0');
    const mes = partes[1].padStart(2, '0');
    const ano = partes[2];
    return `${ano}-${mes}-${dia}`;
  }
  return dataBr;
};

// Conversão de YYYY-MM-DD para DD/MM/AAAA
const deIsoParaBr = (dataIso: string): string => {
  if (!dataIso) return '';
  const partes = dataIso.split('-');
  if (partes.length === 3) {
    const ano = partes[0];
    const mes = partes[1];
    const dia = partes[2];
    return `${dia}/${mes}/${ano}`;
  }
  return dataIso;
};

// Máscara rígida para aceitar apenas dígitos e colocar barra '/'
const aplicarMascaraData = (val: string): string => {
  const limpo = val.replace(/[^\d]/g, '');
  let formatado = '';
  if (limpo.length > 0) {
    formatado += limpo.substring(0, 2);
  }
  if (limpo.length > 2) {
    formatado += '/' + limpo.substring(2, 4);
  }
  if (limpo.length > 4) {
    formatado += '/' + limpo.substring(4, 8);
  }
  return formatado;
};

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1579621970795-87faff3f68b8?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=150&auto=format&fit=crop',
];

export const PerfilScreen = ({ onBack }: { onBack: () => void }) => {
  const { t } = useI18n();
  const { id_usuario, nome_usuario, email_usuario, renda_principal, syncSupabaseData, clearSession, avatar_url, updateAvatarUrl, biometria_ativada, setBiometriaAtivada, getTransacoesEspacoAtivo } = useStore();
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Campos do perfil
  const [nome, setNome] = useState(nome_usuario || '');
  const [email, setEmail] = useState(email_usuario || '');
  const [nascimento, setNascimento] = useState('');
  const [documento, setDocumento] = useState('');
  const [celular, setCelular] = useState('');
  const [renda, setRenda] = useState(renda_principal ? renda_principal.toString() : '0');

  // Segurança (Alterar Senha)
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaLoading, setSenhaLoading] = useState(false);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(t('permission_denied'), t('gallery_permission_message'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        if (id_usuario) {
          setIsAvatarModalOpen(false); // Close modal before processing
          setLoading(true);
          try {
            const fileExt = asset.uri.split('.').pop() || 'jpeg';
            const fileName = `${id_usuario}-${Date.now()}.${fileExt}`;
            const filePath = `${id_usuario}/${fileName}`;
            
            if (!asset.base64) {
               throw new Error(t('image_processing_error'));
            }

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, decode(asset.base64), {
                contentType: `image/${fileExt}`
              });
              
            if (uploadError) throw uploadError;
            
            const { data: publicUrlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
              
            if (publicUrlData.publicUrl) {
              await updateAvatarUrl(publicUrlData.publicUrl);
              Alert.alert(t('success'), t('photo_updated_success'));
            }
          } catch (err: any) {
              Alert.alert(t('upload_error'), err.message);
          } finally {
            setLoading(false);
          }
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    // Carregar dados adicionais do Supabase se existirem
    const loadAdditionalData = async () => {
      if (!id_usuario) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('nome_completo, email, data_nascimento, documento, celular, renda_principal')
          .eq('id', id_usuario)
          .single();

        if (data) {
          if (data.nome_completo) setNome(data.nome_completo);
          if (data.email) setEmail(data.email);
          if (data.data_nascimento) setNascimento(deIsoParaBr(data.data_nascimento));
          if (data.documento) setDocumento(data.documento);
          if (data.celular) setCelular(data.celular);
          if (data.renda_principal !== undefined) setRenda(data.renda_principal.toString());
        }
      } catch (err) {
        console.warn('Erro ao carregar dados complementares:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAdditionalData();
  }, [id_usuario]);

  const handleSalvarPerfil = async () => {
    if (!nome.trim()) {
      Alert.alert(t('error'), t('name_empty_error'));
      return;
    }

    let dataNascimentoFinal = null;
    if (nascimento.trim()) {
      const birthRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!birthRegex.test(nascimento.trim())) {
        Alert.alert(t('error'), t('birth_date_format_error'));
        return;
      }
      const dateParts = nascimento.split('/');
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);
      const currentYear = new Date().getFullYear();
      if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > currentYear) {
        Alert.alert(t('error'), t('birth_date_invalid'));
        return;
      }
      dataNascimentoFinal = deBrParaIso(nascimento.trim());
    }

    if (documento.trim()) {
      const docClean = documento.replace(/[^\d]/g, '');
      if (docClean.length < 8 || docClean.length > 14) {
        Alert.alert(t('error'), t('document_digits_error'));
        return;
      }
    }

    if (celular.trim()) {
      const celClean = celular.replace(/[^\d]/g, '');
      if (celClean.length < 10 || celClean.length > 11) {
        Alert.alert(t('error'), t('phone_digits_error'));
        return;
      }
    }

    setLoading(true);
    try {
      if (id_usuario) {
        // Salva na tabela do Supabase
        const { error } = await supabase
          .from('usuarios')
          .update({
            nome_completo: nome.trim(),
            data_nascimento: dataNascimentoFinal,
            documento: documento.trim() || null,
            celular: celular.trim() || null,
            renda_principal: parseFloat(renda) || 0
          })
          .eq('id', id_usuario);

        if (error) throw error;
        
        await syncSupabaseData();
        Alert.alert(t('success'), t('profile_updated_success'));
      } else {
        useStore.setState({ renda_principal: parseFloat(renda) || 0 });
        Alert.alert(t('demo_mode'), t('demo_mode_message'));
      }
    } catch (error: any) {
      const friendlyMsg = translateAuthError(error.message);
      Alert.alert(t('save_error'), friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAlterarSenha = async () => {
    if (!novaSenha || novaSenha.length < 6) {
      Alert.alert(t('error'), t('password_min_error'));
      return;
    }

    if (novaSenha !== confirmarSenha) {
      Alert.alert(t('error'), t('passwords_not_match'));
      return;
    }

    setSenhaLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (error) throw error;

      Alert.alert(t('success'), t('password_updated_success'));
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (error: any) {
      const friendlyMsg = translateAuthError(error.message);
      Alert.alert(t('change_password_error'), friendlyMsg);
    } finally {
      setSenhaLoading(false);
    }
  };

  const handleExcluirConta = () => {
    Alert.alert(
      t('delete_account_permanently'),
      t('delete_account_confirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete_account'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              const { error } = await supabase.rpc('processar_exclusao_permanente', { uid_alvo: user.id });
              if (error) throw error;
              clearSession();
              await supabase.auth.signOut();
              Alert.alert(t('success'), t('account_closed'));
            } catch (err: any) {
              const friendlyMsg = translateAuthError(err.message || t('unknown_error'));
              Alert.alert(t('delete_account_error'), friendlyMsg);
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleExportCSV = async () => {
    try {
      const transacoes = getTransacoesEspacoAtivo();
      if (!transacoes || transacoes.length === 0) {
        Alert.alert(t('nothing_to_export'), t('no_transactions_found'));
        return;
      }

      const header = 'id,tipo,valor,categoria,data_transacao,descricao';
      const rows = transacoes.map(tx =>
        `"${tx.id}","${tx.tipo}",${tx.valor},"${tx.categoria}","${tx.data_transacao}","${(tx.descricao || '').replace(/"/g, '""')}"`
      );
      const csv = [header, ...rows].join('\n');
      const uri = FileSystem.cacheDirectory + 'mangos_export.csv';
      await FileSystem.writeAsStringAsync(uri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Share.share({ url: uri, title: 'mangos_export.csv' });
    } catch (err: any) {
      Alert.alert(t('export_error'), err.message || t('export_data_error'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Logo variant="horizontal" size="xs" withLeaf />
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV} activeOpacity={0.7}>
          <Download size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
              {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 40 }} />
              ) : (
                <>
                  {/* Seção do Avatar */}
                  <View style={styles.avatarSection}>
                    <TouchableOpacity 
                      style={styles.avatarContainer} 
                      onPress={() => setIsAvatarModalOpen(true)}
                      activeOpacity={0.8}
                    >
                      <Image 
                        source={{ uri: avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' }} 
                        style={styles.avatarImageLarge} 
                      />
                      <View style={styles.cameraIconContainer}>
                        <Camera size={14} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setIsAvatarModalOpen(true)} 
                      activeOpacity={0.7}
                      style={styles.editAvatarBtn}
                    >
                      <Text style={styles.editAvatarText}>{t('change_profile_photo')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ID do Usuário */}
                  {id_usuario && !id_usuario.startsWith('demo-') && (
                    <View style={styles.userIdContainer}>
                      <Text style={styles.userIdLabel}>ID:</Text>
                      <Text style={styles.userIdValue}>{id_usuario}</Text>
                    </View>
                  )}

                  {/* Informações Básicas */}
                  <View style={styles.sectionHeader}>
                    <User size={16} color={theme.colors.textMuted} />
                    <Text style={styles.sectionTitle}>{t('personal_data')}</Text>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.label}>{t('full_name')}</Text>
                    <TextInput
                      style={styles.input}
                      value={nome}
                      onChangeText={setNome}
                      placeholder={t('full_name_placeholder')}
                      placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={styles.label}>{t('email_login')}</Text>
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      value={email}
                      editable={false}
                      selectTextOnFocus={false}
                    />

                    <Text style={styles.label}>{t('birth_date')}</Text>
                    <TextInput
                      style={styles.input}
                      value={nascimento}
                      onChangeText={(t) => setNascimento(aplicarMascaraData(t))}
                      placeholder={t('birth_date_placeholder')}
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                    />

                    <Text style={styles.label}>{t('cpf_or_document')}</Text>
                    <TextInput
                      style={styles.input}
                      value={documento}
                      onChangeText={setDocumento}
                      placeholder={t('document_placeholder')}
                      placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={styles.label}>{t('phone')}</Text>
                    <TextInput
                      style={styles.input}
                      value={celular}
                      onChangeText={setCelular}
                      placeholder={t('phone_placeholder')}
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="phone-pad"
                    />

                    <Text style={styles.label}>{t('monthly_income_label')}</Text>
                    <TextInput
                      style={styles.input}
                      value={renda}
                      onChangeText={setRenda}
                      placeholder={t('income_placeholder')}
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                    />

                    <TouchableOpacity 
                      style={styles.saveBtn} 
                      onPress={handleSalvarPerfil}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveBtnText}>{t('save_changes')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Segurança (Alterar Senha) */}
                  <View style={[styles.sectionHeader, styles.sectionMargin]}>
                    <KeyRound size={16} color={theme.colors.textMuted} />
                    <Text style={styles.sectionTitle}>{t('security')}</Text>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchLabel}>{t('biometric_lock')}</Text>
                        <Text style={styles.switchSub}>{t('biometric_subtitle')}</Text>
                      </View>
                      <Switch
                        value={biometria_ativada}
                        onValueChange={setBiometriaAtivada}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    <Text style={[styles.label, { marginTop: 16 }]}>{t('new_password')}</Text>
                    <TextInput
                      style={styles.input}
                      value={novaSenha}
                      onChangeText={setNovaSenha}
                      placeholder={t('password_min_placeholder')}
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry
                    />

                    <Text style={styles.label}>{t('confirm_new_password')}</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmarSenha}
                      onChangeText={setConfirmarSenha}
                      placeholder={t('confirm_password_placeholder')}
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry
                    />

                    <TouchableOpacity 
                      style={styles.securityBtn} 
                      onPress={handleAlterarSenha}
                      disabled={senhaLoading}
                      activeOpacity={0.8}
                    >
                      {senhaLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.securityBtnText}>{t('change_password')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Zona de Perigo (Excluir Conta) */}
                  <View style={[styles.sectionHeader, styles.sectionMargin]}>
                    <ShieldAlert size={16} color={theme.colors.negative} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.negative }]}>{t('danger_zone')}</Text>
                  </View>

                  <View style={[styles.card, styles.dangerCard]}>
                    <View style={styles.dangerHeader}>
                      <AlertTriangle size={18} color={theme.colors.negative} />
                      <Text style={styles.dangerTitle}>{t('irreversible_action')}</Text>
                    </View>
                    <Text style={styles.dangerText}>
                      {t('delete_account_warning_text')}
                    </Text>
                    <TouchableOpacity 
                      style={styles.deleteBtn} 
                      onPress={handleExcluirConta}
                      activeOpacity={0.8}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.deleteBtnText}>{t('delete_account_permanently')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Modal de Escolha de Avatar */}
      <Modal
        visible={isAvatarModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAvatarModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsAvatarModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{t('choose_avatar')}</Text>
                
                <Text style={styles.modalSubtitle}>{t('suggested_presets')}</Text>
                <View style={styles.presetsGrid}>
                  {PRESET_AVATARS.map((url, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[
                        styles.presetItem,
                        avatar_url === url && styles.presetItemActive
                      ]}
                      onPress={async () => {
                        await updateAvatarUrl(url);
                        setIsAvatarModalOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Image source={{ uri: url }} style={styles.presetImage} />
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.galleryBtn} onPress={handlePickImage} activeOpacity={0.8}>
                  <UploadCloud size={20} color="#FFFFFF" />
                  <Text style={styles.galleryBtnText}>{t('choose_from_gallery')}</Text>
                </TouchableOpacity>

                <Text style={styles.modalSubtitle}>{t('or_enter_image_url')}</Text>
                <View style={styles.urlInputRow}>
                  <TextInput
                    style={styles.urlInput}
                    placeholder={t('image_url_placeholder')}
                    placeholderTextColor={theme.colors.textMuted}
                    value={customAvatarUrl}
                    onChangeText={setCustomAvatarUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity 
                    style={styles.applyUrlBtn}
                    onPress={async () => {
                      if (!customAvatarUrl.trim()) {
                        Alert.alert(t('error'), t('enter_image_url'));
                        return;
                      }
                      if (!customAvatarUrl.startsWith('http://') && !customAvatarUrl.startsWith('https://')) {
                        Alert.alert(t('error'), t('url_must_start_with_http'));
                        return;
                      }
                      await updateAvatarUrl(customAvatarUrl.trim());
                      setCustomAvatarUrl('');
                      setIsAvatarModalOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.applyUrlBtnText}>{t('apply')}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.closeModalBtn}
                  onPress={() => setIsAvatarModalOpen(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeModalBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    padding: 5,
  },
  avatarImageLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.bg,
  },
  editAvatarBtn: {
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  editAvatarText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    ...theme.modalStyles.overlay,
    padding: theme.layout.paddingLg,
  },
  modalContent: {
    ...theme.modalStyles.card,
    width: '100%',
    maxWidth: 340,
    padding: theme.layout.paddingLg * 1.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.ink,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.layout.gapMd * 0.75,
    justifyContent: 'center',
    marginBottom: 8,
  },
  presetItem: {
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 3,
  },
  presetItemActive: {
    borderColor: theme.colors.primary,
  },
  presetImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  galleryBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: theme.layout.radiusMd / 2,
    paddingVertical: theme.layout.paddingMd,
    marginBottom: 8,
  },
  galleryBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: theme.layout.gapMd / 2,
    marginBottom: 20,
  },
  urlInput: {
    flex: 1,
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    borderRadius: theme.layout.radiusMd / 2,
    height: 40,
    paddingHorizontal: theme.layout.paddingMd,
    color: theme.colors.ink,
    fontSize: 13,
  },
  applyUrlBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.layout.radiusMd / 2,
    height: 40,
    paddingHorizontal: theme.layout.paddingLg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyUrlBtnText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.layout.radiusMd / 2,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  closeModalBtnText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.layout.paddingLg,
    paddingVertical: theme.layout.paddingMd,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 12,
  },
  exportBtn: {
    padding: 12,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: theme.layout.paddingLg,
    paddingBottom: Platform.OS === 'ios' ? 120 : 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.layout.gapMd / 2,
    marginBottom: 12,
  },
  sectionMargin: {
    marginTop: 24,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.layout.radiusMd,
    padding: theme.layout.paddingLg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  dangerCard: {
    borderColor: theme.colors.negative,
    backgroundColor: theme.colors.cardBg,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    borderRadius: theme.layout.radiusMd / 2,
    height: 44,
    paddingHorizontal: theme.layout.paddingMd,
    color: theme.colors.ink,
    fontSize: 14,
    marginBottom: 16,
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: theme.colors.cardBg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 24,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.ink,
  },
  switchSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: theme.colors.positive,
    borderRadius: theme.layout.radiusMd / 2,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  securityBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.layout.radiusMd / 2,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  securityBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dangerTitle: {
    color: theme.colors.negative,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dangerText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  deleteBtn: {
    backgroundColor: theme.colors.negative,
    borderRadius: theme.layout.radiusMd / 2,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16,
    gap: 6,
  },
  userIdLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  userIdValue: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },
});

export default PerfilScreen;


