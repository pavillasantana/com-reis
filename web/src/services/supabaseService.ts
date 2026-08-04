/**
 * supabaseService.ts
 * Camada de serviços para todas as operações CRUD no Supabase.
 *
 * Cada função retorna { data, error } seguindo o padrão do supabase-js.
 * O erro é tipado como string para facilitar o consumo nos hooks.
 *
 * Tabelas: usuarios | espacos | contas | transacoes | caixinhas
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Espaco, Conta, Transacao, Caixinha, Cartao, TagBancaria, TransacaoRecorrente } from '../store/useStore';
import { captureError } from '../lib/sentry';

// Helpers internos
type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>;

function notConfigured<T>(): ServiceResult<T> {
  return Promise.resolve({ data: null, error: 'Supabase não configurado.' });
}

// ─── USUÁRIOS ─────────────────────────────────────────────────────────────────

export interface UsuarioPerfil {
  id: string;
  email: string;
  nome_completo: string | null;
  plano: 'free' | 'premium';
  moeda_base: string;
  avatar_url?: string | null;
  renda_principal?: number | null;
  sobrenome?: string | null;
  profissao?: string | null;
  fonte_renda?: string | null;
  data_nascimento?: string | null;
  documento?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  sexo?: string | null;
  nacionalidade?: string | null;
  deleted_at?: string | null;
}

const PERFIL_BASE_COLUMNS = 'id, email, nome_completo, plano, moeda_base, avatar_url, deleted_at';
const PERFIL_EXTRA_COLUMNS = 'renda_principal, sobrenome, profissao, fonte_renda, data_nascimento, documento, endereco, telefone, sexo, nacionalidade';

/**
 * Busca o perfil do usuário logado na tabela public.usuarios.
 * Chamado após login para carregar o plano e preferências.
 */
export async function fetchPerfil(userId: string): ServiceResult<UsuarioPerfil> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    // Tentar com as colunas completas do perfil primeiro
    let { data, error } = await supabase
      .from('usuarios')
      .select(`${PERFIL_BASE_COLUMNS}, ${PERFIL_EXTRA_COLUMNS}`)
      .eq('id', userId)
      .single();
    // Se a query falhou (colunas novas podem não existir no DB), tentar sem elas
    if (error) {
      const result = await supabase
        .from('usuarios')
        .select(PERFIL_BASE_COLUMNS)
        .eq('id', userId)
        .single();
      data = result.data;
      error = result.error;
    }
    if (error) return { data: null, error: error.message };
    return { data: data as UsuarioPerfil, error: null };
  } catch (e) {
    captureError(e, { action: 'fetchPerfil', userId });
    return { data: null, error: 'Erro ao buscar perfil.' };
  }
}

/**
 * Atualiza o plano do usuário (free → premium) e a moeda base.
 */
export async function updatePerfil(
  userId: string,
  updates: Partial<Omit<UsuarioPerfil, 'id'>>
): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', userId);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'updatePerfil', userId });
    return { data: null, error: 'Erro ao atualizar perfil.' };
  }
}

// ─── ESPAÇOS ──────────────────────────────────────────────────────────────────

/**
 * Busca todos os espaços do usuário logado.
 */
export async function fetchEspacos(): ServiceResult<Espaco[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('espacos')
      .select('id, nome, tipo, id_usuario')
      .order('data_criacao', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data as Espaco[], error: null };
  } catch (e) {
    captureError(e, { action: 'fetchEspacos' });
    return { data: null, error: 'Erro ao buscar espaços.' };
  }
}

/**
 * Cria um novo espaço (workspace PF ou PJ).
 */
export async function createEspaco(
  espaco: Omit<Espaco, 'id'>
): ServiceResult<Espaco> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('espacos')
      .insert({ nome: espaco.nome, tipo: espaco.tipo, id_usuario: espaco.id_usuario })
      .select('id, nome, tipo, id_usuario')
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as Espaco, error: null };
  } catch (e) {
    captureError(e, { action: 'createEspaco' });
    return { data: null, error: 'Erro ao criar espaço.' };
  }
}

// ─── CONTAS ───────────────────────────────────────────────────────────────────

/**
 * Busca todas as contas do usuário (todas as contas de todos os espaços).
 */
export async function fetchContas(): ServiceResult<Conta[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('contas')
      .select('id, id_espaco, nome_instituicao, moeda_conta, saldo_inicial')
      .order('data_criacao', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data as Conta[], error: null };
  } catch (e) {
    captureError(e, { action: 'fetchContas' });
    return { data: null, error: 'Erro ao buscar contas.' };
  }
}

