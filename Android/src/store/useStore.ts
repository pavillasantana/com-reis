import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMoney, subtractMoney, multiplyMoney, divideMoney, convertCurrency } from '../utils/currency';
import { supabase } from '../lib/supabase';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface Espaco {
  id: string;
  nome: string;
  tipo: 'PF' | 'PJ';
  id_usuario: string;
}

export interface Conta {
  id: string;
  id_espaco: string;
  nome_instituicao: string;
  moeda_conta: string;
  saldo_inicial: number;
}

export interface Cartao {
  id: string;
  id_espaco: string;
  nome: string;
  limite: number;
  fatura_atual: number;
}

export interface Transacao {
  id: string;
  id_conta: string;
  tipo: 'receita' | 'despesa' | 'transferencia';
  valor: number;
  categoria: string;
  id_tag?: string | null;
  data_transacao: string;
  taxa_cambio_dia: number;
  descricao?: string;
  id_conta_destino?: string;
  is_compartilhada?: boolean;
  id_transacao_pai?: string | null;
  participante_email?: string; // e-mail do participante
}

export interface RegraTag {
  id: string;
  id_usuario: string;
  termo_busca: string;
  id_tag: string;
}

export interface TransacaoParticipante {
  id: string;
  id_transacao: string;
  id_usuario_participante: string;
  valor_devido: number;
  status_pagamento: 'Pendente' | 'Pago';
}

export interface Caixinha {
  id: string;
  id_espaco: string;
  nome: string;
  valor_alvo: number;
  saldo_guardado: number;
}

export interface Tag {
  id: string;
  id_usuario: string;
  nome: string;
  cor: string;
}

export interface AtivoPatrimonio {
  id: string;
  id_usuario: string;
  ticker: string;
  tipo: 'acao' | 'fiis' | 'cripto' | 'moeda';
  quantidade: number;
  preco_medio: number;
  cotacao_atual: number;
}

export interface TransacaoAtivo {
  id: string;
  id_usuario: string;
  ticker: string;
  tipo: 'compra' | 'venda';
  quantidade: number;
  preco_unitario: number;
  data_transacao: string;
}

export interface Provento {
  id: string;
  id_usuario: string;
  ticker: string;
  tipo: 'dividendo' | 'jcp' | 'rendimento';
  valor: number;
  data_pagamento: string;
}

interface AppState {
  // Auth & User Info
  id_usuario: string | null;
  email_usuario: string | null;
  nome_usuario: string | null;
  plano_usuario: 'free' | 'premium';
  moeda_base: string;
  renda_principal: number;
  avatar_url: string | null;
  isAuthLoading: boolean;

  // Active States
  id_espaco_ativo: string | null;

