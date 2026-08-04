/**
 * useSupabaseSync.ts — Sincronização Supabase ↔ Zustand Store
 *
 * Carrega todos os dados do banco (espaços, contas, transações, caixinhas)
 * quando um usuário se autentica. Também expõe ações que gravam no banco
 * E no Zustand ao mesmo tempo (write-through cache).
 *
 * Estratégia:
 * - Read: Supabase → Zustand (ao login)
 * - Write: Zustand primeiro (UI imediata) → Supabase em background
 * - Fallback: Se Supabase falhar, os dados ficam no localStorage (persist)
 */

import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchEspacos, fetchContas, fetchTransacoes, fetchCaixinhas, fetchCartoes,
  fetchTagsBancarias, createTagBancaria, updateTagBancariaRemote, deleteTagBancaria,
  createEspaco, createConta, createTransacao, createTransacoesBatch,
  createCaixinha, updateCaixinhaSaldoRemote, updateCaixinhaRemote, updatePerfil,
  createCartao, updateCartaoRemote, deleteCartao,
  deleteConta, deleteTransacao, deleteCaixinha,
  updateTransacao,
  createCaixinhaMovimento,
  updateCaixinhaMovimento, deleteCaixinhaMovimento,
  criarAssinatura,
  fetchTransacoesRecorrentes, createTransacaoRecorrente,
  updateTransacaoRecorrente as updateTransacaoRecorrenteService, deleteTransacaoRecorrente,
  gerarTransacoesDoMes,
} from '../services/supabaseService';
import type { Espaco, Conta, Transacao, Caixinha, Cartao, TagBancaria, TransacaoRecorrente } from '../store/useStore';
import type { MovimentoCaixinha } from '../components/CaixinhaHistoricoModal';
import { captureError } from '../lib/sentry';

/**
 * Combina os dados vindos do Supabase com itens locais ainda não sincronizados
 * (ids `local-`/`temp-`). Quando a resposta veio com erro (null), retorna null
 * para que o store não seja tocado. Itens locais que já foram gravados no banco
 * e retornaram com UUID real são descartados, evitando duplicatas.
 */
function mergeComLocais<T extends { id: string }>(remotas: T[] | null, atuais: T[]): T[] | null {
  if (!remotas) return null;
  const pendentes = atuais.filter((x) => x.id.startsWith('local-') || x.id.startsWith('temp-'));
  if (pendentes.length === 0) return remotas;
  const idsRemotos = new Set(remotas.map((x) => x.id));
  const naoSincronizados = pendentes.filter((x) => !idsRemotos.has(x.id));
  return [...remotas, ...naoSincronizados];
}