/**
 * Cria uma nova conta bancária/carteira.
 */
export async function createConta(
  conta: Omit<Conta, 'id'>
): ServiceResult<Conta> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('contas')
      .insert({
        id_espaco: conta.id_espaco,
        nome_instituicao: conta.nome_instituicao,
        moeda_conta: conta.moeda_conta,
        saldo_inicial: conta.saldo_inicial,
      })
      .select('id, id_espaco, nome_instituicao, moeda_conta, saldo_inicial')
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as Conta, error: null };
  } catch (e) {
    captureError(e, { action: 'createConta' });
    return { data: null, error: 'Erro ao criar conta.' };
  }
}

export async function deleteConta(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase.from('contas').delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteConta' });
    return { data: null, error: 'Erro ao deletar conta.' };
  }
}

// ─── TRANSAÇÕES ───────────────────────────────────────────────────────────────

function toTransacoes(rows: Transacao[]): Transacao[] {
  return rows.map((t) => ({
    ...t,
    valor: Number(t.valor),
    taxa_cambio_dia: Number(t.taxa_cambio_dia),
  }));
}

/**
 * Busca as transações mais recentes (máximo 500).
 */
export async function fetchTransacoes(limit = 500): ServiceResult<Transacao[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('transacoes')
      .select('id, id_conta, tipo, valor, categoria, data_transacao, taxa_cambio_dia, descricao, moeda_transacao, id_tag_bancaria, is_compartilhada, participante_email, id_transacao_pai')
      .is('deleted_at', null)
      .order('data_criacao', { ascending: false })
      .limit(limit);
    if (error) return { data: null, error: error.message };
    return {
      data: (data as Transacao[]).map((t) => ({
        ...t,
        valor: Number(t.valor),
        taxa_cambio_dia: Number(t.taxa_cambio_dia),
      })),
      error: null,
    };
  } catch (e) {
    captureError(e, { action: 'fetchTransacoes' });
    return { data: null, error: 'Erro ao buscar transações.' };
  }
}

/**
 * Insere uma nova transação.
 */
export async function createTransacao(
  tx: Omit<Transacao, 'id'>
): ServiceResult<Transacao> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('transacoes')
      .insert({
        id_conta: tx.id_conta,
        tipo: tx.tipo,
        valor: tx.valor,
        categoria: tx.categoria,
        data_transacao: tx.data_transacao,
        taxa_cambio_dia: tx.taxa_cambio_dia,
        descricao: tx.descricao || null,
        moeda_transacao: tx.moeda_transacao || 'BRL',
        id_tag_bancaria: tx.id_tag_bancaria || null,
      })
      .select('id, id_conta, tipo, valor, categoria, data_transacao, taxa_cambio_dia, descricao, moeda_transacao, id_tag_bancaria')
      .single();
    if (error) return { data: null, error: error.message };
    const raw = data as Transacao;
    return {
      data: { ...raw, valor: Number(raw.valor), taxa_cambio_dia: Number(raw.taxa_cambio_dia) },
      error: null,
    };
  } catch (e) {
    captureError(e, { action: 'createTransacao' });
    return { data: null, error: 'Erro ao registrar transação.' };
  }
}

/**
 * Insere múltiplas transações em lote (import CSV/OFX).
 */
export async function createTransacoesBatch(
  txs: Omit<Transacao, 'id'>[]
): ServiceResult<Transacao[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const rows = txs.map((tx) => ({
      id_conta: tx.id_conta,
      tipo: tx.tipo,
      valor: tx.valor,
      categoria: tx.categoria,
      data_transacao: tx.data_transacao,
      taxa_cambio_dia: tx.taxa_cambio_dia,
      descricao: tx.descricao || null,
      moeda_transacao: tx.moeda_transacao || 'BRL',
      id_tag_bancaria: tx.id_tag_bancaria || null,
    }));
    const SELECT = 'id, id_conta, tipo, valor, categoria, data_transacao, taxa_cambio_dia, descricao, moeda_transacao, id_tag_bancaria';
    const { data, error } = await supabase
      .from('transacoes')
      .insert(rows)
      .select(SELECT);
    if (error && error.code === 'PGRST204') {
      const fallbackRows = txs.map((tx) => ({
        id_conta: tx.id_conta,
        tipo: tx.tipo,
        valor: tx.valor,
        categoria: tx.categoria,
        data_transacao: tx.data_transacao,
        descricao: tx.descricao || null,
      }));
      const fallback = await supabase
        .from('transacoes')
        .insert(fallbackRows)
        .select(SELECT);
      if (fallback.error) return { data: null, error: fallback.error.message };
      return { data: toTransacoes(fallback.data ?? []), error: null };
    }
    if (error) return { data: null, error: error.message };
    return { data: toTransacoes(data ?? []), error: null };
  } catch (e) {
    captureError(e, { action: 'createTransacoesBatch', count: txs.length });
    return { data: null, error: 'Erro ao importar transações.' };
  }
}

