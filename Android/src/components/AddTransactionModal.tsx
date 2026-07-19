import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
  ScrollView
} from 'react-native';
import { useStore } from '../store/useStore';
import { X, Users, Wallet } from 'lucide-react-native';
import { theme } from '../lib/theme';
import { addMoney, subtractMoney, multiplyMoney, divideMoney, formatCurrency, CURRENCY_CONFIGS, convertCurrency } from '../utils/currency';

export const AddTransactionModal = () => {
  const { 
    isAddTransactionOpen, 
    setAddTransactionOpen, 
    getContasEspacoAtivo, 
    addTransacao,
    transacoes,
    tags,
    regras_tags,
    addRegraTag,
    moeda_base,
    cotacoes_moedas,
    showToast
  } = useStore();

  const [tipo, setTipo] = useState<'despesa' | 'receita' | 'transferencia'>('despesa');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [contaOrigemId, setContaOrigemId] = useState('');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [moedaTransacao, setMoedaTransacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Estados de Tags
  const [idTagSelecionada, setIdTagSelecionada] = useState<string | null>(null);
  const [idTagSugerida, setIdTagSugerida] = useState<string | null>(null);

  // Compartilhamento
  const [isCompartilhado, setIsCompartilhado] = useState(false);
  const [emailParticipante, setEmailParticipante] = useState('');

  const activeAccounts = getContasEspacoAtivo();
  const inputRef = useRef<TextInput>(null);

  // Heurística de sugestão em tempo real conforme digita descrição
  useEffect(() => {
    if (descricao.trim().length >= 2) {
      const descLower = descricao.toLowerCase();
      const regra = regras_tags.find(r => descLower.includes(r.termo_busca.toLowerCase()));
      if (regra) {
        setIdTagSugerida(regra.id_tag);
        setIdTagSelecionada(prev => prev === null ? regra.id_tag : prev);
      } else {
        setIdTagSugerida(null);
      }
    } else {
      setIdTagSugerida(null);
    }
  }, [descricao, regras_tags]);

  useEffect(() => {
    if (isAddTransactionOpen) {
      setContaOrigemId(activeAccounts[0]?.id || '');
      setMoedaTransacao(activeAccounts[0]?.moeda_conta || moeda_base || 'BRL');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    } else {
      setValor('');
      setCategoria('');
      setDescricao('');
      setTipo('despesa');
      setContaOrigemId('');
      setContaDestinoId('');
      setIsCompartilhado(false);
      setEmailParticipante('');
      setIdTagSelecionada(null);
      setIdTagSugerida(null);
      setSalvando(false);
    }
  }, [isAddTransactionOpen]);

  const handleContaOrigemChange = (id: string) => {
    setContaOrigemId(id);
    const conta = activeAccounts.find(c => c.id === id);
    if (conta) {
      setMoedaTransacao(conta.moeda_conta);
    }
  };

  const handleSave = async () => {
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) {
      showToast('Por favor, insira um valor válido.', 'error');
      return;
    }
    if (!moedaTransacao) {
      showToast('Por favor, selecione a moeda da transação.', 'error');
      return;
    }
    if (!categoria.trim()) {
      showToast('Por favor, digite uma categoria.', 'error');
      return;
    }
    if (activeAccounts.length === 0) {
      showToast('Nenhuma conta ativa para associar.', 'error');
      return;
    }

    const contaSelecionada = activeAccounts.find(c => c.id === contaOrigemId) || activeAccounts[0];
    if (!contaSelecionada) {
      showToast('Conta não encontrada.', 'error');
      return;
    }

    if (tipo === 'transferencia') {
      const contaDestino = activeAccounts.find(c => c.id === contaDestinoId) || activeAccounts[1] || activeAccounts[0];
      if (contaDestino.id === contaSelecionada.id && activeAccounts.length < 2) {
        showToast('Você precisa de pelo menos duas contas registradas para transferir.', 'error');
        return;
      }
    }

    if (isCompartilhado && !emailParticipante.trim()) {
      showToast('Por favor, insira o nome ou e-mail para compartilhar o gasto.', 'error');
      return;
    }

    const valorFloat = parseFloat(valor);
    let valorFinalTransacao = valorFloat;
    let descricaoFinal = descricao.trim();
    let taxaCambio = 1.0;

    // Conversão de Câmbio se a moeda do lançamento for diferente da moeda da conta
    if (moedaTransacao !== contaSelecionada.moeda_conta) {
      valorFinalTransacao = convertCurrency(valorFloat, moedaTransacao, contaSelecionada.moeda_conta, cotacoes_moedas);
      taxaCambio = convertCurrency(1, moedaTransacao, contaSelecionada.moeda_conta, cotacoes_moedas);
      
      const valorOriginalFormatado = formatCurrency(valorFloat, moedaTransacao);
      descricaoFinal = `[Original: ${valorOriginalFormatado}] ${descricaoFinal}`.trim();
    }

    // Checkout Validation: Prevent overdraft
    if (tipo === 'despesa' || tipo === 'transferencia') {
      let accountBalance = contaSelecionada.saldo_inicial;
      const accountTrans = transacoes.filter((t) => t.id_conta === contaSelecionada.id || t.id_conta_destino === contaSelecionada.id);

      accountTrans.forEach((t) => {
        if (t.tipo === 'receita') {
          accountBalance = addMoney(accountBalance, t.valor);
        } else if (t.tipo === 'despesa') {
          accountBalance = subtractMoney(accountBalance, t.valor);
        } else if (t.tipo === 'transferencia') {
          if (t.id_conta === contaSelecionada.id) {
            accountBalance = subtractMoney(accountBalance, t.valor);
          }
          if (t.id_conta_destino === contaSelecionada.id) {
            accountBalance = addMoney(accountBalance, t.valor);
          }
        }
      });

      if (accountBalance < valorFinalTransacao) {
        showToast(`Saldo insuficiente. Saldo atual: ${formatCurrency(accountBalance, contaSelecionada.moeda_conta)}`, 'error');
        return;
      }
    }

    setSalvando(true);

    try {
      const novaTransacao = {
        id: Math.random().toString(36).substring(2, 9),
        id_conta: contaSelecionada.id,
        tipo,
        valor: valorFinalTransacao,
        categoria: categoria.trim(),
        id_tag: idTagSelecionada,
        data_transacao: new Date().toISOString().split('T')[0],
        taxa_cambio_dia: taxaCambio,
        descricao: descricaoFinal || undefined,
        id_conta_destino: tipo === 'transferencia' ? (contaDestinoId || activeAccounts[1]?.id || activeAccounts[0].id) : undefined,
        is_compartilhada: isCompartilhado,
        participante_email: isCompartilhado ? emailParticipante.trim().toLowerCase() : undefined,
      };

      await addTransacao(novaTransacao);

      if (isCompartilhado) {
        const valorDevidoFormatado = formatCurrency(valorFinalTransacao / 2, contaSelecionada.moeda_conta);
        showToast(`Gasto dividido! ${valorDevidoFormatado} pendente com ${emailParticipante.trim()}.`, 'success');
      } else {
        showToast('Transação registrada com sucesso!', 'success');
      }

      // Aprendizado contínuo: Perguntar se quer criar a regra se o usuário alterou/associou uma tag manualmente
      if (descricao.trim() && idTagSelecionada && idTagSelecionada !== idTagSugerida) {
        const nomeTag = tags.find(t => t.id === idTagSelecionada)?.nome || '';
        showToast(`Criando regra inteligente para "${descricao.trim()}" -> ${nomeTag}`, 'info');
        try {
          await addRegraTag({
            termo_busca: descricao.trim(),
            id_tag: idTagSelecionada
          });
        } catch (err) {
          console.error('Erro ao salvar regra:', err);
        }
      }
      
      setAddTransactionOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar transação.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const getMoedaSimbolo = (code: string) => {
    switch (code) {
      case 'USD': return 'US$';
      case 'EUR': return '€';
      case 'ARS': return 'ARS$';
      default: return 'R$';
    }
  };

  return (
    <Modal
      visible={isAddTransactionOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setAddTransactionOpen(false)}
    >
      <TouchableWithoutFeedback onPress={() => {
        Keyboard.dismiss();
        setAddTransactionOpen(false);
      }}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.bottomSheet}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Lançamento Rápido</Text>
                <TouchableOpacity 
                  onPress={() => setAddTransactionOpen(false)}
                  style={styles.closeBtn}
                >
                  <X size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Seletor Tipo */}
              <View style={styles.tipoRow}>
                <TouchableOpacity
                  style={[styles.tipoBtn, tipo === 'despesa' && styles.btnDespesaActive]}
                  onPress={() => {
                    setTipo('despesa');
                    setIsCompartilhado(false);
                  }}
                >
                  <Text style={[styles.tipoBtnText, tipo === 'despesa' && styles.textActive]}>Despesa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoBtn, tipo === 'receita' && styles.btnReceitaActive]}
                  onPress={() => {
                    setTipo('receita');
                    setIsCompartilhado(false);
                  }}
                >
                  <Text style={[styles.tipoBtnText, tipo === 'receita' && styles.textActive]}>Receita</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoBtn, tipo === 'transferencia' && styles.btnTransfActive]}
                  onPress={() => {
                    setTipo('transferencia');
                    setIsCompartilhado(false);
                  }}
                >
                  <Text style={[styles.tipoBtnText, tipo === 'transferencia' && styles.textActive]}>Transf.</Text>
                </TouchableOpacity>
              </View>

              {/* Seletor de Conta Origem */}
              {tipo !== 'transferencia' && activeAccounts.length > 1 && (
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>Conta de Origem:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                    {activeAccounts.map(acc => {
                      const isSelected = contaOrigemId === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.selectorBadge,
                            isSelected && styles.selectorBadgeActive
                          ]}
                          onPress={() => handleContaOrigemChange(acc.id)}
                          activeOpacity={0.7}
                        >
                          <Wallet size={12} color={isSelected ? theme.colors.white : theme.colors.textMuted} style={{ marginRight: 4 }} />
                          <Text style={[styles.selectorBadgeText, isSelected && styles.selectorBadgeTextActive]}>
                            {acc.nome_instituicao} ({acc.moeda_conta})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Seletor de Moeda do Lançamento */}
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>Moeda do Gasto/Recebimento:</Text>
                <View style={styles.moedaRow}>
                  {['BRL', 'USD', 'EUR', 'ARS'].map(m => {
                    const isSelected = moedaTransacao === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.moedaBadge,
                          isSelected && styles.moedaBadgeActive
                        ]}
                        onPress={() => setMoedaTransacao(m)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.moedaBadgeText, isSelected && styles.moedaBadgeTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Input Valor */}
              <View style={styles.valorContainer}>
                <Text style={styles.cifrao}>{getMoedaSimbolo(moedaTransacao)}</Text>
                <TextInput
                  ref={inputRef}
                  style={styles.valorInput}
                  placeholder="0,00"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  value={valor}
                  onChangeText={setValor}
                />
              </View>

              {/* Input Categoria */}
              <TextInput
                style={styles.input}
                placeholder="Categoria (Ex: Alimentação, Lazer)"
                placeholderTextColor={theme.colors.textMuted}
                value={categoria}
                onChangeText={setCategoria}
              />

              {/* Input Descrição */}
              <TextInput
                style={styles.input}
                placeholder="Descrição (Opcional)"
                placeholderTextColor={theme.colors.textMuted}
                value={descricao}
                onChangeText={setDescricao}
              />

              {/* AI Tag Suggestion Widget */}
              {tipo === 'despesa' && idTagSugerida && (
                <View style={styles.aiSuggestionBox}>
                  <Text style={styles.aiSuggestionText}>
                    ✨ Tag Sugerida por IA: <Text style={{ fontWeight: 'bold' }}>{tags.find(t => t.id === idTagSugerida)?.nome}</Text>
                  </Text>
                </View>
              )}

              {/* Seletor de Tags */}
              {tipo === 'despesa' && tags.length > 0 && (
                <View style={styles.tagSelectorContainer}>
                  <Text style={styles.tagSelectorLabel}>Tag do Gasto:</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tagScroll}
                  >
                    {tags.map(tag => {
                      const isSelecionada = idTagSelecionada === tag.id;
                      const isSugerida = idTagSugerida === tag.id;
                      return (
                        <TouchableOpacity
                          key={tag.id}
                          style={[
                            styles.tagBadge,
                            { borderColor: tag.cor },
                            isSelecionada ? { backgroundColor: tag.cor } : { backgroundColor: 'transparent' },
                            isSugerida && !isSelecionada && styles.tagBadgeSugerida
                          ]}
                          onPress={() => {
                            setIdTagSelecionada(isSelecionada ? null : tag.id);
                          }}
                          activeOpacity={0.7}
                        >
                          <View 
                            style={[
                              styles.tagDot, 
                              { backgroundColor: isSelecionada ? '#FFFFFF' : tag.cor }
                            ]} 
                          />
                          <Text 
                            style={[
                              styles.tagBadgeText,
                              isSelecionada ? { color: theme.colors.white, fontWeight: 'bold' } : { color: theme.colors.text }
                            ]}
                          >
                            {tag.nome}
                            {isSugerida && ' (sugerida)'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Checkbox / Toggle Dividir Gasto */}
              {tipo === 'despesa' && (
                <View style={styles.shareContainer}>
                  <View style={styles.shareHeaderRow}>
                    <View style={styles.shareLabelGroup}>
                      <Users size={16} color={theme.colors.primary} />
                      <Text style={styles.shareTitle}>Dividir Gasto (50/50)</Text>
                    </View>
                    <Switch
                      value={isCompartilhado}
                      onValueChange={setIsCompartilhado}
                    trackColor={{ false: theme.colors.border, true: theme.colors.positive }}
                    thumbColor={isCompartilhado ? theme.colors.white : theme.colors.textMuted}
                    />
                  </View>

                  {isCompartilhado && (
                    <TextInput
                      style={[styles.input, styles.shareInput]}
                      placeholder="Nome, ID ou e-mail do parceiro"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="default"
                      autoCapitalize="none"
                      value={emailParticipante}
                      onChangeText={setEmailParticipante}
                    />
                  )}
                </View>
              )}

              {/* Seletor Conta Destino (Apenas para transferência) */}
              {tipo === 'transferencia' && activeAccounts.length > 1 && (
                <View style={styles.destinationContainer}>
                  <Text style={styles.destLabel}>Transferir para:</Text>
                  <View style={styles.destRow}>
                    {activeAccounts.map(acc => {
                      if (acc.id === contaOrigemId) return null;
                      return (
                        <TouchableOpacity 
                          key={acc.id}
                          style={[
                            styles.destBadge, 
                            (contaDestinoId === acc.id || !contaDestinoId) && styles.destBadgeActive
                          ]}
                          onPress={() => setContaDestinoId(acc.id)}
                        >
                          <Text style={styles.destBadgeText}>{acc.nome_instituicao}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Botão Registrar */}
              <TouchableOpacity 
                style={[styles.saveBtn, salvando && { opacity: 0.6 }]} 
                onPress={handleSave}
                disabled={salvando}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>{salvando ? 'Salvando...' : 'Confirmar Lançamento'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.modalStyles.backdrop.backgroundColor,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    ...theme.modalStyles.container,
    padding: 36,
  },
  sheetHeader: {
    ...theme.modalStyles.header,
    marginBottom: 20,
  },
  sheetTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
  },
  tipoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tipoBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tipoBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  btnDespesaActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  btnReceitaActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  btnTransfActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  textActive: {
    color: '#FFFFFF',
  },
  selectorContainer: {
    marginBottom: 12,
  },
  selectorLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  selectorScroll: {
    gap: 8,
    paddingVertical: 3,
  },
  selectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  selectorBadgeActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  selectorBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  selectorBadgeTextActive: {
    color: '#FFFFFF',
  },
  moedaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moedaBadge: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moedaBadgeActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  moedaBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  moedaBadgeTextActive: {
    color: '#FFFFFF',
  },
  valorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  cifrao: {
    color: theme.colors.textSecondary,
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  valorInput: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 120,
    paddingVertical: 0,
  },
  input: {
    ...theme.modalStyles.input,
  },
  shareContainer: {
    backgroundColor: theme.colors.bg,
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  shareHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  shareInput: {
    marginTop: 10,
    marginBottom: 0,
    borderColor: theme.colors.primary,
  },
  destinationContainer: {
    marginBottom: 16,
  },
  destLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  destRow: {
    flexDirection: 'row',
    gap: 8,
  },
  destBadge: {
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  destBadgeActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(16, 69, 161, 0.08)',
  },
  destBadgeText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  saveBtn: {
    ...theme.modalStyles.primaryButton,
  },
  saveBtnText: {
    ...theme.modalStyles.primaryButtonText,
  },
  tagSelectorContainer: {
    marginBottom: 16,
  },
  tagSelectorLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  tagScroll: {
    gap: 8,
    paddingVertical: 6,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 18,
    gap: 6,
  },
  tagBadgeSugerida: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#FFC93C',
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagBadgeText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  aiSuggestionBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
  },
  aiSuggestionText: {
    color: '#1E293B',
    fontSize: 12,
    lineHeight: 16,
  },
});
export default AddTransactionModal;
