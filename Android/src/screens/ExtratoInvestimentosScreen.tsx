import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  Modal, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../store/useStore';
import { buscarTickers, validarTicker } from '../utils/tickerSearch';
import { Logo } from '../components/Logo';
import { formatCurrency } from '../utils/currency';
import { theme } from '../lib/theme';
import { 
  ArrowLeft, 
  Calendar, 
  Plus, 
  Trash2, 
  Filter,
  TrendingDown,
  TrendingUp,
  Pencil
} from 'lucide-react-native';

interface ExtratoInvestimentosScreenProps {
  onBack: () => void;
}

export const ExtratoInvestimentosScreen = ({ onBack }: ExtratoInvestimentosScreenProps) => {
  const { t } = useI18n();
  const { 
    moeda_base,
    transacoes_ativos,
    deleteTransacaoAtivo,
    addTransacaoAtivo,
    updateTransacaoAtivo,
    showToast
  } = useStore();

  // Estados de Filtro
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'compra' | 'venda'>('todos');
  const [buscaAtivo, setBuscaAtivo] = useState('');
  const [filtroData, setFiltroData] = useState<'recente' | 'antiga'>('recente');

  // Estados do Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txTicker, setTxTicker] = useState('');
  const [txTipo, setTxTipo] = useState<'compra' | 'venda'>('compra');
  const [txQtd, setTxQtd] = useState('');
  const [txPreco, setTxPreco] = useState('');
  const [txData, setTxData] = useState(new Date().toISOString().split('T')[0]);
  const [sugestoes, setSugestoes] = useState<{ ticker: string; nome: string }[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSalvarTx = async () => {
    if (!txTicker.trim()) {
      showToast(t('enter_ticker'), 'error');
      return;
    }
    const qtdNum = Number(txQtd.replace(',', '.'));
    if (isNaN(qtdNum) || qtdNum <= 0) {
      showToast(t('invalid_quantity'), 'error');
      return;
    }
    const precoNum = Number(txPreco.replace(',', '.'));
    if (isNaN(precoNum) || precoNum <= 0) {
      showToast(t('invalid_unit_price'), 'error');
      return;
    }

    const tickerUpper = txTicker.toUpperCase().trim();

    setLoading(true);
    const tickerValido = await validarTicker(tickerUpper);
    setLoading(false);

    if (!tickerValido) {
      showToast(t('ticker_not_found'), 'error');
      return;
    }

    if (editingTxId) {
      await updateTransacaoAtivo(editingTxId, {
        ticker: tickerUpper,
        tipo: txTipo,
        quantidade: qtdNum,
        preco_unitario: precoNum,
        data_transacao: txData
      });
      showToast(t('operation_updated'), 'success');
    } else {
      await addTransacaoAtivo({
        id: Math.random().toString(36).substring(2, 15),
        ticker: tickerUpper,
        tipo: txTipo,
        quantidade: qtdNum,
        preco_unitario: precoNum,
        data_transacao: txData
      });
      showToast(t('operation_registered'), 'success');
    }

    handleCloseModal();
  };

  const handleEditTx = (tx: any) => {
    setEditingTxId(tx.id);
    setTxTicker(tx.ticker);
    setTxTipo(tx.tipo);
    setTxQtd(tx.quantidade.toString());
    setTxPreco(tx.preco_unitario.toString());
    setTxData(tx.data_transacao);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTxId(null);
    setTxTicker('');
    setTxQtd('');
    setTxPreco('');
    setSugestoes([]);
  };

  const handleDeleteTx = (id: string) => {
    Alert.alert(
      t('confirm_deletion'),
      t('delete_tx_asset_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteTransacaoAtivo(id) }
      ]
    );
  };

  // Processa e filtra os lançamentos
  const lancamentosFiltrados = transacoes_ativos
    .filter(l => {
      const matchTipo = filtroTipo === 'todos' || l.tipo === filtroTipo;
      const matchBusca = l.ticker.toLowerCase().includes(buscaAtivo.toLowerCase());
      return matchTipo && matchBusca;
    })
    .sort((a, b) => {
      if (filtroData === 'recente') {
        return b.data_transacao.localeCompare(a.data_transacao);
      } else {
        return a.data_transacao.localeCompare(b.data_transacao);
      }
    });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Logo variant="horizontal" size="xs" withLeaf />
        <TouchableOpacity 
          style={styles.addBtnHeader} 
          onPress={() => setIsModalOpen(true)}
          activeOpacity={0.7}
        >
          <Plus size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Pesquisa e Filtros */}
      <View style={styles.searchFilterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por ticker..."
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
          value={buscaAtivo}
          onChangeText={setBuscaAtivo}
        />

        {/* Chips de Filtro Rápido */}
        <View style={styles.chipsContainer}>
          <ScrollViewHorizontal style={styles.chipsScroll}>
            <TouchableOpacity
              style={[styles.chipBtn, filtroTipo === 'todos' && styles.chipActive]}
              onPress={() => setFiltroTipo('todos')}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, filtroTipo === 'todos' && styles.chipTextActive]}>{t('filter_all')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chipBtn, filtroTipo === 'compra' && styles.chipActive]}
              onPress={() => setFiltroTipo('compra')}
              activeOpacity={0.8}
            >
              <TrendingUp size={12} color={filtroTipo === 'compra' ? theme.colors.bg : theme.colors.negative} style={styles.chipIcon} />
              <Text style={[styles.chipText, filtroTipo === 'compra' && styles.chipTextActive]}>{t('filter_buys')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chipBtn, filtroTipo === 'venda' && styles.chipActive]}
              onPress={() => setFiltroTipo('venda')}
              activeOpacity={0.8}
            >
              <TrendingDown size={12} color={filtroTipo === 'venda' ? theme.colors.bg : theme.colors.positive} style={styles.chipIcon} />
              <Text style={[styles.chipText, filtroTipo === 'venda' && styles.chipTextActive]}>{t('filter_sells')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chipBtn, styles.dateChip, filtroData === 'antiga' && styles.chipActive]}
              onPress={() => setFiltroData(prev => prev === 'recente' ? 'antiga' : 'recente')}
              activeOpacity={0.8}
            >
              <Filter size={12} color={filtroData === 'antiga' ? theme.colors.bg : theme.colors.primary} style={styles.chipIcon} />
              <Text style={[styles.chipText, filtroData === 'antiga' && styles.chipTextActive]}>
                {filtroData === 'recente' ? t('sort_newest') : t('sort_oldest')}
              </Text>
            </TouchableOpacity>
          </ScrollViewHorizontal>
        </View>
      </View>

      {/* Lista */}
      {lancamentosFiltrados.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{t('no_operations_found')}</Text>
        </View>
      ) : (
        <FlatList
          data={lancamentosFiltrados}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.lancamentoList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isCompra = item.tipo === 'compra';
            return (
              <TouchableOpacity 
                style={styles.lancamentoCard} 
                onPress={() => handleEditTx(item)}
                activeOpacity={0.8}
              >
                <View style={styles.lancamentoLeft}>
                  <View style={[styles.badgeTipo, isCompra ? styles.badgeCompra : styles.badgeVenda]}>
                    <Text style={styles.badgeTipoText}>{isCompra ? 'C' : 'V'}</Text>
                  </View>
                  <View>
                    <Text style={styles.lancamentoTicker}>{item.ticker}</Text>
                    <Text style={styles.lancamentoDesc}>Qtd: {item.quantidade} @ {formatCurrency(item.preco_unitario, moeda_base)}</Text>
                  </View>
                </View>
                <View style={styles.lancamentoRight}>
                  <Text style={[styles.lancamentoValor, isCompra ? styles.valorCompra : styles.valorVenda]}>
                    {isCompra ? '-' : '+'} {formatCurrency(item.quantidade * item.preco_unitario, moeda_base)}
                  </Text>
                  <View style={styles.extratoActionsRow}>
                    <Calendar size={10} color={theme.colors.textMuted} />
                    <Text style={styles.lancamentoDate}>{item.data_transacao}</Text>
                    <TouchableOpacity 
                      style={styles.trashBtn} 
                      onPress={(e) => {
                        e.stopPropagation(); // Evita disparar a edição ao clicar em excluir
                        handleDeleteTx(item.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={12} color={theme.colors.negative} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal Cadastro/Edição Operação */}
      <Modal visible={isModalOpen} animationType="slide" transparent={true} onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingTxId ? t('edit_operation') : t('register_operation')}</Text>
            
            <Text style={styles.inputLabel}>{t('asset_ticker_label')}</Text>
            <View style={{ zIndex: 2000 }}>
              <TextInput
                style={styles.input}
                placeholder="PETR4, VALE3, BTC, USD, MXRF11"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="characters"
                value={txTicker}
                onChangeText={async (text) => {
                  setTxTicker(text);
                  if (text.trim().length >= 2) {
                    setCarregandoSugestoes(true);
                    const res = await buscarTickers(text);
                    setSugestoes(res);
                    setCarregandoSugestoes(false);
                  } else {
                    setSugestoes([]);
                  }
                }}
              />
              {carregandoSugestoes && (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ position: 'absolute', right: 12, top: 12 }} />
              )}
              {sugestoes.length > 0 && (
                <View style={styles.autocompleteContainer}>
                  <FlatList
                    data={sugestoes}
                    keyExtractor={(item) => item.ticker}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.suggestionItem}
                        onPress={() => {
                          setTxTicker(item.ticker);
                          setSugestoes([]);
                        }}
                      >
                        <Text style={styles.suggestionTicker}>{item.ticker}</Text>
                        <Text style={styles.suggestionNome} numberOfLines={1}>{item.nome}</Text>
                      </TouchableOpacity>
                    )}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 150 }}
                  />
                </View>
              )}
            </View>

            <Text style={styles.inputLabel}>{t('operation_type_label')}</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity 
                style={[styles.toggleBtn, txTipo === 'compra' && styles.toggleBtnActiveComp]}
                onPress={() => setTxTipo('compra')}
              >
                <Text style={[styles.toggleBtnText, txTipo === 'compra' && styles.toggleBtnTextActive]}>{t('buy')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, txTipo === 'venda' && styles.toggleBtnActiveVend]}
                onPress={() => setTxTipo('venda')}
              >
                <Text style={[styles.toggleBtnText, txTipo === 'venda' && styles.toggleBtnTextActive]}>{t('sell')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('quantity_label')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  value={txQtd}
                  onChangeText={setTxQtd}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('unit_price_label')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="34.50"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  value={txPreco}
                  onChangeText={setTxPreco}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>{t('operation_date_label')}</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.colors.textMuted}
              value={txData}
              onChangeText={setTxData}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSalvarTx}
              >
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Componente ScrollView horizontal simples inline para evitar imports quebrados
const ScrollViewHorizontal = ({ children, style }: any) => {
  const { ScrollView: RNScrollView } = require('react-native');
  return (
    <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={style}>
      {children}
    </RNScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 23,
    backgroundColor: theme.colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addBtnHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  searchFilterContainer: {
    paddingHorizontal: 30,
    paddingTop: 23,
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 23,
    color: theme.colors.text,
    fontSize: 13,
    marginBottom: 10,
  },
  chipsContainer: {
    marginTop: 2,
  },
  chipsScroll: {
    gap: 8,
    paddingRight: 30,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.colors.bg,
  },
  dateChip: {
    borderColor: theme.colors.border,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyStateText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  lancamentoList: {
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  lancamentoCard: {
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  lancamentoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeTipo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCompra: {
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
  },
  badgeVenda: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
  },
  badgeTipoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  lancamentoTicker: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  lancamentoDesc: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  lancamentoRight: {
    alignItems: 'flex-end',
  },
  lancamentoValor: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  valorCompra: {
    color: theme.colors.negative,
  },
  valorVenda: {
    color: theme.colors.positive,
  },
  extratoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  lancamentoDate: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  trashBtn: {
    padding: 6,
  },
  modalOverlay: {
    ...theme.modalStyles.overlay,
    padding: 30,
  },
  modalContent: {
    ...theme.modalStyles.card,
    padding: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.colors.inputBg || '#1A2235',
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    color: theme.colors.text,
    fontSize: 13,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.inputBg || '#1A2235',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleBtnActiveComp: {
    borderColor: theme.colors.negative,
    backgroundColor: 'rgba(255, 23, 68, 0.15)',
  },
  toggleBtnActiveVend: {
    borderColor: theme.colors.positive,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  toggleBtnText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: theme.colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
  },
  saveBtn: {
    flex: 1.2,
    height: 44,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  autocompleteContainer: {
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionTicker: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 10,
  },
  suggestionNome: {
    color: theme.colors.textMuted,
    fontSize: 12,
    flex: 1,
  }
});