/**
 * Atualiza uma transação existente (ex: mudar conta associada).
 */
export async function updateTransacao(
  id: string,
  updates: { id_conta?: string; descricao?: string; valor?: number; data_transacao?: string; categoria?: string; moeda_transacao?: string; id_tag_bancaria?: string | null }
): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    let { error } = await supabase
      .from('transacoes')
      .update(updates)
      .eq('id', id);
    if (error && error.code === 'PGRST204') {
      const fallbackUpdates: Record<string, unknown> = {};
      if (updates.id_conta !== undefined) fallbackUpdates.id_conta = updates.id_conta;
      if (updates.descricao !== undefined) fallbackUpdates.descricao = updates.descricao;
      if (updates.valor !== undefined) fallbackUpdates.valor = updates.valor;
      if (updates.data_transacao !== undefined) fallbackUpdates.data_transacao = updates.data_transacao;
      if (updates.categoria !== undefined) fallbackUpdates.categoria = updates.categoria;
      const fallback = await supabase
        .from('transacoes')
        .update(fallbackUpdates)
        .eq('id', id);
      error = fallback.error;
    }
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'updateTransacao', id });
    return { data: null, error: 'Erro ao atualizar transação.' };
  }
}

export async function deleteTransacao(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('transacoes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteTransacao' });
    return { data: null, error: 'Erro ao deletar transação.' };
  }
}

// ─── CAIXINHAS ────────────────────────────────────────────────────────────────

/**
 * Busca todas as caixinhas (metas) do usuário.
 */
export async function fetchCaixinhas(): ServiceResult<Caixinha[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('caixinhas')
      .select('id, id_espaco, nome, valor_alvo, saldo_guardado, prazo_meses')
      .is('deleted_at', null)
      .order('data_criacao', { ascending: true });
    if (error) return { data: null, error: error.message };
    return {
      data: (data as Caixinha[]).map((c) => ({
        ...c,
        valor_alvo: Number(c.valor_alvo),
        saldo_guardado: Number(c.saldo_guardado),
        prazo_meses: c.prazo_meses == null ? null : Number(c.prazo_meses),
      })),
      error: null,
    };
  } catch (e) {
    captureError(e, { action: 'fetchCaixinhas' });
    return { data: null, error: 'Erro ao buscar caixinhas.' };
  }
}

/**
 * Cria uma nova caixinha (meta financeira).
 */
export async function createCaixinha(
  caixinha: Omit<Caixinha, 'id'>
): ServiceResult<Caixinha> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('caixinhas')
      .insert({
        id_espaco: caixinha.id_espaco,
        nome: caixinha.nome,
        valor_alvo: caixinha.valor_alvo,
        saldo_guardado: caixinha.saldo_guardado ?? 0,
        prazo_meses: caixinha.prazo_meses ?? null,
      })
      .select('id, id_espaco, nome, valor_alvo, saldo_guardado, prazo_meses')
      .single();
    if (error) return { data: null, error: error.message };
    const raw = data as Caixinha;
    return {
      data: { ...raw, valor_alvo: Number(raw.valor_alvo), saldo_guardado: Number(raw.saldo_guardado), prazo_meses: raw.prazo_meses == null ? null : Number(raw.prazo_meses) },
      error: null,
    };
  } catch (e) {
    captureError(e, { action: 'createCaixinha' });
    return { data: null, error: 'Erro ao criar caixinha.' };
  }
}

/**
 * Atualiza o saldo guardado de uma caixinha.
 */
export async function updateCaixinhaSaldoRemote(
  caixinhaId: string,
  novoSaldo: number
): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('caixinhas')
      .update({ saldo_guardado: novoSaldo })
      .eq('id', caixinhaId);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'updateCaixinhaSaldoRemote', caixinhaId });
    return { data: null, error: 'Erro ao atualizar saldo da caixinha.' };
  }
}