export function useSupabaseSync() {
  const {
    id_usuario,
    isAuthLoading,
    setEspacos, setContas, setTransacoes, setCaixinhas, setCartoes, setTagsBancarias,
    addEspaco: storeAddEspaco,
    addConta: storeAddConta,
    addTransacao: storeAddTransacao,
    addCaixinha: storeAddCaixinha,
    addCartao: storeAddCartao,
    addTagBancaria: storeAddTagBancaria,
    updateCaixinhaSaldo: storeUpdateCaixinhaSaldo,
    updateCaixinha: storeUpdateCaixinha,
    updateCartao: storeUpdateCartao,
    updateTagBancaria: storeUpdateTagBancaria,
    removeConta: storeRemoveConta,
    removeTransacao: storeRemoveTransacao,
    removeCaixinha: storeRemoveCaixinha,
    removeCartao: storeRemoveCartao,
    removeTagBancaria: storeRemoveTagBancaria,
    updateTransacaoConta: storeUpdateTransacaoConta,
    setPlanoUsuario,
    setTransacoesRecorrentes, addTransacaoRecorrente: storeAddTransacaoRecorrente,
    updateTransacaoRecorrente: storeUpdateTransacaoRecorrente,
    removeTransacaoRecorrente: storeRemoveTransacaoRecorrente,
  } = useStore();

  const hasSynced = useRef(false);

  // ─── CARREGAMENTO INICIAL (ao login) ────────────────────────────────────────

  useEffect(() => {
    if (isAuthLoading || !id_usuario || !isSupabaseConfigured || hasSynced.current) return;

    const loadAll = async () => {
      hasSynced.current = true;

      const [espacosRes, contasRes, transacoesRes, caixinhasRes, cartoesRes, tagsBancariasRes, recorrentesRes] = await Promise.all([
        fetchEspacos(),
        fetchContas(),
        fetchTransacoes(),
        fetchCaixinhas(),
        fetchCartoes(),
        fetchTagsBancarias(),
        fetchTransacoesRecorrentes(),
      ]);

      // Log diagnóstico para debug
      console.debug('[sync] loadAll resultados:', {
        espacos: espacosRes.data?.length ?? 0,
        contas: contasRes.data?.length ?? 0,
        transacoes: transacoesRes.data?.length ?? 0,
        caixinhas: caixinhasRes.data?.length ?? 0,
        cartoes: cartoesRes.data?.length ?? 0,
        tags: tagsBancariasRes.data?.length ?? 0,
        recorrentes: recorrentesRes.data?.length ?? 0,
        erros: [espacosRes, contasRes, transacoesRes, caixinhasRes, cartoesRes, tagsBancariasRes, recorrentesRes]
          .filter(r => r.error).map(r => r.error),
      });

      // Supabase é a fonte de verdade quando conectado.
      // Preserva itens locais ainda não sincronizados (ids local-/temp-),
      // evitando que falhas de insert sejam apagadas no próximo reload.
      const atual = useStore.getState();
      const espacos = mergeComLocais(espacosRes.data, atual.espacos);
      const contas = mergeComLocais(contasRes.data, atual.contas);
      const transacoes = mergeComLocais(transacoesRes.data, atual.transacoes);
      const caixinhas = mergeComLocais(caixinhasRes.data, atual.caixinhas);
      const cartoes = mergeComLocais(cartoesRes.data, atual.cartoes);
      const tagsBancarias = mergeComLocais(tagsBancariasRes.data, atual.tagsBancarias);
      const recorrentes = mergeComLocais(recorrentesRes.data, atual.transacoesRecorrentes);

      if (espacos) setEspacos(espacos);
      if (contas) setContas(contas);
      if (transacoes) setTransacoes(transacoes);
      if (caixinhas) setCaixinhas(caixinhas);
      if (cartoes) setCartoes(cartoes);
      if (tagsBancarias) setTagsBancarias(tagsBancarias);
      if (recorrentes) setTransacoesRecorrentes(recorrentes);

      // Gerar transações do mês atual a partir de recorrências ativas
      if (recorrentesRes.data && recorrentesRes.data.length > 0) {
        const mesAtual = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
        const resultado = await gerarTransacoesDoMes(recorrentesRes.data, mesAtual);
        if (resultado.geradas > 0) {
          console.debug(`[sync] Geradas ${resultado.geradas} transações do mês ${mesAtual}`);
          // Recarregar transações para incluir as geradas
          const { data: novasTransacoes } = await fetchTransacoes();
          if (novasTransacoes) {
            const atual = useStore.getState();
            const merged = mergeComLocais(novasTransacoes, atual.transacoes);
            if (merged) setTransacoes(merged);
          }
        }
      }

      // Log erros no Sentry mas não bloqueia a UI
      [espacosRes, contasRes, transacoesRes, caixinhasRes, cartoesRes, tagsBancariasRes, recorrentesRes].forEach(({ error }) => {
        if (error) captureError(new Error(error), { action: 'loadAll' });
      });
    };

    loadAll();
  }, [id_usuario, isAuthLoading, setEspacos, setContas, setTransacoes, setCaixinhas, setCartoes, setTagsBancarias, setTransacoesRecorrentes]);

  // Reset hasSynced quando o usuário muda (logout/login)
  useEffect(() => {
    if (!id_usuario) hasSynced.current = false;
  }, [id_usuario]);

  // ─── WRITE-THROUGH ACTIONS ───────────────────────────────────────────────────

  /**
   * Cria um espaço: atualiza Zustand primeiro, depois persiste no banco.
   * Retorna o ID real (UUID do banco) para ser usado em state.
   */
  const addEspaco = useCallback(async (
    espaco: Omit<Espaco, 'id'>
  ): Promise<string | null> => {
    if (!isSupabaseConfigured || !id_usuario) {
      // Modo offline: gera ID local e atualiza só o store
      const localId = 'local-espaco-' + Math.random().toString(36).substr(2, 9);
      storeAddEspaco({ ...espaco, id: localId });
      return localId;
    }

    const { data, error } = await createEspaco(espaco);
    if (error || !data) {
      captureError(new Error(error ?? 'createEspaco failed'));
      // Fallback: usa ID local mesmo com erro
      const localId = 'local-espaco-' + Math.random().toString(36).substr(2, 9);
      storeAddEspaco({ ...espaco, id: localId });
      return localId;
    }

    storeAddEspaco(data);
    return data.id;
  }, [id_usuario, storeAddEspaco]);

  const addConta = useCallback(async (
    conta: Omit<Conta, 'id'>
  ): Promise<string | null> => {
    if (!isSupabaseConfigured || !id_usuario) {
      const localId = 'local-conta-' + Math.random().toString(36).substr(2, 9);
      storeAddConta({ ...conta, id: localId });
      return localId;
    }

    const { data, error } = await createConta(conta);
    if (error || !data) {
      captureError(new Error(error ?? 'createConta failed'));
      const localId = 'local-conta-' + Math.random().toString(36).substr(2, 9);
      storeAddConta({ ...conta, id: localId });
      return localId;
    }

    storeAddConta(data);
    return data.id;
  }, [id_usuario, storeAddConta]);

  const addTransacao = useCallback(async (
    tx: Omit<Transacao, 'id'>
  ): Promise<Transacao | null> => {
    if (!isSupabaseConfigured || !id_usuario) {
      const localId = 'local-tx-' + Math.random().toString(36).substr(2, 9);
      const localTx: Transacao = { ...tx, id: localId };
      storeAddTransacao(localTx);
      return localTx;
    }

    // Otimistic update: exibe na UI imediatamente
    const tempId = 'temp-' + Math.random().toString(36).substr(2, 9);
    const tempTx: Transacao = { ...tx, id: tempId };
    storeAddTransacao(tempTx);

    const { data, error } = await createTransacao(tx);
    if (error || !data) {
      captureError(new Error(error ?? 'createTransacao failed'));
      // Mantém o tx temporário no store (dado não se perde)
      return tempTx;
    }

    // Substitui o registro temporário pelo real (com UUID do banco) para que
    // o próximo loadAll não o considere "pendente" e crie duplicata.
    storeRemoveTransacao(tempId);
    storeAddTransacao(data);
    return data;
  }, [id_usuario, storeAddTransacao, storeRemoveTransacao]);

  /**
   * Importação em lote — otimistic update + batch insert no banco.
   */
  const addTransacoesBatch = useCallback(async (
    txs: Omit<Transacao, 'id'>[]
  ): Promise<number> => {
    // Atualiza store imediatamente, guardando os ids locais para substituir após o insert
    const localIds = txs.map(() => 'local-tx-' + Math.random().toString(36).substr(2, 9));
    localIds.forEach((id, i) => {
      storeAddTransacao({ ...txs[i], id });
    });

    if (!isSupabaseConfigured || !id_usuario) return txs.length;

    const { data, error } = await createTransacoesBatch(txs);
    if (error) {
      captureError(new Error(error), { action: 'addTransacoesBatch', count: txs.length });
      return txs.length;
    }
    if (data && data.length > 0) {
      // Troca os ids locais pelos UUIDs reais para evitar duplicatas no próximo loadAll
      localIds.forEach((id) => storeRemoveTransacao(id));
      data.forEach((tx) => storeAddTransacao(tx));
      return data.length;
    }
    return txs.length;
  }, [id_usuario, storeAddTransacao, storeRemoveTransacao]);

  const addCaixinha = useCallback(async (
    caixinha: Omit<Caixinha, 'id'>
  ): Promise<string | null> => {
    if (!isSupabaseConfigured || !id_usuario) {
      const localId = 'local-cx-' + Math.random().toString(36).substr(2, 9);
      storeAddCaixinha({ ...caixinha, id: localId });
      return localId;
    }

    const { data, error } = await createCaixinha(caixinha);
    if (error || !data) {
      captureError(new Error(error ?? 'createCaixinha failed'));
      const localId = 'local-cx-' + Math.random().toString(36).substr(2, 9);
      storeAddCaixinha({ ...caixinha, id: localId });
      return localId;
    }

    storeAddCaixinha(data);
    return data.id;
  }, [id_usuario, storeAddCaixinha]);

  const updateCaixinhaSaldo = useCallback(async (
    id: string,
    novoSaldo: number
  ): Promise<void> => {
    // Atualiza store imediatamente
    storeUpdateCaixinhaSaldo(id, novoSaldo);

    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await updateCaixinhaSaldoRemote(id, novoSaldo);
      if (error) captureError(new Error(error), { action: 'updateCaixinhaSaldo', id });
    }
  }, [id_usuario, storeUpdateCaixinhaSaldo]);

  const updateCaixinha = useCallback(async (
    id: string,
    nome: string,
    valor_alvo: number,
    prazo_meses?: number | null
  ): Promise<void> => {
    // Atualiza store imediatamente
    storeUpdateCaixinha(id, nome, valor_alvo, prazo_meses ?? null);

    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await updateCaixinhaRemote(id, nome, valor_alvo, prazo_meses ?? null);
      if (error) captureError(new Error(error), { action: 'updateCaixinha', id });
    }
  }, [id_usuario, storeUpdateCaixinha]);

  /**
   * Upgrade de plano: cria assinatura de 30 dias + atualiza store.
   */
  const upgradeToPremium = useCallback(async (): Promise<void> => {
    setPlanoUsuario('premium');
    if (isSupabaseConfigured && id_usuario) {
      const { error } = await criarAssinatura(id_usuario);
      if (error) {
        // Fallback: tenta pelo menos marcar como premium
        await updatePerfil(id_usuario, { plano: 'premium' });
      }
    }
  }, [id_usuario, setPlanoUsuario]);

  const removeConta = useCallback(async (id: string): Promise<void> => {
    storeRemoveConta(id);
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await deleteConta(id);
      if (error) captureError(new Error(error), { action: 'removeConta', id });
    }
  }, [id_usuario, storeRemoveConta]);

  const removeTransacao = useCallback(async (id: string): Promise<void> => {
    storeRemoveTransacao(id);
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await deleteTransacao(id);
      if (error) captureError(new Error(error), { action: 'removeTransacao', id });
    }
  }, [id_usuario, storeRemoveTransacao]);

  const removeCaixinha = useCallback(async (id: string): Promise<void> => {
    storeRemoveCaixinha(id);
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await deleteCaixinha(id);
      if (error) captureError(new Error(error), { action: 'removeCaixinha', id });
    }
  }, [id_usuario, storeRemoveCaixinha]);

  const addCartao = useCallback(async (
    cartao: Omit<Cartao, 'id'>
  ): Promise<string | null> => {
    if (!isSupabaseConfigured || !id_usuario) {
      const localId = 'local-cartao-' + Math.random().toString(36).substr(2, 9);
      storeAddCartao({ ...cartao, id: localId });
      return localId;
    }

    const { data, error } = await createCartao(cartao);
    if (error || !data) {
      captureError(new Error(error ?? 'createCartao failed'));
      const localId = 'local-cartao-' + Math.random().toString(36).substr(2, 9);
      storeAddCartao({ ...cartao, id: localId });
      return localId;
    }

    storeAddCartao(data);
    return data.id;
  }, [id_usuario, storeAddCartao]);

  const updateCartao = useCallback(async (
    id: string,
    nome: string,
    limite: number,
    fatura_atual: number
  ): Promise<void> => {
    storeUpdateCartao(id, nome, limite, fatura_atual);

    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await updateCartaoRemote(id, nome, limite, fatura_atual);
      if (error) captureError(new Error(error), { action: 'updateCartao', id });
    }
  }, [id_usuario, storeUpdateCartao]);

  /**
   * Move uma transação para outra conta (Conciliação Manual - Drag & Drop).
   * Atualiza o store imediatamente e persiste no Supabase.
   */
  const moveTransacaoToConta = useCallback(async (
    txId: string,
    novaContaId: string
  ): Promise<void> => {
    storeUpdateTransacaoConta(txId, novaContaId);

    if (isSupabaseConfigured && id_usuario && !txId.startsWith('local-') && !txId.startsWith('temp-')) {
      const { error } = await updateTransacao(txId, { id_conta: novaContaId });
      if (error) captureError(new Error(error), { action: 'moveTransacaoToConta', txId });
    }
  }, [id_usuario, storeUpdateTransacaoConta]);

  const removeCartao = useCallback(async (id: string): Promise<void> => {
    storeRemoveCartao(id);
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await deleteCartao(id);
      if (error) captureError(new Error(error), { action: 'removeCartao', id });
    }
  }, [id_usuario, storeRemoveCartao]);

  // ─── TAGS BANCÁRIAS ────────────────────────────────────────────────────

  const addTagBancaria = useCallback(async (
    tag: Omit<TagBancaria, 'id'>
  ): Promise<string | null> => {
    if (!isSupabaseConfigured || !id_usuario) {
      const localId = 'local-tag-' + Math.random().toString(36).substr(2, 9);
      storeAddTagBancaria({ ...tag, id: localId });
      return localId;
    }

    const { data, error } = await createTagBancaria(tag);
    if (error || !data) {
      captureError(new Error(error ?? 'createTagBancaria failed'));
      const localId = 'local-tag-' + Math.random().toString(36).substr(2, 9);
      storeAddTagBancaria({ ...tag, id: localId });
      return localId;
    }

    storeAddTagBancaria(data);
    return data.id;
  }, [id_usuario, storeAddTagBancaria]);

  const updateTagBancaria = useCallback(async (
    id: string,
    nome: string,
    cor: string
  ): Promise<void> => {
    storeUpdateTagBancaria(id, nome, cor);
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await updateTagBancariaRemote(id, nome, cor);
      if (error) captureError(new Error(error), { action: 'updateTagBancaria', id });
    }
  }, [id_usuario, storeUpdateTagBancaria]);

  const removeTagBancaria = useCallback(async (id: string): Promise<void> => {
    storeRemoveTagBancaria(id);
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await deleteTagBancaria(id);
      if (error) captureError(new Error(error), { action: 'removeTagBancaria', id });
    }
  }, [id_usuario, storeRemoveTagBancaria]);

  // ─── CAIXINHAS HISTÓRICO ──────────────────────────────────────────────────

  const addCaixinhaMovimento = useCallback(async (
    mov: Omit<MovimentoCaixinha, 'id'> & { caixinha_id: string }
  ): Promise<string | null> => {
    if (!isSupabaseConfigured || !id_usuario) {
      return 'local-mov-' + Math.random().toString(36).substr(2, 9);
    }
    const { data, error } = await createCaixinhaMovimento({
      caixinha_id: mov.caixinha_id,
      tipo: mov.tipo,
      valor: mov.valor,
      descricao: mov.descricao,
      data_movimento: mov.data,
    });
    if (error || !data) {
      captureError(new Error(error ?? 'createCaixinhaMovimento failed'));
      return 'local-mov-' + Math.random().toString(36).substr(2, 9);
    }
    return data.id;
  }, [id_usuario]);

  const editCaixinhaMovimento = useCallback(async (
    id: string,
    updates: { valor?: number; descricao?: string }
  ): Promise<void> => {
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await updateCaixinhaMovimento(id, updates);
      if (error) captureError(new Error(error), { action: 'editCaixinhaMovimento', id });
    }
  }, [id_usuario]);

  const removeCaixinhaMovimento = useCallback(async (id: string): Promise<void> => {
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await deleteCaixinhaMovimento(id);
      if (error) captureError(new Error(error), { action: 'removeCaixinhaMovimento', id });
    }
  }, [id_usuario]);

  // ─── TRANSAÇÕES RECORRENTES (write-through) ─────────────────────────────

  const addTransacaoRecorrente = useCallback(async (
    recorrente: Omit<TransacaoRecorrente, 'id'>
  ): Promise<string | null> => {
    if (!isSupabaseConfigured || !id_usuario) {
      const localId = 'local-rec-' + Math.random().toString(36).substr(2, 9);
      storeAddTransacaoRecorrente({ ...recorrente, id: localId });
      return localId;
    }
    const { data, error } = await createTransacaoRecorrente(recorrente);
    if (error || !data) {
      captureError(new Error(error ?? 'createTransacaoRecorrente failed'));
      const localId = 'local-rec-' + Math.random().toString(36).substr(2, 9);
      storeAddTransacaoRecorrente({ ...recorrente, id: localId });
      return localId;
    }
    storeAddTransacaoRecorrente(data);
    return data.id;
  }, [id_usuario, storeAddTransacaoRecorrente]);

  const updateTransacaoRecorrente = useCallback(async (
    id: string,
    updates: Partial<Omit<TransacaoRecorrente, 'id' | 'id_usuario'>>
  ): Promise<void> => {
    storeUpdateTransacaoRecorrente(id, updates);
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await updateTransacaoRecorrenteService(id, updates);
      if (error) captureError(new Error(error), { action: 'updateTransacaoRecorrente', id });
    }
  }, [id_usuario, storeUpdateTransacaoRecorrente]);

  const removeTransacaoRecorrente = useCallback(async (id: string): Promise<void> => {
    storeRemoveTransacaoRecorrente(id);
    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await deleteTransacaoRecorrente(id);
      if (error) captureError(new Error(error), { action: 'removeTransacaoRecorrente', id });
    }
  }, [id_usuario, storeRemoveTransacaoRecorrente]);

    return {
      // Write-through actions (usam store + Supabase)
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
      moveTransacaoToConta,
      addCartao,
      updateCartao,
      removeCartao,
      // Tags Bancárias
      addTagBancaria,
      updateTagBancaria,
      removeTagBancaria,
      // Caixinhas Historico
      addCaixinhaMovimento,
      editCaixinhaMovimento,
      removeCaixinhaMovimento,
      // Transações Recorrentes
      addTransacaoRecorrente,
      updateTransacaoRecorrente,
      removeTransacaoRecorrente,
    };
}
