import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, Transacao } from '../store/useStore';
import { ChevronLeft, Share2, Mail, MessageCircle, Calendar, Receipt, PlusCircle, X, Trash2 } from 'lucide-react-native';
import { Logo } from '../components/Logo';
import { useI18n } from '../hooks/useI18n';
import currency from 'currency.js';
import { theme } from '../lib/theme';
import { convertCurrency } from '../utils/currency';

const aplicarMascaraData = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  const limited = cleaned.slice(0, 8);
  if (limited.length <= 2) return limited;
  if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
};

const deBrParaIso = (dataBr: string): string => {
  const parts = dataBr.split('/');
  if (parts.length === 3) {
    const dia = parts[0].padStart(2, '0');
    const mes = parts[1].padStart(2, '0');
    const ano = parts[2];
    if (ano.length === 4) {
      return `${ano}-${mes}-${dia}`;
    }
  }
  return new Date().toISOString().split('T')[0];
};

const deIsoParaBr = (dataIso: string): string => {
  if (!dataIso) return '';
  const parts = dataIso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataIso;
};

interface FechamentoScreenProps {
  onBack: () => void;
}

export const FechamentoScreen = ({ onBack }: FechamentoScreenProps) => {
  const { t } = useI18n();
  const { getTransacoesEspacoAtivo, getContasEspacoAtivo, cotacoes_moedas, moeda_base, updateTransacao, deleteTransacao } = useStore();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Estados para edição
  const [modalEdicaoVisible, setModalEdicaoVisible] = useState(false);
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<Transacao | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editData, setEditData] = useState('');

  const handleAbrirEdicao = (item: Transacao) => {
    setTransacaoSelecionada(item);
    setEditDescricao(item.descricao || '');
    setEditCategoria(item.categoria || '');
    setEditValor(String(item.valor || ''));
    setEditData(deIsoParaBr(item.data_transacao));
    setModalEdicaoVisible(true);
  };

  const handleSalvarEdicao = async () => {
    if (!transacaoSelecionada) return;
    if (!editCategoria.trim()) {
      Alert.alert(t('error'), t('category_empty'));
      return;
    }
    const valNum = parseFloat(editValor);
    if (isNaN(valNum) || valNum <= 0) {
      Alert.alert(t('error'), t('invalid_value'));
      return;
    }

    const dataIso = deBrParaIso(editData);

    try {
      await updateTransacao(transacaoSelecionada.id, {
        descricao: editDescricao.trim() || undefined,
        categoria: editCategoria.trim(),
        valor: valNum,
        data_transacao: dataIso
      });
      setModalEdicaoVisible(false);
      setTransacaoSelecionada(null);
      Alert.alert(t('success'), t('transaction_updated'));
    } catch (err: any) {
      Alert.alert(t('error_updating'), err.message || t('unknown_error'));
    }
  };

  const handleExcluirEdicao = () => {
    if (!transacaoSelecionada) return;
    Alert.alert(
      t('confirm_deletion'),
      t('delete_transaction_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransacao(transacaoSelecionada.id);
              setModalEdicaoVisible(false);
              setTransacaoSelecionada(null);
            } catch (err: any) {
              Alert.alert(t('error_deleting'), err.message || t('unknown_error'));
            }
          }
        }
      ]
    );
  };

  const transacoesEspaco = getTransacoesEspacoAtivo();
  const contas = getContasEspacoAtivo();

  const obterValorConvertido = (t: Transacao) => {
    if (!t) return 0;
    const conta = contas.find(c => c.id === t.id_conta);
    const moedaOrigem = conta ? conta.moeda_conta : moeda_base;
    return convertCurrency(t.valor, moedaOrigem, moeda_base, cotacoes_moedas);
  };

  const compartilhadas = transacoesEspaco.filter(t => {
    const isComp = t.is_compartilhada;
    return isComp === true || 
           isComp === (1 as any) || 
           String(isComp).toLowerCase() === 'true' || 
           String(isComp) === '1';
  });

  // Formata valor com moeda local
  const formatVal = (val: number, isTransfer = false) => {
    return currency(val, { symbol: isTransfer ? '' : moeda_base, precision: 2 }).format();
  };

  // Agrupar transações por mês/ano
  const getMesAnoKey = (dataStr: string) => {
    try {
      if (!dataStr) return t('others_category');
      let ano = '';
      let mesIndex = 0; // 0 a 11

      if (dataStr.includes('/')) {
        const partes = dataStr.split('/');
        if (partes.length === 3) {
          mesIndex = parseInt(partes[1], 10) - 1;
          ano = partes[2];
        } else {
          return t('others_category');
        }
      } else if (dataStr.includes('-')) {
        const partes = dataStr.split('-');
        if (partes.length >= 2) {
          ano = partes[0];
          mesIndex = parseInt(partes[1], 10) - 1;
        } else {
          return t('others_category');
        }
      } else {
        return t('others_category');
      }

      const meses = [
        t('month_january'), t('month_february'), t('month_march'), t('month_april'), t('month_may'), t('month_june'),
        t('month_july'), t('month_august'), t('month_september'), t('month_october'), t('month_november'), t('month_december')
      ];
      if (mesIndex >= 0 && mesIndex < 12) {
        return `${meses[mesIndex]} de ${ano}`;
      }
      return t('others_category');
    } catch {
      return t('others_category');
    }
  };

  const grupos: { [key: string]: Transacao[] } = {};
  compartilhadas.forEach(t => {
    const key = getMesAnoKey(t.data_transacao);
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(t);
  });

  const obterTimestampData = (dataStr: string) => {
    if (!dataStr) return 0;
    if (dataStr.includes('/')) {
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        return new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10)).getTime();
      }
    }
    if (dataStr.includes('-')) {
      const partes = dataStr.split('-');
      if (partes.length >= 3) {
        return new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10)).getTime();
      }
    }
    const d = new Date(dataStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  // Ordenar grupos por data decrescente (com base na primeira transação de cada grupo)
  const sortedMonths = Object.keys(grupos).sort((a, b) => {
    const dataA = obterTimestampData(grupos[a][0].data_transacao);
    const dataB = obterTimestampData(grupos[b][0].data_transacao);
    return dataB - dataA;
  });

  const handleShareWhatsApp = (mes: string, txs: Transacao[]) => {
    const { totalReceitas, totalDespesas, textoLista } = calcularTotais(txs);
    const totalLiquido = totalReceitas.subtract(totalDespesas);

    const texto = `*${t('shared_closing_title')} (${mes})*\n` +
      `----------------------------------------\n` +
      `🟢 *${t('shared_incomes')}:* ${formatVal(totalReceitas.value)}\n` +
      `🔴 *${t('shared_expenses_fechar')}:* ${formatVal(totalDespesas.value)}\n` +
      `⚖️ *${t('total_balance_share')}:* ${formatVal(totalLiquido.value)}\n\n` +
      `*${t('transaction_details_share')}:*\n` +
      textoLista +
      `\n${t('email_footer')}`;

    const url = `whatsapp://send?text=${encodeURIComponent(texto)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), t('whatsapp_not_installed'));
    });
  };

  const handleShareEmail = (mes: string, txs: Transacao[]) => {
    const { totalReceitas, totalDespesas, textoLista } = calcularTotais(txs);
    const totalLiquido = totalReceitas.subtract(totalDespesas);

    const assunto = `${t('shared_closing_title')} (${mes})`;
    const corpo = `${t('email_greeting_closing')}\n\n` +
      `${t('shared_incomes')}: ${formatVal(totalReceitas.value)}\n` +
      `${t('shared_expenses_fechar')}: ${formatVal(totalDespesas.value)}\n` +
      `${t('net_balance_share')}: ${formatVal(totalLiquido.value)}\n\n` +
      `${t('email_transaction_details')}\n` +
      textoLista.replace(/\*/g, '') + // Remove asteriscos para e-mail
      `\n${t('email_footer')}`;

    const url = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), t('email_client_error'));
    });
  };

  const formatarDataSegura = (dataStr: string) => {
    if (!dataStr) return '';
    if (dataStr.includes('/')) {
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        return `${partes[0].padStart(2, '0')}/${partes[1].padStart(2, '0')}`;
      }
      return dataStr;
    }
    if (dataStr.includes('-')) {
      const partes = dataStr.split('-');
      if (partes.length >= 3) {
        return `${partes[2].substring(0, 2).padStart(2, '0')}/${partes[1].padStart(2, '0')}`;
      }
    }
    return dataStr;
  };

  const calcularTotais = (txs: Transacao[]) => {
    let totalReceitas = currency(0);
    let totalDespesas = currency(0);
    let textoLista = '';

    txs.forEach(tx => {
      const valorConvertido = obterValorConvertido(tx);
      const valor = currency(valorConvertido);
      const dataFormatada = formatarDataSegura(tx.data_transacao);
      if (tx.tipo === 'receita') {
        totalReceitas = totalReceitas.add(valor);
        textoLista += `- [${dataFormatada}] ${tx.descricao || t('income')}: +${formatVal(valorConvertido)}\n`;
      } else if (tx.tipo === 'despesa') {
        totalDespesas = totalDespesas.add(valor);
        textoLista += `- [${dataFormatada}] ${tx.descricao || t('expense')}: -${formatVal(valorConvertido)}\n`;
      }
    });

    return { totalReceitas, totalDespesas, textoLista };
  };

  const toggleMonth = (key: string) => {
    setExpandedMonth(expandedMonth === key ? null : key);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ChevronLeft size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Logo variant="horizontal" size="xs" withLeaf />
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {compartilhadas.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Receipt size={48} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitleText}>{t('no_shared_transactions_fechar')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('no_shared_transactions_hint')}
            </Text>
          </View>
        ) : (
          sortedMonths.map(key => {
            const txs = grupos[key];
            const isExpanded = expandedMonth === key;
            const { totalReceitas, totalDespesas } = calcularTotais(txs);
            const totalLiquido = totalReceitas.subtract(totalDespesas);

            return (
              <View key={key} style={styles.monthCard}>
                <TouchableOpacity style={styles.monthHeader} onPress={() => toggleMonth(key)} activeOpacity={0.8}>
                  <View style={styles.monthHeaderLeft}>
                    <Calendar size={18} color={theme.colors.primary} />
                    <Text style={styles.monthName}>{key}</Text>
                  </View>
                  <Text style={[styles.monthTotal, totalLiquido.value >= 0 ? styles.positiveText : styles.negativeText]}>
                    {formatVal(totalLiquido.value)}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* Resumo Rápido */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>{t('shared_incomes')}</Text>
                    <Text style={[styles.summaryVal, styles.positiveText]}>+{formatVal(totalReceitas.value)}</Text>
                  </View>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>{t('shared_expenses_fechar')}</Text>
                    <Text style={[styles.summaryVal, styles.negativeText]}>-{formatVal(totalDespesas.value)}</Text>
                  </View>
                </View>

                {/* Ações de Compartilhamento */}
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.shareBtn, styles.whatsappBtn]} 
                    onPress={() => handleShareWhatsApp(key, txs)}
                    activeOpacity={0.8}
                  >
                    <MessageCircle size={16} color="#FFFFFF" />
                    <Text style={styles.whatsappBtnText}>{t('whatsapp')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.shareBtn, styles.emailBtn]} 
                    onPress={() => handleShareEmail(key, txs)}
                    activeOpacity={0.8}
                  >
                    <Mail size={16} color="#FFFFFF" />
                    <Text style={styles.emailBtnText}>{t('email')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Lista Expandida de Transações */}
                {isExpanded && (
                  <View style={styles.transactionList}>
                    <Text style={styles.listTitle}>{t('month_details')}</Text>
                    {txs.map(tx => {
                      const dataFormatada = formatarDataSegura(tx.data_transacao);
                      const valorConvertido = obterValorConvertido(tx);
                      return (
                        <TouchableOpacity 
                          key={tx.id} 
                          style={styles.txItem}
                          onPress={() => handleAbrirEdicao(tx)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.txLeft}>
                            <Text style={styles.txDate}>{dataFormatada}</Text>
                            <Text style={styles.txDesc} numberOfLines={1}>{tx.descricao || (tx.tipo === 'receita' ? t('income') : t('expense'))}</Text>
                          </View>
                          <Text style={[styles.txValue, tx.tipo === 'receita' ? styles.positiveText : styles.negativeText]}>
                            {tx.tipo === 'receita' ? '+' : '-'}{formatVal(valorConvertido)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.expandToggle} 
                  onPress={() => toggleMonth(key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.expandToggleText}>
                    {isExpanded ? t('hide_details') : t('show_details')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL DE EDIÇÃO DE TRANSAÇÃO */}
      <Modal visible={modalEdicaoVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t('edit_transaction')}</Text>
                <Text style={styles.modalSubtitle}>{t('modify_transaction_details')}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalEdicaoVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.labelInput}>{t('description_label')}</Text>
              <TextInput
                style={styles.textInputEdicao}
                value={editDescricao}
                onChangeText={setEditDescricao}
                placeholder={t('description_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.labelInput}>{t('category_label')}</Text>
              <TextInput
                style={styles.textInputEdicao}
                value={editCategoria}
                onChangeText={setEditCategoria}
                placeholder={t('category_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.labelInput}>{t('value_label')}</Text>
              <TextInput
                style={styles.textInputEdicao}
                value={editValor}
                onChangeText={setEditValor}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.labelInput}>{t('date_label')}</Text>
              <TextInput
                style={styles.textInputEdicao}
                value={editData}
                onChangeText={(t) => setEditData(aplicarMascaraData(t))}
                placeholder={t('date_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[styles.modalFooter, { flexDirection: 'column', gap: 8, paddingBottom: 36, marginTop: 8 }]}>
              <TouchableOpacity 
                style={[styles.modalVerticalBtn, { backgroundColor: theme.colors.positive }]} 
                onPress={handleSalvarEdicao}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalVerticalBtnText, { color: '#FFFFFF' }]}>{t('save_changes')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalVerticalBtn, { backgroundColor: '#EF4444' }]} 
                onPress={handleExcluirEdicao}
                activeOpacity={0.8}
              >
                <Trash2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={[styles.modalVerticalBtnText, { color: '#FFFFFF' }]}>{t('delete_transaction')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalVerticalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border }]} 
                onPress={() => setModalEdicaoVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalVerticalBtnText, { color: theme.colors.textMuted }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 150,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    paddingHorizontal: 36,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitleText: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  monthCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  monthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthName: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: 'bold',
  },
  monthTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 15,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emailBtn: {
    backgroundColor: theme.colors.primary,
  },
  emailBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  expandToggle: {
    alignItems: 'center',
    paddingVertical: 9,
    marginTop: 4,
  },
  expandToggleText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  transactionList: {
    marginTop: 12,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  listTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  txDate: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  txDesc: {
    color: theme.colors.ink,
    fontSize: 13,
    flex: 1,
  },
  txValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  positiveText: {
    color: theme.colors.positive,
  },
  negativeText: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.modalStyles.backdrop.backgroundColor,
    justifyContent: 'flex-end',
  },
  modalContent: {
    ...theme.modalStyles.container,
    padding: 0,
  },
  modalHeader: {
    ...theme.modalStyles.header,
    padding: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.ink,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  labelInput: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
    marginBottom: 8,
    marginTop: 16,
  },
  textInputEdicao: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 24,
    fontSize: 16,
    color: theme.colors.ink,
  },
  modalFooter: {
    paddingHorizontal: 36,
  },
  modalVerticalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 12,
  },
  modalVerticalBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