/**
 * Atualiza o nome e o valor alvo de uma caixinha.
 */
export async function updateCaixinhaRemote(
  id: string,
  nome: string,
  valor_alvo: number,
  prazo_meses?: number | null
): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('caixinhas')
      .update({ nome, valor_alvo, prazo_meses: prazo_meses ?? null })
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'updateCaixinhaRemote', id });
    return { data: null, error: 'Erro ao atualizar caixinha.' };
  }
}

export async function deleteCaixinha(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('caixinhas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteCaixinha' });
    return { data: null, error: 'Erro ao deletar caixinha.' };
  }
}

// ─── CARTÕES DE CRÉDITO ───────────────────────────────────────────────────────

/**
 * Busca todos os cartões de crédito.
 */
export async function fetchCartoes(): ServiceResult<Cartao[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('cartoes')
      .select('id, id_espaco, nome, limite, fatura_atual')
      .order('data_criacao', { ascending: true });
    if (error) return { data: null, error: error.message };
    
    const mapped = (data || []).map((raw: any) => ({
      ...raw,
      limite: Number(raw.limite),
      fatura_atual: Number(raw.fatura_atual)
    })) as Cartao[];

    return { data: mapped, error: null };
  } catch (e) {
    captureError(e, { action: 'fetchCartoes' });
    return { data: null, error: 'Erro ao buscar cartões.' };
  }
}

/**
 * Cria um novo cartão de crédito.
 */
export async function createCartao(
  cartao: Omit<Cartao, 'id'>
): ServiceResult<Cartao> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('cartoes')
      .insert({
        id_espaco: cartao.id_espaco,
        nome: cartao.nome,
        limite: cartao.limite,
        fatura_atual: cartao.fatura_atual ?? 0,
      })
      .select('id, id_espaco, nome, limite, fatura_atual')
      .single();
    if (error) return { data: null, error: error.message };
    
    const raw = data as Cartao;
    return {
      data: {
        ...raw,
        limite: Number(raw.limite),
        fatura_atual: Number(raw.fatura_atual)
      },
      error: null,
    };
  } catch (e) {
    captureError(e, { action: 'createCartao' });
    return { data: null, error: 'Erro ao criar cartão.' };
  }
}

/**
 * Atualiza um cartão de crédito.
 */
export async function updateCartaoRemote(
  id: string,
  nome: string,
  limite: number,
  fatura_atual: number
): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('cartoes')
      .update({ nome, limite, fatura_atual })
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'updateCartaoRemote', id });
    return { data: null, error: 'Erro ao atualizar cartão.' };
  }
}

/**
 * Exclui um cartão de crédito.
 */
export async function deleteCartao(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase.from('cartoes').delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteCartao' });
    return { data: null, error: 'Erro ao deletar cartão.' };
  }
}

// ─── TAGS BANCÁRIAS ────────────────────────────────────────────────────

/**
 * Busca todas as tags bancárias do usuário.
 */
export async function fetchTagsBancarias(): ServiceResult<TagBancaria[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('tags_bancarias')
      .select('id, id_usuario, nome, cor')
      .order('data_criacao', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data as TagBancaria[], error: null };
  } catch (e) {
    captureError(e, { action: 'fetchTagsBancarias' });
    return { data: null, error: 'Erro ao buscar tags bancárias.' };
  }
}

/**
 * Cria uma nova tag bancária.
 */
export async function createTagBancaria(
  tag: Omit<TagBancaria, 'id'>
): ServiceResult<TagBancaria> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('tags_bancarias')
      .insert({
        id_usuario: tag.id_usuario,
        nome: tag.nome,
        cor: tag.cor,
      })
      .select('id, id_usuario, nome, cor')
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as TagBancaria, error: null };
  } catch (e) {
    captureError(e, { action: 'createTagBancaria' });
    return { data: null, error: 'Erro ao criar tag bancária.' };
  }
}

/**
 * Atualiza uma tag bancária existente.
 */
export async function updateTagBancariaRemote(
  id: string,
  nome: string,
  cor: string
): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('tags_bancarias')
      .update({ nome, cor })
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'updateTagBancariaRemote', id });
    return { data: null, error: 'Erro ao atualizar tag bancária.' };
  }
}

/**
 * Exclui uma tag bancária.
 */
