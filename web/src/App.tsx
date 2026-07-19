import React, { useState, useRef } from 'react';
import './GlobalStyles.css';
import { useStore } from './store/useStore';
import { useI18n } from './i18n';

import type { Espaco, Conta, Transacao, Caixinha, Cartao } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { SUPABASE_URL } from './constants/config';
import { updatePerfil } from './services/supabaseService';
import { formatCurrency, addMoney, subtractMoney, multiplyMoney, convertCurrency } from './utils/currency';
import { parseCSV, parseOFX, parseXLSX, parsePDF } from './utils/importer';
import { Card } from './components/Card';
import { PrimaryButton } from './components/PrimaryButton';
import { FloatingActionButton } from './components/FloatingActionButton';
import { TextInput } from './components/TextInput';
import { DepositModal } from './components/DepositModal';
import { useToast } from './components/Toast';
import { TransactionModal } from './components/TransactionModal';
import { CardModal } from './components/CardModal';
import { AccountModal } from './components/AccountModal';
import { CaixinhaModal } from './components/CaixinhaModal';
import { SpaceModal } from './components/SpaceModal';
import { PaywallModal } from './components/PaywallModal';
import { CheckoutModal } from './components/CheckoutModal';
import { ImportReviewModal } from './components/ImportReviewModal';
import type { PendingTransaction } from './components/ImportReviewModal';
import { InvestimentosView } from './components/InvestimentosView';
import { CaixinhaHistoricoModal } from './components/CaixinhaHistoricoModal';
import { FechamentoMensalModal } from './components/FechamentoMensalModal';
import { InventarioView } from './components/InventarioView';
import { CalendarioFinanceiro } from './components/CalendarioFinanceiro';
import { Logo } from './components/Logo';
import { FAQModal, TermosModal } from './components/FAQTermos';
import { useExchangeRates } from './hooks/useExchangeRates';
import { usePremium } from './hooks/usePremium';
import { MOCK_ESTADO_PROFILES as ESTADO_PROFILES } from './hooks/useIbgeData';
import { useInvestments } from './hooks/useInvestments';
import { useFinancialTips } from './hooks/useFinancialTips';
import type { Article } from './hooks/useFinancialTips';
import {
  trackOnboardingCompleted,
  trackTransactionCreated,
  trackImportCompleted,
  trackPaywallHit,
  trackCheckoutInitiated,
  trackPurchaseCompleted,
  trackDemoLoaded,
} from './utils/analytics';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  Upload, 
  User, 
  Sparkles, 
  Briefcase, 
  CreditCard,
  ChevronRight,
  LogOut,
  Globe,
  BookOpen,
  MapPin,
  Trash2,
  Eye,
  EyeOff,
  HelpCircle,
  Shield,
  Pencil,
  Check,
  X,
  CalendarDays,
  CheckSquare,
  Square,
} from 'lucide-react';

import { UpsellModal } from './components/UpsellModal';
import { CostExplorer } from './components/CostExplorer';
import { AdBanner } from './components/AdBanner';
import { AdSenseBanner } from './components/AdSenseBanner';
import { LanguageSelector } from './components/LanguageSelector';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
} from 'recharts';



