import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { Logo } from '../components/Logo';
import { useI18n } from '../hooks/useI18n';
import { theme } from '../lib/theme';
import { formatCurrency } from '../utils/currency';
import { AdBanner } from '../components/AdBanner';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  X 
} from 'lucide-react-native';

export const CaixinhasScreen = () => {
  const { t } = useI18n();
  const { 
    getCaixinhasEspacoAtivo, 
    moeda_base, 
    addCaixinha, 
    deleteCaixinha, 
    updateCaixinha,
    id_espaco_ativo,
    plano_usuario,
    toggleCheckoutModal,
    setCheckoutMessage,
  } = useStore();

  const caixinhas = getCaixinhasEspacoAtivo();

  // Modal Nova Caixinha
  const [modalNovoVisible, setModalNovoVisible] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoValorAlvo, setNovoValorAlvo] = useState('');
  const [novoSaldoInicial, setNovoSaldoInicial] = useState('');

  // Modal Ações Caixinha Selecionada
  const [modalAcoesVisible, setModalAcoesVisible] = useState(false);
  const [caixinhaSelecionada, setCaixinhaSelecionada] = useState<any>(null);

  // Estados para Edição / Aporte / Resgate
  const [isEditMode, setIsEditMode] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editValorAlvo, setEditValorAlvo] = useState('');

  const [valorAporte, setValorAporte] = useState('');
  const [valorResgate, setValorResgate] = useState('');

  // Criar nova Caixinha
  const handleCriarCaixinha = async () => {
    // FREEMIUM CHECK: plano free → máximo 3 caixinhas
    if (caixinhas.length >= 3 && plano_usuario === 'free') {
      setCheckoutMessage(t('free_limit_3_jars'));
      toggleCheckoutModal(true);
      return;
    }

    if (!novoNome.trim()) {
      Alert.alert(t('error'), t('enter_jar_name'));
      return;
    }
    const alvo = parseFloat(novoValorAlvo);
    const inicial = parseFloat(novoSaldoInicial) || 0;

    if (isNaN(alvo) || alvo <= 0) {
      Alert.alert(t('error'), t('invalid_target_value'));
      return;
    }

    try {
      await addCaixinha({
        id: Math.random().toString(36).substring(2),
        id_espaco: id_espaco_ativo || '',
        nome: novoNome.trim(),
        valor_alvo: alvo,
        saldo_guardado: inicial
      });
      setModalNovoVisible(false);
      setNovoNome('');
      setNovoValorAlvo('');
      setNovoSaldoInicial('');
      Alert.alert(t('success'), t('jar_created'));
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('error_creating_jar'));
    }
  };

  // Abrir Modal de Ações da Caixinha
  const handleOpenAcoes = (c: any) => {
    setCaixinhaSelecionada(c);
    setEditNome(c.nome);
    setEditValorAlvo(String(c.valor_alvo));
    setIsEditMode(false);
    setValorAporte('');
    setValorResgate('');
    setModalAcoesVisible(true);
  };

  // Salvar Edição de Caixinha
  const handleSalvarEdicao = async () => {
    if (!editNome.trim()) {
      Alert.alert(t('error'), t('jar_name_empty'));
      return;
    }
    const alvo = parseFloat(editValorAlvo);
    if (isNaN(alvo) || alvo <= 0) {
      Alert.alert(t('error'), t('invalid_target_value'));
      return;
    }

    try {
      await updateCaixinha(caixinhaSelecionada.id, {
        nome: editNome.trim(),
        valor_alvo: alvo
      });
      setIsEditMode(false);
      setCaixinhaSelecionada({
        ...caixinhaSelecionada,
        nome: editNome.trim(),
        valor_alvo: alvo
      });
      Alert.alert(t('success'), t('settings_updated'));
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('error_updating_settings'));
    }
  };

  // Adicionar Aporte
  const handleAporte = async () => {
    const val = parseFloat(valorAporte);
    if (isNaN(val) || val <= 0) {
      Alert.alert(t('error'), t('invalid_contribution_value'));
      return;
    }

    const novoSaldo = caixinhaSelecionada.saldo_guardado + val;
    try {
      await updateCaixinha(caixinhaSelecionada.id, {
        saldo_guardado: novoSaldo
      });
      setCaixinhaSelecionada({ ...caixinhaSelecionada, saldo_guardado: novoSaldo });
      setValorAporte('');
      Alert.alert(t('success'), t('contribution_success'));
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('error_contributing'));
    }
  };

  // Realizar Resgate
  const handleResgate = async () => {
    const val = parseFloat(valorResgate);
    if (isNaN(val) || val <= 0) {
      Alert.alert(t('error'), t('invalid_withdrawal_value'));
      return;
    }

    if (val > caixinhaSelecionada.saldo_guardado) {
      Alert.alert(t('error'), t('insufficient_balance_withdrawal'));
      return;
    }

    const novoSaldo = caixinhaSelecionada.saldo_guardado - val;
    try {
      await updateCaixinha(caixinhaSelecionada.id, {
        saldo_guardado: novoSaldo
      });
      setCaixinhaSelecionada({ ...caixinhaSelecionada, saldo_guardado: novoSaldo });
      setValorResgate('');
      Alert.alert(t('success'), t('withdrawal_success'));
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('error_withdrawing'));
    }
  };

  // Confirmar Exclusão de Caixinha
  const handleExcluirCaixinha = () => {
    Alert.alert(
      t('confirm_deletion'),
      t('delete_jar_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteCaixinha(caixinhaSelecionada.id);
              setModalAcoesVisible(false);
              Alert.alert(t('success'), t('jar_deleted'));
            } catch (err: any) {
              Alert.alert(t('error'), err.message || t('error_deleting_jar'));
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Logo variant="horizontal" size="sm" withLeaf />
        <TouchableOpacity 
          style={styles.btnAddCaixinha} 
          onPress={() => setModalNovoVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.btnAddText}>Criar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {caixinhas.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateText}>{t('no_jars_in_space')}</Text>
            <TouchableOpacity 
              style={[styles.btnAddCaixinha, { marginTop: 14, alignSelf: 'center' }]} 
              onPress={() => setModalNovoVisible(true)}
            >
              <Text style={styles.btnAddText}>{t('create_first_jar')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          caixinhas.map(caixinha => {
            const progresso = Math.min((caixinha.saldo_guardado / caixinha.valor_alvo) * 100, 100);
            return (
              <TouchableOpacity 
                key={caixinha.id} 
                style={styles.card}
                onPress={() => handleOpenAcoes(caixinha)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{caixinha.nome}</Text>
                  <Edit2 size={14} color={theme.colors.textMuted} />
                </View>
                
                <View style={styles.valuesRow}>
                  <Text style={styles.savedValue}>
                    {formatCurrency(caixinha.saldo_guardado, moeda_base)}
                  </Text>
                  <Text style={styles.targetValue}>
                    {t('of_preposition')}{formatCurrency(caixinha.valor_alvo, moeda_base)}
                  </Text>
                </View>

                {/* Barra de progresso */}
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progresso}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{progresso.toFixed(0)}{t('percent_complete')}</Text>
              </TouchableOpacity>
            );
          })
        )}
        <AdBanner />
      </ScrollView>

      {/* MODAL CRIAÇÃO CAIXINHA */}
      <Modal visible={modalNovoVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('new_jar')}</Text>
              <TouchableOpacity onPress={() => setModalNovoVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t('goal_name_label')}</Text>
              <TextInput
                style={styles.input}
                value={novoNome}
                onChangeText={setNovoNome}
                placeholder={t('goal_name_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.label}>Valor Alvo ({moeda_base})</Text>
              <TextInput
                style={styles.input}
                value={novoValorAlvo}
                onChangeText={setNovoValorAlvo}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.label}>{t('initial_saved_label')} ({moeda_base} - Opcional)</Text>
              <TextInput
                style={styles.input}
                value={novoSaldoInicial}
                onChangeText={setNovoSaldoInicial}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
              />

              <TouchableOpacity 
                style={styles.btnConfirm} 
                onPress={handleCriarCaixinha}
                activeOpacity={0.8}
              >
                <Text style={styles.btnConfirmText}>{t('create_jar')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DETALHES E AÇÕES DA CAIXINHA */}
      {caixinhaSelecionada && (
        <Modal visible={modalAcoesVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{caixinhaSelecionada.nome}</Text>
                  <Text style={styles.modalSubtitle}>{t('progress_label')}{((caixinhaSelecionada.saldo_guardado / caixinhaSelecionada.valor_alvo) * 100).toFixed(0)}%</Text>
                </View>
                <TouchableOpacity onPress={() => setModalAcoesVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
                
                {/* Visualizador de Saldo */}
                <View style={styles.visualizadorSaldoCard}>
                  <Text style={styles.visualizadorLabel}>{t('saved_balance')}</Text>
                  <Text style={styles.visualizadorVal}>
                    {formatCurrency(caixinhaSelecionada.saldo_guardado, moeda_base)}
                  </Text>
                  <Text style={styles.visualizadorTarget}>
                    {t('target_value_display')}{formatCurrency(caixinhaSelecionada.valor_alvo, moeda_base)}
                  </Text>
                </View>

                {/* 1. SEÇÃO DE APORTE E RESGATE */}
                {!isEditMode && (
                  <View style={styles.financeActionsSection}>
                    <Text style={styles.sectionHeader}>{t('contribution_withdrawal')}</Text>
                    
                    {/* Guardar Saldo */}
                    <View style={styles.actionRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        value={valorAporte}
                        onChangeText={setValorAporte}
                        keyboardType="numeric"
                        placeholder={t('contribution_placeholder')}
                        placeholderTextColor={theme.colors.textMuted}
                      />
                      <TouchableOpacity style={styles.btnActionAporte} onPress={handleAporte}>
                        <TrendingUp size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.btnActionText}>{t('save_btn')}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Resgatar Saldo */}
                    <View style={[styles.actionRow, { marginTop: 12 }]}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        value={valorResgate}
                        onChangeText={setValorResgate}
                        keyboardType="numeric"
                        placeholder={t('withdrawal_placeholder')}
                        placeholderTextColor={theme.colors.textMuted}
                      />
                      <TouchableOpacity style={styles.btnActionResgate} onPress={handleResgate}>
                        <TrendingDown size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.btnActionText}>{t('withdraw_btn')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* 2. SEÇÃO DE EDIÇÃO DE METAS */}
                {isEditMode ? (
                  <View style={styles.editSection}>
                    <Text style={styles.sectionHeader}>{t('edit_jar')}</Text>
                    
                    <Text style={styles.label}>{t('goal_name_label')}</Text>
                    <TextInput
                      style={styles.input}
                      value={editNome}
                      onChangeText={setEditNome}
                      placeholder={t('goal_name_label')}
                      placeholderTextColor={theme.colors.textMuted}
                    />

              <Text style={styles.label}>{t('target_value_label')} ({moeda_base})</Text>
                    <TextInput
                      style={styles.input}
                      value={editValorAlvo}
                      onChangeText={setEditValorAlvo}
                      keyboardType="numeric"
                      placeholder={t('target_value_label')}
                      placeholderTextColor={theme.colors.textMuted}
                    />

                    <View style={styles.editActionsRow}>
                      <TouchableOpacity style={styles.btnCancelEdit} onPress={() => setIsEditMode(false)}>
                        <Text style={styles.btnCancelEditText}>{t('cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnSaveEdit} onPress={handleSalvarEdicao}>
                        <Text style={styles.btnSaveEditText}>{t('save')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.btnToggleEdit} 
                    onPress={() => setIsEditMode(true)}
                  >
                    <Edit2 size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.btnToggleEditText}>{t('change_name_goal')}</Text>
                  </TouchableOpacity>
                )}

                {/* Botão de Excluir Caixinha */}
                <TouchableOpacity 
                  style={styles.btnDeleteCaixinha} 
                  onPress={handleExcluirCaixinha}
                >
                  <Trash2 size={16} color="#FF5252" style={{ marginRight: 6 }} />
                  <Text style={styles.btnDeleteText}>{t('delete_jar')}</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingHorizontal: theme.layout.paddingLg,
    paddingTop: theme.layout.paddingLg,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  btnAddCaixinha: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnAddText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  scrollContainer: {
    padding: theme.layout.paddingLg,
    paddingBottom: 90,
  },
  emptyStateCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.layout.radiusMd,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 20,
  },
  emptyStateText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.layout.radiusMd,
    padding: theme.layout.paddingLg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: 'bold',
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  savedValue: {
    color: '#00E676',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 6,
  },
  targetValue: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 4,
  },
  progressPercent: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.modalStyles.backdrop.backgroundColor,
    justifyContent: 'flex-end',
  },
  modalContent: {
    ...theme.modalStyles.container,
    paddingTop: 30,
    paddingBottom: 0,
  },
  modalHeader: {
    ...theme.modalStyles.header,
    paddingHorizontal: theme.layout.paddingLg,
    paddingVertical: 0,
    paddingBottom: 24,
  },
  modalTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  modalForm: {
    padding: theme.layout.paddingLg,
    paddingBottom: 60,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 18,
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 16,
  },
  btnConfirm: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  visualizadorSaldoCard: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.layout.radiusMd,
    padding: theme.layout.paddingLg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  visualizadorLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  visualizadorVal: {
    color: '#00E676',
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  visualizadorTarget: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  financeActionsSection: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 30,
    marginBottom: 20,
  },
  sectionHeader: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnActionAporte: {
    backgroundColor: '#00E676',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  btnActionResgate: {
    backgroundColor: '#FF5252',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  btnActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  btnToggleEdit: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  btnToggleEditText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  editSection: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.layout.radiusMd,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.layout.paddingLg,
    marginBottom: 16,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btnCancelEdit: {
    ...theme.modalStyles.secondaryButton,
    flex: 1,
    height: 40,
  },
  btnCancelEditText: {
    ...theme.modalStyles.secondaryButtonText,
  },
  btnSaveEdit: {
    flex: 1.5,
    height: 40,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSaveEditText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  btnDeleteCaixinha: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FF5252',
    marginTop: 10,
  },
  btnDeleteText: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