  // Data Lists
  espacos: Espaco[];
  contas: Conta[];
  cartoes: Cartao[];
  transacoes: Transacao[];
  caixinhas: Caixinha[];
  transacoes_participantes: TransacaoParticipante[];
  tags: Tag[];
  regras_tags: RegraTag[];
  transacoes_ativos: TransacaoAtivo[];
  proventos: Provento[];
  cotacoes_ativos: Record<string, number>;
  cotacoes_moedas: Record<string, number>;
  isAddTransactionOpen: boolean;
  isCheckoutOpen: boolean;
  isCheckoutModalVisible: boolean;
  checkoutMessage: string;
  cartoes_removidos: string[];
  onboarding_completo: boolean;
  biometria_ativada: boolean;
  toast: {
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;
  hasHydrated: boolean;
  isSyncing: boolean;

  // Actions
  addCartao: (cartao: Cartao) => Promise<void>;
  updateCartao: (id: string, updates: Partial<Cartao>) => Promise<void>;
  deleteCartao: (id: string) => Promise<void>;
  recalcularSaldos: () => void;
  setAddTransactionOpen: (open: boolean) => void;
  setUsuario: (id: string | null, email: string | null, nome: string | null, plano?: 'free' | 'premium', moeda_base?: string, avatar_url?: string | null) => void;
  setBiometriaAtivada: (ativada: boolean) => void;
  updateAvatarUrl: (url: string | null) => Promise<void>;
  setPlanoUsuario: (plano: 'free' | 'premium') => Promise<void>;
  verificarAssinaturaAtiva: () => Promise<boolean | null>;
  setMoedaBase: (moeda: string) => Promise<void>;
  setIdEspacoAtivo: (id: string | null) => void;
  setCheckoutOpen: (open: boolean) => void;
  setCheckoutMessage: (msg: string) => void;
  toggleCheckoutModal: (visible: boolean) => void;
  setCotacoesMoedas: (cotacoes: Record<string, number>) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  setAuthLoading: (loading: boolean) => void;

  setEspacos: (espacos: Espaco[]) => void;
  setContas: (contas: Conta[]) => void;
  setCartoes: (cartoes: Cartao[]) => void;
  setTransacoes: (transacoes: Transacao[]) => void;
  setCaixinhas: (caixinhas: Caixinha[]) => void;

  addEspaco: (espaco: Espaco) => void;
  addConta: (conta: Conta) => Promise<void>;
  deleteConta: (id: string) => Promise<void>;
  addTransacao: (transacao: Transacao) => Promise<void>;
  addTransacoesBulk: (transacoes: Transacao[]) => Promise<void>;
  deleteTransacao: (id: string) => Promise<void>;
  updateTransacao: (id: string, updates: Partial<Transacao>) => Promise<void>;
  addCaixinha: (caixinha: Caixinha) => Promise<void>;
  deleteCaixinha: (id: string) => Promise<void>;
  updateCaixinha: (id: string, updates: Partial<Caixinha>) => Promise<void>;
  updateCaixinhaSaldo: (caixinhaId: string, novoSaldo: number) => Promise<void>;
  updateTransacaoValor: (transacaoId: string, novoValor: number) => Promise<void>;
  addTag: (tag: Tag) => Promise<void>;
  updateTag: (id: string, nome: string, cor: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addRegraTag: (regra: Omit<RegraTag, 'id' | 'id_usuario'>) => Promise<void>;
  deleteRegraTag: (id: string) => Promise<void>;
  updateTransacaoTag: (transacaoId: string, idTag: string | null) => Promise<void>;
  addTransacaoAtivo: (tx: Omit<TransacaoAtivo, 'id_usuario'>) => Promise<void>;
  addProvento: (p: Omit<Provento, 'id_usuario'>) => Promise<void>;
  deleteTransacaoAtivo: (id: string) => Promise<void>;
  updateTransacaoAtivo: (id: string, updates: Partial<Omit<TransacaoAtivo, 'id' | 'id_usuario'>>) => Promise<void>;
  deleteProvento: (id: string) => Promise<void>;
  atualizarCotacoes: () => Promise<void>;
  atualizarCotacoesBrapi: (cotacoesBatch: Record<string, number>) => void;

  // Sync with Supabase (Critical queries enforcing active space isolation)
  syncSupabaseData: () => Promise<void>;

  // Onboarding
  inicializarOnboarding: (renda: number) => Promise<void>;

  // Derived Getters
  getSaldoTotal: (cotacoes?: Record<string, number>) => number;
  getResumoMensal: () => { receitas: number; despesas: number };
  getTransacoesEspacoAtivo: () => Transacao[];
  getContasEspacoAtivo: () => Conta[];
  getCartoesEspacoAtivo: () => Cartao[];
  getCaixinhasEspacoAtivo: () => Caixinha[];

  // Reset (logout)
  clearSession: () => void;

  // Development / Demo helper
  loadDemoData: () => void;
}

let currentSyncPromise: Promise<void> | null = null;
let pendingSyncRequest = false;
let syncDebounceTimeout: any = null;

const INITIAL_STATE = {
  id_usuario: null,
  email_usuario: null,
  nome_usuario: null,
  plano_usuario: 'free' as const,
  moeda_base: 'BRL',
  renda_principal: 0,
  avatar_url: null,
  biometria_ativada: false,
  id_espaco_ativo: null,
  toast: null,
  espacos: [],
  contas: [],
  cartoes: [],
  transacoes: [],
  caixinhas: [],
  transacoes_participantes: [],
  tags: [],
  regras_tags: [],
  transacoes_ativos: [],
  proventos: [],
  cotacoes_ativos: {
    'PETR4': 38.45,
    'VALE3': 62.10,
    'BTC': 345000,
    'USD': 5.20,
    'MXRF11': 10.15
  },
  cotacoes_moedas: {
    BRL: 1.0,
    USD: 5.10,
    EUR: 5.83,
    ARS: 0.0035,
    GBP: 6.90,
    JPY: 0.031,
    CAD: 3.62,
    CHF: 6.32,
    AUD: 3.56,
    CNY: 0.75,
    MXN: 0.29
  },
  isAddTransactionOpen: false,
  isCheckoutOpen: false,
  isCheckoutModalVisible: false,
  checkoutMessage: '',
  cartoes_removidos: [],
  onboarding_completo: false,
  hasHydrated: false,
  isSyncing: false,
  isAuthLoading: true,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      addCartao: async (cartao) => {
        let cartaoFinal = { ...cartao };
        if (get().id_usuario) {
          const { data, error } = await supabase.from('cartoes').upsert(cartao).select().single();
          if (error) throw error;
          if (data) cartaoFinal = { ...cartao, ...data };
        }
        set((state) => ({ cartoes: [...state.cartoes, cartaoFinal] }));
        await get().syncSupabaseData();
      },
      updateCartao: async (id, updates) => {
        if (get().id_usuario) {
          const { error } = await supabase.from('cartoes').update(updates).eq('id', id);
          if (error) throw error;
        }
        set((state) => ({
          cartoes: state.cartoes.map((c) => c.id === id ? { ...c, ...updates } : c),
        }));
        await get().syncSupabaseData();
      },
      deleteCartao: async (id) => {
        if (get().id_usuario) {
          const { error } = await supabase.from('cartoes').delete().eq('id', id);
          if (error) throw error;
        }
        set((state) => ({
          cartoes: state.cartoes.filter(c => c.id !== id),
        }));
        await get().syncSupabaseData();
      },

      recalcularSaldos: () => {
        const { caixinhas, moeda_base, cotacoes_moedas } = get();
        const caixinhasConvertidas = caixinhas.map((c) => ({
          ...c,
          valor_alvo: convertCurrency(c.valor_alvo, 'BRL', moeda_base, cotacoes_moedas),
          saldo_guardado: convertCurrency(c.saldo_guardado, 'BRL', moeda_base, cotacoes_moedas),
        }));
        set({ caixinhas: caixinhasConvertidas });
      },

      setAddTransactionOpen: (open) => set({ isAddTransactionOpen: open }),

      setBiometriaAtivada: (ativada: boolean) => set({ biometria_ativada: ativada }),

      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),

      setAuthLoading: (loading: boolean) => set({ isAuthLoading: loading }),

      setUsuario: (id, email, nome, plano = 'free', moeda_base = 'BRL', avatar_url = null) => {
        if (!id) {
          set({ id_usuario: null, email_usuario: null, nome_usuario: null, plano_usuario: 'free', moeda_base: 'BRL', renda_principal: 0, avatar_url: null, isAuthLoading: false });
          return;
        }

        const carregarPerfilESincronizar = async () => {
          try {
            const { data: usuario } = await supabase
              .from('usuarios')
              .select('nome_completo, plano, moeda_base, renda_principal, onboarding_completo, avatar_url')
              .eq('id', id)
              .single();

            let localAvatar = avatar_url;
            // Priorizar avatar da tabela usuarios sobre auth metadata
            if (usuario?.avatar_url) {
              localAvatar = usuario.avatar_url;
            } else {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.user_metadata?.avatar_url) {
                  localAvatar = user.user_metadata.avatar_url;
                }
              } catch (errAuth) {
                console.warn('Erro ao obter metadados do auth:', errAuth);
              }
            }

            if (usuario) {
              set({
                id_usuario: id,
                email_usuario: email,
                nome_usuario: usuario.nome_completo || nome,
                plano_usuario: (usuario.plano || plano) as 'free' | 'premium',
                moeda_base: usuario.moeda_base || moeda_base,
                renda_principal: Number(usuario.renda_principal || 0),
                onboarding_completo: Boolean(usuario.onboarding_completo),
                avatar_url: localAvatar,
              });
            } else {
              set({ id_usuario: id, email_usuario: email, nome_usuario: nome, plano_usuario: plano, moeda_base, renda_principal: 0, avatar_url: localAvatar });
            }
          } catch (err) {
            console.warn('Erro ao carregar perfil de usuário no setUsuario:', err);
            set({ id_usuario: id, email_usuario: email, nome_usuario: nome, plano_usuario: plano, moeda_base, renda_principal: 0, avatar_url });
          } finally {
            set({ isAuthLoading: false });
          }

          // Executa a sincronização completa em background
          get().syncSupabaseData().catch((err) => console.warn('Erro na sincronização pós-login:', err));
        };

