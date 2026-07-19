// src/hooks/useBrapi.ts
import { useState, useCallback } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';
import { supabase } from '../lib/supabase';

/** Tipo retornado pela Brapi para um ativo */
export interface BrapiAtivo {
  precoAtual: number;
  nome: string;
  logo: string | null;
  dividendos: BrapiDividendo[];
}

/** Tipo de cada dividendo individual na resposta da Brapi */
export interface BrapiDividendo {
  /** AAAA-MM-DD */
  paymentDate: string;
  /** Valor por ação (em BRL) */
  rate: number;
  /** Ex: "DIVIDENDO", "JCP", "RENDIMENTO" */
  type: string;
  /** Data ex-dividendo */
  exDividendDate?: string;
  /** Código do ativo */
  assetIssued: string;
  /** Razão de desdobramento (geralmente 1) */
  relatedTo?: string;
  description?: string;
}

/**
 * Hook para buscar dados de um ativo na Brapi (preço atual + histórico de dividendos).
 *
 * O token é injetado server-side pela Edge Function brapi-proxy.
 *
 * Exemplo de uso:
 *   const { getAtivoDados, loading } = useBrapi();
 *   const dados = await getAtivoDados('PETR4');
 *   // dados.precoAtual, dados.dividendos[]
 */
export function useBrapi() {
  const [loading, setLoading] = useState(false);

  /**
   * Busca preço atual e histórico de dividendos de um ativo.
   * @param ticker  Código do ativo SEM o sufixo .SA (ex: "PETR4", "MXRF11", "BTC")
   */
  const getAtivoDados = useCallback(async (ticker: string): Promise<BrapiAtivo | null> => {
    if (!ticker?.trim()) return null;

    const t = ticker.trim().toUpperCase();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sem sessão');

      const url = `${SUPABASE_URL}/functions/v1/brapi-proxy?tickers=${encodeURIComponent(t)}&modules=dividends`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao buscar ${t}`);
      }

      const data = await response.json();

      if (data.error || !data.results?.length) {
        throw new Error(data.message || `Ativo ${t} não encontrado na Brapi`);
      }

      const resultado = data.results[0];

      return {
        precoAtual: resultado.regularMarketPrice ?? 0,
        nome: resultado.longName ?? resultado.shortName ?? t,
        logo: resultado.logourl ?? null,
        dividendos: (resultado.dividendsData?.cashDividends ?? []) as BrapiDividendo[],
      };
    } catch (error: any) {
      console.warn(`[useBrapi] Erro ao buscar dados de "${ticker}":`, error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca cotações de múltiplos ativos de uma vez (endpoint batch da Brapi).
   * @param tickers  Array de tickers SEM o sufixo .SA
   * @returns  Map de ticker → preço atual
   */
  const getCotacoesBatch = useCallback(async (tickers: string[]): Promise<Record<string, number>> => {
    if (!tickers.length) return {};
    setLoading(true);

    const result: Record<string, number> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sem sessão');

      const tickerStr = tickers.join(',');
      const url = `${SUPABASE_URL}/functions/v1/brapi-proxy?tickers=${encodeURIComponent(tickerStr)}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao buscar cotações em batch`);
      }

      const data = await response.json();

      if (data.error || !data.results?.length) {
        throw new Error(data.message || 'Resposta inválida da Brapi');
      }

      for (const item of data.results) {
        if (item.symbol && item.regularMarketPrice != null) {
          result[item.symbol.toUpperCase()] = Number(item.regularMarketPrice.toFixed(2));
        }
      }
    } catch (error: any) {
      console.warn('[useBrapi] Erro ao buscar cotações em batch:', error.message);
    } finally {
      setLoading(false);
    }

    return result;
  }, []);

  return { getAtivoDados, getCotacoesBatch, loading };
}
