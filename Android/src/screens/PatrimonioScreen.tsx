import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, TransacaoAtivo, Provento } from '../store/useStore';
import { theme } from '../lib/theme';
import { buscarTickers, validarTicker } from '../utils/tickerSearch';
import { usePaywall } from '../hooks/usePaywall';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useBrapi } from '../hooks/useBrapi';
import { useI18n } from '../hooks/useI18n';
import { ExtratoInvestimentosScreen } from './ExtratoInvestimentosScreen';
import { ProventosScreen } from './ProventosScreen';
import { formatCurrency } from '../utils/currency';
import { AdBanner } from '../components/AdBanner';
import { 
  TrendingUp, 
  Award, 
  Activity, 
  RefreshCw, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  Plus,
  Trash2,
  ShieldCheck,
  DollarSign,
  Filter
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

export const PatrimonioScreen = () => {
  const { t } = useI18n();
  const { 
    moeda_base,
    transacoes_ativos,
    proventos,
    cotacoes_ativos,
    addTransacaoAtivo,
    addProvento,
    deleteTransacaoAtivo,
    deleteProvento,
    atualizarCotacoes,
    atualizarCotacoesBrapi,
    showToast
  } = useStore();

  const { isPremium, triggerUpgradeModal } = usePaywall();
  const [loading, setLoading] = useState(false);
  const { refetch: refetchCambio, limparCache: limparCacheCambio } = useExchangeRates({ skipAutoFetch: true });
  const { getCotacoesBatch, loading: brapiLoading } = useBrapi();

  // Auto-atualizar cotações Brapi ao abrir a tela (somente Premium)
  useEffect(() => {
    if (!isPremium || !transacoes_ativos.length) return;
    const tickers = Array.from(new Set(transacoes_ativos.map((t) => t.ticker.toUpperCase())));
    getCotacoesBatch(tickers).then((cotacoes) => {
      if (Object.keys(cotacoes).length > 0) {
        atualizarCotacoesBrapi(cotacoes);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  // Estados de Navegação Local
  const [currentView, setCurrentView] = useState<'geral' | 'detalhes' | 'proventos'>('geral');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Estados de Filtro
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'compra' | 'venda'>('todos');
  const [buscaAtivo, setBuscaAtivo] = useState('');

  // Estados dos Modais de Cadastro
  const [isModalTxOpen, setIsModalTxOpen] = useState(false);
  const [isModalProvOpen, setIsModalProvOpen] = useState(false);

  // Formulario Nova Transação
  const [txTicker, setTxTicker] = useState('');
  const [txTipo, setTxTipo] = useState<'compra' | 'venda'>('compra');
  const [txQtd, setTxQtd] = useState('');
  const [txPreco, setTxPreco] = useState('');
  const [txData, setTxData] = useState(new Date().toISOString().split('T')[0]);
  const [txDataExibicao, setTxDataExibicao] = useState('');

  useEffect(() => {
    setTxDataExibicao(deIsoParaBr(txData));
  }, [txData]);
  const [sugestoes, setSugestoes] = useState<{ ticker: string; nome: string }[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);

  // Formulario Novo Provento
  const [provTicker, setProvTicker] = useState('');
  const [provTipo, setProvTipo] = useState<'dividendo' | 'jcp' | 'rendimento'>('dividendo');
  const [provValor, setProvValor] = useState('');
  const [provData, setProvData] = useState(new Date().toISOString().split('T')[0]);

  const ajustarDataTx = (dias: number) => {
    let dataBase = new Date();
    if (txData) {
      const parts = txData.split('-');
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
    setTxData(dataBase.toISOString().split('T')[0]);
  };

  const ajustarDataProv = (dias: number) => {
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

  // --- Lógica de Consolidação de Investimentos ---
  const ativosConsolidadosMap: Record<string, { ticker: string; tipo: 'acao' | 'fiis' | 'cripto' | 'moeda'; quantidade: number; custoTotal: number }> = {};
  const txsOrdenadas = [...transacoes_ativos].sort((a, b) => a.data_transacao.localeCompare(b.data_transacao));

  txsOrdenadas.forEach(tx => {
    const ticker = tx.ticker.toUpperCase().trim();
    if (!ticker) return;

    if (!ativosConsolidadosMap[ticker]) {
      let tipo: 'acao' | 'fiis' | 'cripto' | 'moeda' = 'acao';
      if (ticker === 'BTC' || ticker === 'ETH' || ticker === 'SOL') tipo = 'cripto';
      else if (ticker === 'USD' || ticker === 'EUR' || ticker === 'ARS') tipo = 'moeda';
      else if (ticker.endsWith('11') || ticker.includes('FII')) tipo = 'fiis';

      ativosConsolidadosMap[ticker] = {
        ticker,
        tipo,
        quantidade: 0,
        custoTotal: 0
      };
    }

    const item = ativosConsolidadosMap[ticker];
    if (tx.tipo === 'compra') {
      item.quantidade += tx.quantidade;
      item.custoTotal += tx.quantidade * tx.preco_unitario;
    } else if (tx.tipo === 'venda') {
      const pmAnterior = item.quantidade > 0 ? item.custoTotal / item.quantidade : 0;
      item.quantidade = Math.max(0, item.quantidade - tx.quantidade);
      item.custoTotal = item.quantidade * pmAnterior;
    }
  });

  const ativosConsolidados = Object.values(ativosConsolidadosMap)
    .filter(a => a.quantidade > 0)
    .map(a => {
      const precoMedio = a.quantidade > 0 ? a.custoTotal / a.quantidade : 0;
      const cotacaoAtual = a.ticker === 'GENERICO' ? precoMedio : (cotacoes_ativos[a.ticker] || precoMedio);
      return {
        id: a.ticker,
        ticker: a.ticker,
        tipo: a.tipo,
        quantidade: a.quantidade,
        precoMedio,
        cotacaoAtual
      };
    });

  // Cálculos do Painel Consolidado
  const valorInvestido = ativosConsolidados.reduce((acc, curr) => acc + (curr.quantidade * curr.precoMedio), 0);
  const totalPatrimonio = ativosConsolidados.reduce((acc, curr) => acc + (curr.quantidade * curr.cotacaoAtual), 0);
  const ganhoPerdaTotal = totalPatrimonio - valorInvestido;
  const rentabilidadePercentual = valorInvestido > 0 ? (ganhoPerdaTotal / valorInvestido) * 100 : 0;

  // Proventos do mês atual (ex: Junho 2026)
  const proventosMesAtual = proventos.filter(p => p.data_pagamento.startsWith('2026-06'));
  const totalProventosMes = proventosMesAtual.reduce((acc, curr) => acc + curr.valor, 0);

  // Proventos agrupados por mês para a tela detalhada de Dividendos
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

  // Ações
  const handleAtualizarCotacoes = async () => {
    if (!isPremium) {
      triggerUpgradeModal(t('premium_quotes_required'));
      return;
    }

    setLoading(true);
    try {
      const tickers = Array.from(new Set(transacoes_ativos.map((t) => t.ticker.toUpperCase())));

      // Tentativa 1: Brapi (B3 + criptos brasileiros)
      let cotacoesBrapi: Record<string, number> = {};
      if (tickers.length > 0) {
        cotacoesBrapi = await getCotacoesBatch(tickers);
      }

      if (Object.keys(cotacoesBrapi).length > 0) {
        atualizarCotacoesBrapi(cotacoesBrapi);
        showToast(t('quotes_updated_brapi').replace('{count}', String(Object.keys(cotacoesBrapi).length)), 'success');
      } else {
        // Fallback: Yahoo Finance
        await limparCacheCambio();
        await refetchCambio();
        await atualizarCotacoes();
        showToast(t('quotes_updated_yahoo'), 'success');
      }
    } catch (e: any) {
      showToast(t('quotes_update_failed') + ' ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

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

    await addTransacaoAtivo({
      id: Math.random().toString(36).substring(2, 15),
      ticker: tickerUpper,
      tipo: txTipo,
      quantidade: qtdNum,
      preco_unitario: precoNum,
      data_transacao: txData
    });

    setIsModalTxOpen(false);
    setTxTicker('');
    setTxQtd('');
    setTxPreco('');
    setSugestoes([]);
    showToast(t('asset_transaction_registered'), 'success');
  };

  const handleSalvarProvento = async () => {
    if (!provTicker.trim()) {
      showToast(t('enter_ticker'), 'error');
      return;
    }
    const valorNum = Number(provValor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      showToast(t('invalid_provento_value'), 'error');
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

    setIsModalProvOpen(false);
    setProvTicker('');
    setProvValor('');
    setSugestoes([]);
    showToast(t('dividend_registered'), 'success');
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

  // --- RENDER TELA PRINCIPAL (GERAL) ---
  if (currentView === 'geral') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Botões Analíticos do Topo */}
          <View style={styles.topButtonsRow}>
            <TouchableOpacity 
              style={styles.topBtn} 
              onPress={() => setCurrentView('detalhes')}
              activeOpacity={0.8}
            >
              <Activity size={14} color={theme.colors.primary} />
              <Text style={styles.topBtnText}>{t('statement')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.topBtn, styles.topBtnGreen]} 
              onPress={() => setCurrentView('proventos')}
              activeOpacity={0.8}
            >
              <Award size={14} color={theme.colors.positive} />
              <Text style={[styles.topBtnText, { color: theme.colors.positive }]}>{t('dividends')}</Text>
            </TouchableOpacity>
          </View>

          {/* Card Patrimônio Total (Navegável) */}
          <TouchableOpacity 
            style={styles.headerBlock} 
            onPress={() => setCurrentView('detalhes')}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeaderWithNav}>
              <Text style={styles.headerLabel}>{t('consolidated_equity')}</Text>
              <Text style={styles.verMaisBtnText}>{t('statement_arrow')}</Text>
            </View>
            <View style={styles.patrimonyRow}>
              <Text style={styles.patrimonyValue}>{formatCurrency(totalPatrimonio, moeda_base)}</Text>
              <View style={[styles.badgeRentabilidade, ganhoPerdaTotal >= 0 ? styles.badgePositivo : styles.badgeNegativo]}>
                <Text style={[styles.rentabilidadeText, ganhoPerdaTotal >= 0 ? styles.textPositivo : styles.textNegativo]}>
                  {ganhoPerdaTotal >= 0 ? '+' : ''}{rentabilidadePercentual.toFixed(2)}%
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.investedRow}>
              <View>
                <Text style={styles.investedLabel}>{t('cost_value_invested')}</Text>
                <Text style={styles.investedValue}>{formatCurrency(valorInvestido, moeda_base)}</Text>
              </View>
              <TrendingUp size={24} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Botão Atualizar Cotações */}
          <TouchableOpacity 
            style={styles.refreshBtn} 
            onPress={handleAtualizarCotacoes} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.bg} />
            ) : (
              <RefreshCw size={14} color={theme.colors.bg} />
            )}
            <Text style={styles.refreshBtnText}>
              {loading ? t('updating_quotes') : t('update_quotes')}
            </Text>
            {!isPremium && <Text style={styles.freeBadge}>{t('free_badge')}</Text>}
          </TouchableOpacity>

          {/* Card Proventos (Navegável) */}
          <TouchableOpacity 
            style={styles.proventosCard} 
            onPress={() => setCurrentView('proventos')}
            activeOpacity={0.9}
          >
            <View style={styles.proventosHeader}>
              <View style={styles.proventosTitleGroup}>
                <Award size={18} color={theme.colors.positive} />
                <Text style={styles.proventosTitle}>{t('proventos_monthly').replace('{month}', `${t('month_' + new Date().toLocaleDateString('pt-BR', { month: 'long' }).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()) || 'month_june'}/${new Date().getFullYear().toString().slice(-2)}`)}</Text>
              </View>
              <Text style={styles.verMaisBtnText}>{t('history_arrow')}</Text>
            </View>
            <Text style={styles.proventosDesc}>
              {t('dividends_monthly_summary_start')}<Text style={styles.proventosHighlight}>{formatCurrency(totalProventosMes, moeda_base)}</Text>{t('dividends_monthly_summary_end')}
            </Text>
          </TouchableOpacity>

          {/* Lista de Ativos com Expansão de Card */}
          <View style={styles.sectionHeader}>
            <Activity size={16} color={theme.colors.textMuted} />
            <Text style={styles.sectionTitle}>{t('your_investment_assets')}</Text>
          </View>

          {ativosConsolidados.length === 0 ? (
            <View style={styles.emptyAssetsCard}>
              <Text style={styles.emptyAssetsText}>{t('no_investment_assets')}</Text>
              <TouchableOpacity 
                style={styles.addAssetBtn}
                onPress={() => setIsModalTxOpen(true)}
                activeOpacity={0.8}
              >
                <Plus size={14} color={theme.colors.bg} />
                <Text style={styles.addAssetBtnText}>{t('add_first_purchase')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            ativosConsolidados.map(ativo => {
              const isPositivo = ativo.cotacaoAtual >= ativo.precoMedio;
              const isExpanded = selectedAssetId === ativo.id;
              
              const valorTotalAtivo = ativo.quantidade * ativo.cotacaoAtual;
              const custoTotalAtivo = ativo.quantidade * ativo.precoMedio;
              const ganhoPerdaValor = valorTotalAtivo - custoTotalAtivo;
              const ganhoPerdaPercentual = ((ativo.cotacaoAtual - ativo.precoMedio) / ativo.precoMedio) * 100;

              return (
                <View key={ativo.id} style={styles.assetWrapper}>
                  <TouchableOpacity 
                    style={[styles.assetCard, isExpanded && styles.assetCardActive]}
                    onPress={() => setSelectedAssetId(isExpanded ? null : ativo.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.assetInfoLeft}>
                      <Text style={styles.assetTicker}>{ativo.ticker}</Text>
                      <Text style={styles.assetPM}>{t('quantity_abbrev')} {ativo.quantidade}</Text>
                    </View>
                    <View style={styles.rightAsset}>
                      {ativo.ticker === 'GENERICO' ? (
                        <Text style={[styles.assetCotacao, { color: theme.colors.textMuted }]}>
                          {t('no_quote')}
                        </Text>
                      ) : (
                        <Text style={[styles.assetCotacao, isPositivo ? styles.cotacaoPositiva : styles.cotacaoNegativa]}>
                          {formatCurrency(ativo.cotacaoAtual, moeda_base)}
                        </Text>
                      )}
                      <View style={styles.expBtnRow}>
                        <Text style={styles.assetRent}>PM: {formatCurrency(ativo.precoMedio, moeda_base)}</Text>
                        {isExpanded ? <ChevronUp size={12} color={theme.colors.textMuted} /> : <ChevronDown size={12} color={theme.colors.textMuted} />}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Card Detalhado Expandido (Dando vida aos números) */}
                  {isExpanded && (
                    <View style={styles.expandedCard}>
                      {ativo.ticker === 'GENERICO' ? (
                        <>
                          <View style={styles.expandedRow}>
                            <Text style={styles.expandedLabel}>{t('avg_purchase_price')}</Text>
                            <Text style={styles.expandedValue}>{formatCurrency(ativo.precoMedio, moeda_base)}</Text>
                          </View>
                          <View style={styles.expandedRow}>
                            <Text style={styles.expandedLabel}>{t('total_invested')}</Text>
                            <Text style={styles.expandedValue}>{formatCurrency(custoTotalAtivo, moeda_base)}</Text>
                          </View>
                          <View style={styles.expandedRow}>
                            <Text style={styles.expandedLabel}>{t('status')}</Text>
                            <Text style={[styles.expandedValue, { color: theme.colors.textMuted, fontStyle: 'italic' }]}>{t('generic_asset_no_quote')}</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={styles.expandedRow}>
                            <Text style={styles.expandedLabel}>{t('average_price')}</Text>
                            <Text style={styles.expandedValue}>{formatCurrency(ativo.precoMedio, moeda_base)}</Text>
                          </View>
                          <View style={styles.expandedRow}>
                            <Text style={styles.expandedLabel}>{t('current_stock_quote')}</Text>
                            <Text style={[styles.expandedValue, { color: theme.colors.primary }]}>{formatCurrency(ativo.cotacaoAtual, moeda_base)}</Text>
                          </View>
                          <View style={styles.expandedRow}>
                            <Text style={styles.expandedLabel}>{t('current_market_value')}</Text>
                            <Text style={styles.expandedValue}>{formatCurrency(valorTotalAtivo, moeda_base)}</Text>
                          </View>
                          <View style={styles.expandedRow}>
                            <Text style={styles.expandedLabel}>{t('gain_loss')}</Text>
                            <Text style={[styles.expandedValue, ganhoPerdaValor >= 0 ? styles.cotacaoPositiva : styles.cotacaoNegativa, { fontWeight: 'bold' }]}>
                              {ganhoPerdaValor >= 0 ? '+' : ''}{formatCurrency(ganhoPerdaValor, moeda_base)} ({ganhoPerdaPercentual.toFixed(2)}%)
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}

          {ativosConsolidados.length > 0 && (
            <TouchableOpacity 
              style={styles.floatingActionBtn}
              onPress={() => setIsModalTxOpen(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color={theme.colors.bg} />
              <Text style={styles.floatingActionBtnText}>{t('add_operation')}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 80 }} />
          <AdBanner />
        </ScrollView>

        {/* Modal de Cadastro de Transação de Ativo */}
        <Modal visible={isModalTxOpen} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('register_operation_modal')}</Text>
              
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
              <View style={styles.dateInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  value={txDataExibicao}
                  onChangeText={(text) => {
                    const masked = aplicarMascaraData(text);
                    setTxDataExibicao(masked);
                    if (masked.length === 10) {
                      setTxData(deBrParaIso(masked));
                    }
                  }}
                />
                <TouchableOpacity style={styles.dateQuickBtn} onPress={() => setTxData(new Date().toISOString().split('T')[0])}>
                  <Text style={styles.dateQuickBtnText}>{t('today')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateQuickBtn} onPress={() => ajustarDataTx(-1)}>
                  <Text style={styles.dateQuickBtnText}>-1d</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateQuickBtn} onPress={() => ajustarDataTx(1)}>
                  <Text style={styles.dateQuickBtnText}>+1d</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setIsModalTxOpen(false)}
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
  }

  // --- RENDER TELA DETALHE DO PATRIMÔNIO (EXTRATO DE INVESTIMENTOS) ---
  if (currentView === 'detalhes') {
    return <ExtratoInvestimentosScreen onBack={() => setCurrentView('geral')} />;
  }

  // --- RENDER TELA DE PROVENTOS (DIVIDENDOS / RENDIMENTOS) ---
  if (currentView === 'proventos') {
    return <ProventosScreen onBack={() => setCurrentView('geral')} />;
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContainer: {
    padding: 30,
  },
  topButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  topBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  topBtnGreen: {
    borderColor: theme.colors.border,
  },
  topBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 23,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.cardBg,
  },
  backBtn: {
    padding: 12,
  },
  addBtnHeader: {
    padding: 12,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerBlock: {
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 30,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeaderWithNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verMaisBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  patrimonyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  patrimonyValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  badgeRentabilidade: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  badgePositivo: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  badgeNegativo: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  rentabilidadeText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  textPositivo: {
    color: theme.colors.positive,
  },
  textNegativo: {
    color: theme.colors.negative,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  investedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investedLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  investedValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  refreshBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  refreshBtnText: {
    color: theme.colors.bg,
    fontWeight: 'bold',
    fontSize: 13,
  },
  freeBadge: {
    position: 'absolute',
    right: 12,
    backgroundColor: 'rgba(255, 201, 60, 0.2)',
    color: '#FFC93C',
    fontSize: 9,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFC93C',
  },
  proventosCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  proventosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  proventosTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proventosTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  proventosDesc: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  proventosHighlight: {
    color: theme.colors.positive,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyAssetsCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyAssetsText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  addAssetBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    height: 38,
    flexDirection: 'row',
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addAssetBtnGreen: {
    backgroundColor: theme.colors.positive,
    borderRadius: 8,
    height: 38,
    flexDirection: 'row',
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 16,
  },
  addAssetBtnText: {
    color: theme.colors.bg,
    fontWeight: 'bold',
    fontSize: 12,
  },
  assetWrapper: {
    marginBottom: 8,
  },
  assetCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  assetCardActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: theme.colors.primary,
  },
  assetInfoLeft: {
    flex: 1,
  },
  assetTicker: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  assetPM: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  rightAsset: {
    alignItems: 'flex-end',
  },
  assetCotacao: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cotacaoPositiva: {
    color: theme.colors.positive,
  },
  cotacaoNegativa: {
    color: theme.colors.negative,
  },
  expBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  assetRent: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  expandedCard: {
    backgroundColor: theme.colors.lightAccent || theme.colors.cardBg,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.border,
    padding: 24,
    gap: 8,
  },
  expandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  expandedValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  floatingActionBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingActionBtnText: {
    color: theme.colors.bg,
    fontWeight: 'bold',
    fontSize: 13,
  },
  searchFilterContainer: {
    padding: 24,
    backgroundColor: theme.colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 18,
    color: theme.colors.text,
    fontSize: 13,
    marginBottom: 12,
  },
  tabsFilterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTabBtn: {
    paddingHorizontal: 21,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterTabBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterTabText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterTabTextActive: {
    color: theme.colors.bg,
  },
  lancamentoList: {
    padding: 24,
  },
  lancamentoCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lancamentoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  badgeTipo: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCompra: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  badgeVenda: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
  },
  badgeTipoText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  lancamentoTicker: {
    color: theme.colors.text,
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: 'bold',
  },
  extratoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  lancamentoDate: {
    color: theme.colors.textMuted,
    fontSize: 9,
  },
  trashBtn: {
    padding: 6,
  },
  trashBtnSmall: {
    padding: 6,
    alignSelf: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  emptyStateText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  grupoProventos: {
    marginBottom: 20,
  },
  grupoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  grupoMes: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  grupoTotal: {
    color: theme.colors.positive,
    fontSize: 13,
    fontWeight: 'bold',
  },
  grupoItensContainer: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 12,
  },
  proventoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proventoAtivo: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  proventoTipoText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  proventoRightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  proventoValorText: {
    color: theme.colors.positive,
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30
  },
  modalContent: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 30,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 18,
    color: theme.colors.text,
    fontSize: 13,
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    height: 38,
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActiveComp: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderColor: theme.colors.negative,
  },
  toggleBtnActiveVend: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: theme.colors.positive,
  },
  toggleBtnActiveGreen: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: theme.colors.positive,
  },
  toggleBtnText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: theme.colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnGreen: {
    flex: 1,
    backgroundColor: theme.colors.positive,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 13,
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

export default PatrimonioScreen;