        carregarPerfilESincronizar();
      },

      updateAvatarUrl: async (url) => {
        set({ avatar_url: url });
        try {
          const { id_usuario } = get();
          if (id_usuario && !id_usuario.startsWith('demo-')) {
            await supabase.auth.updateUser({
              data: { avatar_url: url }
            });
            // Persistir na tabela usuarios
            const { error: dbError } = await supabase
              .from('usuarios')
              .update({ avatar_url: url })
              .eq('id', id_usuario);
            if (dbError) console.warn('Erro ao salvar avatar na tabela usuarios:', dbError);
          }
        } catch (err) {
          console.warn('Erro ao atualizar avatar no Supabase:', err);
        }
      },

      setPlanoUsuario: async (plano) => {
        set({ plano_usuario: plano });
        const uid = get().id_usuario;
        if (!uid) return;

        try {
          // Atualiza diretamente na tabela usuarios para garantir persistência
          const { error: dbError } = await supabase
            .from('usuarios')
            .update({ plano: plano })
            .eq('id', uid);
          if (dbError) throw dbError;

          if (plano === 'premium') {
            // Cria/renova assinatura de 30 dias via RPC
            const { error: rpcError } = await supabase.rpc('criar_assinatura', { uid });
            if (rpcError) throw rpcError;
          }
        } catch (err) {
          console.warn('Erro ao atualizar plano no Supabase:', err);
        }
      },

      /**
       * Verifica assinatura ativa via RPC e força 'free' se expirada.
       */
      verificarAssinaturaAtiva: async () => {
        const uid = get().id_usuario;
        if (!uid) return false;
        try {
          const { data, error } = await supabase.rpc('verificar_assinatura', { uid });
          if (error) throw error;
          if (data === false) {
            set({ plano_usuario: 'free' });
            return false;
          }
          return true;
        } catch (err) {
          console.warn('Erro ao verificar assinatura:', err);
          return null;
        }
      },

      setCheckoutOpen: (open) => set({ isCheckoutOpen: open }),
      setCheckoutMessage: (msg) => set({ checkoutMessage: msg }),
      toggleCheckoutModal: (visible) => set({ isCheckoutModalVisible: visible }),
      setCotacoesMoedas: (cotacoes) => set({ cotacoes_moedas: cotacoes }),
      showToast: (message, type = 'info') => {
        set({ toast: { visible: true, message, type } });
      },
      hideToast: () => {
        set((state) => ({ toast: state.toast ? { ...state.toast, visible: false } : null }));
      },
      setMoedaBase: async (moeda) => {
        set({ moeda_base: moeda });
        if (get().id_usuario) {
          try {
            const { error } = await supabase
              .from('usuarios')
              .update({ moeda_base: moeda })
              .eq('id', get().id_usuario);
            if (error) throw error;
          } catch (err) {
            console.warn('Erro ao atualizar moeda no Supabase:', err);
          }
        }
        // Recalculate all values in the new base currency
        get().recalcularSaldos();
      },
      setIdEspacoAtivo: (id) => {
        set({ id_espaco_ativo: id });
        
        // Debounce synchronization to prevent flickering and API spam
        if (syncDebounceTimeout) {
          clearTimeout(syncDebounceTimeout);
        }
        syncDebounceTimeout = setTimeout(() => {
          get().syncSupabaseData();
        }, 300);
      },

      setEspacos: (espacos) => set({
        espacos,
        id_espaco_ativo: espacos.length > 0 && !get().id_espaco_ativo ? espacos[0].id : get().id_espaco_ativo,
      }),
      setContas: (contas) => set({ contas }),
      setCartoes: (cartoes) => set({ cartoes }),
      setTransacoes: (transacoes) => set({ transacoes }),
      setCaixinhas: (caixinhas) => set({ caixinhas }),

      addEspaco: (espaco) => set((state) => ({
        espacos: [...state.espacos, espaco],
        id_espaco_ativo: state.id_espaco_ativo ? state.id_espaco_ativo : espaco.id,
      })),

      addConta: async (conta) => {
        let contaFinal = { ...conta };
        if (get().id_usuario) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conta.id);
          const insertPayload: any = {
            id_espaco: conta.id_espaco,
            nome_instituicao: conta.nome_instituicao,
            moeda_conta: conta.moeda_conta,
            saldo_inicial: conta.saldo_inicial
          };
          if (isUUID) {
            insertPayload.id = conta.id;
          }
          const { data, error } = await supabase
            .from('contas')
            .upsert(insertPayload)
            .select()
            .single();
          if (error) throw error;
          if (data) {
            contaFinal = {
              id: data.id,
              id_espaco: data.id_espaco,
              nome_instituicao: data.nome_instituicao,
              moeda_conta: data.moeda_conta,
              saldo_inicial: Number(data.saldo_inicial)
            };
          }
        }
        set((state) => ({ contas: [...state.contas.filter(c => c.id !== conta.id), contaFinal] }));
        await get().syncSupabaseData();
      },

      deleteConta: async (id) => {
        if (get().id_usuario) {
          const agora = new Date().toISOString();
          // 1. Soft delete nas transações vinculadas
          const { error: errorTrans } = await supabase
            .from('transacoes')
            .update({ deleted_at: agora })
            .eq('id_conta', id);
          if (errorTrans) {
            console.warn('Aviso: erro ao soft-deletar transações associadas:', errorTrans);
          }

          // 2. Hard delete na conta (sem soft delete — não tem deleted_at)
          const { error } = await supabase
            .from('contas')
            .delete()
            .eq('id', id);
          if (error) throw error;
        }
        set((state) => ({ 
          transacoes: state.transacoes.filter(t => t.id_conta !== id),
          contas: state.contas.filter(c => c.id !== id) 
        }));
        await get().syncSupabaseData();
      },

      addTransacao: async (transacao) => {
        let transacaoFinal = { ...transacao };

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transacaoFinal.id);
        if (!isUUID) {
          transacaoFinal.id = generateUUID();
        }

        // Autocategorização heurística
        if (!transacaoFinal.id_tag && transacaoFinal.descricao) {
          const descLower = transacaoFinal.descricao.toLowerCase();
          const regra = get().regras_tags.find(r => descLower.includes(r.termo_busca.toLowerCase()));
          if (regra) {
            transacaoFinal.id_tag = regra.id_tag;
          }
        }

        if (get().id_usuario) {
          const insertPayload: any = {
            id: transacaoFinal.id,
            id_conta: transacaoFinal.id_conta,
            tipo: transacaoFinal.tipo,
            valor: transacaoFinal.valor,
            categoria: transacaoFinal.categoria,
            id_tag: transacaoFinal.id_tag || null,
            data_transacao: transacaoFinal.data_transacao,
            taxa_cambio_dia: transacaoFinal.taxa_cambio_dia,
            descricao: transacaoFinal.descricao,
            is_compartilhada: transacaoFinal.is_compartilhada || false,
            participante_email: transacaoFinal.participante_email || null,
            id_transacao_pai: transacaoFinal.id_transacao_pai || null
          };

          let dataPai = null;
          try {
            const { data, error } = await supabase.from('transacoes').insert(insertPayload).select().single();
            if (error) throw error;
            dataPai = data;
          } catch (err) {
            console.error('Erro ao inserir transacao pai:', err);
          }

          if (dataPai) {
            transacaoFinal = {
              id: dataPai.id,
              id_conta: dataPai.id_conta,
              tipo: dataPai.tipo as 'receita' | 'despesa',
              valor: Number(dataPai.valor),
              categoria: dataPai.categoria,
              id_tag: dataPai.id_tag,
              data_transacao: dataPai.data_transacao,
              taxa_cambio_dia: Number(dataPai.taxa_cambio_dia),
              descricao: dataPai.descricao || undefined,
              is_compartilhada: dataPai.is_compartilhada !== undefined ? dataPai.is_compartilhada : transacao.is_compartilhada,
              participante_email: dataPai.participante_email !== undefined ? dataPai.participante_email : transacao.participante_email,
              id_transacao_pai: dataPai.id_transacao_pai !== undefined ? dataPai.id_transacao_pai : transacao.id_transacao_pai,
            };

            if (transacao.is_compartilhada && transacao.participante_email) {
              try {
                await supabase.from('transacoes').insert({
                  id_conta: transacao.id_conta,
                  tipo: transacao.tipo,
                  valor: transacao.valor,
                  categoria: transacao.categoria,
                  data_transacao: transacao.data_transacao,
                  taxa_cambio_dia: transacao.taxa_cambio_dia,
                  descricao: `[Rateio Pendente] ${transacao.descricao || transacao.categoria}`,
                  is_compartilhada: true,
                  participante_email: transacao.participante_email,
                  id_transacao_pai: dataPai.id
                });
              } catch (filhoError) {
                console.error('Erro ao gerar transacao do parceiro:', filhoError);
              }

              try {
                // Opcional: tenta inserir na tabela de participantes, falhando silenciosamente se não existir a tabela
                await supabase.from('transacoes_participantes').insert({
                  id_transacao: dataPai.id,
                  email_participante: transacao.participante_email,
                  valor_devido: transacao.valor,
                  status_pagamento: 'Pendente'
                });
              } catch (partError) {
                console.warn('Erro ao inserir participante de rateio (tabela pode nao existir):', partError);
              }
            }
          }
        }
        set((state) => ({ transacoes: [transacaoFinal, ...state.transacoes.filter(t => t.id !== transacao.id)] }));
        get().syncSupabaseData(); // Background Sync para máxima performance e velocidade
      },

      addTransacoesBulk: async (novasTransacoes) => {
        const categorizadas = novasTransacoes.map(t => {
          let transacaoFinal = { ...t };

          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transacaoFinal.id);
          if (!isUUID) {
            transacaoFinal.id = generateUUID();
          }

          if (!transacaoFinal.id_tag && transacaoFinal.descricao) {
            const descLower = transacaoFinal.descricao.toLowerCase();
            const regra = get().regras_tags.find(r => descLower.includes(r.termo_busca.toLowerCase()));
            if (regra) {
              transacaoFinal.id_tag = regra.id_tag;
            }
          }
          return transacaoFinal;
        });

        set((state) => ({ transacoes: [...categorizadas, ...state.transacoes] }));
        if (get().id_usuario) {
          const insertPayload = categorizadas.map(t => ({
            id: t.id,
            id_conta: t.id_conta,
            tipo: t.tipo,
            valor: t.valor,
            categoria: t.categoria,
            id_tag: t.id_tag || null,
            data_transacao: t.data_transacao,
            taxa_cambio_dia: t.taxa_cambio_dia,
            descricao: t.descricao,
            is_compartilhada: t.is_compartilhada || false,
            participante_email: t.participante_email || null,
            id_transacao_pai: t.id_transacao_pai || null
          }));
          const { error } = await supabase.from('transacoes').insert(insertPayload);
          if (error) {
            console.error('Erro bulk insert:', error);
          }
          await get().syncSupabaseData();
        }
      },

      addCaixinha: async (caixinha) => {
        let caixinhaFinal = { ...caixinha };
        if (get().id_usuario) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caixinha.id);
          const insertPayload: any = {
            id_espaco: caixinha.id_espaco,
            nome: caixinha.nome,
            valor_alvo: caixinha.valor_alvo,
            saldo_guardado: caixinha.saldo_guardado
          };
          if (isUUID) {
            insertPayload.id = caixinha.id;
          }
          const { data, error } = await supabase
            .from('caixinhas')
            .upsert(insertPayload)
            .select()
            .single();
          if (error) throw error;
          if (data) {
            caixinhaFinal = {
              id: data.id,
              id_espaco: data.id_espaco,
              nome: data.nome,
              valor_alvo: Number(data.valor_alvo),
              saldo_guardado: Number(data.saldo_guardado)
            };
          }
        }
        set((state) => ({ caixinhas: [...state.caixinhas.filter(c => c.id !== caixinha.id), caixinhaFinal] }));
        await get().syncSupabaseData();
      },

      deleteCaixinha: async (id) => {
        if (get().id_usuario) {
          try {
            const { error } = await supabase
              .from('caixinhas')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', id);
            if (error) console.warn('Erro ao soft-deletar caixinha no Supabase:', error);
          } catch (err) {
            console.warn('Erro ao soft-deletar caixinha:', err);
          }
        }
        set((state) => ({ caixinhas: state.caixinhas.filter((c) => c.id !== id) }));
        await get().syncSupabaseData();
      },

      updateCaixinha: async (id, updates) => {
        if (get().id_usuario) {
          try {
            const { error } = await supabase
              .from('caixinhas')
              .update({
                nome: updates.nome,
                valor_alvo: updates.valor_alvo,
                saldo_guardado: updates.saldo_guardado
              })
              .eq('id', id);
            if (error) throw error;
          } catch (err) {
            console.warn('Erro ao atualizar caixinha no Supabase:', err);
          }
        }
        set((state) => ({
          caixinhas: state.caixinhas.map(c => c.id === id ? { ...c, ...updates } : c)
        }));
        await get().syncSupabaseData();
      },

      addTag: async (tag) => {
        let tagFinal = { ...tag };
        if (get().id_usuario) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tag.id);
          const insertData: any = {
            id_usuario: get().id_usuario,
            nome: tag.nome,
            cor: tag.cor
          };
          if (isUUID) {
            insertData.id = tag.id;
          }
          const { data, error } = await supabase
            .from('tags')
            .insert(insertData)
            .select()
            .single();

          if (error) throw error;
          if (data) {
            tagFinal = {
              id: data.id,
              id_usuario: data.id_usuario,
              nome: data.nome,
              cor: data.cor
            };
          }
        }
        set((state) => ({ tags: [...state.tags, tagFinal] }));
      },

      deleteTag: async (id) => {
        if (get().id_usuario) {
          const { error } = await supabase.from('tags').delete().eq('id', id);
          if (error) throw error;
        }
        set((state) => ({ tags: state.tags.filter(t => t.id !== id) }));
      },

      updateTag: async (id, nome, cor) => {
        if (get().id_usuario) {
          const { error } = await supabase
            .from('tags')
            .update({ nome, cor })
            .eq('id', id);
          if (error) throw error;
        }
        set((state) => ({
          tags: state.tags.map(t => t.id === id ? { ...t, nome, cor } : t)
        }));
      },

      addRegraTag: async (regra) => {
        const id_usuario = get().id_usuario;
        if (!id_usuario) return;

        const insertPayload = {
          id_usuario,
          termo_busca: regra.termo_busca,
          id_tag: regra.id_tag
        };

        const { data, error } = await supabase
          .from('regras_tags')
          .insert(insertPayload)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const novaRegra: RegraTag = {
            id: data.id,
            id_usuario: data.id_usuario,
            termo_busca: data.termo_busca,
            id_tag: data.id_tag
          };
          set((state) => ({
            regras_tags: [...state.regras_tags.filter(r => !(r.termo_busca.toLowerCase() === regra.termo_busca.toLowerCase())), novaRegra]
          }));
        }
      },

      deleteRegraTag: async (id) => {
        if (get().id_usuario) {
          const { error } = await supabase.from('regras_tags').delete().eq('id', id);
          if (error) throw error;
        }
        set((state) => ({ regras_tags: state.regras_tags.filter(r => r.id !== id) }));
      },

      updateTransacaoTag: async (transacaoId, idTag) => {
        if (get().id_usuario) {
          const { error } = await supabase
            .from('transacoes')
            .update({ id_tag: idTag })
            .eq('id', transacaoId);
          if (error) throw error;
        }
        set((state) => ({
          transacoes: state.transacoes.map(t => t.id === transacaoId ? { ...t, id_tag: idTag } : t)
        }));
      },

      addTransacaoAtivo: async (tx) => {
        const id_usuario = get().id_usuario || 'demo-user-123';
        const novaTx = { ...tx, id_usuario };

        if (get().id_usuario) {
          try {
            const { error } = await supabase.from('transacoes_ativos').insert({
              id: novaTx.id,
              id_usuario,
              ticker: novaTx.ticker,
              tipo: novaTx.tipo,
              quantidade: novaTx.quantidade,
              preco_unitario: novaTx.preco_unitario,
              data_transacao: novaTx.data_transacao
            });
            if (error) throw error;
          } catch (err) {
            console.warn('Erro ao salvar transação de ativo no Supabase:', err);
          }
        }

        set((state) => ({
          transacoes_ativos: [novaTx, ...state.transacoes_ativos]
        }));
      },

      addProvento: async (p) => {
        const id_usuario = get().id_usuario || 'demo-user-123';
        const novoP = { ...p, id_usuario };

        if (get().id_usuario) {
          try {
            const { error } = await supabase.from('proventos').insert({
              id: novoP.id,
              id_usuario,
              ticker: novoP.ticker,
              tipo: novoP.tipo,
              valor: novoP.valor,
              data_pagamento: novoP.data_pagamento
            });
            if (error) throw error;
          } catch (err) {
            console.warn('Erro ao salvar provento no Supabase:', err);
          }
        }

        set((state) => ({
          proventos: [novoP, ...state.proventos]
        }));
      },

      deleteTransacaoAtivo: async (id) => {
        if (get().id_usuario) {
          try {
            const { error } = await supabase.from('transacoes_ativos').delete().eq('id', id);
            if (error) throw error;
          } catch (err) {
            console.warn('Erro ao deletar transação de ativo no Supabase:', err);
          }
        }

        set((state) => ({
          transacoes_ativos: state.transacoes_ativos.filter((t) => t.id !== id)
        }));
      },

      updateTransacaoAtivo: async (id, updates) => {
        if (get().id_usuario) {
          try {
            const { error } = await supabase
              .from('transacoes_ativos')
              .update(updates)
              .eq('id', id);
            if (error) throw error;
          } catch (err) {
            console.warn('Erro ao atualizar transação de ativo no Supabase:', err);
          }
        }

        set((state) => ({
          transacoes_ativos: state.transacoes_ativos.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          )
        }));
      },

      deleteProvento: async (id) => {
        if (get().id_usuario) {
          try {
            const { error } = await supabase.from('proventos').delete().eq('id', id);
            if (error) throw error;
          } catch (err) {
            console.warn('Erro ao deletar provento no Supabase:', err);
          }
        }

        set((state) => ({
          proventos: state.proventos.filter((p) => p.id !== id)
        }));
      },

      atualizarCotacoes: async () => {
        const transacoesAtivos = get().transacoes_ativos;
        const tickersUnicos = Array.from(new Set(transacoesAtivos.map((t) => t.ticker.toUpperCase())));

        // Garante que os tickers padrão também sejam atualizados se a lista for vazia
        const defaultTickers = ['PETR4', 'VALE3', 'MXRF11'];
        defaultTickers.forEach(t => {
          if (!tickersUnicos.includes(t)) {
            tickersUnicos.push(t);
          }
        });

        // Formata para símbolos do Yahoo Finance
        const simbolosYahoo = tickersUnicos.map((ticker) => {
          if (/^[A-Z]{4}[0-9]{1,2}$/.test(ticker)) {
            return `${ticker}.SA`;
          }
          if (ticker === 'BTC') {
            return 'BTC-USD';
          }
          return ticker;
        });

        if (simbolosYahoo.length === 0) return;

        try {
          const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(simbolosYahoo.join(','))}`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status}`);
          }

          const data = await response.json();
          const result = data.quoteResponse?.result || [];

          const novasCotacoes = { ...get().cotacoes_ativos };

          result.forEach((item: any) => {
            let symbol = item.symbol.toUpperCase();
            if (symbol.endsWith('.SA')) {
              symbol = symbol.replace('.SA', '');
            }
            if (symbol === 'BTC-USD') {
              symbol = 'BTC';
            }

            const preco = item.regularMarketPrice;
            if (preco !== undefined && preco !== null) {
              if (symbol === 'BTC') {
                const usdToBrl = get().cotacoes_moedas?.USD || 5.10;
                novasCotacoes[symbol] = Math.round(preco * usdToBrl);
              } else {
                novasCotacoes[symbol] = Number(preco.toFixed(2));
              }
            }
          });

          set({ cotacoes_ativos: novasCotacoes });
        } catch (error) {
          console.warn('Erro ao buscar cotações reais no Yahoo Finance, usando variação local:', error);
          // Fallback para variação simulada local
          set((state) => {
            const novas = { ...state.cotacoes_ativos };
            Object.keys(novas).forEach((ticker) => {
              const variacao = 1 + (Math.random() * 0.08 - 0.04);
              novas[ticker] = Number((novas[ticker] * variacao).toFixed(2));
            });
            return { cotacoes_ativos: novas };
          });
        }
      },

      // Recebe cotações já resolvidas pelo useBrapi (sem duplicar a lógica de fetch aqui)
      atualizarCotacoesBrapi: (cotacoesBatch) => {
        if (!cotacoesBatch || !Object.keys(cotacoesBatch).length) return;
        set((state) => ({
          cotacoes_ativos: { ...state.cotacoes_ativos, ...cotacoesBatch },
        }));
      },

      updateTransacaoValor: async (transacaoId, novoValor) => {
        set((state) => ({
          transacoes: state.transacoes.map((t) => t.id === transacaoId ? { ...t, valor: novoValor } : t)
        }));
        if (get().id_usuario) {
          await supabase
            .from('transacoes')
            .update({ valor: novoValor })
            .eq('id', transacaoId);
          await get().syncSupabaseData();
        }
      },

      deleteTransacao: async (id) => {
        set((state) => ({
          transacoes: state.transacoes.filter((t) => t.id !== id)
        }));
        if (get().id_usuario) {
          const { error } = await supabase
            .from('transacoes')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
          if (error) {
            console.error("Erro ao soft-deletar transacao no Supabase:", error);
          }
          await get().syncSupabaseData();
        }
      },

      updateTransacao: async (id, updates) => {
        set((state) => ({
          transacoes: state.transacoes.map((t) => t.id === id ? { ...t, ...updates } : t)
        }));
        if (get().id_usuario) {
          const { error } = await supabase
            .from('transacoes')
            .update(updates)
            .eq('id', id);
          if (error) {
            console.error("Erro ao atualizar transacao no Supabase:", error);
          }
          await get().syncSupabaseData();
        }
      },

      updateCaixinhaSaldo: async (caixinhaId, novoSaldo) => {
        set((state) => ({
          caixinhas: state.caixinhas.map((c) => c.id === caixinhaId ? { ...c, saldo_guardado: novoSaldo } : c),
        }));
        const uid = get().id_usuario;
        if (uid && !caixinhaId.startsWith('local-') && !caixinhaId.startsWith('demo-')) {
          try {
            const { error } = await supabase
              .from('caixinhas')
              .update({ saldo_guardado: novoSaldo })
              .eq('id', caixinhaId);
            if (error) console.warn('Erro ao salvar saldo da caixinha no Supabase:', error);
          } catch (err) {
            console.warn('Erro ao atualizar saldo da caixinha:', err);
          }
        }
      },

      syncSupabaseData: async () => {
        const { id_usuario, isAuthLoading } = get();
        if (isAuthLoading || !id_usuario) return;

        set({ isSyncing: true });

        if (currentSyncPromise) {
          pendingSyncRequest = true;
          return currentSyncPromise;
        }

        const runSync = async () => {
          const { id_usuario: userId } = get();
          if (!userId) return;

          try {
            // 1. Fetch do perfil do usuário para corrigir identidade (Problema 2)
            const { data: usuario } = await supabase
              .from('usuarios')
              .select('nome_completo, plano, moeda_base, renda_principal, avatar_url')
              .eq('id', userId)
              .single();

            let localAvatar = get().avatar_url;
            // Priorizar avatar da tabela usuarios sobre auth metadata
            if (usuario?.avatar_url) {
              localAvatar = usuario.avatar_url;
            } else {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.user_metadata?.avatar_url) {
                  localAvatar = user.user_metadata.avatar_url;
                }
              } catch (errAuth) {
                console.warn('Erro ao obter avatar no syncSupabaseData:', errAuth);
              }
            }

            if (usuario) {
              set({ 
                nome_usuario: usuario.nome_completo,
                plano_usuario: usuario.plano as 'free' | 'premium',
                moeda_base: usuario.moeda_base,
                renda_principal: Number(usuario.renda_principal || 0),
                avatar_url: localAvatar
              });
            }

            // 2. Fetch dos espaços do usuário
            let { data: espacosData } = await supabase
              .from('espacos')
              .select('*')
              .eq('id_usuario', userId);

            if (!espacosData || espacosData.length === 0) {
              // Criação silenciosa de onboarding pelo frontend se o trigger falhar ou demorar
              const { data: newSpace } = await supabase
                .from('espacos')
                .insert({
                  id_usuario: userId,
                  nome: 'Meu Espaço',
                  tipo: 'PF'
                })
                .select()
                .single();

              if (newSpace) {
                espacosData = [newSpace];
                // Insere conta inicial Carteira Física
                await supabase
                  .from('contas')
                  .insert({
                    id_espaco: newSpace.id,
                    nome_instituicao: 'Carteira Física',
                    moeda_conta: 'BRL',
                    saldo_inicial: 0.00
                  });
              }
            }

            if (espacosData && espacosData.length > 0) {
              const listEspacos: Espaco[] = espacosData.map(e => ({
                id: e.id,
                nome: e.nome,
                tipo: e.tipo as 'PF' | 'PJ',
                id_usuario: e.id_usuario
              }));
              
              const currentActiveId = get().id_espaco_ativo;
              const activeId = (currentActiveId && listEspacos.some(e => e.id === currentActiveId))
                ? currentActiveId
                : listEspacos[0].id;
              set({ espacos: listEspacos, id_espaco_ativo: activeId });

              // 3. Fetch de Contas Físicas (Problema 1: FILTRADO pelo id_espaco ativo)
              const { data: contasData } = await supabase
                .from('contas')
                .select('*')
                .eq('id_espaco', activeId);

              if (get().id_espaco_ativo !== activeId) return;

              if (contasData) {
                const listContas: Conta[] = contasData.map(c => ({
                  id: c.id,
                  id_espaco: c.id_espaco,
                  nome_instituicao: c.nome_instituicao,
                  moeda_conta: c.moeda_conta,
                  saldo_inicial: Number(c.saldo_inicial)
                }));
                set({ contas: listContas });
              }

              // 3.5 Fetch de Cartões de Crédito (FILTRADO pelo id_espaco ativo)
              const { data: cartoesData } = await supabase
                .from('cartoes')
                .select('*')
                .eq('id_espaco', activeId);

              if (cartoesData) {
                const listCartoes: Cartao[] = cartoesData.map(c => ({
                  id: c.id,
                  id_espaco: c.id_espaco,
                  nome: c.nome,
                  limite: Number(c.limite),
                  fatura_atual: Number(c.fatura_atual)
                }));
                set({ cartoes: listCartoes });
              }

              if (contasData) {
                // 4. Fetch de Transações (Problema 1: FILTRADO via join de contas pelo id_espaco ativo)
                const { data: transacoesData } = await supabase
                  .from('transacoes')
                  .select('*, contas!inner(*)')
                  .eq('contas.id_espaco', activeId)
                  .is('deleted_at', null);

                if (transacoesData) {
                  const listTransacoes: Transacao[] = transacoesData.map(t => ({
                    id: t.id,
                    id_conta: t.id_conta,
                    tipo: t.tipo as 'receita' | 'despesa',
                    valor: Number(t.valor),
                    categoria: t.categoria,
                    id_tag: t.id_tag,
                    data_transacao: t.data_transacao,
                    taxa_cambio_dia: Number(t.taxa_cambio_dia),
                    descricao: t.descricao,
                    is_compartilhada: t.is_compartilhada || false,
                    participante_email: t.participante_email || undefined,
                    id_transacao_pai: t.id_transacao_pai || undefined,
                  }));
                  set({ transacoes: listTransacoes });
                }
              }

              // 5. Fetch de Caixinhas (Problema 1: FILTRADO pelo id_espaco ativo)
              const { data: caixinhasData } = await supabase
                .from('caixinhas')
                .select('*')
                .eq('id_espaco', activeId)
                .is('deleted_at', null);

              if (caixinhasData) {
                const listCaixinhas: Caixinha[] = caixinhasData.map(c => ({
                  id: c.id,
                  id_espaco: c.id_espaco,
                  nome: c.nome,
                  valor_alvo: Number(c.valor_alvo),
                  saldo_guardado: Number(c.saldo_guardado)
                }));
                set({ caixinhas: listCaixinhas });
              }

              // 6. Fetch de Tags
              try {
                const { data: tagsData } = await supabase
                  .from('tags')
                  .select('*')
                  .eq('id_usuario', userId);
                if (tagsData) {
                  const listTags: Tag[] = tagsData.map(t => ({
                    id: t.id,
                    id_usuario: t.id_usuario,
                    nome: t.nome,
                    cor: t.cor
                  }));
                  set({ tags: listTags });
                }
              } catch (err) {
                console.warn('Erro ao sincronizar tags:', err);
              }

              // 6.5. Fetch de Regras de Tags
              try {
                const { data: regrasData } = await supabase
                  .from('regras_tags')
                  .select('*')
                  .eq('id_usuario', userId);
                if (regrasData) {
                  const listRegras: RegraTag[] = regrasData.map(r => ({
                    id: r.id,
                    id_usuario: r.id_usuario,
                    termo_busca: r.termo_busca,
                    id_tag: r.id_tag
                  }));
                  set({ regras_tags: listRegras });
                }
              } catch (err) {
                console.warn('Erro ao sincronizar regras de tags:', err);
              }

              // 7. Fetch de Transacoes Ativos
              try {
                const { data: txAtivosData, error: txError } = await supabase
                  .from('transacoes_ativos')
                  .select('*')
                  .eq('id_usuario', userId);
                
                if (txError) throw txError;
                
                if (txAtivosData) {
                  const listTxAtivos: TransacaoAtivo[] = txAtivosData.map(t => ({
                    id: t.id,
                    id_usuario: t.id_usuario,
                    ticker: t.ticker,
                    tipo: t.tipo as 'compra' | 'venda',
                    quantidade: Number(t.quantidade),
                    preco_unitario: Number(t.preco_unitario),
                    data_transacao: t.data_transacao
                  }));
                  set({ transacoes_ativos: listTxAtivos });
                }
              } catch (err) {
                console.warn('Erro ao sincronizar transações de ativos:', err);
              }

              // 8. Fetch de Proventos
              try {
                const { data: proventosData, error: proventosError } = await supabase
                  .from('proventos')
                  .select('*')
                  .eq('id_usuario', userId);
                
                if (proventosError) throw proventosError;

                if (proventosData) {
                  const listProventos: Provento[] = proventosData.map(p => ({
                    id: p.id,
                    id_usuario: p.id_usuario,
                    ticker: p.ticker,
                    tipo: p.tipo as 'dividendo' | 'jcp' | 'rendimento',
                    valor: Number(p.valor),
                    data_pagamento: p.data_pagamento
                  }));
                  set({ proventos: listProventos });
                }
              } catch (err) {
                console.warn('Erro ao sincronizar proventos:', err);
              }
            }
          } catch (error) {
            console.warn('Erro ao sincronizar com Supabase, usando dados em cache local:', error);
          } finally {
            currentSyncPromise = null;
            set({ isSyncing: false });
            if (pendingSyncRequest) {
              pendingSyncRequest = false;
              get().syncSupabaseData();
            }
          }
        };

        currentSyncPromise = runSync();
        return currentSyncPromise;
      },

      inicializarOnboarding: async (renda) => {
        // Guard: only run once per user
        const currentState = get();
        if (currentState.onboarding_completo) return;
        const state = get();
        const userId = state.id_usuario;
        
        let activeSpaceId = state.id_espaco_ativo;
        let finalEspacos = [...state.espacos];

        if (userId) {
          // Atualizar renda do usuário no Supabase
          const { error: userErr } = await supabase.from('usuarios').update({
            renda_principal: renda
          }).eq('id', userId);
          if (userErr) throw userErr;

          // Se não tiver um espaço ativo ou não tiver espaços cadastrados
          if (!activeSpaceId || finalEspacos.length === 0 || activeSpaceId === 'space-pf') {
            // Verifica se já existe algum espaço cadastrado no Supabase
            const { data: existingSpaces } = await supabase
              .from('espacos')
              .select('*')
              .eq('id_usuario', userId);

            let spaceToUse;
            if (existingSpaces && existingSpaces.length > 0) {
              spaceToUse = existingSpaces[0];
            } else {
              // Cria o Espaço Pessoal (PF) padrão no Supabase
              const { data: newSpace, error: spaceErr } = await supabase
                .from('espacos')
                .insert({
                  id_usuario: userId,
                  nome: 'Meu Espaço (PF)',
                  tipo: 'PF'
                })
                .select()
                .single();

              if (spaceErr) throw spaceErr;
              spaceToUse = newSpace;
            }

            if (spaceToUse) {
              activeSpaceId = spaceToUse.id;
              finalEspacos = [{
                id: spaceToUse.id,
                nome: spaceToUse.nome,
                tipo: spaceToUse.tipo as 'PF' | 'PJ',
                id_usuario: spaceToUse.id_usuario
              }];
            }
          }

          if (activeSpaceId) {
            const emergencyLimit = renda * 4;

            // Verifica se a Conta Principal já existe no espaço para evitar duplicações
            const { data: existingContas } = await supabase
              .from('contas')
              .select('*')
              .eq('id_espaco', activeSpaceId)
              .eq('nome_instituicao', 'Conta Principal');

            let contaFinalData;
            if (existingContas && existingContas.length > 0) {
              // Atualiza o saldo_inicial se já existir
              const { data: updatedConta, error: updateContaErr } = await supabase
                .from('contas')
                .update({ saldo_inicial: renda })
                .eq('id', existingContas[0].id)
                .select()
                .single();
              if (updateContaErr) throw updateContaErr;
              contaFinalData = updatedConta;
            } else {
              // Cria a Conta Principal
              const { data: newConta, error: contaErr } = await supabase
                .from('contas')
                .insert({
                  id_espaco: activeSpaceId,
                  nome_instituicao: 'Conta Principal',
                  moeda_conta: state.moeda_base,
                  saldo_inicial: renda
                })
                .select()
                .single();
              if (contaErr) throw contaErr;
              contaFinalData = newConta;
            }

            // Verifica se a Caixinha Reserva de Emergência já existe para evitar duplicações
            const { data: existingCaixinhas } = await supabase
              .from('caixinhas')
              .select('*')
              .eq('id_espaco', activeSpaceId)
              .eq('nome', 'Reserva de Emergência');

            let caixinhaFinalData;
            if (existingCaixinhas && existingCaixinhas.length > 0) {
              // Atualiza o valor_alvo se já existir
              const { data: updatedCaixinha, error: updateCaixinhaErr } = await supabase
                .from('caixinhas')
                .update({ valor_alvo: emergencyLimit })
                .eq('id', existingCaixinhas[0].id)
                .select()
                .single();
              if (updateCaixinhaErr) throw updateCaixinhaErr;
              caixinhaFinalData = updatedCaixinha;
            } else {
              // Cria a Caixinha
              const { data: newCaixinha, error: caixinhaErr } = await supabase
                .from('caixinhas')
                .insert({
                  id_espaco: activeSpaceId,
                  nome: 'Reserva de Emergência',
                  valor_alvo: emergencyLimit,
                  saldo_guardado: 0
                })
                .select()
                .single();
              if (caixinhaErr) throw caixinhaErr;
              caixinhaFinalData = newCaixinha;
            }

            const listContas: Conta[] = contaFinalData ? [{
              id: contaFinalData.id,
              id_espaco: contaFinalData.id_espaco,
              nome_instituicao: contaFinalData.nome_instituicao,
              moeda_conta: contaFinalData.moeda_conta,
              saldo_inicial: Number(contaFinalData.saldo_inicial)
            }] : [];

            const listCaixinhas: Caixinha[] = caixinhaFinalData ? [{
              id: caixinhaFinalData.id,
              id_espaco: caixinhaFinalData.id_espaco,
              nome: caixinhaFinalData.nome,
              valor_alvo: Number(caixinhaFinalData.valor_alvo),
              saldo_guardado: Number(caixinhaFinalData.saldo_guardado)
            }] : [];

            // Mark onboarding as complete in Supabase
            await supabase.from('usuarios').update({ onboarding_completo: true }).eq('id', userId);

            set({
              renda_principal: renda,
              espacos: finalEspacos,
              id_espaco_ativo: activeSpaceId,
              onboarding_completo: true,
              contas: [...state.contas.filter(c => c.id_espaco !== activeSpaceId), ...listContas],
              caixinhas: [...state.caixinhas.filter(c => c.id_espaco !== activeSpaceId), ...listCaixinhas]
            });

            await get().syncSupabaseData();
          }
        } else {
          // Usuário Offline / Demo
          const localSpaceId = 'space-pf';
          const emergencyLimit = renda * 4;

          const reservaEmergencia: Caixinha = {
            id: 'caixinha-reserva-emergencia',
            id_espaco: localSpaceId,
            nome: 'Reserva de Emergência',
            valor_alvo: emergencyLimit,
            saldo_guardado: 0,
          };

          const contaInicial: Conta = {
            id: 'conta-principal-onboarding',
            id_espaco: localSpaceId,
            nome_instituicao: 'Conta Principal',
            moeda_conta: state.moeda_base,
            saldo_inicial: renda,
          };

          set({
            renda_principal: renda,
            id_espaco_ativo: localSpaceId,
            onboarding_completo: true,
            caixinhas: [...state.caixinhas.filter(c => c.id !== 'caixinha-reserva-emergencia'), reservaEmergencia],
            contas: [...state.contas.filter(c => c.id !== 'conta-principal-onboarding'), contaInicial],
          });
        }
      },

      clearSession: () => {
        if (syncDebounceTimeout) clearTimeout(syncDebounceTimeout);
        syncDebounceTimeout = null;
        currentSyncPromise = null;
        pendingSyncRequest = false;
        set({ ...INITIAL_STATE, isAuthLoading: false });
      },

      getSaldoTotal: (cotacoes) => {
        const state = get();
        const activeSpaceId = state.id_espaco_ativo;
        if (!activeSpaceId) return 0;

        const cotacoesUtilizadas = cotacoes || state.cotacoes_moedas;
        const baseCurrency = state.moeda_base;
        const activeAccounts = state.contas.filter((c) => c.id_espaco === activeSpaceId);
        let total = 0;

        activeAccounts.forEach((conta) => {
          let accountBalance = conta.saldo_inicial;
          const accountTrans = state.transacoes.filter((t) => t.id_conta === conta.id || t.id_conta_destino === conta.id);

          accountTrans.forEach((t) => {
            if (t.tipo === 'receita') {
              accountBalance = addMoney(accountBalance, t.valor);
            } else if (t.tipo === 'despesa') {
              accountBalance = subtractMoney(accountBalance, t.valor);
            } else if (t.tipo === 'transferencia') {
              if (t.id_conta === conta.id) {
                accountBalance = subtractMoney(accountBalance, t.valor);
              }
              if (t.id_conta_destino === conta.id) {
                accountBalance = addMoney(accountBalance, t.valor);
              }
            }
          });

          if (conta.moeda_conta === baseCurrency) {
            total = addMoney(total, accountBalance);
          } else {
            const balanceInBase = convertCurrency(accountBalance, conta.moeda_conta, baseCurrency, cotacoesUtilizadas);
            total = addMoney(total, balanceInBase);
          }
        });

        return total;
      },

      getResumoMensal: () => {
        const state = get();
        const activeSpaceId = state.id_espaco_ativo;
        if (!activeSpaceId) return { receitas: 0, despesas: 0 };

        const activeAccountIds = state.contas
          .filter((c) => c.id_espaco === activeSpaceId)
          .map((c) => c.id);

        let receitas = 0;
        let despesas = 0;

        state.transacoes.forEach((t) => {
          if (activeAccountIds.includes(t.id_conta)) {
            const conta = state.contas.find(c => c.id === t.id_conta);
            const moedaOrigem = conta ? conta.moeda_conta : state.moeda_base;
            const valorConvertido = convertCurrency(t.valor, moedaOrigem, state.moeda_base, state.cotacoes_moedas);
            if (t.tipo === 'receita') {
              receitas = addMoney(receitas, valorConvertido);
            } else if (t.tipo === 'despesa') {
              despesas = addMoney(despesas, valorConvertido);
            }
          }
        });

        return { receitas, despesas };
      },

      getTransacoesEspacoAtivo: () => {
        const state = get();
        if (!state.id_espaco_ativo) return [];
        const activeAccountIds = state.contas
          .filter((c) => c.id_espaco === state.id_espaco_ativo)
          .map((c) => c.id);
        return state.transacoes.filter((t) => activeAccountIds.includes(t.id_conta) || (t.id_conta_destino && activeAccountIds.includes(t.id_conta_destino)));
      },

      getContasEspacoAtivo: () => {
        const state = get();
        if (!state.id_espaco_ativo) return [];
        return state.contas.filter((c) => c.id_espaco === state.id_espaco_ativo);
      },

      getCartoesEspacoAtivo: () => {
        const state = get();
        if (!state.id_espaco_ativo) return [];
        return state.cartoes.filter((c) => c.id_espaco === state.id_espaco_ativo);
      },

      getCaixinhasEspacoAtivo: () => {
        const state = get();
        if (!state.id_espaco_ativo) return [];
        return state.caixinhas.filter((c) => c.id_espaco === state.id_espaco_ativo);
      },

      loadDemoData: () => {
        const userId = 'demo-user-123';

        set({
          id_usuario: userId,
          email_usuario: 'usuario@comreis.com',
          nome_usuario: 'Rodrigo Silva',
          plano_usuario: 'free',
          moeda_base: 'BRL',
          renda_principal: 3500.00,
          id_espaco_ativo: 'space-pf',
          espacos: [
            { id: 'space-pf', nome: 'Minha Vida (PF)', tipo: 'PF', id_usuario: userId },
            { id: 'space-pj', nome: 'Consultoria PSTec (PJ)', tipo: 'PJ', id_usuario: userId },
          ],
          contas: [
            { id: 'conta-nubank',   id_espaco: 'space-pf', nome_instituicao: 'Nubank',        moeda_conta: 'BRL', saldo_inicial: 1500.00 },
            { id: 'conta-wise-usd', id_espaco: 'space-pf', nome_instituicao: 'Wise USD',       moeda_conta: 'USD', saldo_inicial: 350.00 },
            { id: 'conta-pj-inter', id_espaco: 'space-pj', nome_instituicao: 'Banco Inter PJ', moeda_conta: 'BRL', saldo_inicial: 8500.00 },
          ],
          transacoes: [
            { id: 't1', id_conta: 'conta-nubank',   tipo: 'receita', valor: 3500.00, categoria: 'Salário',      data_transacao: '2026-06-15', taxa_cambio_dia: 1.0, descricao: 'Salário Mensal' },
            { id: 't2', id_conta: 'conta-nubank',   tipo: 'despesa', valor: 1200.00, categoria: 'Moradia',      data_transacao: '2026-06-16', taxa_cambio_dia: 1.0, descricao: 'Aluguel' },
            { id: 't3', id_conta: 'conta-nubank',   tipo: 'despesa', valor: 250.50,  categoria: 'Alimentação',  data_transacao: '2026-06-18', taxa_cambio_dia: 1.0, descricao: 'Supermercado' },
            { id: 't4', id_conta: 'conta-wise-usd', tipo: 'receita', valor: 150.00,  categoria: 'Freelance',    data_transacao: '2026-06-10', taxa_cambio_dia: 5.4, descricao: 'Design Logo' },
            { id: 't5', id_conta: 'conta-wise-usd', tipo: 'despesa', valor: 29.99,   categoria: 'Assinaturas',  data_transacao: '2026-06-12', taxa_cambio_dia: 5.4, descricao: 'SaaS Tool' },
            { id: 't6', id_conta: 'conta-pj-inter', tipo: 'receita', valor: 12000.00,categoria: 'Serviços',     data_transacao: '2026-06-14', taxa_cambio_dia: 1.0, descricao: 'Projeto Migração Vivare' },
            { id: 't7', id_conta: 'conta-pj-inter', tipo: 'despesa', valor: 1500.00, categoria: 'Impostos',     data_transacao: '2026-06-15', taxa_cambio_dia: 1.0, descricao: 'DAS MEI + Pró-labore' },
            { id: 't8', id_conta: 'conta-pj-inter', tipo: 'despesa', valor: 450.00,  categoria: 'Ferramentas',  data_transacao: '2026-06-17', taxa_cambio_dia: 1.0, descricao: 'Google Workspace & AWS' },
          ],
          caixinhas: [
            { id: 'c1', id_espaco: 'space-pf', nome: 'Reserva de Emergência',       valor_alvo: 14000.00, saldo_guardado: 4500.00 },
            { id: 'c2', id_espaco: 'space-pf', nome: 'Viagem Europa',                valor_alvo: 20000.00, saldo_guardado: 1200.00 },
            { id: 'c3', id_espaco: 'space-pj', nome: 'Provisão de Décimo Terceiro', valor_alvo: 5000.00,  saldo_guardado: 1500.00 },
          ],
          transacoes_ativos: [
            { id: 'ta1', id_usuario: userId, ticker: 'PETR4', tipo: 'compra', quantidade: 300, preco_unitario: 32.50, data_transacao: '2026-06-01' },
            { id: 'ta2', id_usuario: userId, ticker: 'PETR4', tipo: 'compra', quantidade: 100, preco_unitario: 38.00, data_transacao: '2026-06-20' },
            { id: 'ta3', id_usuario: userId, ticker: 'VALE3', tipo: 'compra', quantidade: 150, preco_unitario: 68.20, data_transacao: '2026-05-15' },
            { id: 'ta4', id_usuario: userId, ticker: 'BTC', tipo: 'compra', quantidade: 0.01, preco_unitario: 320000.00, data_transacao: '2026-06-10' },
            { id: 'ta5', id_usuario: userId, ticker: 'USD', tipo: 'compra', quantidade: 350, preco_unitario: 5.15, data_transacao: '2026-06-12' },
          ],
          proventos: [
            { id: 'p1', id_usuario: userId, ticker: 'PETR4', tipo: 'dividendo', valor: 85.20, data_pagamento: '2026-06-18' },
            { id: 'p2', id_usuario: userId, ticker: 'MXRF11', tipo: 'rendimento', valor: 99.00, data_pagamento: '2026-06-08' },
            { id: 'p3', id_usuario: userId, ticker: 'PETR4', tipo: 'dividendo', valor: 75.00, data_pagamento: '2026-05-25' },
            { id: 'p4', id_usuario: userId, ticker: 'MXRF11', tipo: 'rendimento', valor: 95.00, data_pagamento: '2026-05-10' },
            { id: 'p5', id_usuario: userId, ticker: 'VALE3', tipo: 'jcp', valor: 110.00, data_pagamento: '2026-04-20' },
            { id: 'p6', id_usuario: userId, ticker: 'MXRF11', tipo: 'rendimento', valor: 90.00, data_pagamento: '2026-04-08' },
          ]
        });
      },
    }),
    {
      name: 'mangos-mobile-state-v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        id_usuario: state.id_usuario,
        email_usuario: state.email_usuario,
        nome_usuario: state.nome_usuario,
        plano_usuario: state.plano_usuario,
        moeda_base: state.moeda_base,
        renda_principal: state.renda_principal,
        id_espaco_ativo: state.id_espaco_ativo,
        onboarding_completo: state.onboarding_completo,
        espacos: state.espacos,
        contas: state.contas,
        transacoes: state.transacoes,
        caixinhas: state.caixinhas,
        transacoes_ativos: state.transacoes_ativos,
        proventos: state.proventos,
        cotacoes_ativos: state.cotacoes_ativos,
      }),
    }
  )
);
