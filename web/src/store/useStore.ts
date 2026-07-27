import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { addMoney, subtractMoney } from '../utils/currency';

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

export interface Transacao {
  id: string;
  id_conta: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria: string;
  data_transacao: string;
  taxa_cambio_dia: number;
  descricao?: string;
  moeda_transacao?: string;
  id_tag_bancaria?: string | null;
  is_compartilhada?: boolean;
  participante_email?: string;
  id_transacao_pai?: string | null;
}

export interface Caixinha {
  id: string;
  id_espaco: string;
  nome: string;
  valor_alvo: number;
  saldo_guardado: number;
}

export interface Cartao {
  id: string;
  id_espaco: string;
  nome: string;
  limite: number;
  fatura_atual: number;
}

export interface TagBancaria {
  id: string;
  id_usuario: string;
  nome: string;
  cor: string;
}

export interface TransacaoRecorrente {
  id: string;
  id_usuario: string;
  id_espaco: string;
  id_conta: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria: string;
  moeda_transacao: string;
  descricao?: string;
  frequencia: 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  dia_vencimento: number;
  data_inicio: string;
  data_fim?: string;
  ativo: boolean;
}

interface AppState {
  // Auth & User Info
  id_usuario: string | null;
  email_usuario: string | null;
  nome_usuario: string | null;
  plano_usuario: 'free' | 'premium';
  moeda_base: string;
  avatar_url: string | null;
  isAuthLoading: boolean;

  // Active States
  id_espaco_ativo: string | null;
  isCheckoutModalVisible: boolean;

  // Data Lists
  espacos: Espaco[];
  contas: Conta[];
  transacoes: Transacao[];
  caixinhas: Caixinha[];
  cartoes: Cartao[];
  tagsBancarias: TagBancaria[];
  transacoesRecorrentes: TransacaoRecorrente[];

  // Actions
  setUsuario: (id: string | null, email: string | null, nome: string | null, plano?: 'free' | 'premium', moeda_base?: string, avatar_url?: string | null) => void;
  setPlanoUsuario: (plano: 'free' | 'premium') => void;
  setMoedaBase: (moeda: string) => void;
  setIdEspacoAtivo: (id: string | null) => void;
  updateAvatarUrl: (url: string | null) => void;
  setAuthLoading: (loading: boolean) => void;
  toggleCheckoutModal: (visible: boolean) => void;

  setEspacos: (espacos: Espaco[]) => void;
  setContas: (contas: Conta[]) => void;
  setTransacoes: (transacoes: Transacao[]) => void;
  setCaixinhas: (caixinhas: Caixinha[]) => void;
  setCartoes: (cartoes: Cartao[]) => void;
  setTagsBancarias: (tags: TagBancaria[]) => void;

  addEspaco: (espaco: Espaco) => void;
  addConta: (conta: Conta) => void;
  addTransacao: (transacao: Transacao) => void;
  addCaixinha: (caixinha: Caixinha) => void;
  addCartao: (cartao: Cartao) => void;
  updateCaixinhaSaldo: (caixinhaId: string, novoSaldo: number) => void;
  updateCaixinha: (id: string, nome: string, valor_alvo: number) => void;
  updateCartao: (id: string, nome: string, limite: number, fatura_atual: number) => void;
  updateTransacaoConta: (txId: string, novaContaId: string) => void;
  removeConta: (id: string) => void;
  removeTransacao: (id: string) => void;
  removeCaixinha: (id: string) => void;
  removeCartao: (id: string) => void;
  addTagBancaria: (tag: TagBancaria) => void;
  updateTagBancaria: (id: string, nome: string, cor: string) => void;
  removeTagBancaria: (id: string) => void;
  setTransacoesRecorrentes: (recorrentes: TransacaoRecorrente[]) => void;
  addTransacaoRecorrente: (recorrente: TransacaoRecorrente) => void;
  updateTransacaoRecorrente: (id: string, updates: Partial<Omit<TransacaoRecorrente, 'id' | 'id_usuario'>>) => void;
  removeTransacaoRecorrente: (id: string) => void;

  // Derived Getters
  getSaldoTotal: (cotacoes?: Record<string, number>) => number;
  getTransacoesEspacoAtivo: () => Transacao[];
  getContasEspacoAtivo: () => Conta[];
  getCaixinhasEspacoAtivo: () => Caixinha[];
  getCartoesEspacoAtivo: () => Cartao[];

  // Reset (logout)
  clearSession: () => void;

  // Development / Demo helper
  loadDemoData: () => void;
}