export async function deleteTagBancaria(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase.from('tags_bancarias').delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteTagBancaria' });
    return { data: null, error: 'Erro ao deletar tag bancária.' };
  }
}

// ─── CAIXINHAS HISTÓRICO ─────────────────────────────────────────────────

export interface CaixinhaMovimento {
  id: string;
  caixinha_id: string;
  tipo: 'aporte' | 'resgate';
  valor: number;
  descricao: string;
  data_movimento: string;
}

export async function fetchCaixinhaHistorico(
  caixinhaId: string
): ServiceResult<CaixinhaMovimento[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('caixinhas_historico')
      .select('id, caixinha_id, tipo, valor, descricao, data_movimento')
      .eq('caixinha_id', caixinhaId)
      .order('data_movimento', { ascending: false });
    if (error) return { data: null, error: error.message };
    const mapped = (data || []).map((r: any) => ({
      ...r,
      valor: Number(r.valor),
    })) as CaixinhaMovimento[];
    return { data: mapped, error: null };
  } catch (e) {
    captureError(e, { action: 'fetchCaixinhaHistorico', caixinhaId });
    return { data: null, error: 'Erro ao buscar histórico.' };
  }
}

export async function createCaixinhaMovimento(
  mov: Omit<CaixinhaMovimento, 'id'>
): ServiceResult<CaixinhaMovimento> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('caixinhas_historico')
      .insert({
        caixinha_id: mov.caixinha_id,
        tipo: mov.tipo,
        valor: mov.valor,
        descricao: mov.descricao || '',
        data_movimento: mov.data_movimento,
      })
      .select('id, caixinha_id, tipo, valor, descricao, data_movimento')
      .single();
    if (error) return { data: null, error: error.message };
    const raw = data as CaixinhaMovimento;
    return { data: { ...raw, valor: Number(raw.valor) }, error: null };
  } catch (e) {
    captureError(e, { action: 'createCaixinhaMovimento' });
    return { data: null, error: 'Erro ao registrar movimento.' };
  }
}

export async function updateCaixinhaMovimento(
  id: string,
  updates: { valor?: number; descricao?: string; data_movimento?: string }
): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('caixinhas_historico')
      .update(updates)
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'updateCaixinhaMovimento', id });
    return { data: null, error: 'Erro ao atualizar movimento.' };
  }
}

export async function deleteCaixinhaMovimento(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('caixinhas_historico')
      .delete()
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteCaixinhaMovimento', id });
    return { data: null, error: 'Erro ao deletar movimento.' };
  }
}

// ─── ATIVOS DE PATRIMÔNIO (Investimentos) ─────────────────────────────────

export interface AtivoPatrimonio {
  id: string;
  id_usuario: string;
  ticker: string;
  tipo: 'acao' | 'fiis' | 'cripto' | 'moeda';
  quantidade: number;
  preco_medio: number;
  cotacao_atual: number;
}

export async function fetchAtivosPatrimonio(): ServiceResult<AtivoPatrimonio[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('ativos_patrimonio')
      .select('*')
      .order('ticker', { ascending: true });
    if (error) return { data: null, error: error.message };
    const mapped = (data || []).map((r: any) => ({
      ...r,
      quantidade: Number(r.quantidade),
      preco_medio: Number(r.preco_medio),
      cotacao_atual: Number(r.cotacao_atual),
    })) as AtivoPatrimonio[];
    return { data: mapped, error: null };
  } catch (e) {
    captureError(e, { action: 'fetchAtivosPatrimonio' });
    return { data: null, error: 'Erro ao buscar ativos.' };
  }
}

export async function createAtivoPatrimonio(
  ativo: Omit<AtivoPatrimonio, 'id'>
): ServiceResult<AtivoPatrimonio> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('ativos_patrimonio')
      .insert({
        id_usuario: ativo.id_usuario,
        ticker: ativo.ticker,
        tipo: ativo.tipo,
        quantidade: ativo.quantidade,
        preco_medio: ativo.preco_medio,
        cotacao_atual: ativo.cotacao_atual,
      })
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    const raw = data as any;
    return {
      data: {
        ...raw,
        quantidade: Number(raw.quantidade),
        preco_medio: Number(raw.preco_medio),
        cotacao_atual: Number(raw.cotacao_atual),
      },
      error: null,
    };
  } catch (e) {
    captureError(e, { action: 'createAtivoPatrimonio' });
    return { data: null, error: 'Erro ao criar ativo.' };
  }
}

