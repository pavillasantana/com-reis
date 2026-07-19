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
  createEspaco, createConta, createTransacao, createTransacoesBatch,
  createCaixinha, updateCaixinhaSaldoRemote, updateCaixinhaRemote, updatePerfil,
  createCartao, updateCartaoRemote, deleteCartao,
  deleteConta, deleteTransacao, deleteCaixinha,
  updateTransacao,
  createCaixinhaMovimento,
  updateCaixinhaMovimento, deleteCaixinhaMovimento,
  verificarAssinatura, criarAssinatura,
} from '../services/supabaseService';
import type { Espaco, Conta, Transacao, Caixinha, Cartao } from '../store/useStore';
import type { MovimentoCaixinha } from '../components/CaixinhaHistoricoModal';
import { captureError } from '../lib/sentry';

export function useSupabaseSync() {
  const {
    id_usuario,
    isAuthLoading,
    setEspacos, setContas, setTransacoes, setCaixinhas, setCartoes,
    addEspaco: storeAddEspaco,
    addConta: storeAddConta,
    addTransacao: storeAddTransacao,
    addCaixinha: storeAddCaixinha,
    addCartao: storeAddCartao,
    updateCaixinhaSaldo: storeUpdateCaixinhaSaldo,
    updateCaixinha: storeUpdateCaixinha,
    updateCartao: storeUpdateCartao,
    removeConta: storeRemoveConta,
    removeTransacao: storeRemoveTransacao,
    removeCaixinha: storeRemoveCaixinha,
    removeCartao: storeRemoveCartao,
    updateTransacaoConta: storeUpdateTransacaoConta,
    setPlanoUsuario,
  } = useStore();

  const hasSynced = useRef(false);

  // ─── CARREGAMENTO INICIAL (ao login) ────────────────────────────────────────

  useEffect(() => {
    if (isAuthLoading || !id_usuario || !isSupabaseConfigured || hasSynced.current) return;

    const loadAll = async () => {
      hasSynced.current = true;

      const [assinaturaRes, espacosRes, contasRes, transacoesRes, caixinhasRes, cartoesRes] = await Promise.all([
        verificarAssinatura(id_usuario),
        fetchEspacos(),
        fetchContas(),
        fetchTransacoes(),
        fetchCaixinhas(),
        fetchCartoes(),
      ]);

      // Middleware de Expiração: força 'free' se assinatura estiver expirada
      if (assinaturaRes.data === false) {
        setPlanoUsuario('free');
        await updatePerfil(id_usuario, { plano: 'free' });
      }

      if (espacosRes.data && espacosRes.data.length > 0)    setEspacos(espacosRes.data);
      if (contasRes.data && contasRes.data.length > 0)     setContas(contasRes.data);
      if (transacoesRes.data && transacoesRes.data.length > 0) setTransacoes(transacoesRes.data);
      if (caixinhasRes.data && caixinhasRes.data.length > 0)  setCaixinhas(caixinhasRes.data);
      if (cartoesRes.data && cartoesRes.data.length > 0)    setCartoes(cartoesRes.data);

      // Log erros no Sentry mas não bloqueia a UI
      [assinaturaRes, espacosRes, contasRes, transacoesRes, caixinhasRes, cartoesRes].forEach(({ error }) => {
        if (error) captureError(new Error(error), { action: 'loadAll' });
      });
    };

    loadAll();
  }, [id_usuario, isAuthLoading, setEspacos, setContas, setTransacoes, setCaixinhas, setCartoes, setPlanoUsuario]);

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

    // Substitui o registro temporário pelo real (com UUID do banco)
    // Re-adicionar não é necessário pois o ID temporário já está no store;
    // O próximo sync de loadAll vai corrigir em sessões futuras.
    return data;
  }, [id_usuario, storeAddTransacao]);

  /**
   * Importação em lote — otimistic update + batch insert no banco.
   */
  const addTransacoesBatch = useCallback(async (
    txs: Omit<Transacao, 'id'>[]
  ): Promise<number> => {
    // Atualiza store imediatamente
    txs.forEach((tx) => {
      storeAddTransacao({ ...tx, id: 'local-tx-' + Math.random().toString(36).substr(2, 9) });
    });

    if (!isSupabaseConfigured || !id_usuario) return txs.length;

    const { data, error } = await createTransacoesBatch(txs);
    if (error) captureError(new Error(error), { action: 'addTransacoesBatch', count: txs.length });
    return data ?? txs.length;
  }, [id_usuario, storeAddTransacao]);

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
    valor_alvo: number
  ): Promise<void> => {
    // Atualiza store imediatamente
    storeUpdateCaixinha(id, nome, valor_alvo);

    if (isSupabaseConfigured && id_usuario && !id.startsWith('local-')) {
      const { error } = await updateCaixinhaRemote(id, nome, valor_alvo);
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
    // Caixinhas Historico
    addCaixinhaMovimento,
    editCaixinhaMovimento,
    removeCaixinhaMovimento,
  };
}
