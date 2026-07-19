import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  TextInput, 
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { usePaywall } from '../hooks/usePaywall';
import { formatCurrency, multiplyMoney, divideMoney, convertCurrency } from '../utils/currency';
import { useI18n } from '../hooks/useI18n';
import { theme } from '../lib/theme';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Wallet, 
  User, 
  Briefcase, 
  Target, 
  Plus, 
  X,
  Gauge,
  Trash2,
  Edit2,
  AlertCircle,
  ChevronRight
} from 'lucide-react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import { AdBanner } from '../components/AdBanner';
import { Logo } from '../components/Logo';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { 
    id_usuario, 
    nome_usuario, 
    id_espaco_ativo, 
    espacos, 
    setIdEspacoAtivo, 
    getSaldoTotal,
    getResumoMensal,
    getContasEspacoAtivo,
    getCaixinhasEspacoAtivo,
    getTransacoesEspacoAtivo,
    moeda_base,
    renda_principal,
    cotacoes_moedas,
    loadDemoData,
    syncSupabaseData,
    addConta,
    addCaixinha,
    deleteConta,
    deleteCaixinha,
    addCartao,
    updateCartao,
    deleteCartao,
    getCartoesEspacoAtivo,
    avatar_url,
    isSyncing
  } = useStore();

  const { t } = useI18n();

  const { verificarAcessoEspaco, verificarLimiteCaixinhas } = usePaywall();

  // Modais de Criação
  const [modalContaVisible, setModalContaVisible] = useState(false);
  const [modalCaixinhaVisible, setModalCaixinhaVisible] = useState(false);
  const [contaEditando, setContaEditando] = useState<any | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Estado confirmação de exclusão de cartão
  const [confirmCartao, setConfirmCartao] = useState<{ visible: boolean; id: string; nome: string }>({
    visible: false,
    id: '',
    nome: '',
  });

  const [modalCartaoVisible, setModalCartaoVisible] = useState(false);
  const [cartaoEditando, setCartaoEditando] = useState<any | null>(null);
  const [nomeCartao, setNomeCartao] = useState('');
  const [limiteCartao, setLimiteCartao] = useState('');
  const [faturaCartao, setFaturaCartao] = useState('');

  // States Formulário Conta
  const [nomeConta, setNomeConta] = useState('');
  const [moedaConta, setMoedaConta] = useState('BRL');
  const [saldoConta, setSaldoConta] = useState('');

  // States Formulário Caixinha
  const [caixinhaEditando, setCaixinhaEditando] = useState<any | null>(null);
  const [nomeCaixinha, setNomeCaixinha] = useState('');
  const [alvoCaixinha, setAlvoCaixinha] = useState('');
  const [saldoGuardadoCaixinha, setSaldoGuardadoCaixinha] = useState('');

  useEffect(() => {
    if (!id_usuario) {
      loadDemoData();
    } else {
      syncSupabaseData();
    }
  }, [id_usuario]);

  const activeSpace = espacos.find(e => e.id === id_espaco_ativo);
  const saldoTotal = getSaldoTotal();
  const { receitas, despesas } = getResumoMensal();
  const contas = getContasEspacoAtivo();
  const cartoes = getCartoesEspacoAtivo();
  const caixinhas = getCaixinhasEspacoAtivo();
  const transacoes = getTransacoesEspacoAtivo();

  const alternarEspaco = () => {
    const proximoEspaco = espacos.find(e => e.id !== id_espaco_ativo);
    if (proximoEspaco) {
      if (verificarAcessoEspaco(proximoEspaco.tipo)) {
        setIdEspacoAtivo(proximoEspaco.id);
      }
    }
  };

  // 50/30/20 Regra de Orçamento (Termômetro)
  const rendaMensalSimulada = renda_principal || 3500.00;
  const tetoNecessidades = rendaMensalSimulada * 0.5;
  const tetoEstiloVida = rendaMensalSimulada * 0.3;
  const tetoFuturo = rendaMensalSimulada * 0.2;

  let gastoNecessidades = 0;
  let gastoEstiloVida = 0;
  let gastoFuturo = 0;

  const cotacoes = cotacoes_moedas;
  
  const converterValorParaBase = (valor: number, moedaOrigem: string) => {
    return convertCurrency(valor, moedaOrigem, moeda_base, cotacoes_moedas);
  };

  transacoes.forEach(t => {
    if (t.tipo === 'despesa') {
      const contaOrigem = contas.find(c => c.id === t.id_conta);
      const moedaOrigem = contaOrigem ? contaOrigem.moeda_conta : moeda_base;
      const valorConvertido = converterValorParaBase(t.valor, moedaOrigem);

      const cat = t.categoria.toLowerCase();
      if (
        cat.includes('moradia') || 
        cat.includes('aluguel') || 
        cat.includes('mercado') || 
        cat.includes('supermercado') || 
        cat.includes('alimentação') || 
        cat.includes('impostos') || 
        cat.includes('saúde') || 
        cat.includes('transporte')
      ) {
        gastoNecessidades += valorConvertido;
      } else if (
        cat.includes('lazer') || 
        cat.includes('restaurante') || 
        cat.includes('viagem') || 
        cat.includes('assinaturas') || 
        cat.includes('outros')
      ) {
        gastoEstiloVida += valorConvertido;
      } else {
        gastoFuturo += valorConvertido;
      }
    }
  });

  const pctNecessidades = Math.min((gastoNecessidades / tetoNecessidades) * 100, 100);
  const pctEstiloVida = Math.min((gastoEstiloVida / tetoEstiloVida) * 100, 100);
  const pctFuturo = Math.min((gastoFuturo / tetoFuturo) * 100, 100);

  const getCorProgresso = (percent: number) => {
    if (percent >= 100) return theme.colors.negative;
    if (percent >= 80) return theme.colors.accent;
    return theme.colors.positive;
  };

  // Salvar Conta
  const handleSalvarConta = async () => {
    if (!nomeConta.trim() || !saldoConta || isNaN(Number(saldoConta))) {
      Alert.alert(t('error'), t('fill_fields_correctly'));
      return;
    }
    setSalvando(true);
    const activeSpaceId = id_espaco_ativo || 'space-pf';
    try {
      await addConta({
        id: contaEditando ? contaEditando.id : Math.random().toString(36).substring(2, 9),
        id_espaco: contaEditando ? contaEditando.id_espaco : activeSpaceId,
        nome_instituicao: nomeConta.trim(),
        moeda_conta: moedaConta,
        saldo_inicial: parseFloat(saldoConta)
      });
      setModalContaVisible(false);
      setContaEditando(null);
      setNomeConta('');
      setSaldoConta('');
      Alert.alert(t('success'), contaEditando ? t('account_updated_success') : t('account_created_success'));
    } catch (error: any) {
      Alert.alert(t('error_saving_account'), error.message || t('error'));
    } finally {
      setSalvando(false);
    }
  };

  // Excluir Conta
  const handleDeletarConta = () => {
    if (!contaEditando) return;
    Alert.alert(
      t('confirm_deletion'),
      t('delete_account_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConta(contaEditando.id);
              setModalContaVisible(false);
              setContaEditando(null);
              setNomeConta('');
              setSaldoConta('');
              Alert.alert(t('success'), t('account_deleted_success'));
            } catch (err: any) {
              Alert.alert(t('error'), err.message || t('error_deleting_account'));
            }
          }
        }
      ]
    );
  };

  const abrirAdicionarConta = () => {
    setContaEditando(null);
    setNomeConta('');
    setMoedaConta('BRL');
    setSaldoConta('');
    setModalContaVisible(true);
  };

  const abrirEditarConta = (conta: any) => {
    setContaEditando(conta);
    setNomeConta(conta.nome_instituicao);
    setMoedaConta(conta.moeda_conta);
    setSaldoConta(conta.saldo_inicial.toString());
    setModalContaVisible(true);
  };

  // Salvar Cartão
  const handleSalvarCartao = async () => {
    if (!nomeCartao.trim() || !limiteCartao || isNaN(Number(limiteCartao))) {
      Alert.alert(t('error'), t('fill_fields_correctly_alert'));
      return;
    }
    setSalvando(true);
    const activeSpaceId = id_espaco_ativo || 'space-pf';
    try {
      const payload = {
        id: cartaoEditando ? cartaoEditando.id : Math.random().toString(36).substring(2, 9),
        id_espaco: cartaoEditando ? cartaoEditando.id_espaco : activeSpaceId,
        nome: nomeCartao.trim(),
        limite: parseFloat(limiteCartao),
        fatura_atual: parseFloat(faturaCartao) || 0
      };
      
      if (cartaoEditando) {
        await updateCartao(payload.id, payload);
      } else {
        await addCartao(payload);
      }
      
      setModalCartaoVisible(false);
      setCartaoEditando(null);
      setNomeCartao('');
      setLimiteCartao('');
      setFaturaCartao('');
      Alert.alert(t('success'), cartaoEditando ? t('card_updated_success') : t('card_created_success'));
    } catch (error: any) {
      Alert.alert(t('error_saving_card'), error.message || t('error'));
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletarCartao = () => {
    if (!cartaoEditando) return;
    Alert.alert(
      t('confirm_deletion'),
      t('delete_card_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCartao(cartaoEditando.id);
              setModalCartaoVisible(false);
              setCartaoEditando(null);
              setNomeCartao('');
              setLimiteCartao('');
              setFaturaCartao('');
              Alert.alert(t('success'), t('card_deleted_success'));
            } catch (err: any) {
              Alert.alert(t('error'), err.message || t('error_deleting_card'));
            }
          }
        }
      ]
    );
  };

  const abrirAdicionarCartao = () => {
    setCartaoEditando(null);
    setNomeCartao('');
    setLimiteCartao('');
    setFaturaCartao('');
    setModalCartaoVisible(true);
  };

  const abrirEditarCartao = (cartao: any) => {
    setCartaoEditando(cartao);
    setNomeCartao(cartao.nome);
    setLimiteCartao(cartao.limite.toString());
    setFaturaCartao(cartao.fatura_atual.toString());
    setModalCartaoVisible(true);
  };

  // Salvar Caixinha
  const handleSalvarCaixinha = async () => {
    if (!nomeCaixinha.trim() || !alvoCaixinha || isNaN(Number(alvoCaixinha))) {
      Alert.alert(t('error'), t('fill_fields_correctly'));
      return;
    }

    // Trava de caixinha freemium (Módulo 4)
    if (!verificarLimiteCaixinhas(caixinhas.length)) {
      setModalCaixinhaVisible(false);
      return;
    }

    setSalvando(true);
    const activeSpaceId = id_espaco_ativo || 'space-pf';
    try {
      await addCaixinha({
        id: caixinhaEditando ? caixinhaEditando.id : Math.random().toString(36).substring(2, 9),
        id_espaco: caixinhaEditando ? caixinhaEditando.id_espaco : activeSpaceId,
        nome: nomeCaixinha.trim(),
        valor_alvo: parseFloat(alvoCaixinha),
        saldo_guardado: parseFloat(saldoGuardadoCaixinha) || 0
      });
      setModalCaixinhaVisible(false);
      setCaixinhaEditando(null);
      setNomeCaixinha('');
      setAlvoCaixinha('');
      setSaldoGuardadoCaixinha('');
      Alert.alert(t('success'), t('jar_created_success'));
    } catch (error: any) {
      Alert.alert(t('error_creating_jar'), error.message || t('error'));
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletarCaixinha = (caixinhaId: string, nome: string) => {
    Alert.alert(
      t('confirm_deletion'),
      t('delete_jar_confirm_named').replace('{name}', nome),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCaixinha(caixinhaId);
              Alert.alert(t('success'), t('jar_deleted_success'));
            } catch (err: any) {
              Alert.alert(t('error'), err.message || t('error_deleting_jar'));
            }
          }
        }
      ]
    );
  };

  const abrirAdicionarCaixinha = () => {
    setCaixinhaEditando(null);
    setNomeCaixinha('');
    setAlvoCaixinha('');
    setSaldoGuardadoCaixinha('');
    setModalCaixinhaVisible(true);
  };

  const abrirEditarCaixinha = (caixinha: any) => {
    setCaixinhaEditando(caixinha);
    setNomeCaixinha(caixinha.nome);
    setAlvoCaixinha(caixinha.valor_alvo.toString());
    setSaldoGuardadoCaixinha(caixinha.saldo_guardado.toString());
    setModalCaixinhaVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Superior com Logo e Perfil */}
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Logo size="sm" withLeaf />
            {isSyncing && (
              <ActivityIndicator 
                size="small" 
                color={theme.colors.accent} 
                style={{ marginLeft: 8 }} 
              />
            )}
          </View>

          <View style={styles.headerRightGroup}>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>{moeda_base}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Mais')} activeOpacity={0.7}>
              <Image 
                source={{ uri: avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' }} 
                style={[
                  styles.avatarImage,
                  { borderColor: activeSpace?.tipo === 'PJ' ? theme.colors.primary : theme.colors.positive }
                ]} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Saudação e Badge de Espaço */}
        <View style={styles.salutationRow}>
          <View>
            <Text style={styles.salutation}>{t('welcome')}, {nome_usuario?.split(' ')[0] || t('user_fallback')}</Text>
            <Text style={styles.subtitle}>{t('panel_subtitle')}</Text>
            {id_usuario && !id_usuario.startsWith('demo-') && (
              <Text style={styles.userIdText}>ID: {id_usuario.slice(0, 8)}...</Text>
            )}
          </View>
          
          <TouchableOpacity style={styles.spaceBadgeContainer} onPress={alternarEspaco} activeOpacity={0.8}>
            <View style={styles.spaceBadge}>
              {activeSpace?.tipo === 'PJ' ? (
                <Briefcase size={14} color={theme.colors.primary} />
              ) : (
                <User size={14} color={theme.colors.positive} />
              )}
              <Text style={[styles.spaceText, activeSpace?.tipo === 'PJ' ? styles.pjColor : styles.pfColor]}>
                {activeSpace?.tipo === 'PJ' ? t('empresa_pj') : t('pessoal_pf')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Banner de Completar Perfil */}
        {id_usuario && !id_usuario.startsWith('demo-') && 
         (!nome_usuario || nome_usuario.split(' ').length < 2 || renda_principal <= 0 || !avatar_url) && (
          <TouchableOpacity 
            style={styles.profileCompletionBanner}
            onPress={() => navigation.navigate('Perfil')}
            activeOpacity={0.8}
          >
            <AlertCircle size={16} color={theme.colors.primary} />
            <View style={styles.profileCompletionText}>
              <Text style={styles.profileCompletionTitle}>{t('complete_your_profile')}</Text>
              <Text style={styles.profileCompletionSub}>{t('complete_profile_subtitle')}</Text>
            </View>
            <ChevronRight size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        {/* Card de Saldo Central */}
        <TouchableOpacity 
          style={styles.balanceCard} 
          onPress={() => navigation.navigate('Transações')} 
          activeOpacity={0.9}
        >
          <Text style={styles.balanceLabel}>{t('total_balance')}</Text>
          <Text style={styles.balanceValue}>{formatCurrency(saldoTotal, moeda_base)}</Text>
          
          <View style={styles.balanceFooter}>
            <View style={styles.balanceFooterBtn}>
              <ArrowUpRight size={14} color="#FFFFFF" />
              <Text style={styles.balanceFooterBtnText}>{t('send')}</Text>
            </View>
            <View style={styles.balanceFooterDivider} />
            <View style={styles.balanceFooterBtn}>
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.balanceFooterBtnText}>{t('add')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Resumo do Mês */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBlock}>
            <View style={styles.summaryHeader}>
              <ArrowUpRight size={16} color={theme.colors.positive} style={styles.summaryIcon} />
              <Text style={styles.summaryLabel}>{t('revenues')}</Text>
            </View>
            <Text style={styles.revenueValue}>{formatCurrency(receitas, moeda_base)}</Text>
          </View>

          <View style={styles.summaryBlock}>
            <View style={styles.summaryHeader}>
              <ArrowDownRight size={16} color={theme.colors.negative} style={styles.summaryIcon} />
              <Text style={styles.summaryLabel}>{t('expenses')}</Text>
            </View>
            <Text style={styles.expenseValue}>{formatCurrency(despesas, moeda_base)}</Text>
          </View>
        </View>

        {/* 50/30/20 Termômetro do Mês */}
        <View style={styles.termometroCard}>
          <View style={styles.termometroHeader}>
            <Gauge size={16} color={theme.colors.primary} />
            <Text style={styles.termometroTitle}>{t('passive_budget')}</Text>
          </View>

          {/* Necessidades */}
          <View style={styles.progressGroup}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t('necessities')}</Text>
              <Text style={styles.progressValues}>
                {formatCurrency(gastoNecessidades, moeda_base)} / {formatCurrency(tetoNecessidades, moeda_base)}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pctNecessidades}%`, backgroundColor: getCorProgresso(pctNecessidades) }]} />
            </View>
            {gastoNecessidades > tetoNecessidades && (
              <Text style={styles.microcopyAlert}>{t('budget_alert')}</Text>
            )}
          </View>

          {/* Estilo de Vida */}
          <View style={styles.progressGroup}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t('lifestyle')}</Text>
              <Text style={styles.progressValues}>
                {formatCurrency(gastoEstiloVida, moeda_base)} / {formatCurrency(tetoEstiloVida, moeda_base)}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pctEstiloVida}%`, backgroundColor: getCorProgresso(pctEstiloVida) }]} />
            </View>
          </View>

          {/* Futuro */}
          <View style={styles.progressGroup}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t('future')}</Text>
              <Text style={styles.progressValues}>
                {formatCurrency(gastoFuturo, moeda_base)} / {formatCurrency(tetoFuturo, moeda_base)}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pctFuturo}%`, backgroundColor: getCorProgresso(pctFuturo) }]} />
            </View>
          </View>
        </View>

        {/* Contas Físicas */}
        <View style={[styles.sectionHeader, styles.sectionMargin]}>
          <View style={styles.headerLeftGroup}>
            <Wallet size={16} color={theme.colors.textMuted} />
            <Text style={styles.sectionTitle}>{t('accounts')}</Text>
          </View>
          <TouchableOpacity onPress={abrirAdicionarConta}>
            <Plus size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        {contas.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={abrirAdicionarConta}>
            <Text style={styles.emptyText}>{t('no_accounts')}</Text>
            <Text style={styles.emptyLink}>{t('add_account_btn')}</Text>
          </TouchableOpacity>
        ) : (
          contas.map(conta => (
            <TouchableOpacity 
              key={conta.id} 
              style={styles.itemCard}
              onPress={() => abrirEditarConta(conta)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{conta.nome_instituicao}</Text>
                <Text style={styles.itemValue}>{formatCurrency(conta.saldo_inicial, conta.moeda_conta)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => abrirEditarConta(conta)} activeOpacity={0.7}>
                  <Edit2 size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    setContaEditando(conta);
                    Alert.alert(
                      t('confirm_deletion'),
                      t('delete_jar_confirm_named').replace('{name}', conta.nome_instituicao),
                      [
                        { text: t('cancel'), style: 'cancel', onPress: () => setContaEditando(null) },
                        { 
                          text: t('delete'), 
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deleteConta(conta.id);
                              setContaEditando(null);
                              Alert.alert(t('success'), t('account_deleted_success'));
                            } catch (err: any) {
                              Alert.alert(t('error'), err.message || t('error_deleting_account'));
                            }
                          }
                        }
                      ]
                    );
                  }} 
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={theme.colors.negative} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Metas e Caixinhas */}
        <View style={[styles.sectionHeader, styles.sectionMargin]}>
          <View style={styles.headerLeftGroup}>
            <Target size={16} color={theme.colors.textMuted} />
            <Text style={styles.sectionTitle}>{t('caixinhas')}</Text>
          </View>
          <TouchableOpacity onPress={abrirAdicionarCaixinha}>
            <Plus size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        {caixinhas.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={abrirAdicionarCaixinha}>
            <Text style={styles.emptyText}>{t('no_jars')}</Text>
            <Text style={styles.emptyLink}>{t('add_jar_btn')}</Text>
          </TouchableOpacity>
        ) : (
          caixinhas.map(caixinha => {
            const progresso = Math.min((caixinha.saldo_guardado / caixinha.valor_alvo) * 100, 100);
            return (
              <TouchableOpacity key={caixinha.id} style={styles.goalCard} onPress={() => abrirEditarCaixinha(caixinha)} activeOpacity={0.7}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{caixinha.nome}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.goalPercent}>{progresso.toFixed(0)}%</Text>
                    <TouchableOpacity onPress={() => abrirEditarCaixinha(caixinha)} activeOpacity={0.7}>
                      <Edit2 size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeletarCaixinha(caixinha.id, caixinha.nome)} activeOpacity={0.7}>
                      <Trash2 size={16} color={theme.colors.negative} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Barra de Progresso Nativa */}
                <View style={styles.progressBarBgGoal}>
                  <View style={[styles.progressBarFillGoal, { width: `${progresso}%` }]} />
                </View>

                <View style={styles.goalFooter}>
                  <Text style={styles.goalDetails}>
                    {formatCurrency(caixinha.saldo_guardado, moeda_base)} {t('saved')}
                  </Text>
                  <Text style={styles.goalTarget}>
                    {t('target')}: {formatCurrency(caixinha.valor_alvo, moeda_base)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Cartões de Crédito */}
        <View style={[styles.sectionHeader, styles.sectionMargin]}>
          <View style={styles.headerLeftGroup}>
            <CreditCard size={16} color={theme.colors.textMuted} />
            <Text style={styles.sectionTitle}>{t('credit_cards')}</Text>
          </View>
          <TouchableOpacity onPress={abrirAdicionarCartao}>
            <Plus size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {cartoes.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={abrirAdicionarCartao}>
            <Text style={styles.emptyText}>{t('no_cards')}</Text>
            <Text style={styles.emptyLink}>{t('add_card')}</Text>
          </TouchableOpacity>
        ) : (
          cartoes.map(cartao => (
            <TouchableOpacity 
              key={cartao.id} 
              style={styles.itemCard}
              onPress={() => abrirEditarCartao(cartao)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{cartao.nome}</Text>
                <Text style={styles.itemSubText}>{t('available')}: {formatCurrency(cartao.limite - cartao.fatura_atual, moeda_base)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={styles.cardExpenseValue}>{formatCurrency(cartao.fatura_atual, moeda_base)}</Text>
                <TouchableOpacity onPress={() => abrirEditarCartao(cartao)} activeOpacity={0.7}>
                  <Edit2 size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    setCartaoEditando(cartao);
                    Alert.alert(
                      t('confirm_deletion'),
                      t('delete_card_confirm_named').replace('{name}', cartao.nome),
                      [
                        { text: t('cancel'), style: 'cancel', onPress: () => setCartaoEditando(null) },
                        { 
                          text: t('delete'), 
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deleteCartao(cartao.id);
                              setCartaoEditando(null);
                              Alert.alert(t('success'), t('card_deleted_success'));
                            } catch (err: any) {
                              Alert.alert(t('error'), err.message || t('error_deleting_card'));
                            }
                          }
                        }
                      ]
                    );
                  }} 
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={theme.colors.negative} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 80 }} />
        <AdBanner />
      </ScrollView>

      {/* MODAL ADICIONAR/EDITAR CARTÃO */}
      <Modal visible={modalCartaoVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{cartaoEditando ? t('edit_card') : t('add_card')}</Text>
              <TouchableOpacity onPress={() => { setModalCartaoVisible(false); setCartaoEditando(null); }}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('card_name_label')}</Text>
            <TextInput
              style={styles.modalInput}
              value={nomeCartao}
              onChangeText={setNomeCartao}
              placeholder="Ex: Nubank Violeta"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.inputLabel}>{t('total_limit_label')}</Text>
            <TextInput
              style={styles.modalInput}
              value={limiteCartao}
              onChangeText={setLimiteCartao}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>{t('current_invoice_label')}</Text>
            <TextInput
              style={styles.modalInput}
              value={faturaCartao}
              onChangeText={setFaturaCartao}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
            />

            <TouchableOpacity 
              style={[styles.submitBtn, salvando && { opacity: 0.7 }]} 
              onPress={handleSalvarCartao} 
              disabled={salvando}
            >
              <Text style={styles.submitBtnText}>
                {salvando ? t('saving') : (cartaoEditando ? t('save_changes') : t('register_card'))}
              </Text>
            </TouchableOpacity>

            {cartaoEditando && (
              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: theme.colors.negative, marginTop: 10 }]} 
                onPress={handleDeletarCartao}
              >
                <Text style={styles.submitBtnText}>{t('delete_card')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL ADICIONAR/EDITAR CONTA */}
      <Modal visible={modalContaVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{contaEditando ? t('edit_account') : t('add_account_title')}</Text>
              <TouchableOpacity onPress={() => { setModalContaVisible(false); setContaEditando(null); }}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('institution_name')}</Text>
            <TextInput
              style={styles.modalInput}
              value={nomeConta}
              onChangeText={setNomeConta}
              placeholder={t('inst_placeholder')}
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.inputLabel}>{t('account_currency')}</Text>
            <View style={styles.currencyRow}>
              {['BRL', 'USD', 'EUR', 'ARS'].map(cur => (
                <TouchableOpacity
                  key={cur}
                  style={[styles.currencyBtn, moedaConta === cur && styles.currencyBtnActive]}
                  onPress={() => setMoedaConta(cur)}
                >
                  <Text style={[styles.currencyBtnText, moedaConta === cur && styles.currencyBtnTextActive]}>{cur}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>{contaEditando ? t('current_balance') : t('initial_balance')}</Text>
            <TextInput
              style={styles.modalInput}
              value={saldoConta}
              onChangeText={setSaldoConta}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />

            <TouchableOpacity 
              style={[styles.submitBtn, salvando && { opacity: 0.7 }]} 
              onPress={handleSalvarConta} 
              disabled={salvando}
            >
              <Text style={styles.submitBtnText}>
                {salvando ? t('saving') : (contaEditando ? t('save_changes') : t('register_account'))}
              </Text>
            </TouchableOpacity>

            {contaEditando && (
              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: theme.colors.negative, marginTop: 10 }]} 
                onPress={handleDeletarConta}
              >
                <Text style={styles.submitBtnText}>{t('delete_account')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL ADICIONAR CAIXINHA */}
      <Modal visible={modalCaixinhaVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('new_jar_title')}</Text>
              <TouchableOpacity onPress={() => setModalCaixinhaVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('goal_name')}</Text>
            <TextInput
              style={styles.modalInput}
              value={nomeCaixinha}
              onChangeText={setNomeCaixinha}
              placeholder={t('goal_placeholder')}
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.inputLabel}>{t('target_value')}</Text>
            <TextInput
              style={styles.modalInput}
              value={alvoCaixinha}
              onChangeText={setAlvoCaixinha}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>{t('initial_saved')}</Text>
            <TextInput
              style={styles.modalInput}
              value={saldoGuardadoCaixinha}
              onChangeText={setSaldoGuardadoCaixinha}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
            />

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: theme.colors.primary }, salvando && { opacity: 0.7 }]} 
              onPress={handleSalvarCaixinha} 
              disabled={salvando}
            >
              <Text style={styles.submitBtnText}>{salvando ? t('saving') : t('create_jar')}</Text>
            </TouchableOpacity>
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
  scrollContainer: {
    padding: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextMang: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  logoO: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.accent,
    marginHorizontal: 1,
    marginTop: 5,
  },
  logoTextS: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencyBadge: {
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  salutationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  salutation: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  userIdText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 1,
    fontFamily: 'monospace',
  },
  profileCompletionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 95, 141, 0.08)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  profileCompletionText: {
    flex: 1,
  },
  profileCompletionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  profileCompletionSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  spaceBadgeContainer: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  spaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spaceText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  pfColor: {
    color: theme.colors.positive,
  },
  pjColor: {
    color: theme.colors.primary,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 30,
    marginBottom: 24,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 16,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 21,
  },
  balanceFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  balanceFooterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  balanceFooterDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryBlock: {
    flex: 1,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryIcon: {
    marginRight: 6,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  revenueValue: {
    color: theme.colors.positive,
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseValue: {
    color: theme.colors.negative,
    fontSize: 16,
    fontWeight: 'bold',
  },
  termometroCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 24,
  },
  termometroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  termometroTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressGroup: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  progressValues: {
    color: theme.colors.ink,
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  microcopyAlert: {
    color: theme.colors.negative,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionMargin: {
    marginTop: 12,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyLink: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  itemCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  itemName: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  itemSubText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  itemValue: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardExpenseValue: {
    color: theme.colors.negative,
    fontSize: 15,
    fontWeight: 'bold',
  },
  goalCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalName: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
  },
  goalPercent: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBgGoal: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.cardBg,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFillGoal: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalDetails: {
    color: theme.colors.positive,
    fontSize: 11,
    fontWeight: '500',
  },
  goalTarget: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  modalOverlay: {
    ...theme.modalStyles.overlay,
    padding: 30,
  },
  modalContent: {
    ...theme.modalStyles.card,
    padding: 30,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalHeader: {
    ...theme.modalStyles.header,
    marginBottom: 16,
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  modalTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    ...theme.modalStyles.input,
    height: 44,
    paddingHorizontal: 18,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  currencyBtn: {
    flex: 1,
    height: 36,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(16, 69, 161, 0.08)',
  },
  currencyBtnText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  currencyBtnTextActive: {
    color: theme.colors.primary,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