export async function updateAtivoPatrimonio(
  id: string,
  updates: Partial<Pick<AtivoPatrimonio, 'quantidade' | 'preco_medio' | 'cotacao_atual'>>
): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('ativos_patrimonio')
      .update(updates)
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'updateAtivoPatrimonio', id });
    return { data: null, error: 'Erro ao atualizar ativo.' };
  }
}

export async function deleteAtivoPatrimonio(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('ativos_patrimonio')
      .delete()
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteAtivoPatrimonio', id });
    return { data: null, error: 'Erro ao deletar ativo.' };
  }
}

// ─── TRANSAÇÕES DE ATIVOS (Investimentos) ────────────────────────────────

export interface TransacaoAtivo {
  id: string;
  id_usuario: string;
  ticker: string;
  tipo: 'compra' | 'venda';
  quantidade: number;
  preco_unitario: number;
  data_transacao: string;
  categoria?: string;
  subcategoria?: string;
}

export async function fetchTransacoesAtivos(): ServiceResult<TransacaoAtivo[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('transacoes_ativos')
      .select('*')
      .order('data_criacao', { ascending: false });
    if (error) return { data: null, error: error.message };
    const mapped = (data || []).map((r: any) => ({
      ...r,
      quantidade: Number(r.quantidade),
      preco_unitario: Number(r.preco_unitario),
    })) as TransacaoAtivo[];
    return { data: mapped, error: null };
  } catch (e) {
    captureError(e, { action: 'fetchTransacoesAtivos' });
    return { data: null, error: 'Erro ao buscar transações de ativos.' };
  }
}

export async function createTransacaoAtivo(
  tx: Omit<TransacaoAtivo, 'id'>
): ServiceResult<TransacaoAtivo> {  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('transacoes_ativos')
      .insert({
        id_usuario: tx.id_usuario,
        ticker: tx.ticker,
        tipo: tx.tipo,
        quantidade: tx.quantidade,
        preco_unitario: tx.preco_unitario,
        data_transacao: tx.data_transacao,
        categoria: tx.categoria || null,
        subcategoria: tx.subcategoria || null,
      })
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    const raw = data as any;
    return {
      data: {
        ...raw,
        quantidade: Number(raw.quantidade),
        preco_unitario: Number(raw.preco_unitario),
      },
      error: null,
    };
  } catch (e) {
    captureError(e, { action: 'createTransacaoAtivo' });
    return { data: null, error: 'Erro ao registrar operação.' };
  }
}

export async function updateTransacaoAtivo(
  id: string,
  updates: Partial<Pick<TransacaoAtivo, 'quantidade' | 'preco_unitario' | 'data_transacao' | 'categoria' | 'subcategoria'>>
): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('transacoes_ativos')
      .update(updates)
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'updateTransacaoAtivo', id });
    return { data: null, error: 'Erro ao atualizar operação.' };
  }
}

export async function deleteTransacaoAtivo(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('transacoes_ativos')
      .delete()
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteTransacaoAtivo', id });
    return { data: null, error: 'Erro ao deletar operação.' };
  }
}

export async function createTransacoesAtivosBulk(
  txs: Omit<TransacaoAtivo, 'id'>[]
): ServiceResult<number> {
  if (!isSupabaseConfigured) return notConfigured();
  if (txs.length === 0) return { data: 0, error: null };
  try {
    const { error } = await supabase.from('transacoes_ativos').insert(txs);
    if (error) return { data: null, error: error.message };
    return { data: txs.length, error: null };
  } catch (e) {
    captureError(e, { action: 'createTransacoesAtivosBulk', count: txs.length });
    return { data: null, error: 'Erro ao importar operações.' };
  }
}

// ─── INVENTÁRIO DE BENS ──────────────────────────────────────────────────

export interface BemPatrimonio {
  id: string;
  id_espaco: string;
  nome: string;
  valor_compra: number;
  data_aquisicao: string;
  categoria: string;
  descricao: string;
}

export async function fetchBensPatrimonio(): ServiceResult<BemPatrimonio[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('bens_patrimonio')
      .select('*')
      .is('deleted_at', null)
      .order('data_aquisicao', { ascending: false });
    if (error) return { data: null, error: error.message };
    const mapped = (data || []).map((r: any) => ({
      ...r,
      valor_compra: Number(r.valor_compra),
    })) as BemPatrimonio[];
    return { data: mapped, error: null };
  } catch (e) {
    captureError(e, { action: 'fetchBensPatrimonio' });
    return { data: null, error: 'Erro ao buscar bens.' };
  }
}