export default function App() {
  const { t } = useI18n();
  const toast = useToast();
  const {
    id_usuario,
    email_usuario,
    nome_usuario,
    plano_usuario,
    moeda_base,
    avatar_url,
    id_espaco_ativo,
    espacos,
    contas,
    transacoes,
    cartoes,
    setUsuario,
    setPlanoUsuario,
    setMoedaBase,
    setIdEspacoAtivo,
    getSaldoTotal,
    getTransacoesEspacoAtivo,
    getContasEspacoAtivo,
    getCaixinhasEspacoAtivo,
    getCartoesEspacoAtivo,
    loadDemoData
  } = useStore();

  const { verificarAcessoImportacao } = usePremium();

  const {
    isLoading: authLoading,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,
  } = useAuth();

  const {
    addEspaco,
    addConta,
    addTransacao,
    addTransacoesBatch,
    addCaixinha,
    updateCaixinhaSaldo,
    updateCaixinha,
    upgradeToPremium,
    removeConta,
    removeTransacao,
    removeCaixinha,
    addCartao,
    updateCartao,
    removeCartao,
    addCaixinhaMovimento,
    editCaixinhaMovimento,
    removeCaixinhaMovimento,
    moveTransacaoToConta,
  } = useSupabaseSync();

  // Estado do DepositModal (substituição do window.prompt)
  const [depositGoal, setDepositGoal] = useState<{ id: string; nome: string; saved: number; target: number } | null>(null);

  // Local UI States
  const [activeView, setActiveView] = useState<'dashboard' | 'costExplorer' | 'blog' | 'investimentos' | 'fluxopj' | 'inventario' | 'calendario'>('dashboard');
  const [landingView, setLandingView] = useState<'home' | 'costExplorer' | 'blog'>('home');
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileAvatarInput, setProfileAvatarInput] = useState('');
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [sandboxExpense, setSandboxExpense] = useState(3500);
  const [sandboxState, setSandboxState] = useState('SP');

  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddCaixinhaModal, setShowAddCaixinhaModal] = useState(false);
  const [editingCaixinhaId, setEditingCaixinhaId] = useState<string | null>(null);
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellReason, setUpsellReason] = useState('');
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Cartao | null>(null);

  // Checkout Flow States (Fase 6)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<'card' | 'pix'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // ─── Phase 4.1: Modo Privacidade ───────────────────────────────────────────
  const [privacyMode, setPrivacyMode] = useState(false);

  // ─── Phase 4.1: Conciliação Manual (Drag & Drop) ──────────────────────────
  const [dragOverContaId, setDragOverContaId] = useState<string | null>(null);
  const [dragTxId, setDragTxId] = useState<string | null>(null);

  // ─── Phase 1: FAQ & Termos LGPD ────────────────────────────────────────────
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showTermosModal, setShowTermosModal] = useState(false);

  // ─── Phase 3: Edição de Transação ──────────────────────────────────────────
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxDescricao, setEditTxDescricao] = useState('');
  const [editTxValor, setEditTxValor] = useState('');
  const [editTxData, setEditTxData] = useState('');
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  const toggleTxSelection = (txId: string) => {
    setSelectedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId); else next.add(txId);
      return next;
    });
  };

  const toggleAllTxSelection = () => {
    setSelectedTxIds(prev => {
      if (prev.size === activeTransactions.length) return new Set();
      return new Set(activeTransactions.map(t => t.id));
    });
  };

  const handleBulkDelete = async () => {
    if (selectedTxIds.size === 0) return;
    if (!window.confirm(t('bulk_delete_confirm', { count: selectedTxIds.size }))) return;
    for (const txId of selectedTxIds) {
      await handleDeleteTransacao(txId);
    }
    setSelectedTxIds(new Set());
  };

  // ─── Phase 4.2 & 4: Caixinha Historico & Fechamento Mensal ──────────────
  const [showCaixinhaHistorico, setShowCaixinhaHistorico] = useState<Caixinha | null>(null);
  const [showFechamentoMensal, setShowFechamentoMensal] = useState(false);

  // ─── Phase 4.1: Fluxo PJ, Inventário, Calendário ────────────────────────
  const [_showFluxoPJ, _setShowFluxoPJ] = useState(false);
  const [_showInventario, _setShowInventario] = useState(false);
  const [_showCalendario, _setShowCalendario] = useState(false);



  // Exchange Rates (Mock/Live from AwesomeAPI)
  const { data: liveRates, isFetching: isFetchingRates } = useExchangeRates(plano_usuario === 'premium');
  const rates = liveRates || {
    BRL: 1.0,
    USD: 5.4,
    EUR: 5.8,
    ARS: 0.006
  };

  // Investments Data (Brapi.dev)
  const { data: _investments } = useInvestments(Boolean(id_usuario));

  // Financial tips (Strapi CMS)
  const [tipsPage, setTipsPage] = useState(1);
  const { data: newTips } = useFinancialTips(tipsPage);
  const [accumulatedTips, setAccumulatedTips] = useState<Article[]>([]);

  // Se o espaço ativo não é PJ, volta para dashboard
  React.useEffect(() => {
    const space = espacos.find(e => e.id === id_espaco_ativo);
    if (activeView === 'fluxopj' && space?.tipo !== 'PJ') {
      setActiveView('dashboard');
    }
  }, [activeView, espacos, id_espaco_ativo]);

  // Accumulate articles as page increases
  React.useEffect(() => {
    if (newTips && newTips.length > 0) {
      setAccumulatedTips(prev => {
        const ids = new Set(prev.map(t => t.id));
        const filtered = newTips.filter(t => !ids.has(t.id));
        return [...prev, ...filtered];
      });
    }
  }, [newTips]);

  // Cross-Platform SSO via código de uso único (Mobile → Web)
  // Resolve CRIT-02: JWT não mais transmitido via URL
  React.useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const ssoCode = queryParams.get('sso_code');
    const view = queryParams.get('view') || queryParams.get('mode');

    if (ssoCode) {
      window.history.replaceState(null, '', window.location.pathname);

      import('./lib/supabase').then(({ supabase }) => {
        fetch(`${SUPABASE_URL}/functions/v1/sso-exchange-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: ssoCode }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.access_token && data.refresh_token) {
              return supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
              });
            }
            throw new Error(data.error || 'SSO failed');
          })
          .then(({ data, error }) => {
            if (!error && data.session) {
              if (view === 'costExplorer') {
                setShowLandingPage(false);
                setActiveView('costExplorer');
              } else if (view === 'blog') {
                setShowLandingPage(false);
                setActiveView('blog');
              }
            }
          })
          .catch(() => {});
      });
    } else if (view === 'costExplorer' || view === 'blog') {
      window.history.replaceState(null, '', window.location.pathname);
      if (id_usuario) {
        setShowLandingPage(false);
        setActiveView(view as 'costExplorer' | 'blog');
      } else {
        setLandingView(view as 'costExplorer' | 'blog');
      }
    }
  }, [id_usuario]);

  // Sincronizar título da página para SEO
  React.useEffect(() => {
    if (!showLandingPage && id_usuario) {
      if (activeView === 'dashboard') {
        document.title = `Com Réis — ${t('web_dashboard_panel')}`;
      } else if (activeView === 'costExplorer') {
        document.title = `Com Réis — ${t('web_cost_living')}`;
      } else if (activeView === 'blog') {
        document.title = `Com Réis — ${t('web_blog_title')}`;
      }
    } else {
      if (landingView === 'home') {
        document.title = `Com Réis — ${t('web_landing_hero_subtitle')}`;
      } else if (landingView === 'costExplorer') {
        document.title = `Com Réis — ${t('web_cost_title')}`;
      } else if (landingView === 'blog') {
        document.title = `Com Réis — ${t('web_blog_title')}`;
      }
    }
  }, [showLandingPage, id_usuario, activeView, landingView]);

  // Clean tips when logging out
  const handleLogout = () => {
    const confirm = window.confirm(`${t('web_logout_title')} ${t('web_logout_desc')}`);
    if (!confirm) return;
    signOut();
    setAccumulatedTips([]);
    setTipsPage(1);
  };

  // 5-Minute Inactivity Timeout
  React.useEffect(() => {
    if (!id_usuario) return;

    let inactivityTimer: number;

    const resetTimer = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        signOut();
        setAccumulatedTips([]);
        setTipsPage(1);
        toast.warning(t('web_session_expired'), t('web_session_expired_desc'));
      }, 300000); // 5 minutos
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetTimer));

    resetTimer();

    return () => {
      window.clearTimeout(inactivityTimer);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [id_usuario, signOut, toast]);





  const handleOpenCheckout = (method: 'card' | 'pix' = 'card') => {
    setShowCheckoutModal(true);
    setCheckoutMethod(method);
    setCardNumber('');
    setCardHolder('');
    setCardExpiry('');
    setCardCvv('');
    setCheckoutProcessing(false);
    setCheckoutSuccess(false);
    setCopiedPix(false);
    setShowUpsellModal(false);
    trackCheckoutInitiated(method);
  };

  React.useEffect(() => {
    const handleCustomCheckout = () => {
      handleOpenCheckout();
    };
    window.addEventListener('open-checkout', handleCustomCheckout);
    return () => window.removeEventListener('open-checkout', handleCustomCheckout);
  }, []);

  React.useEffect(() => {
    const handlePaywall = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.reason) {
        setPaywallReason(detail.reason);
        setShowPaywallModal(true);
      }
    };
    window.addEventListener('open-paywall', handlePaywall);
    return () => window.removeEventListener('open-paywall', handlePaywall);
  }, []);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutProcessing(true);
    // Simular processamento real do gateway de pagamento
    setTimeout(() => {
      setCheckoutProcessing(false);
      setCheckoutSuccess(true);
      upgradeToPremium();
      trackPurchaseCompleted(checkoutMethod);
    }, 2500);
  };
  
  // Onboarding Form
  const [onboardName, setOnboardName] = useState('');
  const [onboardIncome, setOnboardIncome] = useState('');
  const [onboardCurrency, setOnboardCurrency] = useState('BRL');

  // Auth State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [lembrarCredenciais, setLembrarCredenciais] = useState(() => window.localStorage.getItem('lembrar_credenciais') === 'true');

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  React.useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setIsSettingNewPassword(true);
    }
  }, []);

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) {
      toast.warning(t('web_auth_email_required'), t('web_auth_enter_email_recovery'));
      return;
    }
    const err = await resetPassword(authEmail);
    if (err) {
      toast.error('Erro', err.message);
    } else {
      toast.success(t('web_auth_recovery_email_sent'), t('web_auth_check_inbox'));
      setIsRecoveryMode(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.warning(t('web_auth_weak_password'), t('web_auth_min_6_chars'));
      return;
    }
    const err = await updatePassword(newPassword);
    if (err) {
      toast.error('Erro', err.message);
    } else {
      toast.success(t('web_auth_password_updated'), t('web_auth_login_again'));
      setIsSettingNewPassword(false);
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  React.useEffect(() => {
    window.localStorage.setItem('lembrar_credenciais', lembrarCredenciais.toString());
  }, [lembrarCredenciais]);

  // Transaction Form State
  const [txDesc, setTxDesc] = useState('');
  const [txVal, setTxVal] = useState('');
  const [txTipo, setTxTipo] = useState<'receita' | 'despesa'>('despesa');
  const [txCat, setTxCat] = useState('Alimentação');
  const [txContaId, setTxContaId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txMoeda, setTxMoeda] = useState('');
  const [txCartaoId, setTxCartaoId] = useState('');

  // Account Form State
  const [acName, setAcName] = useState('');
  const [acCurrency, setAcCurrency] = useState('BRL');
  const [acBalance, setAcBalance] = useState('');

  // Goal Form State
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  // Space Form State
  const [spaceName, setSpaceName] = useState('');
  const [spaceType, setSpaceType] = useState<'PF' | 'PJ'>('PF');

  // File Import Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importAccountSelect, setImportAccountSelect] = useState('');
  const [importReviewOpen, setImportReviewOpen] = useState(false);
  const [importPending, setImportPending] = useState<PendingTransaction[]>([]);
  const [importFormat, setImportFormat] = useState<'csv' | 'ofx' | 'xlsx' | 'pdf'>('csv');
  const [importLoading, setImportLoading] = useState(false);

  // Active items derived from store
  const activeSpace = espacos.find(e => e.id === id_espaco_ativo);
  const activeTransactions = getTransacoesEspacoAtivo();
  const activeAccounts = getContasEspacoAtivo();
  const activeCaixinhas = getCaixinhasEspacoAtivo();
  const activeCartoes = getCartoesEspacoAtivo();
  const totalBalance = getSaldoTotal(rates);

  const openAddTransactionModal = () => {
    if (activeAccounts.length === 0) {
      toast.error(t('web_tx_account_required'), t('web_tx_account_required_desc'));
      return;
    }
    const defaultAccount = activeAccounts[0];
    setTxContaId(defaultAccount.id);
    setTxMoeda(defaultAccount.moeda_conta || 'BRL');
    setTxCartaoId('');
    setShowAddTransactionModal(true);
  };

  // ─── Phase 4.1 & 3: privacy blur e checkout guard aplicados via JSX inline ──
  // privacyMode → filter: privacyMode ? 'blur(Xpx)' : 'none' nos spans/h2
  // totalBalance → usado no badge de saldo negativo abaixo


  // ─── Phase 3: Salvar edição de transação ────────────────────────────────────
  const handleSaveEditTx = (txId: string) => {
    const newVal = parseFloat(editTxValor);
    if (!editTxDescricao.trim() || isNaN(newVal) || newVal <= 0) {
      toast.error(t('web_tx_invalid_data'), t('web_tx_invalid_data_desc'));
      return;
    }
    // Update via store (optimistic) — delegates persistence to useSupabaseSync via zustand
    useStore.setState(state => ({
      transacoes: state.transacoes.map(t =>
        t.id === txId
          ? { ...t, descricao: editTxDescricao.trim(), valor: newVal, data_transacao: editTxData || t.data_transacao }
          : t
      )
    }));
    setEditingTxId(null);
    toast.success('Transação Atualizada', 'A transação foi editada com sucesso.');
  };

  // Calculate monthly average expense for CostExplorer comparison
  const despesasVal = activeTransactions
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => {
      const conta = activeAccounts.find(c => c.id === t.id_conta);
      const moedaTx = conta?.moeda_conta || moeda_base;
      return acc + convertCurrency(t.valor, moedaTx, moeda_base, rates);
    }, 0);
  const uniqueMonths = new Set(activeTransactions.map(t => t.data_transacao.substring(0, 7)));
  const userAverageExpense = uniqueMonths.size > 0 ? despesasVal / uniqueMonths.size : despesasVal;

  // ─── Phase 4: Regra 50/30/20 ─────────────────────────────────────────────────
  const receitaTotal = activeTransactions
    .filter(t => t.tipo === 'receita')
    .reduce((acc, t) => {
      const conta = activeAccounts.find(c => c.id === t.id_conta);
      const moedaTx = conta?.moeda_conta || moeda_base;
      return acc + convertCurrency(t.valor, moedaTx, moeda_base, rates);
    }, 0);
  const regra502030 = receitaTotal > 0
    ? {
        necessidades: multiplyMoney(receitaTotal, 0.5),
        desejos:      multiplyMoney(receitaTotal, 0.3),
        investimentos: multiplyMoney(receitaTotal, 0.2),
        despesasReais: despesasVal,
        pctGasto:      Math.min(Math.round((despesasVal / receitaTotal) * 100), 100)
      }
    : null;



  // Efeito para criar a carteira principal e a caixinha de reserva de emergência para novos usuários no Supabase
  React.useEffect(() => {
    if (id_usuario && id_usuario !== 'demo-user-123' && espacos.length > 0 && contas.length === 0 && onboardIncome) {
      const incomeVal = parseFloat(onboardIncome) || 0;
      if (incomeVal > 0) {
        const activeSpaceId = id_espaco_ativo || espacos[0].id;
        
        const createInitialData = async () => {
          // 1. Criar conta
          await addConta({
            id_espaco: activeSpaceId,
            nome_instituicao: 'Carteira Principal',
            moeda_conta: moeda_base,
            saldo_inicial: incomeVal
          });

          // 2. Criar caixinha de reserva
          const reserveTarget = multiplyMoney(incomeVal, 4);
          await addCaixinha({
            id_espaco: activeSpaceId,
            nome: 'Reserva de Emergência',
            valor_alvo: reserveTarget,
            saldo_guardado: 0
          });

          trackOnboardingCompleted(moeda_base);
          toast.success(t('web_onboarding_welcome'), `${t('web_onboarding_wallet_created')} ${formatCurrency(incomeVal, moeda_base)}.`);
        };

        createInitialData();
      }
    }
  }, [id_usuario, espacos, contas.length, id_espaco_ativo, moeda_base, onboardIncome]);

  // Trigger Onboarding (SignUp ou Cadastro Local)
  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardName || !onboardIncome) return;

    const incomeVal = parseFloat(onboardIncome);
    if (isNaN(incomeVal) || incomeVal <= 0) {
      toast.error(t('web_tx_invalid_income'), t('web_tx_invalid_income_desc'));
      return;
    }

    if (isSupabaseConfigured) {
      if (!authEmail || !authPassword) {
        toast.warning(t('web_tx_required'), t('web_tx_required_desc'));
        return;
      }
      setIsAuthLoading(true);
      const err = await signUp(authEmail, authPassword, onboardName, onboardCurrency);
      setIsAuthLoading(false);
      if (err) {
        toast.error('Erro ao criar conta', err.message);
      } else {
        toast.success(t('web_auth_account_created'), t('web_auth_syncing'));
      }
    } else {
      // Flow offline clássico:
      const userId = 'user_' + Math.random().toString(36).substr(2, 9);
      setUsuario(userId, `${onboardName.toLowerCase().replace(/\s+/g, '')}@comreis.com`, onboardName, 'free', onboardCurrency);
      
      const pfSpaceId = 'space_pf_' + Math.random().toString(36).substr(2, 9);
      const initialPFSpace: Espaco = {
        id: pfSpaceId,
        nome: 'Minha Vida (PF)',
        tipo: 'PF',
        id_usuario: userId
      };
      addEspaco(initialPFSpace);
      setIdEspacoAtivo(pfSpaceId);

      const accountId = 'account_' + Math.random().toString(36).substr(2, 9);
      const initialAccount: Conta = {
        id: accountId,
        id_espaco: pfSpaceId,
        nome_instituicao: 'Carteira Principal',
        moeda_conta: onboardCurrency,
        saldo_inicial: incomeVal
      };
      addConta(initialAccount);

      const reserveTarget = multiplyMoney(incomeVal, 4);
      const emergencyGoal: Caixinha = {
        id: 'caixinha_emergency_' + Math.random().toString(36).substr(2, 9),
        id_espaco: pfSpaceId,
        nome: 'Reserva de Emergência',
        valor_alvo: reserveTarget,
        saldo_guardado: 0
      };
      addCaixinha(emergencyGoal);

      trackOnboardingCompleted(onboardCurrency);
      toast.success(t('web_onboarding_welcome'), `${t('web_onboarding_emergency_created')} ${formatCurrency(reserveTarget, onboardCurrency)} ${t('web_onboarding_was_created')}`);
    }
  };

  // Trigger Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    setIsAuthLoading(true);
    const err = await signIn(authEmail, authPassword);
    setIsAuthLoading(false);

    if (err) {
      toast.error(t('error'), err.message);
    } else {
      toast.success(t('web_auth_access_granted'), t('web_auth_loading_finance'));
    }
  };

  // Switch Workspace (PF/PJ)
  const handleSwitchSpace = (spaceId: string) => {
    setIdEspacoAtivo(spaceId);
  };

  // Add Transaction
  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const descCleaned = txDesc.trim();
    if (!descCleaned) {
      toast.error(t('web_tx_desc_required'), t('web_tx_desc_required_desc'));
      return;
    }
    if (descCleaned.length > 100) {
      toast.error(t('web_tx_desc_long'), t('web_tx_desc_long_desc'));
      return;
    }
    if (!txVal) {
      toast.error(t('web_tx_value_required'), t('web_tx_value_required_desc'));
      return;
    }
    if (!txMoeda) {
      toast.error(t('web_tx_currency_required'), t('web_tx_currency_required_desc'));
      return;
    }
    let finalContaId = txContaId;
    if (!finalContaId) {
      let contaGeral = contas.find(c => c.nome_instituicao === 'Conta Geral' && c.id_espaco === id_espaco_ativo);
      if (!contaGeral) {
        const novaContaGeral = {
          id_espaco: id_espaco_ativo!,
          nome_instituicao: 'Conta Geral',
          moeda_conta: moeda_base,
          saldo_inicial: 0
        };
        const generatedId = await addConta(novaContaGeral);
        finalContaId = generatedId as string;
      } else {
        finalContaId = contaGeral.id;
      }
    }

    const valNum = parseFloat(txVal);
    if (isNaN(valNum) || valNum <= 0) {
      toast.error(t('web_tx_invalid_value'), t('web_tx_invalid_value_desc'));
      return;
    }
    if (valNum > 99999999.99) {
      toast.error(t('web_tx_value_limit'), t('web_tx_value_limit_desc'));
      return;
    }


    if (!txDate) {
      toast.error(t('web_tx_date_required'), t('web_tx_date_required_desc'));
      return;
    }
    const txYear = new Date(txDate).getFullYear();
    if (isNaN(txYear) || txYear < 1970 || txYear > 2100) {
      toast.error(t('web_tx_date_invalid'), t('web_tx_date_invalid_desc'));
      return;
    }

    const contaToUse = contas.find(c => c.id === finalContaId);
    if (!contaToUse) {
      toast.error(t('web_tx_account_not_found'), t('web_tx_account_not_found_desc'));
      return;
    }

    let valorFinalTransacao = valNum;
    let descricaoFinal = descCleaned;
    let taxaCambio = 1.0;

    if (txMoeda !== contaToUse.moeda_conta) {
      valorFinalTransacao = convertCurrency(valNum, txMoeda, contaToUse.moeda_conta, rates);
      taxaCambio = convertCurrency(1, txMoeda, contaToUse.moeda_conta, rates);
      
      const valorOriginalFormatado = formatCurrency(valNum, txMoeda);
      descricaoFinal = `[Original: ${valorOriginalFormatado}] ${descricaoFinal}`.trim();
    }

    const isCartaoCredito = txTipo === 'despesa' && !!txCartaoId;
    if (isCartaoCredito) {
      const card = cartoes.find(c => c.id === txCartaoId);
      if (card) {
        descricaoFinal = `[Cartão: ${card.nome}] ${descricaoFinal}`.trim();
      }
    }

    if (descricaoFinal.length > 100) {
      descricaoFinal = descricaoFinal.substring(0, 97) + '...';
    }

    if (txTipo === 'despesa' && !isCartaoCredito) {
      let accountBalance = contaToUse.saldo_inicial;
      const accountTrans = transacoes.filter((t) => t.id_conta === contaToUse.id);

      accountTrans.forEach((t) => {
        if (t.tipo === 'receita') {
          accountBalance = addMoney(accountBalance, t.valor);
        } else if (t.tipo === 'despesa') {
          accountBalance = subtractMoney(accountBalance, t.valor);
        }
      });

      if (accountBalance < valorFinalTransacao) {
        toast.info(t('web_tx_negative_balance'), t('web_tx_negative_balance_desc'));
      }
    }

    const newTx: Transacao = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      id_conta: finalContaId,
      tipo: txTipo,
      valor: valorFinalTransacao,
      categoria: txCat,
      data_transacao: txDate,
      taxa_cambio_dia: taxaCambio,
      descricao: descricaoFinal
    };

    addTransacao(newTx);

    if (isCartaoCredito) {
      const card = cartoes.find(c => c.id === txCartaoId);
      if (card) {
        let valorFaturaAdicional = valorFinalTransacao;
        if (contaToUse.moeda_conta !== moeda_base) {
          valorFaturaAdicional = convertCurrency(valorFinalTransacao, contaToUse.moeda_conta, moeda_base, rates);
        }
        const novaFatura = addMoney(card.fatura_atual, valorFaturaAdicional);
        updateCartao(card.id, card.nome, card.limite, novaFatura);
      }
    }

    setShowAddTransactionModal(false);
    setTxDesc('');
    setTxVal('');
    setTxCartaoId('');

    // Analytics
    trackTransactionCreated({ type: txTipo, category: txCat, currency: contaToUse.moeda_conta || moeda_base });
    toast.success(
      txTipo === 'receita' ? t('web_tx_recorded_income') : t('web_tx_recorded_expense'),
      `${descricaoFinal} — ${formatCurrency(valorFinalTransacao, contaToUse.moeda_conta || moeda_base)}`
    );
  };

  // Add Account
  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameCleaned = acName.trim();
    if (!nameCleaned) {
      toast.error(t('web_account_name_required'), t('web_account_name_required_desc'));
      return;
    }
    if (nameCleaned.length > 50) {
      toast.error(t('web_account_name_long'), t('web_account_name_long_desc'));
      return;
    }
    if (!id_espaco_ativo) return;

    const balNum = acBalance ? parseFloat(acBalance) : 0;
    if (isNaN(balNum)) {
      toast.error(t('web_account_invalid_balance'), t('web_account_invalid_balance_desc'));
      return;
    }
    if (Math.abs(balNum) > 99999999.99) {
      toast.error(t('web_account_balance_limit'), 'O saldo inicial deve estar entre R$ -99.999.999,99 e R$ 99.999.999,99.');
      return;
    }

    const newAccount: Conta = {
      id: 'account_' + Math.random().toString(36).substr(2, 9),
      id_espaco: id_espaco_ativo,
      nome_instituicao: nameCleaned,
      moeda_conta: acCurrency,
      saldo_inicial: balNum
    };

    addConta(newAccount);
    setShowAddAccountModal(false);
    setAcName('');
    setAcBalance('');
    toast.success(t('web_account_created'), `${nameCleaned} ${t('web_account_created_desc')}`);
  };

  const handleDeleteTransacao = async (txId: string) => {
    const tx = transacoes.find(t => t.id === txId);
    if (!tx) return;
    
    if (tx.descricao?.startsWith('[Cartão:')) {
      const match = tx.descricao.match(/^\[Cartão:\s*([^\]]+)\]/);
      if (match) {
        const cardName = match[1].trim();
        const card = cartoes.find(c => c.nome.toLowerCase() === cardName.toLowerCase());
        if (card) {
          const conta = contas.find(c => c.id === tx.id_conta);
          let valorTxEmBase = tx.valor;
          if (conta && conta.moeda_conta !== moeda_base) {
            valorTxEmBase = convertCurrency(tx.valor, conta.moeda_conta, moeda_base, rates);
          }
          const novaFatura = Math.max(0, subtractMoney(card.fatura_atual, valorTxEmBase));
          await updateCartao(card.id, card.nome, card.limite, novaFatura);
        }
      }
    }
    
    await removeTransacao(txId);
  };

  // ─── Phase 4.1: Mover transação entre contas (Drag & Drop) ──────────────
  const handleMoveTransacao = async (txId: string, novaContaId: string) => {
    const tx = transacoes.find(t => t.id === txId);
    const novaConta = contas.find(c => c.id === novaContaId);
    if (!tx || !novaConta || tx.id_conta === novaContaId) return;
    const contaAntiga = contas.find(c => c.id === tx.id_conta);
    await moveTransacaoToConta(txId, novaContaId);
    toast.success(
      t('web_tx_reconciled'),
      `"${tx.descricao || t('no_description')}" movida de ${contaAntiga?.nome_instituicao || '?'} para ${novaConta.nome_instituicao}.`
    );
  };

  const handleCardSubmit = async (nome: string, limite: number, fatura_atual: number) => {
    if (!id_espaco_ativo) return;

    if (cardToEdit) {
      await updateCartao(cardToEdit.id, nome, limite, fatura_atual);
      toast.success(t('web_card_updated'), t('web_card_updated_desc'));
    } else {
      const newCard = {
        id_espaco: id_espaco_ativo,
        nome,
        limite,
        fatura_atual
      };
      await addCartao(newCard);
      toast.success(t('web_card_created'), t('web_card_created_desc'));
    }
    setShowAddCardModal(false);
    setCardToEdit(null);
  };

  const handleCardDelete = async (id: string) => {
    await removeCartao(id);
    toast.success(t('web_card_deleted'), t('web_card_deleted_desc'));
    setShowAddCardModal(false);
    setCardToEdit(null);
  };

  const handleEditCaixinhaClick = (caixinha: Caixinha) => {
    setEditingCaixinhaId(caixinha.id);
    setGoalName(caixinha.nome);
    setGoalTarget(caixinha.valor_alvo.toString());
    setShowAddCaixinhaModal(true);
  };

  const handleCaixinhaModalClose = () => {
    setShowAddCaixinhaModal(false);
    setEditingCaixinhaId(null);
    setGoalName('');
    setGoalTarget('');
  };

  // Add/Edit Caixinha (Goal)
  const handleAddCaixinhaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameCleaned = goalName.trim();
    if (!nameCleaned) {
      toast.error(t('web_jar_name_required'), t('web_jar_name_required_desc'));
      return;
    }
    if (nameCleaned.length > 50) {
      toast.error(t('web_jar_name_long'), t('web_jar_name_long_desc'));
      return;
    }
    if (!goalTarget) {
      toast.error(t('web_jar_target_required'), t('web_jar_target_required_desc'));
      return;
    }
    if (!id_espaco_ativo) return;

    const targetNum = parseFloat(goalTarget);
    if (isNaN(targetNum) || targetNum <= 0) {
      toast.error(t('web_jar_target_invalid'), t('web_jar_target_invalid_desc'));
      return;
    }
    if (targetNum > 99999999.99) {
      toast.error(t('web_jar_target_limit'), t('web_jar_target_limit_desc'));
      return;
    }

    if (editingCaixinhaId) {
      updateCaixinha(editingCaixinhaId, nameCleaned, targetNum);
      handleCaixinhaModalClose();
      toast.success(t('web_jar_updated'), `${t('web_jar_meta_for')} ${nameCleaned} ${formatCurrency(targetNum, moeda_base)}.`);
      return;
    }

    // FREEMIUM CHECK: plano free → máximo 3 caixinhas
    if (plano_usuario === 'free' && activeCaixinhas.length >= 3) {
      trackPaywallHit('caixinhas');
      setUpsellReason(t('web_jar_free_limit'));
      setShowUpsellModal(true);
      return;
    }

    const newCaixinha: Caixinha = {
      id: 'caixinha_' + Math.random().toString(36).substr(2, 9),
      id_espaco: id_espaco_ativo,
      nome: nameCleaned,
      valor_alvo: targetNum,
      saldo_guardado: 0
    };

    addCaixinha(newCaixinha);
    setShowAddCaixinhaModal(false);
    setGoalName('');
    setGoalTarget('');
    toast.success(t('web_jar_created'), `Meta de ${formatCurrency(targetNum, moeda_base)} definida para ${nameCleaned}.`);
  };

  // Add Space (Workspace)
  const handleAddSpaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameCleaned = spaceName.trim();
    if (!nameCleaned) {
      toast.error(t('web_space_name_required'), t('web_space_name_required_desc'));
      return;
    }
    if (nameCleaned.length > 50) {
      toast.error(t('web_space_name_long'), t('web_space_name_long_desc'));
      return;
    }
    if (!id_usuario) return;

    // FREEMIUM CHECK: multi-espaços é Premium
    if (plano_usuario === 'free') {
      trackPaywallHit('multi_space');
      setUpsellReason(t('web_space_premium_only'));
      setShowUpsellModal(true);
      return;
    }

    const newSpace: Espaco = {
      id: 'space_' + Math.random().toString(36).substr(2, 9),
      nome: nameCleaned,
      tipo: spaceType,
      id_usuario: id_usuario
    };

    addEspaco(newSpace);
    setIdEspacoAtivo(newSpace.id);
    setShowAddSpaceModal(false);
    setSpaceName('');
    toast.success(t('web_space_created'), `${nameCleaned} ${t('web_space_created_desc')}`);
  };

  // Add Money to Caixinha — abre o DepositModal (substituição de window.prompt)
  const handleAddMoneyToGoal = (id: string, nome: string, currentSaved: number, target: number) => {
    setDepositGoal({ id, nome, saved: currentSaved, target });
  };

  const handleDepositConfirm = (amount: number) => {
    if (!depositGoal) return;
    const newSaved = addMoney(depositGoal.saved, amount);
    updateCaixinhaSaldo(depositGoal.id, newSaved);
    setDepositGoal(null);
    if (newSaved >= depositGoal.target) {
      toast.success(t('web_jar_goal_achieved'), `${t('web_jar_goal_achieved_desc')} "${depositGoal.nome}".`);
    } else {
      toast.success(t('web_jar_deposit_done'), `${formatCurrency(amount, moeda_base)} ${t('web_jar_deposit_done_desc')} "${depositGoal.nome}".`);
    }
  };

  const handleCaixinhaSaldoChange = (id: string, novoSaldo: number) => {
    updateCaixinhaSaldo(id, novoSaldo);
  };

  // Handle File Statement Import (CSV/OFX/XLSX/PDF) — opens review modal first
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[Import] handleFileImport chamado', e.target.files?.length, 'arquivo(s)');
    const file = e.target.files?.[0];
    if (!file || !importAccountSelect) {
      console.log('[Import] Early return: file=', !!file, 'account=', !!importAccountSelect);
      toast.warning(t('web_import_select_account'), t('web_import_select_account_desc'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileName = file.name.toLowerCase();
    const format: 'csv' | 'ofx' | 'xlsx' | 'pdf' | null = fileName.endsWith('.ofx')
      ? 'ofx'
      : fileName.endsWith('.csv')
      ? 'csv'
      : fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
      ? 'xlsx'
      : fileName.endsWith('.pdf')
      ? 'pdf'
      : null;

    if (!format) {
      toast.error(t('web_import_format_not_supported'), t('web_import_format_not_supported_desc'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImportLoading(true);

    console.log('[Import] Tipo do arquivo:', file.type);
    console.log('[Import] Nome do arquivo:', file.name);
    console.log('[Import] Formato detectado:', format);

    try {
      let parsedTxs: Omit<Transacao, 'id'>[] = [];

      if (format === 'xlsx' || format === 'pdf') {
        const buffer = await file.arrayBuffer();
        console.log('[Import] Buffer do arquivo (bytes):', buffer.byteLength);
        if (format === 'xlsx') {
          parsedTxs = parseXLSX(buffer, importAccountSelect);
        } else {
          parsedTxs = await parsePDF(buffer, importAccountSelect);
        }
      } else {
        const text = await file.text();
        console.log('[Import] Conteúdo textual (primeiros 500 chars):', text.substring(0, 500));
        parsedTxs = format === 'ofx'
          ? parseOFX(text, importAccountSelect)
          : parseCSV(text, importAccountSelect);
      }

      console.log('[Import] Transações extraídas:', parsedTxs.length);

      if (parsedTxs.length === 0) {
        toast.warning(t('web_import_no_transactions'), t('web_import_no_transactions_desc'));
        return;
      }

      const pending: PendingTransaction[] = parsedTxs.map((tx, i) => ({
        ...tx,
        _key: `import_${Date.now()}_${i}`,
      }));
      setImportPending(pending);
      setImportFormat(format);
      setImportReviewOpen(true);
    } catch (err: any) {
      console.error('[Import] Erro ao importar arquivo:', err);
      toast.error(t('web_import_error'), err.message || 'Falha ao processar o arquivo.');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Called when user confirms the reviewed import
  const handleConfirmImport = async (selected: PendingTransaction[]) => {
    if (selected.length === 0) return;
    try {
      await addTransacoesBatch(selected.map(tx => ({
        id_conta: tx.id_conta,
        tipo: tx.tipo,
        valor: tx.valor,
        categoria: tx.categoria,
        data_transacao: tx.data_transacao,
        taxa_cambio_dia: tx.taxa_cambio_dia,
        descricao: tx.descricao,
      })));
      trackImportCompleted(selected.length, importFormat);
      toast.success(
        `${selected.length} ${t('web_import_transactions_imported')}`,
        `${t('web_import_statement_saved')}`
      );
    } catch (err: any) {
      toast.error(t('error_saving'), err.message || 'Falha ao persistir as transações.');
    } finally {
      setImportReviewOpen(false);
      setImportPending([]);
    }
  };

  const handleOpenProfileModal = () => {
    setProfileNameInput(nome_usuario || '');
    setProfileAvatarInput(avatar_url || '');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNameInput.trim()) {
      toast.error(t('web_profile_name_empty'), t('web_profile_name_empty_desc'));
      return;
    }
    
    let finalAvatarUrl = profileAvatarInput;

    if (profileAvatarFile) {
      setIsUploadingAvatar(true);
      try {
        const fileExt = profileAvatarFile.name.split('.').pop();
        const fileName = `${id_usuario}_${Date.now()}.${fileExt}`;
        const filePath = `${id_usuario}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, profileAvatarFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalAvatarUrl = data.publicUrl;
        setProfileAvatarInput(finalAvatarUrl);
      } catch (error) {
        toast.error(t('web_profile_upload_error'), t('web_profile_upload_error_desc'));
        console.error(error);
        setIsUploadingAvatar(false);
        return;
      }
      setIsUploadingAvatar(false);
    }

    setUsuario(id_usuario, email_usuario, profileNameInput.trim(), plano_usuario, moeda_base, finalAvatarUrl);
    
    // Atualizar no Supabase para refletir instantaneamente no Mobile
    if (id_usuario && isSupabaseConfigured) {
      // 1. Atualiza metadados do auth (para persistência de sessão)
      supabase.auth.updateUser({
        data: { avatar_url: finalAvatarUrl, nome: profileNameInput.trim() }
      }).then(({ error }: { error: any }) => {
        if (error) console.error("Error updating user meta:", error);
      });
      // 2. Atualiza a tabela pública 'usuarios' para leitura unificada
      updatePerfil(id_usuario, {
        avatar_url: finalAvatarUrl,
        nome_completo: profileNameInput.trim()
      }).then(({ error }) => {
        if (error) console.error("Error updating usuarios table:", error);
      });
    }

    toast.success(t('web_profile_updated'), t('web_profile_changes_saved'));
    setShowProfileModal(false);
    setProfileAvatarFile(null);
  };

  // Calculate Chart Data (Expense Category Breakdown) — converte para moeda_base
  const expenseData = activeTransactions
    .filter(t => t.tipo === 'despesa')
    .reduce((acc: Record<string, number>, curr) => {
      const conta = activeAccounts.find(c => c.id === curr.id_conta);
      const moedaTx = conta?.moeda_conta || moeda_base;
      const valorEmBase = convertCurrency(curr.valor, moedaTx, moeda_base, rates);
      acc[curr.categoria] = addMoney(acc[curr.categoria] || 0, valorEmBase);
      return acc;
    }, {});

  const chartData = Object.entries(expenseData).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['var(--accent-blue)', 'var(--accent-green)', '#c084fc', '#ff4a5a', '#ffb800', '#64748b'];

  const renderArticleReader = (article: Article, onClose: () => void) => {
    return (
      <Card style={{ maxWidth: '800px', margin: '0 auto', padding: '48px'}} className="fade-in">
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-blue)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            marginBottom: '24px',
            padding: 0,
            fontWeight: 600
          }}
        >
          &larr; Voltar para a lista de artigos
        </button>

        {article.imageUrl && (
          <div style={{ width: '100%', maxHeight: '400px', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px'}}>
            <img src={article.imageUrl} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '16px'}}>
          <span style={{ 
            fontSize: '0.8rem', 
            background: 'rgba(0, 210, 255, 0.1)', 
            color: 'var(--accent-blue)', 
            padding: '6px 12px', 
            borderRadius: '8px', 
            fontWeight: 700 
          }}>
            {article.category.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{article.readTime} de leitura</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(article.publishedAt).toLocaleDateString('pt-BR')}</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 24px 0', color: 'var(--text-primary)', lineHeight: '1.2'}}>{article.title}</h1>
        
        <div style={{ 
          fontSize: '1.05rem', 
          color: 'var(--text-secondary)', 
          lineHeight: '1.8', 
          whiteSpace: 'pre-line',
          textAlign: 'justify'
        }}>
          {article.content}
        </div>
      </Card>
    );
  };

  const renderBlogFeed = (isPublic: boolean) => {
    const filteredTips = selectedCategory === 'Todos'
      ? accumulatedTips
      : accumulatedTips.filter(tip => tip.category === selectedCategory);

    const categories = ['Todos', 'Orçamento', 'Investimentos', 'Negócios', 'Câmbio'];

    return (
      <div>
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          flexWrap: 'wrap', 
          marginBottom: '24px', 
          justifyContent: 'center' 
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? 'var(--accent-blue)' : 'var(--card-border)',
                color: selectedCategory === cat ? '#000' : 'var(--text-secondary)',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Exibindo {filteredTips.length} {filteredTips.length === 1 ? 'artigo' : 'artigos'}
          </span>
          {!isPublic && plano_usuario === 'premium' ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}>
              ✓ Experiência Premium (Sem Anúncios)
            </span>
          ) : (
            (isPublic || plano_usuario === 'free') && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                Exibindo Anúncios (Versão Gratuita)
              </span>
            )
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', marginBottom: '32px', width: '100%'}}>
          {filteredTips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--card-border)', borderRadius: '16px', width: '100%', boxSizing: 'border-box'}}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '12px' }}>
                Nenhum artigo carregado nesta categoria ainda.
              </p>
              <button
                onClick={() => setTipsPage(prev => prev + 1)}
                style={{
                  background: 'var(--accent-blue)',
                  color: '#000',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Buscar Mais Artigos
              </button>
            </div>
          ) : (
            filteredTips.map((article, index) => (
              <React.Fragment key={article.id}>
                <div 
                  className="glass-card"
                  onClick={() => setActiveArticle(article)}
                  style={{
                    display: 'flex',
                    gap: '36px',
                    padding: '36px',
                    cursor: 'pointer',
                    flexWrap: 'wrap',
                    background: 'var(--card-bg)',
                    transition: 'all 0.2s',
                    position: 'relative',
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-blue)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--card-border)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {article.imageUrl && (
                    <div style={{ 
                      width: '180px', 
                      height: '120px', 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      flexShrink: 0 
                    }}>
                      <img 
                        src={article.imageUrl} 
                        alt={article.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '8px'}}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          background: 'rgba(0, 210, 255, 0.1)', 
                          color: 'var(--accent-blue)', 
                          padding: '3px 8px', 
                          borderRadius: '8px', 
                          fontWeight: 700 
                        }}>
                          {article.category.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{article.readTime} de leitura</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(article.publishedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)', letterSpacing: '-0.3px'}}>
                        {article.title}
                      </h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                        {article.excerpt}
                      </p>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '9px', color: 'var(--accent-blue)', fontSize: '0.85rem', fontWeight: 'bold'}}>
                      Ler Artigo Completo <ChevronRight size={14} />
                    </div>
                  </div>
                </div>

                {(isPublic || plano_usuario === 'free') && index === 0 && false && (
                  <div style={{
                    padding: '30px',
                    background: 'linear-gradient(90deg, rgba(255, 184, 0, 0.05) 0%, rgba(255, 74, 90, 0.05) 100%)',
                    borderRadius: '16px',
                    border: '1px dashed rgba(255, 184, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '24px',
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'left'
                  }}>
                    <div>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        background: 'var(--color-warning)', 
                        color: '#000', 
                        padding: '3px 6px', 
                        borderRadius: '4px', 
                        fontWeight: 800, 
                        marginRight: '8px'
                      }}>
                        ANÚNCIO
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Invista com taxa zero na Toro Investimentos</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                        Abra sua conta hoje e ganhe até R$ 100 de bônus em fundos selecionados.
                      </p>
                    </div>
                    <button 
                      onClick={() => window.open('https://toroinvestimentos.com.br', '_blank')}
                      style={{
                        background: 'var(--color-warning)',
                        color: '#000',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: '0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                      onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                    >
                      Saiba Mais
                    </button>
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>

        {filteredTips.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button
              onClick={() => setTipsPage(prev => prev + 1)}
              style={{
                background: 'var(--card-border)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
                padding: '18px 32px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--card-border)'}
            >
              Carregar Mais Artigos
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* 1. SE NÃO LOGADO: LANDING PAGE OU TELA DE ONBOARDING */}
      {!id_usuario ? (
        showLandingPage ? (
          /* LANDING PAGE MODERNA E PREMIUM */
          <div style={{
            background: 'var(--bg-color)',
            color: 'var(--text-primary)',
            fontFamily: 'system-ui, sans-serif',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            width: '100%'
          }}>
            {/* NAVBAR */}
            <nav style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '36px 40px',
              maxWidth: '1200px',
              width: '100%',
              margin: '0 auto',
              boxSizing: 'border-box',
              flexWrap: 'wrap',
              gap: '24px'
            }}>
              <Logo 
                size="xl" 
                onClick={() => { setLandingView('home'); setActiveArticle(null); }} 
              />

              {/* TABS DE NAVEGAÇÃO PÚBLICA */}
              <div className="nav-links" style={{ display: 'flex', gap: '36px', alignItems: 'center'}}>
                <span 
                  onClick={() => { setLandingView('home'); setActiveArticle(null); }}
                  style={{
                    color: landingView === 'home' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseOut={(e) => e.currentTarget.style.color = landingView === 'home' ? 'var(--accent-blue)' : 'var(--text-secondary)'}
                >
                  {t('web_landing_nav_home')}
                </span>
                <span 
                  onClick={() => { setLandingView('costExplorer'); setActiveArticle(null); }}
                  style={{
                    color: landingView === 'costExplorer' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseOut={(e) => e.currentTarget.style.color = landingView === 'costExplorer' ? 'var(--accent-blue)' : 'var(--text-secondary)'}
                >
                  {t('web_cost_living')}
                </span>
                <span 
                  onClick={() => { setLandingView('blog'); setActiveArticle(null); }}
                  style={{
                    color: landingView === 'blog' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseOut={(e) => e.currentTarget.style.color = landingView === 'blog' ? 'var(--accent-blue)' : 'var(--text-secondary)'}
                >
                  {t('web_landing_nav_blog')}
                </span>
              </div>

              {/* LANGUAGE SELECTOR */}
              <LanguageSelector />

              <PrimaryButton 
                onClick={() => setShowLandingPage(false)}
                style={{ padding: '10px 20px', fontSize: '0.9rem', borderRadius: '8px' }}
              >
                {t('web_landing_access_platform')}
              </PrimaryButton>
            </nav>

            {/* VISTA HOME */}
            {landingView === 'home' && (
              <div className="section-padding" style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '90px 40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                flex: 1
              }}>
                {/* HERO SECTION */}
                <h1 style={{
                  fontSize: '3.5rem',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  margin: '0 0 24px 0',
                  background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-green) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  maxWidth: '850px'
                }}>
                  {t('web_landing_hero_title')}
                </h1>
                
                <p style={{
                  fontSize: '1.25rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '650px',
                  lineHeight: 1.6,
                  margin: '0 0 40px 0'
                }}>
                  {t('web_landing_hero_subtitle')}
                </p>

                <div style={{ display: 'flex', gap: '24px', marginBottom: '60px'}}>
                  <PrimaryButton 
                    onClick={() => setShowLandingPage(false)}
                    style={{ padding: '12px 24px', fontSize: '0.9rem', borderRadius: '8px'}}
                  >
                    {t('web_landing_create_free')}
                  </PrimaryButton>
                  <button
                    onClick={() => { loadDemoData(); trackDemoLoaded(); }}
                    style={{
                      background: 'var(--card-border)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)',
                      padding: '12px 24px',
                      fontSize: '0.9rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--card-border)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--card-border)'}
                  >
                    {t('web_landing_test_demo')}
                  </button>
                </div>

                {/* INTERACTIVE FINANCE PREVIEW (MOCKUP CARD) */}
                <div style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '24px',
                  padding: '48px',
                  width: '100%',
                  maxWidth: '900px',
                  textAlign: 'left',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                  marginBottom: '80px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '24px'}}>
                    <div style={{ display: 'flex', gap: '18px'}}>
                      <div className="window-dot-red" style={{ width: '12px', height: '12px', borderRadius: '50%'}}></div>
                      <div className="window-dot-yellow" style={{ width: '12px', height: '12px', borderRadius: '50%'}}></div>
                      <div className="window-dot-green" style={{ width: '12px', height: '12px', borderRadius: '50%'}}></div>
                    </div>
                    <div style={{ display: 'flex', background: 'var(--card-border)', padding: '6px', borderRadius: '10px'}}>
                      <span className="btn-tab-active" style={{ fontSize: '0.8rem', padding: '9px 12px', borderRadius: '6px', fontWeight: 'bold'}}>Minha Vida (PF)</span>
                      <span style={{ fontSize: '0.8rem', padding: '9px 12px', color: 'var(--text-secondary)'}}>Consultoria (PJ)</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px'}}>
                    <div style={{ background: 'var(--card-border)', padding: '24px', borderRadius: '16px', border: '1px solid var(--card-border)'}}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>SALDO CONSOLIDADO</span>
                      <strong style={{ fontSize: '1.4rem' }}>R$ 17.290,00</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', display: 'block', marginTop: '6px' }}>+12.4% este mês</span>
                    </div>
                    <div style={{ background: 'var(--card-border)', padding: '24px', borderRadius: '16px', border: '1px solid var(--card-border)'}}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>CAIXINHA: RESERVA</span>
                      <strong style={{ fontSize: '1.4rem' }}>R$ 4.500,00</strong>
                      <div style={{ height: '6px', background: 'var(--card-border)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden'}}>
                        <div style={{ width: '30%', height: '100%', background: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-green) 100%)' }}></div>
                      </div>
                    </div>
                    <div style={{ background: 'var(--card-border)', padding: '24px', borderRadius: '16px', border: '1px solid var(--card-border)'}}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>WISE USD</span>
                      <strong style={{ fontSize: '1.4rem' }}>$ 350,00</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Eq. R$ 1.890,00</span>
                    </div>
                  </div>
                </div>

                {/* FEATURES GRID */}
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '40px', letterSpacing: '-0.5px' }}>
                  Tudo Que Você Precisa em Um Só Lugar
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '36px',
                  width: '100%',
                  maxWidth: '1050px',
                  marginBottom: '80px'
                }}>
                  <div className="landing-card" style={styles.landingCard}>
                    <div style={styles.landingCardIcon}>💼</div>
                      <h3 style={styles.landingCardTitle}>{t('web_landing_feature_title_pf_pj')}</h3>
                    <p style={styles.landingCardText}>{t('web_landing_feature_desc_pf_pj')}</p>
                  </div>
                  <div className="landing-card" style={styles.landingCard}>
                    <div style={styles.landingCardIcon}>🌍</div>
                    <h3 style={styles.landingCardTitle}>{t('web_landing_feature_title_multicurrency')}</h3>
                    <p style={styles.landingCardText}>{t('web_landing_feature_desc_multicurrency')}</p>
                  </div>
                  <div className="landing-card" style={styles.landingCard}>
                    <div style={styles.landingCardIcon}>🐷</div>
                    <h3 style={styles.landingCardTitle}>{t('web_landing_feature_title_goals')}</h3>
                    <p style={styles.landingCardText}>{t('web_landing_feature_desc_goals')}</p>
                  </div>
                  <div className="landing-card" style={styles.landingCard}>
                    <div style={styles.landingCardIcon}>🧭</div>
                    <h3 style={styles.landingCardTitle}>{t('web_landing_feature_title_explorer')}</h3>
                    <p style={styles.landingCardText}>{t('web_landing_feature_desc_explorer')}</p>
                  </div>
                </div>

                {/* ECONOMIC CALCULATOR SANDBOX (IBGE) */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.05) 0%, rgba(0, 245, 160, 0.05) 100%)',
                  border: '1px solid rgba(0, 210, 255, 0.15)',
                  borderRadius: '24px',
                  padding: '60px',
                  width: '100%',
                  maxWidth: '900px',
                  textAlign: 'left',
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)',
                  marginBottom: '80px',
                  boxSizing: 'border-box'
                }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.5px'}}>
                  {t('web_landing_sandbox_title')}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 24px 0', lineHeight: '1.5'}}>
                    Experimente o recurso premium de inteligência geográfica. Selecione um estado e digite seu gasto estimado para ver a comparação imediata com o salário médio oficial.
                  </p>

                  <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '24px'}}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('web_landing_sandbox_expense')}</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>R$</span>
                        <input 
                          type="number"
                          style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '12px',
                            color: 'var(--text-primary)',
                            padding: '18px 12px 12px 36px',
                            fontSize: '0.95rem',
                            width: '100%',
                            boxSizing: 'border-box'
                          }}
                          value={sandboxExpense}
                          onChange={(e) => setSandboxExpense(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('web_landing_sandbox_region')}</label>
                      <select
                        className="select-input"
                        style={{ 
                          background: 'var(--card-bg)', 
                          borderRadius: '12px', 
                          padding: '18px', 
                          fontSize: '0.95rem',
                          boxSizing: 'border-box'
                        }}
                        value={sandboxState}
                        onChange={(e) => setSandboxState(e.target.value)}
                      >
                        <option value="SP">São Paulo (SP)</option>
                        <option value="RJ">Rio de Janeiro (RJ)</option>
                        <option value="DF">Distrito Federal (DF)</option>
                        <option value="SC">Santa Catarina (SC)</option>
                        <option value="PR">Paraná (PR)</option>
                        <option value="RS">Rio Grande do Sul (RS)</option>
                        <option value="MG">Minas Gerais (MG)</option>
                        <option value="BA">Bahia (BA)</option>
                        <option value="PE">Pernambuco (PE)</option>
                        <option value="CE">Ceará (CE)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--card-border)',
                    padding: '30px',
                    borderRadius: '16px',
                    border: '1px solid var(--card-border)'
                  }}>
                    <div className="rg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px'}}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{t('web_landing_sandbox_avg_salary')}</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>R$ {ESTADO_PROFILES[sandboxState] ? ESTADO_PROFILES[sandboxState].salarioMedio.toLocaleString('pt-BR') : '2400'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{t('web_landing_sandbox_cost')}</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>R$ {ESTADO_PROFILES[sandboxState] ? ESTADO_PROFILES[sandboxState].custoVidaClasseMedia.toLocaleString('pt-BR') : '2900'}</strong>
                      </div>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px', fontSize: '0.9rem' }}>
                      Seu gasto de <strong style={{ color: 'var(--text-primary)' }}>R$ {sandboxExpense.toLocaleString('pt-BR')}</strong> é{' '}
                      <strong className={sandboxExpense - (ESTADO_PROFILES[sandboxState]?.salarioMedio || 2400) > 0 ? 'text-danger-mangos' : 'text-success-mangos'}>
                        {Math.round(((sandboxExpense - (ESTADO_PROFILES[sandboxState]?.salarioMedio || 2400)) / (ESTADO_PROFILES[sandboxState]?.salarioMedio || 2400)) * 100) > 0 
                          ? `+${Math.round(((sandboxExpense - (ESTADO_PROFILES[sandboxState]?.salarioMedio || 2400)) / (ESTADO_PROFILES[sandboxState]?.salarioMedio || 2400)) * 100)}%` 
                          : `${Math.round(((sandboxExpense - (ESTADO_PROFILES[sandboxState]?.salarioMedio || 2400)) / (ESTADO_PROFILES[sandboxState]?.salarioMedio || 2400)) * 100)}%`}{' '}
                      </strong>
                      {sandboxExpense - (ESTADO_PROFILES[sandboxState]?.salarioMedio || 2400) > 0 ? t('web_landing_sandbox_higher') : t('web_landing_sandbox_lower')} {t('web_landing_sandbox_than_salary')}
                    </div>
                  </div>
                </div>

                {/* CALL TO ACTION BOTTOM */}
                <div style={{ margin: '40px 0 60px 0' }}>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.5px' }}>
                    {t('web_landing_cta_title')}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '1.1rem' }}>
                    {t('web_landing_cta_subtitle')}
                  </p>
                  <PrimaryButton 
                    onClick={() => setShowLandingPage(false)}
                    style={{ padding: '24px 36px', fontSize: '1.05rem', borderRadius: '14px'}}
                  >
                    {t('web_landing_create_free')}
                  </PrimaryButton>
                </div>
              </div>
            )}

            {/* VISTA EXPLORADOR DE CUSTO DE VIDA PÚBLICO */}
            {landingView === 'costExplorer' && (
              <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '60px 40px',
                flex: 1,
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.5px'}}>
                    {t('web_cost_title')}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto 24px auto', lineHeight: '1.5'}}>
                    Pesquise dados oficiais de PIB e renda de qualquer município brasileiro no mapa interativo. Simule suas despesas locais personalizando o campo abaixo.
                  </p>
                  
                  {/* Sandbox input for public visitor to set average expense */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '18px', 
                    background: 'var(--card-bg)', 
                    padding: '24px 24px', 
                    borderRadius: '16px',
                    border: '1px solid var(--card-border)',
                    width: 'fit-content',
                    margin: '0 auto 12px auto'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sua Despesa Mensal Estimada:</span>
                    <div style={{ position: 'relative', width: '150px' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>R$</span>
                      <input 
                        type="number"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '12px 8px 8px 30px',
                          fontSize: '0.9rem',
                          width: '100%',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                        value={sandboxExpense}
                        onChange={(e) => setSandboxExpense(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <CostExplorer 
                  planoUsuario="premium" // Completely unlocked for landing page demo!
                  userAverageExpense={sandboxExpense}
                  moedaBase="BRL"
                  onUpgrade={() => setShowLandingPage(false)}
                />
              </div>
            )}

            {/* VISTA BLOG / DICAS E EDUCAÇÃO FINANCEIRA PÚBLICA */}
            {landingView === 'blog' && (
              <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '60px 40px',
                flex: 1,
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {activeArticle ? (
                  renderArticleReader(activeArticle, () => setActiveArticle(null))
                ) : (
                  <>
                    <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                      <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.5px'}}>
                        {t('web_blog_title')}
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto', lineHeight: '1.5'}}>
                        Aprenda a planejar melhor seus orçamentos, investir de forma inteligente e gerenciar as finanças da sua empresa.
                      </p>
                    </div>

                    {renderBlogFeed(true)}
                  </>
                )}
              </div>
            )}

                {/* LEAD CAPTURE */}
                <div style={{
                  margin: '0 0 40px 0',
                  padding: '32px',
                  background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.06), rgba(99, 102, 241, 0.06))',
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 210, 255, 0.15)',
                  textAlign: 'center',
                }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
                    {t('web_lead_title')}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 20px auto' }}>
                    {t('web_lead_subtitle')}
                  </p>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const input = (e.target as HTMLFormElement).querySelector('input[type=email]') as HTMLInputElement;
                      if (input?.value) {
                        try {
                          await fetch(`${SUPABASE_URL}/functions/v1/lead-capture`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: input.value, source: 'landing_page' }),
                          });
                        } catch {}
                        input.value = '';
                        alert(t('web_lead_thanks'));
                      }
                    }}
                    style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}
                  >
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      required
                      style={{
                        padding: '14px 18px', borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                        color: '#fff', fontSize: '0.9rem', width: '280px', outline: 'none',
                      }}
                    />
                    <PrimaryButton type="submit" style={{ padding: '14px 24px', fontSize: '0.9rem' }}>
                      {t('web_lead_submit')}
                    </PrimaryButton>
                  </form>
                </div>

                {/* FOOTER */}
            <footer style={{
              borderTop: '1px solid var(--card-border)',
              padding: '36px 40px',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <a href="#privacidade" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>{t('web_landing_footer_privacy')}</a>
                <a href="#termos" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>{t('web_landing_footer_terms')}</a>
                <a href="#contato" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>{t('web_landing_footer_contact')}</a>
              </div>
              <div>&copy; 2026 {t('web_landing_footer_copyright')}</div>
              <div style={{ marginTop: '8px', fontSize: '0.7rem', opacity: 0.5 }}>
                Desenvolvido por <a href="https://pstec.pavilasantana.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>PSTec</a>
              </div>
            </footer>
          </div>
        ) : (
          /* TELA DE AUTENTICAÇÃO COM LINK DE VOLTAR */
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: '36px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '500px', marginBottom: '20px' }}>
              <button 
                onClick={() => setShowLandingPage(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: 0,
                  fontWeight: 600
                }}
              >
                &larr; {t('web_auth_back_to_login')}
              </button>
              <LanguageSelector className="auth-language-selector" />
            </div>
            <Card style={{ maxWidth: '500px', width: '100%', textAlign: 'left' }} className="fade-in">
            <div style={{ marginBottom: '24px' }}>
              <Logo size="lg" />
            </div>

            {isSupabaseConfigured ? (
              <div>
              {isSettingNewPassword ? (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '8px' }}>{t('web_auth_new_password_title')}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('web_auth_new_password_desc')}</p>
                </div>
              ) : isRecoveryMode ? (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '8px' }}>{t('web_auth_recovery_title')}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('web_auth_recovery_desc')}</p>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--card-border)',
                  marginBottom: '20px',
                  gap: '24px'
                }}>
                  <button
                    onClick={() => { setIsLoginMode(false); setAuthEmail(''); setAuthPassword(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: !isLoginMode ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      padding: '12px 4px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderBottom: !isLoginMode ? '2px solid var(--accent-blue)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t('signup')}
                  </button>
                  <button
                    onClick={() => { setIsLoginMode(true); setAuthEmail(''); setAuthPassword(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isLoginMode ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      padding: '12px 4px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderBottom: isLoginMode ? '2px solid var(--accent-blue)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t('already_have_account')}
                  </button>
                </div>
              )}

              {isSettingNewPassword ? (
                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      {t('new_password')}
                    </label>
                    <TextInput 
                      type="password"
                      placeholder={t('password_min_placeholder')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px'}}>
                    <PrimaryButton type="submit" style={{ width: '100%' }} disabled={isAuthLoading}>
                      {isAuthLoading ? t('web_auth_saving') : t('web_auth_save_password')}
                    </PrimaryButton>
                  </div>
                </form>
              ) : isRecoveryMode ? (
                <form onSubmit={handleRecoverySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      {t('email')}
                    </label>
                    <TextInput 
                      type="email"
                      placeholder="seu@email.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px'}}>
                    <PrimaryButton type="submit" style={{ width: '100%' }} disabled={isAuthLoading}>
                      {isAuthLoading ? t('web_auth_saving') : t('send')}
                    </PrimaryButton>
                    <button 
                      type="button" 
                      onClick={() => setIsRecoveryMode(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', marginTop: '8px' }}
                    >
                      Voltar para o Login
                    </button>
                  </div>
                </form>
              ) : isLoginMode ? (
                  /* LOGIN FORM */
                  <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                        {t('email')}
                      </label>
                      <TextInput 
                        type="email"
                        placeholder="seu@email.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                        {t('password')}
                      </label>
                      <TextInput 
                        type="password"
                        placeholder={t('password_min_placeholder')}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <input 
                          type="checkbox" 
                          id="lembrar_credenciais_login" 
                          checked={lembrarCredenciais}
                          onChange={(e) => setLembrarCredenciais(e.target.checked)}
                          style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="lembrar_credenciais_login" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          {t('web_auth_remember')}
                        </label>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsRecoveryMode(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        {t('forgot_password')}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px'}}>
                      <PrimaryButton type="submit" style={{ width: '100%' }} disabled={isAuthLoading || authLoading}>
                        {isAuthLoading ? t('web_auth_accessing') : t('web_auth_access_account')} <ChevronRight size={18} />
                      </PrimaryButton>

                      <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
                        <span style={{ margin: '0 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('web_auth_or_continue')}</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => signInWithProvider('google')}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            <path d="M1 1h22v22H1z" fill="none"/>
                          </svg>
                          Google
                        </button>
                        <button
                          type="button"
                          onClick={() => signInWithProvider('azure')}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 0H0v10h10V0z" fill="#f25022"/>
                            <path d="M21 0H11v10h10V0z" fill="#7fba00"/>
                            <path d="M10 11H0v10h10V11z" fill="#00a4ef"/>
                            <path d="M21 11H11v10h10V11z" fill="#ffb900"/>
                          </svg>
                          Microsoft
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* SIGNUP / ONBOARDING FORM */
                  <form onSubmit={handleOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        {t('web_auth_name_question')}
                      </label>
                      <TextInput 
                        placeholder="Ex: Rodrigo Silva"
                        value={onboardName}
                        onChange={(e) => setOnboardName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        {t('email')}
                      </label>
                      <TextInput 
                        type="email"
                        placeholder="seu@email.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        {t('password')}
                      </label>
                      <TextInput 
                        type="password"
                        placeholder={t('password_min_placeholder')}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        {t('web_auth_net_income')} ({onboardCurrency})?
                      </label>
                      <TextInput 
                        type="number"
                        placeholder="Ex: 5000"
                        value={onboardIncome}
                        onChange={(e) => setOnboardIncome(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        {t('web_auth_base_currency')}
                      </label>
                      <select 
                        className="select-input" 
                        value={onboardCurrency}
                        onChange={(e) => setOnboardCurrency(e.target.value)}
                      >
                        <option value="BRL">Real Brasileiro (BRL)</option>
                        <option value="USD">Dólar Americano (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="ARS">Peso Argentino (ARS)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px'}}>
                      <input 
                        type="checkbox" 
                        id="lembrar_credenciais_signup" 
                        checked={lembrarCredenciais}
                        onChange={(e) => setLembrarCredenciais(e.target.checked)}
                        style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="lembrar_credenciais_signup" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        {t('web_auth_remember_credentials')}
                      </label>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px'}}>
                      <PrimaryButton type="submit" style={{ width: '100%' }} disabled={isAuthLoading || authLoading}>
                        {isAuthLoading ? t('web_auth_creating') : t('web_auth_create_start')} <ChevronRight size={18} />
                      </PrimaryButton>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* OFFLINE / LOCAL ONBOARDING FORM */
              <form onSubmit={handleOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '30px'}}>
                <div style={{
                  background: 'rgba(255, 184, 0, 0.1)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  padding: '18px',
                  borderRadius: '12px',
                  color: '#ffb800',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Sparkles size={16} /> {t('web_auth_demo_mode')}
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    {t('web_auth_name_question')}
                  </label>
                  <TextInput 
                    placeholder="Ex: Rodrigo Silva"
                    value={onboardName}
                    onChange={(e) => setOnboardName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    {t('web_auth_net_income')} (BRL)?
                  </label>
                  <TextInput 
                    type="number"
                    placeholder="Ex: 5000"
                    value={onboardIncome}
                    onChange={(e) => setOnboardIncome(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    {t('web_auth_base_currency')}
                  </label>
                  <select 
                    className="select-input" 
                    value={onboardCurrency}
                    onChange={(e) => setOnboardCurrency(e.target.value)}
                  >
                    <option value="BRL">Real Brasileiro (BRL)</option>
                    <option value="USD">Dólar Americano (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="ARS">Peso Argentino (ARS)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px'}}>
                  <PrimaryButton type="submit" style={{ width: '100%' }}>
                    {t('web_auth_start_local')} <ChevronRight size={18} />
                  </PrimaryButton>
                </div>
              </form>
            )}

            {/* DEMO DATA BUTTON - ALWAYS AVAILABLE */}
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
              <button 
                type="button" 
                onClick={() => { loadDemoData(); trackDemoLoaded(); }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-secondary)',
                  padding: '18px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: '0.2s',
                  width: '100%'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--card-border)'}
              >
                <Sparkles size={16} /> {t('web_auth_enter_demo')}
              </button>
            </div>
          </Card>
        </div>
      )
    ) : (
        /* 2. DASHBOARD PRINCIPAL */
        <div className="dashboard-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px'}}>
          
          {/* HEADER */}
          <header className="app-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px'}}>
              <div 
                onClick={handleOpenProfileModal}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-green) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title="Editar Perfil"
              >
                {avatar_url ? (
                  avatar_url.startsWith('http') ? (
                    <img src={avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '22px' }}>{avatar_url}</span>
                  )
                ) : (
                  <span className="text-dark-mangos" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {(nome_usuario || 'M').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <Logo size="md" withLeaf />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px'}}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Olá, {nome_usuario}</span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    background: plano_usuario === 'premium' ? 'var(--accent-green-glow)' : 'var(--card-border)', 
                    color: plano_usuario === 'premium' ? 'var(--accent-green)' : 'var(--text-secondary)',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontWeight: 700
                  }}>
                    {plano_usuario.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* CONTROLES / INTERRUPTOR DE WORKSPACE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px'}}>
              <div style={{ display: 'flex', background: 'var(--card-bg)', padding: '6px', borderRadius: '12px'}}>
                {espacos.map(space => (
                  <button
                    key={space.id}
                    onClick={() => handleSwitchSpace(space.id)}
                    style={{
                      background: id_espaco_ativo === space.id ? 'var(--accent-blue)' : 'transparent',
                      color: id_espaco_ativo === space.id ? '#000' : 'var(--text-secondary)',
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px'
                    }}
                  >
                    {space.tipo === 'PF' ? <User size={14} /> : <Briefcase size={14} />}
                    {space.nome}
                  </button>
                ))}
                
                <button
                  onClick={() => setShowAddSpaceModal(true)}
                  style={{
                    background: 'transparent',
                    color: 'var(--accent-blue)',
                    border: 'none',
                    padding: '12px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '1.1rem'
                  }}
                  title="Criar novo espaço"
                >
                  +
                </button>
              </div>

              {/* SELETOR DE MOEDA BASE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px'}}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Visualizar em:</span>
                <select 
                  className="select-input" 
                  style={{ padding: '9px 12px', width: 'auto', borderRadius: '10px'}}
                  value={moeda_base}
                  onChange={(e) => setMoedaBase(e.target.value)}
                >
                  <option value="BRL">BRL (R$)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="CHF">CHF (CHF)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="CNY">CNY (¥)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="ARS">ARS ($)</option>
                </select>
              </div>

              {/* SELETOR DE IDIOMA */}
              <LanguageSelector />

              {/* MODO PRIVACIDADE (Phase 4.1) */}
              <button
                onClick={() => setPrivacyMode(p => !p)}
                style={{
                  background: privacyMode ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255,255,255,0.04)',
                  color: privacyMode ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: privacyMode ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid var(--card-border)',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
                title={privacyMode ? 'Exibir valores' : 'Ocultar valores'}
              >
                {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>

              {/* FAQ (Phase 1) */}
              <button
                onClick={() => setShowFAQModal(true)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--card-border)',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
                title="Ajuda & FAQ"
              >
                <HelpCircle size={16} />
              </button>

              {/* TERMOS LGPD (Phase 1) */}
              <button
                onClick={() => setShowTermosModal(true)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--card-border)',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
                title="Privacidade & LGPD"
              >
                <Shield size={16} />
              </button>

              {/* RESET DE DADOS */}
              <button 
                onClick={handleLogout} 
                style={{ 
                  background: 'rgba(255, 74, 90, 0.1)', 
                  color: 'var(--color-danger)', 
                  border: 'none', 
                  padding: '12px 12px', 
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px'
                }}
                title="Sair / Resetar"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>


          {/* TAB NAVIGATION */}
          <div className="tab-nav" style={{ 
            display: 'flex', 
            gap: '18px', 
            marginBottom: '24px', 
            background: 'var(--card-bg)', 
            padding: '9px', 
            borderRadius: '16px', 
            border: '1px solid var(--card-border)',
            width: 'fit-content'
          }}>
            <button
              onClick={() => setActiveView('dashboard')}
              className={activeView === 'dashboard' ? 'btn-tab-active' : 'btn-tab-inactive'}
              style={{
                fontWeight: 700,
                border: 'none',
                padding: '15px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.9rem'
              }}
            >
              <Wallet size={16} />
              {t('web_dashboard_panel')}
            </button>
            <button
              onClick={() => setActiveView('costExplorer')}
              className={activeView === 'costExplorer' ? 'btn-tab-active' : 'btn-tab-inactive'}
              style={{
                fontWeight: 700,
                border: 'none',
                padding: '15px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.9rem'
              }}
            >
              <MapPin size={16} />
              {t('web_cost_title')}
            </button>
            <button
              onClick={() => { setActiveView('blog'); setActiveArticle(null); }}
              className={activeView === 'blog' ? 'btn-tab-active' : 'btn-tab-inactive'}
              style={{
                fontWeight: 700,
                border: 'none',
                padding: '15px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.9rem'
              }}
            >
              <BookOpen size={16} />
              {t('web_dashboard_blog')}
            </button>
            <button
              onClick={() => setActiveView('investimentos')}
              className={activeView === 'investimentos' ? 'btn-tab-active' : 'btn-tab-inactive'}
              style={{
                fontWeight: 700,
                border: 'none',
                padding: '15px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.9rem'
              }}
            >
              <TrendingUp size={16} />
              {t('web_dashboard_investments')}
            </button>
            {activeSpace?.tipo === 'PJ' && (
            <button
              onClick={() => setActiveView('fluxopj')}
              className={activeView === 'fluxopj' ? 'btn-tab-active' : 'btn-tab-inactive'}
              style={{
                fontWeight: 700,
                border: 'none',
                padding: '15px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.9rem'
              }}
            >
              <Briefcase size={16} />
              {t('web_dashboard_fluxopj')}
            </button>
            )}
            <button
              onClick={() => setActiveView('inventario')}
              className={activeView === 'inventario' ? 'btn-tab-active' : 'btn-tab-inactive'}
              style={{
                fontWeight: 700,
                border: 'none',
                padding: '15px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.9rem'
              }}
            >
              <PiggyBank size={16} />
              {t('web_dashboard_inventory')}
            </button>
            <button
              onClick={() => setActiveView('calendario')}
              className={activeView === 'calendario' ? 'btn-tab-active' : 'btn-tab-inactive'}
              style={{
                fontWeight: 700,
                border: 'none',
                padding: '15px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.9rem'
              }}
            >
              <CalendarDays size={16} />
              {t('web_dashboard_calendar')}
            </button>
          </div>

          {activeView === 'dashboard' && (
            <>
              {/* MAIN PANELS GRID */}
              <div className="rg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px', marginBottom: '24px'}}>
            {/* LEFT: SALDO E ESPAÇO INFO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px'}}>
              
              {/* SALDO TOTAL CARD */}
              <Card className="card-mangos text-white-mangos" style={{ position: 'relative', overflow: 'hidden', border: 'none' }}>
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  filter: 'blur(40px)',
                  pointerEvents: 'none'
                }} className="bg-accent-glow-mangos"></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="text-gray-mangos" style={{ fontSize: '0.85rem' }}>
                    {t('web_dashboard_balance_title')} ({activeSpace?.nome})
                  </span>
                  {plano_usuario === 'premium' ? (
                    <span className="text-accent-mangos" style={{ 
                      fontSize: '0.7rem', 
                      background: 'rgba(0, 210, 255, 0.1)', 
                      padding: '3px 8px', 
                      borderRadius: '8px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      fontWeight: 600
                    }}>
                      <Globe size={12} className={isFetchingRates ? 'spin' : ''} /> AwesomeAPI Live
                    </span>
                  ) : (
                    <span className="text-white-mangos" style={{ 
                      fontSize: '0.7rem', 
                      background: 'rgba(255, 255, 255, 0.2)', 
                      padding: '3px 8px', 
                      borderRadius: '8px',
                      fontWeight: 500
                    }}>
                      {t('web_dashboard_static_rates')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px'}}>
                  <h2 className="text-white-mangos" style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-1px', transition: 'filter 0.3s', filter: privacyMode ? 'blur(8px)' : 'none' }}>
                    {formatCurrency(totalBalance, moeda_base)}
                  </h2>
                  {totalBalance < 0 && !privacyMode && (
                    <span className="badge-danger-mangos" style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>
                      ⚠ {t('web_dashboard_negative')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '24px', marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '16px'}}>
                  <div className="text-success-mangos" style={{ display: 'flex', alignItems: 'center', gap: '9px'}}>
                    <TrendingUp size={16} />
                    <span style={{ fontSize: '0.85rem', filter: privacyMode ? 'blur(6px)' : 'none', transition: 'filter 0.3s' }}>
                      {t('web_dashboard_receitas')}: {formatCurrency(
                        activeTransactions.filter(t => t.tipo === 'receita').reduce((sum, t) => {
                          const conta = activeAccounts.find(c => c.id === t.id_conta);
                          const moedaTx = conta?.moeda_conta || moeda_base;
                          return sum + convertCurrency(t.valor, moedaTx, moeda_base, rates);
                        }, 0),
                        moeda_base
                      )}
                    </span>
                  </div>
                  <div className="text-danger-mangos" style={{ display: 'flex', alignItems: 'center', gap: '9px'}}>
                    <TrendingDown size={16} />
                    <span style={{ fontSize: '0.85rem', filter: privacyMode ? 'blur(6px)' : 'none', transition: 'filter 0.3s' }}>
                      {t('web_dashboard_despesas')}: {formatCurrency(
                        activeTransactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => {
                          const conta = activeAccounts.find(c => c.id === t.id_conta);
                          const moedaTx = conta?.moeda_conta || moeda_base;
                          return sum + convertCurrency(t.valor, moedaTx, moeda_base, rates);
                        }, 0),
                        moeda_base
                      )}
                    </span>
                  </div>
                </div>
              </Card>

              {/* REGRA 50/30/20 CARD (Phase 4) */}
              {regra502030 && (
                <Card>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', marginBottom: '16px' }}>
                    <TrendingUp size={18} color="var(--accent-green)" />
                    {t('web_dashboard_health_title')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Necessidades (50%)', target: regra502030.necessidades, color: 'var(--accent-blue)', icon: '🏠' },
                      { label: 'Desejos (30%)', target: regra502030.desejos, color: 'var(--color-warning)', icon: '🎉' },
                      { label: 'Investimentos (20%)', target: regra502030.investimentos, color: 'var(--accent-green)', icon: '📈' }
                    ].map((item) => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{item.icon} {item.label}</span>
                          <span style={{ color: item.color, fontWeight: 700, filter: privacyMode ? 'blur(5px)' : 'none', transition: 'filter 0.3s' }}>
                            {formatCurrency(item.target, moeda_base)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: '8px', padding: '12px', background: 'var(--card-border)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('web_dashboard_budget_spent')}</span>
                        <span className={
                          regra502030.pctGasto > 80 ? 'text-danger-mangos' : regra502030.pctGasto > 60 ? 'text-warning-mangos' : 'text-success-mangos'
                        } style={{
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}>
                          {regra502030.pctGasto}%
                        </span>
                      </div>
                      <div className="progress-track-mangos" style={{ width: '100%', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          className={
                            regra502030.pctGasto > 80
                              ? 'bg-danger-mangos'
                              : regra502030.pctGasto > 60
                                ? 'bg-warning-mangos'
                                : 'bg-success-mangos'
                          } 
                          style={{
                            width: `${regra502030.pctGasto}%`,
                            height: '100%',
                            transition: 'width 0.6s ease'
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* CONTAS BANCÁRIAS CARD */}

              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem'}}>
                    <Wallet size={18} color="var(--accent-blue)" />
                    {t('web_dashboard_accounts_title')}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>
                      ({t('web_dashboard_drag_hint')})
                    </span>
                  </h3>
                  <button 
                    onClick={() => setShowAddAccountModal(true)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {t('web_dashboard_new_account')}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px'}}>
                  {activeAccounts.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '36px 16px', 
                      border: '1px dashed var(--card-border)', 
                      borderRadius: '16px',
                      background: 'var(--card-border)'
                    }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                        {t('no_accounts_in_space')}
                      </p>
                      <button 
                        onClick={() => setShowAddAccountModal(true)}
                        style={{
                          background: 'rgba(0, 210, 255, 0.1)',
                          color: 'var(--accent-blue)',
                          border: '1px solid rgba(0, 210, 255, 0.3)',
                          padding: '9px 16px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 210, 255, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 210, 255, 0.1)'}
                      >
                        {t('web_dashboard_add_first_account')}
                      </button>
                    </div>
                  ) : (
                    activeAccounts.map(conta => {
                      // Calcula saldo líquido da conta específica
                      let bal = conta.saldo_inicial;
                      // BUG FIX: usa subtractMoney (Currency.js) em vez de operador nativo
                      transacoes.filter(t => t.id_conta === conta.id).forEach(t => {
                        bal = t.tipo === 'receita' ? addMoney(bal, t.valor) : subtractMoney(bal, t.valor);
                      });
                      const isDragOver = dragOverContaId === conta.id;
                      
                      return (
                        <div key={conta.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            setDragOverContaId(conta.id);
                          }}
                          onDragLeave={() => {
                            setDragOverContaId(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverContaId(null);
                            const txId = e.dataTransfer.getData('text/plain');
                            if (txId) {
                              handleMoveTransacao(txId, conta.id);
                            }
                          }}
                          style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '18px',
                          background: isDragOver ? 'rgba(0, 229, 255, 0.12)' : 'var(--card-border)',
                          borderRadius: '12px',
                          borderLeft: isDragOver ? '4px solid var(--accent-green)' : '4px solid var(--accent-blue)',
                          outline: isDragOver ? '2px dashed var(--accent-green)' : 'none',
                          cursor: 'default',
                          transition: 'all 0.2s',
                        }}>
                          <div>
                            <span style={{ fontWeight: 600, display: 'block' }}>{conta.nome_instituicao}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('web_dashboard_native_currency')} {conta.moeda_conta}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 700 }}>
                              {formatCurrency(bal, conta.moeda_conta)}
                            </span>
                            <button 
                              onClick={() => {
                                if (window.confirm(`${t('web_dashboard_confirm_delete_account')} ${conta.nome_instituicao}?`)) {
                                  removeConta(conta.id);
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              title="Excluir Conta"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* CREDIT CARDS CARD */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem'}}>
                    <CreditCard size={18} color="var(--accent-blue)" />
                    {t('web_dashboard_cards_title')}
                  </h3>
                  <button 
                    onClick={() => setShowAddCardModal(true)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {t('web_dashboard_new_card')}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px'}}>
                  {activeCartoes.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '36px 16px', 
                      border: '1px dashed var(--card-border)', 
                      borderRadius: '16px',
                      background: 'var(--card-border)'
                    }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                        {t('no_cards')}
                      </p>
                      <button 
                        onClick={() => setShowAddCardModal(true)}
                        style={{
                          background: 'rgba(0, 210, 255, 0.1)',
                          color: 'var(--accent-blue)',
                          border: '1px solid rgba(0, 210, 255, 0.3)',
                          padding: '9px 16px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 210, 255, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 210, 255, 0.1)'}
                      >
                        {t('web_dashboard_add_first_card')}
                      </button>
                    </div>
                  ) : (
                    activeCartoes.map(card => {
                      return (
                        <div key={card.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '18px',
                          background: 'var(--card-border)',
                          borderRadius: '12px',
                          borderLeft: '4px solid var(--accent-blue)'
                        }}>
                          <div>
                            <span style={{ fontWeight: 600, display: 'block' }}>{card.nome}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {t('web_dashboard_invoice')} <span style={{ filter: privacyMode ? 'blur(5px)' : 'none' }}>{formatCurrency(card.fatura_atual, moeda_base)}</span> / {t('web_dashboard_limit')} <span style={{ filter: privacyMode ? 'blur(5px)' : 'none' }}>{formatCurrency(card.limite, moeda_base)}</span>
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button 
                              onClick={() => {
                                setCardToEdit(card);
                                setShowAddCardModal(true);
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              title="Editar Cartão"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm(`${t('web_dashboard_confirm_delete_card')} ${card.nome}?`)) {
                                  handleCardDelete(card.id);
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              title="Excluir Cartão"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* CAIXINHAS / METAS CARD */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem'}}>
                    <PiggyBank size={18} color="var(--accent-green)" />
                    {t('web_dashboard_jars_title')}
                  </h3>
                  <button 
                    onClick={() => setShowAddCaixinhaModal(true)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-green)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {t('web_dashboard_new_jar')}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
                  {activeCaixinhas.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma caixinha cadastrada.</p>
                  ) : (
                    activeCaixinhas.map(goal => {
                      const pct = Math.min(Math.round((goal.saldo_guardado / goal.valor_alvo) * 100), 100);
                      return (
                        <div key={goal.id} style={{
                          padding: '21px',
                          background: 'var(--card-border)',
                          borderRadius: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600 }}>{goal.nome}</span>
                            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{pct}%</span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div style={{ width: '100%', height: '8px', background: 'var(--card-border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px'}}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-green)', boxShadow: '0 0 10px rgba(0, 245, 160, 0.5)' }}></div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {formatCurrency(goal.saldo_guardado, moeda_base)} guardados de {formatCurrency(goal.valor_alvo, moeda_base)}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleAddMoneyToGoal(goal.id, goal.nome, goal.saldo_guardado, goal.valor_alvo)}
                                style={{
                                  background: 'rgba(0, 245, 160, 0.1)',
                                  border: 'none',
                                  color: 'var(--accent-green)',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  fontWeight: 700
                                }}
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setShowCaixinhaHistorico(goal)}
                                style={{
                                  background: 'rgba(0, 229, 255, 0.1)',
                                  border: 'none',
                                  color: 'var(--accent-blue)',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  fontWeight: 700
                                }}
                              >
                                Extrato
                              </button>
                              <button
                                onClick={() => handleEditCaixinhaClick(goal)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Editar Caixinha"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Tem certeza que deseja excluir a caixinha ${goal.nome}?`)) {
                                    removeCaixinha(goal.id);
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Excluir Caixinha"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

            </div>

            {/* AdBanner for Free Users */}
            <AdBanner adSlot="sidebar_dashboard" />

            {/* RIGHT: GRÁFICOS E TRANSAÇÕES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px'}}>
              
              {/* RECHARTS PIE CHART (Expense breakdown) */}
              <Card style={{ display: 'flex', flexDirection: 'column', height: '315px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Divisão de Despesas por Categoria</h3>
                
                {chartData.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Cadastre despesas para gerar o gráfico.
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', height: '100%' }}>
                    <div style={{ width: '50%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                             {chartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => formatCurrency(value as number, moeda_base)}
                            contentStyle={{ background: 'var(--card-color)', border: '1px solid rgba(255, 255, 255, 0.07)', color: 'var(--text-white)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px', overflowY: 'auto'}}>
                      {chartData.map((item, _idx) => (
                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem'}}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'COLORS[idx % COLORS.length]'}}></div>
                          <span style={{ color: 'var(--text-secondary)' }}>{item.name}:</span>
                          <span style={{ fontWeight: 700 }}>{formatCurrency(item.value, moeda_base)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* TRANSACTIONS LIST CARD */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem'}}>
                    <CreditCard size={18} color="var(--accent-blue)" />
                    Fluxo de Caixa / Transações
                  </h3>
                </div>

                {/* CSV/OFX IMPORTER CARD */}
                <div style={{
                  padding: '24px',
                  background: 'rgba(0, 210, 255, 0.03)',
                  borderRadius: '12px',
                  border: '1px dashed rgba(0, 210, 255, 0.2)',
                  marginBottom: '16px'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--accent-blue)' }}>
                    Importador de Extrato Bancário (CSV/OFX)
                  </span>
                  
                  <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <select 
                      className="select-input"
                      style={{ flex: 1, padding: '12px', minWidth: '150px', fontSize: '0.85rem', borderRadius: '8px'}}
                      value={importAccountSelect}
                      onChange={(e) => setImportAccountSelect(e.target.value)}
                    >
                      <option value="">Selecione a Conta de Destino</option>
                      {activeAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.nome_instituicao} ({a.moeda_conta})</option>
                      ))}
                    </select>

                    <button
                      disabled={!importAccountSelect || importLoading}
                      onClick={() => {
                        if (verificarAcessoImportacao()) {
                          fileInputRef.current?.click();
                        }
                      }}
                      style={{
                        background: importAccountSelect ? 'rgba(0, 210, 255, 0.1)' : 'var(--card-border)',
                        color: importAccountSelect ? 'var(--accent-blue)' : 'var(--text-muted)',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        cursor: importAccountSelect && !importLoading ? 'pointer' : 'not-allowed',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        opacity: importLoading ? 0.6 : 1,
                      }}
                    >
                      {importLoading ? (
                        <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      ) : (
                        <Upload size={14} />
                      )}
                      {importLoading ? 'Processando...' : 'Selecionar Extrato'}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      accept=".csv,.ofx,.xlsx,.xls,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      onChange={handleFileImport}
                    />
                  </div>
                </div>

                {/* FECHAMENTO MENSAL ACTION */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    onClick={() => setShowFechamentoMensal(true)}
                    style={{
                      flex: 1, padding: '10px 14px',
                      background: 'rgba(255,180,0,0.08)',
                      border: '1px solid rgba(255,180,0,0.2)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: '#FFB400',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s',
                    }}
                  >
                    <CalendarDays size={15} /> Fechamento Mensal
                  </button>
                </div>

                {activeTransactions.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <button
                      onClick={toggleAllTxSelection}
                      style={{
                        background: selectedTxIds.size === activeTransactions.length && activeTransactions.length > 0 ? 'rgba(0,210,255,0.15)' : 'var(--card-bg)',
                        border: `1px solid ${selectedTxIds.size === activeTransactions.length && activeTransactions.length > 0 ? 'rgba(0,210,255,0.4)' : 'var(--card-border)'}`,
                        borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)',
                      }}
                      title={selectedTxIds.size === activeTransactions.length ? 'Desmarcar todas' : 'Selecionar todas'}
                    >
                      {selectedTxIds.size === activeTransactions.length && activeTransactions.length > 0
                        ? <CheckSquare size={16} color="var(--accent-cyan)" />
                        : <Square size={16} />}
                    </button>
                    {selectedTxIds.size > 0 && (
                      <>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {selectedTxIds.size} selecionada(s)
                        </span>
                        <button
                          onClick={handleBulkDelete}
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                            color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.78rem',
                            display: 'flex', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <Trash2 size={13} /> Excluir ({selectedTxIds.size})
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '300px', overflowY: 'auto'}}>
                  {activeTransactions.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '36px 16px', 
                      border: '1px dashed var(--card-border)', 
                      borderRadius: '12px',
                      background: 'var(--card-border)'
                    }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                        Nenhuma transação registrada neste espaço.
                      </p>
                      <button 
                        onClick={openAddTransactionModal}
                        style={{
                          background: 'rgba(0, 245, 160, 0.1)',
                          color: 'var(--accent-green)',
                          border: '1px solid rgba(0, 245, 160, 0.3)',
                          padding: '9px 16px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 245, 160, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 245, 160, 0.1)'}
                      >
                        + Registrar Minha Primeira Transação
                      </button>
                    </div>
                  ) : (
                    activeTransactions.map(tx => {
                      const conta = contas.find(c => c.id === tx.id_conta);
                      const isEditing = editingTxId === tx.id;
                      const isDragging = dragTxId === tx.id;
                      return (
                        <div key={tx.id}
                          draggable={!isEditing}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', tx.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDragTxId(tx.id);
                          }}
                          onDragEnd={() => {
                            setDragTxId(null);
                            setDragOverContaId(null);
                          }}
                          style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          padding: '16px 18px',
                          background: isEditing ? 'rgba(0, 229, 255, 0.04)' : 'var(--card-border)',
                          borderRadius: '12px',
                          borderLeft: tx.tipo === 'receita' ? '3px solid var(--accent-green)' : '3px solid var(--color-danger)',
                          border: isEditing ? '1px solid rgba(0, 229, 255, 0.3)' : undefined,
                          opacity: isDragging ? 0.5 : 1,
                          cursor: isEditing ? 'default' : 'grab',
                          transition: 'all 0.2s',
                          userSelect: 'none',
                        }}>
                          {isEditing ? (
                            /* Modo Edição Inline */
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <input
                                className="input-text"
                                style={{ flex: 2, minWidth: '120px', fontSize: '0.9rem', padding: '8px 10px' }}
                                value={editTxDescricao}
                                onChange={e => setEditTxDescricao(e.target.value)}
                                placeholder="Descrição"
                              />
                              <input
                                className="input-text"
                                type="number"
                                style={{ flex: 1, minWidth: '90px', fontSize: '0.9rem', padding: '8px 10px' }}
                                value={editTxValor}
                                onChange={e => setEditTxValor(e.target.value)}
                                placeholder="Valor"
                              />
                              <input
                                className="input-text"
                                type="date"
                                style={{ flex: 1, minWidth: '110px', fontSize: '0.9rem', padding: '8px 10px' }}
                                value={editTxData}
                                onChange={e => setEditTxData(e.target.value)}
                              />
                              <button
                                onClick={() => handleSaveEditTx(tx.id)}
                                className="btn-action-success-mangos"
                                style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px' }}
                                title="Salvar"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingTxId(null)}
                                className="btn-action-danger-mangos"
                                style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px' }}
                                title="Cancelar"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            /* Modo Visualização */
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleTxSelection(tx.id); }}
                                style={{
                                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0,
                                }}
                                title={selectedTxIds.has(tx.id) ? 'Desmarcar' : 'Selecionar'}
                              >
                                {selectedTxIds.has(tx.id)
                                  ? <CheckSquare size={15} color="var(--accent-cyan)" />
                                  : <Square size={15} color="var(--text-muted)" />}
                              </button>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                              <div>
                                <span style={{ fontWeight: 600, display: 'block' }}>{tx.descricao}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {tx.data_transacao} • {tx.categoria} ({conta?.nome_instituicao})
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{
                                  fontWeight: 700,
                                  color: tx.tipo === 'receita' ? 'var(--accent-green)' : 'var(--color-danger)',
                                  filter: privacyMode ? 'blur(6px)' : 'none',
                                  transition: 'filter 0.3s'
                                }}>
                                  {tx.tipo === 'receita' ? '+' : '-'} {formatCurrency(tx.valor, conta?.moeda_conta || moeda_base)}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingTxId(tx.id);
                                    setEditTxDescricao(tx.descricao ?? '');
                                    setEditTxValor(tx.valor.toString());
                                    setEditTxData(tx.data_transacao);
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                  title="Editar Transação"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
                                      handleDeleteTransacao(tx.id);
                                    }
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                  title="Excluir Transação"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                </div>
              </Card>

            </div>
          </div>

          {/* SIMULAÇÃO DO PLANO PREMIUM UPSELL (Abaixo no Dashboard) */}
          <Card style={{ 
            background: plano_usuario === 'free' ? 'linear-gradient(135deg, rgba(0, 210, 255, 0.05) 0%, rgba(192, 132, 252, 0.05) 100%)' : 'var(--card-bg)',
            border: plano_usuario === 'free' ? '1px solid rgba(0, 210, 255, 0.2)' : '1px solid var(--card-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px'
          }}>
            <div>
              <h4 className={plano_usuario === 'premium' ? 'text-success-mangos' : 'text-accent-mangos'} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem' }}>
                <Sparkles size={16} /> 
                {plano_usuario === 'premium' ? 'Você é um Assinante Premium!' : 'Libere o Potencial Completo do Com Réis'}
              </h4>
              <p className="text-gray-mangos" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                {plano_usuario === 'premium' 
                  ? 'Você tem acesso ilimitado a multiespaços PF/PJ, caixinhas ilimitadas, cotações ao vivo e inteligência geográfica.'
                  : 'Assine o Plano Premium para ter acesso ilimitado a multi-espaços PF/PJ, caixinhas ilimitadas, cotações de moedas em tempo real e o Explorador de Custo de Vida.'}
              </p>
            </div>

            <button
              onClick={() => { if (plano_usuario === 'free') { upgradeToPremium(); } else { setPlanoUsuario('free'); if (id_usuario) updatePerfil(id_usuario, { plano: 'free' }); } }}
              className={plano_usuario === 'free' ? 'btn-upgrade-active' : 'btn-upgrade-inactive'}
              style={{
                fontWeight: 700,
                padding: '15px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {plano_usuario === 'free' ? 'Mudar para Premium' : 'Reverter para Grátis'}
            </button>
          </Card>

          </>)}

          {activeView === 'costExplorer' && (
            <CostExplorer 
              planoUsuario={plano_usuario}
              userAverageExpense={userAverageExpense}
              moedaBase={moeda_base}
              onUpgrade={handleOpenCheckout}
            />
          )}

          {activeView === 'investimentos' && (
            <>
              <AdBanner adSlot="topo_investimentos" />
              <InvestimentosView moedaBase={moeda_base} onUpgrade={handleOpenCheckout} id_usuario={id_usuario} />
            </>
          )}

          {activeView === 'fluxopj' && (
            <div style={{ padding: '0 0 40px 0' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px'}}>
                  <Briefcase size={24} style={{ verticalAlign: 'middle', marginRight: '12px' }} />
                  Fluxo de Caixa PJ
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>
                  Relatório rápido de Lucro Líquido (Receitas PJ - Despesas PJ).
                </p>
              </div>

              <Card>
                {(() => {
                  const receitasPJ = transacoes
                    .filter(t => {
                      const c = contas.find(c => c.id === t.id_conta);
                      return c && espacos.find(e => e.id === c.id_espaco)?.tipo === 'PJ' && t.tipo === 'receita';
                    })
                    .reduce((s, t) => s + t.valor, 0);
                  const despesasPJ = transacoes
                    .filter(t => {
                      const c = contas.find(c => c.id === t.id_conta);
                      return c && espacos.find(e => e.id === c.id_espaco)?.tipo === 'PJ' && t.tipo === 'despesa';
                    })
                    .reduce((s, t) => s + t.valor, 0);
                  const lucroLiquido = receitasPJ - despesasPJ;
                  const margem = receitasPJ > 0 ? ((lucroLiquido / receitasPJ) * 100).toFixed(1) : '0.0';

                  return (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                        <div style={{ background: 'var(--card-border)', padding: '24px', borderRadius: '16px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Receitas PJ</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-green)', marginTop: '8px' }}>
                            {formatCurrency(receitasPJ, moeda_base)}
                          </div>
                        </div>
                        <div style={{ background: 'var(--card-border)', padding: '24px', borderRadius: '16px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Despesas PJ</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FF5252', marginTop: '8px' }}>
                            {formatCurrency(despesasPJ, moeda_base)}
                          </div>
                        </div>
                        <div style={{ background: 'var(--card-border)', padding: '24px', borderRadius: '16px', border: `1px solid ${lucroLiquido >= 0 ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.3)'}` }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Lucro Líquido</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: lucroLiquido >= 0 ? 'var(--accent-green)' : '#FF5252', marginTop: '8px' }}>
                            {formatCurrency(Math.abs(lucroLiquido), moeda_base)}
                            <span style={{ fontSize: '0.85rem', marginLeft: '8px' }}>
                              {lucroLiquido >= 0 ? '(positivo)' : '(negativo)'}
                            </span>
                          </div>
                        </div>
                        <div style={{ background: 'var(--card-border)', padding: '24px', borderRadius: '16px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Margem Líquida</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '8px' }}>
                            {margem}%
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '24px' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '12px' }}>Transações PJ Recentes</h3>
                        {transacoes.filter(t => {
                          const c = contas.find(c => c.id === t.id_conta);
                          return c && espacos.find(e => e.id === c.id_espaco)?.tipo === 'PJ';
                        }).slice(0, 10).map(tx => {
                          const conta = contas.find(c => c.id === tx.id_conta);
                          return (
                            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--card-border)', fontSize: '0.9rem' }}>
                              <div>
                                <span style={{ fontWeight: 600 }}>{tx.descricao || tx.categoria}</span>
                                <span style={{ color: 'var(--text-muted)', marginLeft: '12px', fontSize: '0.8rem' }}>{tx.data_transacao}</span>
                              </div>
                              <span style={{ fontWeight: 700, color: tx.tipo === 'receita' ? 'var(--accent-green)' : '#FF5252' }}>
                                {tx.tipo === 'receita' ? '+' : '-'} {formatCurrency(tx.valor, conta?.moeda_conta || moeda_base)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </div>
          )}

          {activeView === 'inventario' && (
            <div style={{ padding: '0 0 40px 0' }}>
              <AdBanner adSlot="topo_inventario" />
              <InventarioView
                moedaBase={moeda_base}
                idEspaco={id_espaco_ativo}
              />
            </div>
          )}

          {activeView === 'calendario' && (
            <div style={{ padding: '0 0 40px 0' }}>
              <AdBanner adSlot="topo_calendario" />
              <CalendarioFinanceiro
                transacoes={activeTransactions}
                moedaBase={moeda_base}
              />
            </div>
          )}

          {activeView === 'blog' && (
            <div style={{ padding: '0 0 40px 0' }}>
              {activeArticle ? (
                renderArticleReader(activeArticle, () => setActiveArticle(null))
              ) : (
                <>
                  <div style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px'}}>
                      Educação Financeira
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>
                      Dicas e melhores práticas para organizar o orçamento pessoal e empresarial.
                    </p>
                  </div>
                  {renderBlogFeed(false)}
                </>
              )}
            </div>
          )}

          {/* AdSense Banner for Free Users (Dashboard Bottom) */}
          {plano_usuario === 'free' && (
            <div style={{ padding: '0px 40px 40px 40px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box'}}>
              <AdSenseBanner adSlot="1234567890" style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '24px', border: '1px solid var(--card-border)'}} />
            </div>
          )}

          <FloatingActionButton 
            onClick={openAddTransactionModal}
            title="Registrar nova transação"
            aria-label="Registrar nova transação"
          >
            <Plus size={28} />
          </FloatingActionButton>
        </div>
      )}

      {/* =========================================================================
          MODALS DE CADASTRO E UPSELL (GLASSMORPHISM POPUPS)
          ========================================================================= */}

      {/* MODAL: NOVA TRANSAÇÃO */}
      <TransactionModal
        isOpen={showAddTransactionModal}
        onClose={() => setShowAddTransactionModal(false)}
        txDesc={txDesc}
        setTxDesc={setTxDesc}
        txVal={txVal}
        setTxVal={setTxVal}
        txDate={txDate}
        setTxDate={setTxDate}
        txTipo={txTipo}
        setTxTipo={setTxTipo}
        txContaId={txContaId}
        setTxContaId={setTxContaId}
        txMoeda={txMoeda}
        setTxMoeda={setTxMoeda}
        txCat={txCat}
        setTxCat={setTxCat}
        activeAccounts={activeAccounts}
        activeCartoes={activeCartoes}
        txCartaoId={txCartaoId}
        setTxCartaoId={setTxCartaoId}
        onSubmit={handleAddTransactionSubmit}
      />

      {/* MODAL: NOVA CONTA */}
      <AccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        acName={acName}
        setAcName={setAcName}
        acCurrency={acCurrency}
        setAcCurrency={setAcCurrency}
        acBalance={acBalance}
        setAcBalance={setAcBalance}
        onSubmit={handleAddAccountSubmit}
      />

      {/* MODAL: REVISÃO DE IMPORTAÇÃO */}
      <ImportReviewModal
        isOpen={importReviewOpen}
        transactions={importPending}
        accountName={activeAccounts.find(a => a.id === importAccountSelect)?.nome_instituicao ?? 'Conta'}
        format={importFormat}
        onConfirm={handleConfirmImport}
        onClose={() => { setImportReviewOpen(false); setImportPending([]); }}
      />

      {/* MODAL: CARTÃO DE CRÉDITO */}
      <CardModal
        isOpen={showAddCardModal}
        onClose={() => {
          setShowAddCardModal(false);
          setCardToEdit(null);
        }}
        onSubmit={handleCardSubmit}
        onDelete={handleCardDelete}
        cardToEdit={cardToEdit}
      />

      {/* MODAL: NOVA/EDITAR CAIXINHA */}
      <CaixinhaModal
        isOpen={showAddCaixinhaModal}
        onClose={handleCaixinhaModalClose}
        goalName={goalName}
        setGoalName={setGoalName}
        goalTarget={goalTarget}
        setGoalTarget={setGoalTarget}
        moedaBase={moeda_base}
        onSubmit={handleAddCaixinhaSubmit}
        title={editingCaixinhaId ? 'Editar Caixinha (Meta)' : 'Criar Nova Caixinha (Meta)'}
        submitText={editingCaixinhaId ? 'Salvar Alterações' : 'Criar Meta'}
      />

      {/* MODAL: NOVO ESPAÇO */}
      <SpaceModal
        isOpen={showAddSpaceModal}
        onClose={() => setShowAddSpaceModal(false)}
        spaceName={spaceName}
        setSpaceName={setSpaceName}
        spaceType={spaceType}
        setSpaceType={setSpaceType}
        onSubmit={handleAddSpaceSubmit}
      />

      {/* MODAL: UPSELL / PAYWALL */}
      <UpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        upsellReason={upsellReason}
        onUpgrade={handleOpenCheckout}
      />
      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        reason={paywallReason}
        onUpgrade={() => { setShowPaywallModal(false); handleOpenCheckout(); }}
      />

      {/* MODAIS LGPD (Phase 1) */}
      {showFAQModal && <FAQModal onClose={() => setShowFAQModal(false)} />}
      {showTermosModal && <TermosModal onClose={() => setShowTermosModal(false)} />}


      {/* MODAL: CHECKOUT SIMULATOR */}
      <CheckoutModal
        visible={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        checkoutSuccess={checkoutSuccess}
        checkoutProcessing={checkoutProcessing}
        checkoutMethod={checkoutMethod}
        setCheckoutMethod={setCheckoutMethod}
        cardNumber={cardNumber}
        setCardNumber={setCardNumber}
        cardHolder={cardHolder}
        setCardHolder={setCardHolder}
        cardExpiry={cardExpiry}
        setCardExpiry={setCardExpiry}
        cardCvv={cardCvv}
        setCardCvv={setCardCvv}
        copiedPix={copiedPix}
        setCopiedPix={setCopiedPix}
        onSubmit={handleCheckoutSubmit}
        onConfirmPix={() => {
          setCheckoutProcessing(true);
          setTimeout(() => {
            setCheckoutProcessing(false);
            setCheckoutSuccess(true);
            upgradeToPremium();
          }, 2500);
        }}
      />

      {/* DEPOSIT MODAL — substitui window.prompt() nas caixinhas */}
      {depositGoal && (
        <DepositModal
          goalName={depositGoal.nome}
          currentSaved={depositGoal.saved}
          target={depositGoal.target}
          currencySymbol={moeda_base === 'USD' ? '$' : moeda_base === 'EUR' ? '€' : 'R$'}
          onConfirm={handleDepositConfirm}
          onClose={() => setDepositGoal(null)}
        />
      )}

      {/* MODAL: CAIXINHA HISTÓRICO (EXTRATO / APORTE / RESGATE) */}
      {showCaixinhaHistorico && (
        <CaixinhaHistoricoModal
          isOpen={true}
          caixinhaId={showCaixinhaHistorico.id}
          caixinhaNome={showCaixinhaHistorico.nome}
          valorAlvo={showCaixinhaHistorico.valor_alvo}
          saldoAtual={showCaixinhaHistorico.saldo_guardado}
          moedaBase={moeda_base}
          onClose={() => setShowCaixinhaHistorico(null)}
          onSaldoChange={(novoSaldo) => handleCaixinhaSaldoChange(showCaixinhaHistorico.id, novoSaldo)}
          onAddMovimento={(mov) => addCaixinhaMovimento(mov)}
          onEditMovimento={(id, updates) => editCaixinhaMovimento(id, updates)}
          onDeleteMovimento={(id) => removeCaixinhaMovimento(id)}
        />
      )}

      {/* MODAL: FECHAMENTO MENSAL */}
      <FechamentoMensalModal
        isOpen={showFechamentoMensal}
        onClose={() => setShowFechamentoMensal(false)}
        transacoes={activeTransactions}
        moedaBase={moeda_base}
        addTransacao={addTransacao}
        contaId={activeAccounts[0]?.id || ''}
      />

      {/* MODAL DE PERFIL E SELETOR DE AVATAR */}
      {showProfileModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(18, 26, 47, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          padding: '36px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '24px',
            padding: '48px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            boxSizing: 'border-box'
          }} className="fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px'}}>
              Editar Perfil
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 24px 0'}}>
              Personalize seu nome e avatar que aparecem no Com Réis.
            </p>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '30px'}}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Seu Nome
                </label>
                <TextInput
                  type="text"
                  placeholder="Ex: Rodrigo Silva"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Escolha um Avatar (Preset)
                </label>
                <div className="rg-4col" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '18px',
                  marginBottom: '16px'
                }}>
                  {['🐱', '🐵', '🐶', '🦁', '🐼', '🦝', '🦊', '🐰'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setProfileAvatarInput(emoji)}
                      style={{
                        background: profileAvatarInput === emoji ? 'rgba(0, 210, 255, 0.15)' : 'var(--card-border)',
                        border: profileAvatarInput === emoji ? '2px solid var(--accent-blue)' : '1px solid var(--card-border)',
                        borderRadius: '16px',
                        padding: '18px',
                        fontSize: '1.6rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseOver={(e) => {
                        if (profileAvatarInput !== emoji) e.currentTarget.style.borderColor = 'var(--card-border)';
                      }}
                      onMouseOut={(e) => {
                        if (profileAvatarInput !== emoji) e.currentTarget.style.borderColor = 'var(--card-border)';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Fazer Upload de Foto (Nova)
                </label>
                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setProfileAvatarFile(e.target.files[0]);
                        setProfileAvatarInput(''); // Reseta o texto se enviou arquivo
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '15px 14px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                {profileAvatarFile && (
                  <p style={{ color: 'var(--accent-green)', fontSize: '0.8rem', marginTop: '4px' }}>
                    Arquivo selecionado: {profileAvatarFile.name}
                  </p>
                )}
                
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '16px', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Ou use uma URL de Imagem Customizada
                </label>
                <TextInput
                  type="url"
                  placeholder="https://exemplo.com/suafoto.jpg"
                  value={profileAvatarInput && profileAvatarInput.startsWith('http') ? profileAvatarInput : ''}
                  onChange={(e) => {
                    setProfileAvatarInput(e.target.value);
                    setProfileAvatarFile(null); // Reseta o arquivo se digitou URL
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '18px', marginTop: '12px'}}>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  style={{
                    flex: 1,
                    background: 'var(--card-border)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                    padding: '18px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--card-border)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'var(--card-border)'}
                >
                  Cancelar
                </button>
                <PrimaryButton type="submit" style={{ flex: 1, borderRadius: '12px'}} disabled={isUploadingAvatar}>
                  {isUploadingAvatar ? 'Enviando...' : 'Salvar Alterações'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  landingCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '20px',
    padding: '42px',
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
    transition: 'all 0.2s'
  },
  landingCardIcon: {
    fontSize: '2rem',
    marginBottom: '16px'
  },
  landingCardTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    margin: '0 0 10px 0',
    color: 'var(--text-primary)'
  },
  landingCardText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: 0
  }
};
