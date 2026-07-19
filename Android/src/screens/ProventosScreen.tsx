import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, Provento } from '../store/useStore';
import { buscarTickers, validarTicker } from '../utils/tickerSearch';
import { Logo } from '../components/Logo';
import { useBrapi } from '../hooks/useBrapi';
import { useI18n } from '../hooks/useI18n';
import { formatCurrency } from '../utils/currency';
import { theme } from '../lib/theme';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Award,
  Calendar,
  Download
} from 'lucide-react-native';

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

interface ProventosScreenProps {
  onBack: () => void;
}

export const ProventosScreen = ({ onBack }: ProventosScreenProps) => {
  const { t } = useI18n();
  const { 
    moeda_base,
    proventos,
    transacoes_ativos,
    addProvento,
    deleteProvento,
    showToast
  } = useStore();

  const { getAtivoDados, loading: brapiLoading } = useBrapi();

  // Estados do Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [provTicker, setProvTicker] = useState('');
  const [provTipo, setProvTipo] = useState<'dividendo' | 'jcp' | 'rendimento'>('dividendo');
  const [provValor, setProvValor] = useState('');
  const [provData, setProvData] = useState(new Date().toISOString().split('T')[0]);
  const [provDataExibicao, setProvDataExibicao] = useState('');

  React.useEffect(() => {
    setProvDataExibicao(deIsoParaBr(provData));
  }, [provData]);
  const [sugestoes, setSugestoes] = useState<{ ticker: string; nome: string }[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [loading, setLoading] = useState(false);

  const ajustarData = (dias: number) => {
    let dataBase = new Date();
    if (provData) {
      const parts = provData.split('-');
      if (parts.length === 3) {
        const ano = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10) - 1;
        const dia = parseInt(parts[2], 10);
        const parsed = new Date(ano, mes, dia);
        if (!isNaN(parsed.getTime())) {
          dataBase = parsed;
        }
      }
    }
    dataBase.setDate(dataBase.getDate() + dias);
    setProvData(dataBase.toISOString().split('T')[0]);
  };

  const handleSalvarProvento = async () => {
    if (!provTicker.trim()) {
      showToast(t('enter_ticker'), 'error');
      return;
    }
    const valorNum = Number(provValor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      showToast(t('invalid_value'), 'error');
      return;
    }

    const tickerUpper = provTicker.toUpperCase().trim();

    setLoading(true);
    const tickerValido = await validarTicker(tickerUpper);
    setLoading(false);

    if (!tickerValido) {
      showToast(t('ticker_not_found'), 'error');
      return;
    }

    await addProvento({
      id: Math.random().toString(36).substring(2, 15),
      ticker: tickerUpper,
      tipo: provTipo,
      valor: valorNum,
      data_pagamento: provData
    });

    setIsModalOpen(false);
    setProvTicker('');
    setProvValor('');
    setSugestoes([]);
    showToast(t('dividend_registered'), 'success');
  };

  /**
   * Busca os proventos mais recentes de todos os ativos da carteira via Brapi
   * e os adiciona automaticamente ao histórico.
   */
  const handleImportarDividendosBrapi = async () => {
    const tickers = Array.from(new Set(transacoes_ativos.map((t) => t.ticker.toUpperCase())));
    if (!tickers.length) {
      showToast(t('no_assets_for_dividends'), 'info');
      return;
    }

    setLoading(true);
    let importados = 0;

    try {
      const MESES_ATRAS = 6;
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - MESES_ATRAS);
      const dataLimiteStr = dataLimite.toISOString().split('T')[0];

      // IDs já existentes para evitar duplicata
      const idsExistentes = new Set(proventos.map((p) => `${p.ticker}-${p.data_pagamento}-${p.valor}`));

      for (const ticker of tickers) {
        try {
          const dados = await getAtivoDados(ticker);
          if (!dados || !dados.dividendos.length) continue;

          // Filtra apenas os últimos MESES_ATRAS meses
          const recentes = dados.dividendos.filter((d) => {
            const dataPag = d.paymentDate?.split('T')[0] ?? '';
            return dataPag >= dataLimiteStr;
          });

          for (const div of recentes) {
            const dataPag = div.paymentDate?.split('T')[0] ?? new Date().toISOString().split('T')[0];
            const chave = `${ticker}-${dataPag}-${div.rate}`;
            if (idsExistentes.has(chave)) continue; // Skip duplicata

            const tipoRaw = (div.type || '').toUpperCase();
            const tipo: 'dividendo' | 'jcp' | 'rendimento' =
              tipoRaw.includes('JCP') ? 'jcp'
              : tipoRaw.includes('REND') ? 'rendimento'
              : 'dividendo';

            await addProvento({
              id: Math.random().toString(36).substring(2, 15),
              ticker,
              tipo,
              valor: Number(div.rate.toFixed(4)),
              data_pagamento: dataPag,
            });
            idsExistentes.add(chave);
            importados++;
          }
        } catch (tickerErr) {
          console.warn(`[Brapi] Erro ao buscar proventos de ${ticker}:`, tickerErr);
        }
      }

      if (importados > 0) {
        showToast(t('dividends_imported_from_brapi').replace('{count}', String(importados)), 'success');
      } else {
        showToast(t('no_new_dividends_6months'), 'info');
      }
    } catch (err: any) {
      showToast(t('error_fetching_dividends') + ' ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProvento = (id: string) => {
    Alert.alert(
      t('confirm_deletion'),
      t('delete_dividend_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteProvento(id) }
      ]
    );
  };

  // Proventos agrupados por mês para exibição estruturada
  const proventosAgrupadosMap: Record<string, { mes: string; total: number; itens: Provento[] }> = {};
  
  // Ordena proventos por data descendente
  const proventosOrdenados = [...proventos].sort((a, b) => b.data_pagamento.localeCompare(a.data_pagamento));
  
  proventosOrdenados.forEach(p => {
    const dataObj = new Date(p.data_pagamento + 'T00:00:00');
    const meses = [t('month_january'), t('month_february'), t('month_march'), t('month_april'), t('month_may'), t('month_june'), t('month_july'), t('month_august'), t('month_september'), t('month_october'), t('month_november'), t('month_december')];
    const mesAno = `${meses[dataObj.getMonth()]} ${dataObj.getFullYear()}`;

    if (!proventosAgrupadosMap[mesAno]) {
      proventosAgrupadosMap[mesAno] = {
        mes: mesAno,
        total: 0,
        itens: []
      };
    }
    proventosAgrupadosMap[mesAno].total += p.valor;
    proventosAgrupadosMap[mesAno].itens.push(p);
  });

  const proventosAgrupadosList = Object.values(proventosAgrupadosMap);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Logo variant="horizontal" size="xs" withLeaf />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Botão import automático via Brapi */}
          <TouchableOpacity
            style={[styles.addBtnHeader, { backgroundColor: `${theme.colors.primary}15` }]}
            onPress={handleImportarDividendosBrapi}
            disabled={loading || brapiLoading}
            activeOpacity={0.7}
          >
            {loading || brapiLoading
              ? <ActivityIndicator size="small" color={theme.colors.primary} />
              : <Download size={18} color={theme.colors.primary} />}
          </TouchableOpacity>
          {/* Botão adicionar manual */}
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.7}
          >
            <Plus size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista */}
      {proventosAgrupadosList.length === 0 ? (
        <View style={styles.emptyState}>
          <Award size={36} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyStateText}>{t('no_dividends_registered')}</Text>
          {/* Botão de importação automática Brapi */}
          <TouchableOpacity
            style={[styles.addBtnEmpty, { backgroundColor: theme.colors.primary, marginBottom: 8 }]}
            onPress={handleImportarDividendosBrapi}
            disabled={loading || brapiLoading}
            activeOpacity={0.8}
          >
            {loading || brapiLoading
              ? <ActivityIndicator size="small" color={theme.colors.bg} style={{ marginRight: 6 }} />
              : <Download size={14} color={theme.colors.bg} style={{ marginRight: 4 }} />}
            <Text style={styles.addBtnEmptyText}>{t('auto_fetch_dividends')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.addBtnEmpty, { backgroundColor: theme.colors.primary }]}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.8}
          >
            <Plus size={14} color={theme.colors.bg} style={{ marginRight: 4 }} />
            <Text style={styles.addBtnEmptyText}>{t('register_first_dividend')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {proventosAgrupadosList.map((grupo, idx) => (
            <View key={idx} style={styles.grupoProventos}>
              <View style={styles.grupoHeader}>
                <Text style={styles.grupoMes}>{grupo.mes}</Text>
                <Text style={styles.grupoTotal}>{t('total_prefix')}{formatCurrency(grupo.total, moeda_base)}</Text>
              </View>

              <View style={styles.grupoItensContainer}>
                {grupo.itens.map(item => (
                  <View key={item.id} style={styles.proventoItem}>
                    <View>
                      <Text style={styles.proventoAtivo}>{item.ticker}</Text>
                      <Text style={styles.proventoTipoText}>
                        {item.tipo.toUpperCase()} • {item.data_pagamento}
                      </Text>
                    </View>
                    <View style={styles.proventoRightCol}>
                      <Text style={styles.proventoValorText}>+{formatCurrency(item.valor, moeda_base)}</Text>
                      <TouchableOpacity 
                        style={styles.trashBtnSmall} 
                        onPress={() => handleDeleteProvento(item.id)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={12} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Modal de Cadastro de Provento */}
      <Modal visible={isModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('register_dividend_modal_title')}</Text>
            
            <Text style={styles.inputLabel}>{t('asset_ticker_label')}</Text>
            <View style={{ zIndex: 2000 }}>
              <TextInput
                style={styles.input}
                placeholder={t('ticker_placeholder')}
                placeholderTextColor="#8A99AD"
                autoCapitalize="characters"
                value={provTicker}
                onChangeText={async (text) => {
                  setProvTicker(text);
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
                <ActivityIndicator size="small" color={theme.colors.positive} style={{ position: 'absolute', right: 12, top: 12 }} />
              )}
              {sugestoes.length > 0 && (
                <View style={styles.autocompleteContainer}>
                  <FlatList
                    data={sugestoes}
                    keyExtractor={(item) => item.ticker}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.suggestionItem}
                        onPress={async () => {
                          setProvTicker(item.ticker);
                          setSugestoes([]);
                          // Auto-preenche o último dividendo via Brapi
                          try {
                            const dados = await getAtivoDados(item.ticker);
                            if (dados?.dividendos?.length) {
                              const ultimo = dados.dividendos[0];
                              setProvValor(String(ultimo.rate.toFixed(4)));
                              if (ultimo.paymentDate) {
                                setProvData(ultimo.paymentDate.split('T')[0]);
                              }
                              const tipoRaw = (ultimo.type || '').toUpperCase();
                              if (tipoRaw.includes('JCP')) setProvTipo('jcp');
                              else if (tipoRaw.includes('REND')) setProvTipo('rendimento');
                              else setProvTipo('dividendo');
                            }
                          } catch (_) {}
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

            <Text style={styles.inputLabel}>{t('income_type_label')}</Text>
            <View style={styles.toggleRow}>
              {(['dividendo', 'jcp', 'rendimento'] as const).map(tipo => (
                <TouchableOpacity 
                  key={tipo}
                  style={[styles.toggleBtn, provTipo === tipo && styles.toggleBtnActiveGreen]}
                  onPress={() => setProvTipo(tipo)}
                >
                  <Text style={[styles.toggleBtnText, provTipo === tipo && styles.toggleBtnTextActive]}>
                    {tipo.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>{t('income_value_label')}</Text>
            <TextInput
              style={styles.input}
              placeholder="85.20"
              placeholderTextColor="#8A99AD"
              keyboardType="numeric"
              value={provValor}
              onChangeText={setProvValor}
            />

            <Text style={styles.inputLabel}>{t('payment_date_label')}</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#8A99AD"
                keyboardType="numeric"
                value={provDataExibicao}
                onChangeText={(text) => {
                  const masked = aplicarMascaraData(text);
                  setProvDataExibicao(masked);
                  if (masked.length === 10) {
                    setProvData(deBrParaIso(masked));
                  }
                }}
              />
              <TouchableOpacity style={styles.dateQuickBtn} onPress={() => setProvData(new Date().toISOString().split('T')[0])}>
                <Text style={styles.dateQuickBtnText}>{t('today')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateQuickBtn} onPress={() => ajustarData(-1)}>
                <Text style={styles.dateQuickBtnText}>-1d</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateQuickBtn} onPress={() => ajustarData(1)}>
                <Text style={styles.dateQuickBtnText}>+1d</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSalvarProvento}
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
    backgroundColor: theme.colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.ink,
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
  scrollContainer: {
    paddingHorizontal: 30,
    paddingTop: 30,
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
    marginBottom: 16,
  },
  addBtnEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  addBtnEmptyText: {
    color: theme.colors.bg,
    fontSize: 12,
    fontWeight: 'bold',
  },
  grupoProventos: {
    marginBottom: 20,
  },
  grupoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  grupoMes: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
  },
  grupoTotal: {
    color: theme.colors.positive,
    fontSize: 13,
    fontWeight: '600',
  },
  grupoItensContainer: {
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  proventoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  proventoAtivo: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
  },
  proventoTipoText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  proventoRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proventoValorText: {
    color: theme.colors.positive,
    fontSize: 14,
    fontWeight: 'bold',
  },
  trashBtnSmall: {
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
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    color: theme.colors.ink,
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
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  toggleBtnActiveGreen: {
    borderColor: theme.colors.positive,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  toggleBtnText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: theme.colors.ink,
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
    backgroundColor: theme.colors.lightAccent,
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
    color: theme.colors.positive,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 10,
  },
  suggestionNome: {
    color: theme.colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  dateQuickBtn: {
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  dateQuickBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  }
});