export async function createBemPatrimonio(
  bem: Omit<BemPatrimonio, 'id'>
): ServiceResult<BemPatrimonio> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('bens_patrimonio')
      .insert({
        id_espaco: bem.id_espaco,
        nome: bem.nome,
        valor_compra: bem.valor_compra,
        data_aquisicao: bem.data_aquisicao,
        categoria: bem.categoria,
        descricao: bem.descricao,
      })
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    const raw = data as any;
    return { data: { ...raw, valor_compra: Number(raw.valor_compra) }, error: null };
  } catch (e) {
    captureError(e, { action: 'createBemPatrimonio' });
    return { data: null, error: 'Erro ao criar bem.' };
  }
}

export async function deleteBemPatrimonio(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('bens_patrimonio')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteBemPatrimonio', id });
    return { data: null, error: 'Erro ao deletar bem.' };
  }
}

// ─── ASSINATURAS ────────────────────────────────────────────────────────

export interface Assinatura {
  id: string;
  id_usuario: string;
  data_inicio: string;
  data_fim: string;
  status: 'active' | 'expired' | 'cancelled';
}

/**
 * Verifica se o usuário possui assinatura ativa via RPC.
 */
export async function verificarAssinatura(userId: string): ServiceResult<boolean> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase.rpc('verificar_assinatura', { uid: userId });
    if (error) return { data: null, error: error.message };
    return { data: !!data, error: null };
  } catch (e) {
    captureError(e, { action: 'verificarAssinatura', userId });
    return { data: null, error: 'Erro ao verificar assinatura.' };
  }
}

/**
 * Cria/renova assinatura de 30 dias via RPC.
 */
export async function criarAssinatura(userId: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase.rpc('criar_assinatura', { uid: userId });
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'criarAssinatura', userId });
    return { data: null, error: 'Erro ao criar assinatura.' };
  }
}

// ─── EXCLUSÃO DE CONTA (LGPD) ──────────────────────────────────────────

export async function solicitarExclusao(): ServiceResult<string> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase.rpc('solicitar_exclusao');
    if (error) return { data: null, error: error.message };
    return { data: data as string, error: null };
  } catch (e) {
    captureError(e, { action: 'solicitarExclusao' });
    return { data: null, error: 'Erro ao solicitar exclusão.' };
  }
}

export async function cancelarExclusao(): ServiceResult<string> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase.rpc('cancelar_exclusao');
    if (error) return { data: null, error: error.message };
    return { data: data as string, error: null };
  } catch (e) {
    captureError(e, { action: 'cancelarExclusao' });
    return { data: null, error: 'Erro ao cancelar exclusão.' };
  }
}

export async function verificarStatusExclusao(): ServiceResult<any> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase.rpc('verificar_status_exclusao');
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (e) {
    captureError(e, { action: 'verificarStatusExclusao' });
    return { data: null, error: 'Erro ao verificar status de exclusão.' };
  }
}

// ─── TRANSAÇÕES RECORRENTES ──────────────────────────────────────────────

export async function fetchTransacoesRecorrentes(): ServiceResult<TransacaoRecorrente[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('transacoes_recorrentes')
      .select('id, id_usuario, id_espaco, id_conta, tipo, valor, categoria, moeda_transacao, descricao, frequencia, dia_vencimento, data_inicio, data_fim, ativo')
      .is('deleted_at', null)
      .order('data_criacao', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data || []) as TransacaoRecorrente[], error: null };
  } catch (e) {
    captureError(e, { action: 'fetchTransacoesRecorrentes' });
    return { data: null, error: 'Erro ao buscar despesas recorrentes.' };
  }
}

export async function createTransacaoRecorrente(
  recorrente: Omit<TransacaoRecorrente, 'id'>
): ServiceResult<TransacaoRecorrente> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('transacoes_recorrentes')
      .insert(recorrente)
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as TransacaoRecorrente, error: null };
  } catch (e) {
    captureError(e, { action: 'createTransacaoRecorrente' });
    return { data: null, error: 'Erro ao criar despesa recorrente.' };
  }
}