// Estado inicial separado para facilitar reset no logout
const INITIAL_STATE = {
  id_usuario: null,
  email_usuario: null,
  nome_usuario: null,
  plano_usuario: 'free' as const,
  moeda_base: 'BRL',
  avatar_url: null,
  id_espaco_ativo: null,
  isCheckoutModalVisible: false,
  espacos: [],
  contas: [],
  transacoes: [],
  caixinhas: [],
  cartoes: [],
  tagsBancarias: [],
  transacoesRecorrentes: [],
  isAuthLoading: true,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setUsuario: (id, email, nome, plano = 'free', moeda_base = 'BRL', avatar_url = null) =>
        set({ id_usuario: id, email_usuario: email, nome_usuario: nome, plano_usuario: plano, moeda_base, avatar_url, isAuthLoading: false }),

      setPlanoUsuario: (plano) => set({ plano_usuario: plano }),
      setMoedaBase: (moeda) => set({ moeda_base: moeda }),
      setIdEspacoAtivo: (id) => set({ id_espaco_ativo: id }),
      updateAvatarUrl: (url) => set({ avatar_url: url }),
      setAuthLoading: (loading) => set({ isAuthLoading: loading }),
      toggleCheckoutModal: (visible) => set({ isCheckoutModalVisible: visible }),

      setEspacos: (espacos) => {
        const current = get().id_espaco_ativo;
        const isValid = current && espacos.some((e) => e.id === current);
        set({
          espacos,
          id_espaco_ativo: espacos.length > 0
            ? (isValid ? current : espacos[0].id)
            : null,
        });
      },
      setContas: (contas) => set({ contas }),
      setTransacoes: (transacoes) => set({ transacoes }),
      setCaixinhas: (caixinhas) => set({ caixinhas }),

      addEspaco: (espaco) => set((state) => ({
        espacos: [...state.espacos, espaco],
        id_espaco_ativo: state.id_espaco_ativo ? state.id_espaco_ativo : espaco.id,
      })),

      addConta: (conta) => set((state) => ({ contas: [...state.contas, conta] })),

      addTransacao: (transacao) => set((state) => ({ transacoes: [transacao, ...state.transacoes] })),

      addCaixinha: (caixinha) => set((state) => ({ caixinhas: [...state.caixinhas, caixinha] })),

      updateCaixinhaSaldo: (caixinhaId, novoSaldo) => set((state) => ({
        caixinhas: state.caixinhas.map((c) => c.id === caixinhaId ? { ...c, saldo_guardado: novoSaldo } : c),
      })),

      updateCaixinha: (id, nome, valor_alvo) => set((state) => ({
        caixinhas: state.caixinhas.map((c) => c.id === id ? { ...c, nome, valor_alvo } : c),
      })),

      updateCartao: (id, nome, limite, fatura_atual) => set((state) => ({
        cartoes: state.cartoes.map((c) => c.id === id ? { ...c, nome, limite, fatura_atual } : c),
      })),

      updateTransacaoConta: (txId, novaContaId) => set((state) => ({
        transacoes: state.transacoes.map(t => t.id === txId ? { ...t, id_conta: novaContaId } : t),
      })),
      removeConta: (id) => set((state) => ({ contas: state.contas.filter(c => c.id !== id) })),
      removeTransacao: (id) => set((state) => ({ transacoes: state.transacoes.filter(t => t.id !== id) })),
      removeCaixinha: (id) => set((state) => ({ caixinhas: state.caixinhas.filter(c => c.id !== id) })),
      removeCartao: (id) => set((state) => ({ cartoes: state.cartoes.filter(c => c.id !== id) })),

      setCartoes: (cartoes) => set({ cartoes }),
      addCartao: (cartao) => set((state) => ({ cartoes: [...state.cartoes, cartao] })),

      setTagsBancarias: (tags) => set({ tagsBancarias: tags }),
      addTagBancaria: (tag) => set((state) => ({ tagsBancarias: [...state.tagsBancarias, tag] })),
      updateTagBancaria: (id, nome, cor) => set((state) => ({
        tagsBancarias: state.tagsBancarias.map(t => t.id === id ? { ...t, nome, cor } : t),
      })),
      removeTagBancaria: (id) => set((state) => ({
        tagsBancarias: state.tagsBancarias.filter(t => t.id !== id),
      })),

      setTransacoesRecorrentes: (recorrentes) => set({ transacoesRecorrentes: recorrentes }),
      addTransacaoRecorrente: (recorrente) => set((state) => ({
        transacoesRecorrentes: [recorrente, ...state.transacoesRecorrentes],
      })),
      updateTransacaoRecorrente: (id, updates) => set((state) => ({
        transacoesRecorrentes: state.transacoesRecorrentes.map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
      })),
      removeTransacaoRecorrente: (id) => set((state) => ({
        transacoesRecorrentes: state.transacoesRecorrentes.filter(r => r.id !== id),
      })),

      // Limpa a sessão sem apagar o estado persistido do localStorage
      clearSession: () => set({
        id_usuario: null,
        email_usuario: null,
        nome_usuario: null,
        plano_usuario: 'free' as const,
        moeda_base: 'BRL',
        avatar_url: null,
        isCheckoutModalVisible: false,
        isAuthLoading: true,
        // NÃO reseta id_espaco_ativo nem dados — preserva estado do localStorage
      }),

      // ─── GETTERS DERIVADOS ───────────────────────────────────────────────────

      getSaldoTotal: (cotacoes = { USD: 5.4, EUR: 5.8, ARS: 0.006, BRL: 1.0 }) => {
        const state = get();
        const activeSpaceId = state.id_espaco_ativo;
        if (!activeSpaceId) return 0;

        const baseCurrency = state.moeda_base;
        const activeAccounts = state.contas.filter((c) => c.id_espaco === activeSpaceId);
        let total = 0;

        activeAccounts.forEach((conta) => {
          let accountBalance = conta.saldo_inicial;
          const accountTrans = state.transacoes.filter((t) => t.id_conta === conta.id && !t.descricao?.startsWith('[Cartao:'));

          accountTrans.forEach((t) => {
            accountBalance = t.tipo === 'receita'
              ? addMoney(accountBalance, t.valor)
              : subtractMoney(accountBalance, t.valor);
          });

          // Use moeda_transacao if available, fallback to conta.moeda_conta
          const moedaConta = conta.moeda_conta;
          if (moedaConta === baseCurrency) {
            total = addMoney(total, accountBalance);
          } else {
            const rateToBRL = cotacoes[moedaConta] || 1.0;
            const rateFromBRL = cotacoes[baseCurrency] || 1.0;
            const balanceInBRL = accountBalance * rateToBRL;
            const balanceInBase = balanceInBRL / rateFromBRL;
            total = addMoney(total, balanceInBase);
          }
        });

        return total;
      },

      getTransacoesEspacoAtivo: () => {
        const state = get();
        if (!state.id_espaco_ativo) return [];
        const activeAccountIds = state.contas
          .filter((c) => c.id_espaco === state.id_espaco_ativo)
          .map((c) => c.id);
        return state.transacoes.filter((t) => activeAccountIds.includes(t.id_conta));
      },

      getContasEspacoAtivo: () => {
        const state = get();
        if (!state.id_espaco_ativo) return [];
        return state.contas.filter((c) => c.id_espaco === state.id_espaco_ativo);
      },

      getCaixinhasEspacoAtivo: () => {
        const state = get();
        if (!state.id_espaco_ativo) return [];
        return state.caixinhas.filter((c) => c.id_espaco === state.id_espaco_ativo);
      },

      getCartoesEspacoAtivo: () => {
        const state = get();
        if (!state.id_espaco_ativo) return [];
        return state.cartoes.filter((c) => c.id_espaco === state.id_espaco_ativo);
      },

      // ─── DEMO DATA ────────────────────────────────────────────────────────────

      loadDemoData: () => {
        const userId = 'demo-user-123';

        set({
          id_usuario: userId,
          email_usuario: 'usuario@comreis.com',
          nome_usuario: 'Rodrigo Silva',
          plano_usuario: 'free',
          moeda_base: 'BRL',
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
            { id: 'c1', id_espaco: 'space-pf', nome: 'Reserva de Emergência',       valor_alvo: 15000.00, saldo_guardado: 4500.00 },
            { id: 'c2', id_espaco: 'space-pf', nome: 'Viagem Europa',                valor_alvo: 20000.00, saldo_guardado: 1200.00 },
            { id: 'c3', id_espaco: 'space-pj', nome: 'Provisão de Décimo Terceiro', valor_alvo: 5000.00,  saldo_guardado: 1500.00 },
          ],
          cartoes: [
            { id: 'cartao-1', id_espaco: 'space-pf', nome: 'Cartão de Crédito Nubank', limite: 5000.00, fatura_atual: 120.00 }
          ],
        });
      },
    }),
    {
      name: 'mangos-state-v1', // chave no localStorage
      storage: createJSONStorage(() => localStorage),
      // Persiste tudo EXCETO as funções (getters/actions são recriados automaticamente)
      partialize: (state) => ({
        id_usuario: state.id_usuario,
        email_usuario: state.email_usuario,
        nome_usuario: state.nome_usuario,
        plano_usuario: state.plano_usuario,
        moeda_base: state.moeda_base,
        avatar_url: state.avatar_url,
        id_espaco_ativo: state.id_espaco_ativo,
        espacos: state.espacos,
        contas: state.contas,
        transacoes: state.transacoes,
        caixinhas: state.caixinhas,
        cartoes: state.cartoes,
        tagsBancarias: state.tagsBancarias,
        transacoesRecorrentes: state.transacoesRecorrentes,
      }),
    }
  )
);
