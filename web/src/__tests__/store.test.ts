/**
 * store.test.ts
 * Testes unitários para o Zustand store (useStore.ts)
 *
 * Cobre:
 * - Estado inicial
 * - setUsuario, setPlanoUsuario, setMoedaBase
 * - addEspaco, addConta, addTransacao, addCaixinha
 * - updateCaixinhaSaldo
 * - getSaldoTotal (lógica de saldo consolidado multimoedas)
 * - getTransacoesEspacoAtivo, getContasEspacoAtivo, getCaixinhasEspacoAtivo
 * - loadDemoData
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';

// Reset store before each test
beforeEach(() => {
  useStore.setState({
    id_usuario: null,
    email_usuario: null,
    nome_usuario: null,
    plano_usuario: 'free',
    moeda_base: 'BRL',
    id_espaco_ativo: null,
    espacos: [],
    contas: [],
    transacoes: [],
    caixinhas: [],
  });
});

// ─── ESTADO INICIAL ───────────────────────────────────────────────────────────

describe('Estado inicial', () => {
  it('começa sem usuário logado', () => {
    const s = useStore.getState();
    expect(s.id_usuario).toBeNull();
    expect(s.plano_usuario).toBe('free');
    expect(s.moeda_base).toBe('BRL');
    expect(s.espacos).toHaveLength(0);
    expect(s.contas).toHaveLength(0);
    expect(s.transacoes).toHaveLength(0);
    expect(s.caixinhas).toHaveLength(0);
  });

  it('getSaldoTotal retorna 0 quando sem espaço ativo', () => {
    expect(useStore.getState().getSaldoTotal()).toBe(0);
  });

  it('getTransacoesEspacoAtivo retorna array vazio sem espaço ativo', () => {
    expect(useStore.getState().getTransacoesEspacoAtivo()).toHaveLength(0);
  });
});

// ─── setUsuario ───────────────────────────────────────────────────────────────

describe('setUsuario()', () => {
  it('define os dados do usuário corretamente', () => {
    const { setUsuario } = useStore.getState();
    setUsuario('user-1', 'joao@comreis.com', 'João Silva', 'premium', 'USD');
    const s = useStore.getState();
    expect(s.id_usuario).toBe('user-1');
    expect(s.email_usuario).toBe('joao@comreis.com');
    expect(s.nome_usuario).toBe('João Silva');
    expect(s.plano_usuario).toBe('premium');
    expect(s.moeda_base).toBe('USD');
  });

  it('usa "free" como plano padrão se não informado', () => {
    useStore.getState().setUsuario('user-2', 'e@m.com', 'Teste');
    expect(useStore.getState().plano_usuario).toBe('free');
  });

  it('setUsuario(null) efetua logout', () => {
    useStore.getState().setUsuario('u', 'e@m.com', 'User');
    useStore.getState().setUsuario(null, null, null);
    const s = useStore.getState();
    expect(s.id_usuario).toBeNull();
    expect(s.email_usuario).toBeNull();
    expect(s.nome_usuario).toBeNull();
  });
});

// ─── setPlanoUsuario ─────────────────────────────────────────────────────────

describe('setPlanoUsuario()', () => {
  it('muda de free para premium', () => {
    useStore.getState().setPlanoUsuario('premium');
    expect(useStore.getState().plano_usuario).toBe('premium');
  });

  it('pode reverter para free', () => {
    useStore.getState().setPlanoUsuario('premium');
    useStore.getState().setPlanoUsuario('free');
    expect(useStore.getState().plano_usuario).toBe('free');
  });
});

// ─── addEspaco ────────────────────────────────────────────────────────────────

describe('addEspaco()', () => {
  it('adiciona um espaço e define como ativo automaticamente', () => {
    const espaco = { id: 'e1', nome: 'Minha Vida', tipo: 'PF' as const, id_usuario: 'u1' };
    useStore.getState().addEspaco(espaco);
    const s = useStore.getState();
    expect(s.espacos).toHaveLength(1);
    expect(s.id_espaco_ativo).toBe('e1');
  });

  it('adicionar segundo espaço não muda o espaço ativo', () => {
    useStore.getState().addEspaco({ id: 'e1', nome: 'PF', tipo: 'PF', id_usuario: 'u1' });
    useStore.getState().addEspaco({ id: 'e2', nome: 'PJ', tipo: 'PJ', id_usuario: 'u1' });
    expect(useStore.getState().id_espaco_ativo).toBe('e1'); // mantém o primeiro
  });
});

// ─── addConta ─────────────────────────────────────────────────────────────────

describe('addConta()', () => {
  it('adiciona uma conta ao array de contas', () => {
    const conta = { id: 'c1', id_espaco: 'e1', nome_instituicao: 'Nubank', moeda_conta: 'BRL', saldo_inicial: 1000 };
    useStore.getState().addConta(conta);
    expect(useStore.getState().contas).toHaveLength(1);
  });

  it('adiciona múltiplas contas sem perder nenhuma', () => {
    useStore.getState().addConta({ id: 'c1', id_espaco: 'e1', nome_instituicao: 'Nu', moeda_conta: 'BRL', saldo_inicial: 500 });
    useStore.getState().addConta({ id: 'c2', id_espaco: 'e1', nome_instituicao: 'Wise', moeda_conta: 'USD', saldo_inicial: 100 });
    expect(useStore.getState().contas).toHaveLength(2);
  });
});

// ─── addTransacao ─────────────────────────────────────────────────────────────

describe('addTransacao()', () => {
  it('adiciona uma transação ao início do array (mais recente primeiro)', () => {
    const tx1 = { id: 't1', id_conta: 'c1', tipo: 'receita' as const, valor: 100, categoria: 'Salário', data_transacao: '2026-06-01', taxa_cambio_dia: 1 };
    const tx2 = { id: 't2', id_conta: 'c1', tipo: 'despesa' as const, valor: 50, categoria: 'Alimentação', data_transacao: '2026-06-02', taxa_cambio_dia: 1 };
    useStore.getState().addTransacao(tx1);
    useStore.getState().addTransacao(tx2);
    // tx2 deve ser o primeiro (mais recente)
    expect(useStore.getState().transacoes[0].id).toBe('t2');
  });
});

// ─── getSaldoTotal ────────────────────────────────────────────────────────────

describe('getSaldoTotal()', () => {
  const setupSpace = () => {
    useStore.setState({ id_espaco_ativo: 'e1' });
    useStore.getState().addConta({ id: 'c1', id_espaco: 'e1', nome_instituicao: 'Nu', moeda_conta: 'BRL', saldo_inicial: 1000 });
  };

  it('retorna saldo inicial sem transações', () => {
    setupSpace();
    expect(useStore.getState().getSaldoTotal()).toBe(1000);
  });

  it('soma receitas ao saldo', () => {
    setupSpace();
    useStore.getState().addTransacao({ id: 't1', id_conta: 'c1', tipo: 'receita', valor: 500, categoria: 'Salário', data_transacao: '2026-06-01', taxa_cambio_dia: 1 });
    expect(useStore.getState().getSaldoTotal()).toBe(1500);
  });

  it('subtrai despesas do saldo', () => {
    setupSpace();
    useStore.getState().addTransacao({ id: 't1', id_conta: 'c1', tipo: 'despesa', valor: 200, categoria: 'Moradia', data_transacao: '2026-06-01', taxa_cambio_dia: 1 });
    expect(useStore.getState().getSaldoTotal()).toBe(800);
  });

  it('saldo consolidado com receitas e despesas mistas é preciso', () => {
    setupSpace();
    // +500 -200 +100 -50 = 350 adicional ao saldo inicial de 1000 = 1350
    useStore.getState().addTransacao({ id: 't1', id_conta: 'c1', tipo: 'receita', valor: 500, categoria: 'Salário', data_transacao: '2026-06-01', taxa_cambio_dia: 1 });
    useStore.getState().addTransacao({ id: 't2', id_conta: 'c1', tipo: 'despesa', valor: 200, categoria: 'Moradia', data_transacao: '2026-06-02', taxa_cambio_dia: 1 });
    useStore.getState().addTransacao({ id: 't3', id_conta: 'c1', tipo: 'receita', valor: 100, categoria: 'Freelance', data_transacao: '2026-06-03', taxa_cambio_dia: 1 });
    useStore.getState().addTransacao({ id: 't4', id_conta: 'c1', tipo: 'despesa', valor: 50, categoria: 'Lazer', data_transacao: '2026-06-04', taxa_cambio_dia: 1 });
    expect(useStore.getState().getSaldoTotal()).toBe(1350);
  });

  it('converte conta USD para BRL usando cotação', () => {
    useStore.setState({ id_espaco_ativo: 'e2', moeda_base: 'BRL' });
    useStore.getState().addConta({ id: 'c2', id_espaco: 'e2', nome_instituicao: 'Wise', moeda_conta: 'USD', saldo_inicial: 100 });
    // 100 USD × 5.4 BRL/USD = 540 BRL
    const rates = { BRL: 1.0, USD: 5.4, EUR: 5.8, ARS: 0.006 };
    expect(useStore.getState().getSaldoTotal(rates)).toBe(540);
  });

  it('retorna 0 para espaço sem contas', () => {
    useStore.setState({ id_espaco_ativo: 'e-vazio' });
    expect(useStore.getState().getSaldoTotal()).toBe(0);
  });
});

// ─── updateCaixinhaSaldo ──────────────────────────────────────────────────────

describe('updateCaixinhaSaldo()', () => {
  it('atualiza corretamente o saldo da caixinha', () => {
    useStore.getState().addCaixinha({ id: 'cx1', id_espaco: 'e1', nome: 'Viagem', valor_alvo: 5000, saldo_guardado: 0 });
    useStore.getState().updateCaixinhaSaldo('cx1', 1500);
    const caixinha = useStore.getState().caixinhas.find(c => c.id === 'cx1');
    expect(caixinha?.saldo_guardado).toBe(1500);
  });

  it('não afeta outras caixinhas', () => {
    useStore.getState().addCaixinha({ id: 'cx1', id_espaco: 'e1', nome: 'Viagem', valor_alvo: 5000, saldo_guardado: 0 });
    useStore.getState().addCaixinha({ id: 'cx2', id_espaco: 'e1', nome: 'Reserva', valor_alvo: 10000, saldo_guardado: 500 });
    useStore.getState().updateCaixinhaSaldo('cx1', 2000);
    const cx2 = useStore.getState().caixinhas.find(c => c.id === 'cx2');
    expect(cx2?.saldo_guardado).toBe(500); // inalterada
  });
});

// ─── Getters de espaço ativo ──────────────────────────────────────────────────

describe('Getters de espaço ativo', () => {
  beforeEach(() => {
    useStore.setState({ id_espaco_ativo: 'e1' });
    useStore.getState().addConta({ id: 'c1', id_espaco: 'e1', nome_instituicao: 'Nu', moeda_conta: 'BRL', saldo_inicial: 0 });
    useStore.getState().addConta({ id: 'c2', id_espaco: 'e2', nome_instituicao: 'Outro', moeda_conta: 'BRL', saldo_inicial: 0 });
    useStore.getState().addTransacao({ id: 't1', id_conta: 'c1', tipo: 'receita', valor: 100, categoria: 'Teste', data_transacao: '2026-06-01', taxa_cambio_dia: 1 });
    useStore.getState().addTransacao({ id: 't2', id_conta: 'c2', tipo: 'despesa', valor: 200, categoria: 'Outro', data_transacao: '2026-06-01', taxa_cambio_dia: 1 });
    useStore.getState().addCaixinha({ id: 'cx1', id_espaco: 'e1', nome: 'Meta PF', valor_alvo: 1000, saldo_guardado: 0 });
    useStore.getState().addCaixinha({ id: 'cx2', id_espaco: 'e2', nome: 'Meta PJ', valor_alvo: 5000, saldo_guardado: 0 });
  });

  it('getContasEspacoAtivo retorna só contas do espaço ativo', () => {
    const contas = useStore.getState().getContasEspacoAtivo();
    expect(contas).toHaveLength(1);
    expect(contas[0].id).toBe('c1');
  });

  it('getTransacoesEspacoAtivo retorna só transações do espaço ativo', () => {
    const txs = useStore.getState().getTransacoesEspacoAtivo();
    expect(txs).toHaveLength(1);
    expect(txs[0].id).toBe('t1');
  });

  it('getCaixinhasEspacoAtivo retorna só caixinhas do espaço ativo', () => {
    const cxs = useStore.getState().getCaixinhasEspacoAtivo();
    expect(cxs).toHaveLength(1);
    expect(cxs[0].id).toBe('cx1');
  });
});

// ─── loadDemoData ─────────────────────────────────────────────────────────────

describe('loadDemoData()', () => {
  it('carrega dados de demonstração com usuário, espaços, contas e transações', () => {
    useStore.getState().loadDemoData();
    const s = useStore.getState();
    expect(s.id_usuario).toBeTruthy();
    expect(s.espacos.length).toBeGreaterThanOrEqual(2); // PF + PJ
    expect(s.contas.length).toBeGreaterThan(0);
    expect(s.transacoes.length).toBeGreaterThan(0);
    expect(s.caixinhas.length).toBeGreaterThan(0);
  });

  it('demo tem espaços PF e PJ', () => {
    useStore.getState().loadDemoData();
    const tipos = useStore.getState().espacos.map(e => e.tipo);
    expect(tipos).toContain('PF');
    expect(tipos).toContain('PJ');
  });

  it('saldo total dos dados demo é maior que zero', () => {
    useStore.getState().loadDemoData();
    const saldo = useStore.getState().getSaldoTotal();
    expect(saldo).toBeGreaterThan(0);
  });
});