export async function updateTransacaoRecorrente(
  id: string,
  updates: Partial<Omit<TransacaoRecorrente, 'id' | 'id_usuario'>>
): ServiceResult<TransacaoRecorrente> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('transacoes_recorrentes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as TransacaoRecorrente, error: null };
  } catch (e) {
    captureError(e, { action: 'updateTransacaoRecorrente' });
    return { data: null, error: 'Erro ao atualizar despesa recorrente.' };
  }
}

export async function deleteTransacaoRecorrente(id: string): ServiceResult<null> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('transacoes_recorrentes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteTransacaoRecorrente' });
    return { data: null, error: 'Erro ao excluir despesa recorrente.' };
  }
}

/**
 * Gera transações a partir de recorrências ativas para um determinado mês.
 * Evita duplicatas verificando se já existe transação com a mesma descrição e data.
 */
export async function gerarTransacoesDoMes(
  recorrentes: TransacaoRecorrente[],
  mesAno: string // formato: 'YYYY-MM'
): Promise<{ geradas: number; erros: number }> {
  if (!isSupabaseConfigured) return { geradas: 0, erros: 0 };
  
  let geradas = 0;
  let erros = 0;
  
  for (const rec of recorrentes) {
    // Verificar se a recorrência está ativa
    if (!rec.ativo) continue;
    
    // Verificar se a data de início é anterior ou igual ao mês
    if (rec.data_inicio > mesAno + '-31') continue;
    
    // Verificar se a data de fim é posterior ao mês (se definida)
    if (rec.data_fim && rec.data_fim < mesAno + '-01') continue;
    
    // Calcular a data da transação usando o último dia real do mês (28/29/30/31)
    const [ano, mes] = mesAno.split('-').map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dia = Math.min(rec.dia_vencimento, ultimoDia);
    const dataTransacao = `${mesAno}-${String(dia).padStart(2, '0')}`;
    
    const descricaoGerada = `[Recorrente] ${rec.descricao?.trim() || rec.categoria}`;

    // Verificar se já existe transação para esta recorrência neste mês
    const { data: existente } = await supabase
      .from('transacoes')
      .select('id')
      .eq('id_conta', rec.id_conta)
      .eq('data_transacao', dataTransacao)
      .eq('descricao', descricaoGerada)
      .limit(1);
    
    if (existente && existente.length > 0) {
      // Já existe transação para esta recorrência neste mês
      continue;
    }
    
    // Criar a transação
    const { error } = await supabase
      .from('transacoes')
      .insert({
        id_conta: rec.id_conta,
        tipo: rec.tipo,
        valor: rec.valor,
        categoria: rec.categoria,
        data_transacao: dataTransacao,
        descricao: descricaoGerada,
        moeda_transacao: rec.moeda_transacao,
      });
    
    if (error) {
      erros++;
      console.error(`Erro ao gerar transação para recorrência ${rec.id}:`, error);
    } else {
      geradas++;
    }
  }
  
  return { geradas, erros };
}

// ─── DIVIDENDOS / PROVENTOS ─────────────────────────────────────────────

export interface Dividendo {
  id: string;
  id_usuario: string;
  ticker: string;
  valor: number;
  data_recebimento: string;
  tipo: 'dividendo' | 'juros' | 'cupom' | 'rendimento';
  descricao: string;
}

export async function fetchDividendos(): ServiceResult<Dividendo[]> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('dividendos')
      .select('*')
      .order('data_recebimento', { ascending: false });
    if (error) return { data: null, error: error.message };
    const mapped = (data || []).map((r: any) => ({
      ...r,
      valor: Number(r.valor),
    })) as Dividendo[];
    return { data: mapped, error: null };
  } catch (e) {
    captureError(e, { action: 'fetchDividendos' });
    return { data: null, error: 'Erro ao buscar dividendos.' };
  }
}

export async function createDividendo(
  div: Omit<Dividendo, 'id'>
): ServiceResult<Dividendo> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { data, error } = await supabase
      .from('dividendos')
      .insert(div)
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    const raw = data as any;
    return { data: { ...raw, valor: Number(raw.valor) }, error: null };
  } catch (e) {
    captureError(e, { action: 'createDividendo' });
    return { data: null, error: 'Erro ao registrar dividendo.' };
  }
}

export async function deleteDividendo(id: string): ServiceResult<void> {
  if (!isSupabaseConfigured) return notConfigured();
  try {
    const { error } = await supabase
      .from('dividendos')
      .delete()
      .eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (e) {
    captureError(e, { action: 'deleteDividendo', id });
    return { data: null, error: 'Erro ao deletar dividendo.' };
  }
}
