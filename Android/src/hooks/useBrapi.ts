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
  /** AAAA-MM-DD (ou ISO completo) */
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
  /** Aliases da API v2 (proxy normaliza label→type, lastDatePrior→exDividendDate, remarks→description) */
  label?: string;
  lastDatePrior?: string;
  remarks?: string;
  approvedOn?: string | null;
  isinCode?: string;
}

/** Fonte primária de cotações: Yahoo Finance v8/chart (100% grátis, sem chave).
 *  O endpoint v7/finance/quote foi descontinuado pela Yahoo (401).
 *  Retorna null se o ticker falhar. */
const SUFIXOS_EXCHANGE = new Set(['SA', 'MC', 'PA', 'DE', 'AS', 'L', 'SW', 'MI', 'BA', 'MX', 'SN']);

function toYahooSymbol(ticker: string): string {
  const t = ticker.toUpperCase();
  const dot = t.lastIndexOf('.');
  if (dot !== -1) {
    const sufixo = t.slice(dot + 1);
    if (SUFIXOS_EXCHANGE.has(sufixo)) return t;
    if (/^[A-Z]$/.test(sufixo)) return `${t.slice(0, dot)}-${sufixo}`;
    return `${t}.SA`;
  }
  return /\d/.test(t) ? `${t}.SA` : t;
}

async function fetchYahooQuote(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(ticker))}?range=1d&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    return meta?.regularMarketPrice != null ? Number(meta.regularMarketPrice) : null;
  } catch {
    return null;
  }
}

/** Executa fn sobre items respeitando um limite de concorrência. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
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
      // Fallback de preço via Yahoo (dividendos ficam vazios)
      const preco = await fetchYahooQuote(t);
      return preco != null
        ? { precoAtual: preco, nome: t, logo: null, dividendos: [] }
        : null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca cotações de múltiplos ativos de uma vez.
   * Fonte primária: Yahoo Finance v8/chart (100% grátis, sem chave).
   * Fallback por ticker: Edge Function brapi-proxy (cobre tickers que o Yahoo não retornou).
   * @param tickers  Array de tickers SEM o sufixo .SA
   * @returns  Map de ticker → preço atual
   */
  const getCotacoesBatch = useCallback(async (tickers: string[]): Promise<Record<string, number>> => {
    if (!tickers.length) return {};
    setLoading(true);

    const result: Record<string, number> = {};
    try {
      const upper = [...new Set(tickers.map(t => t.trim().toUpperCase()))];

      // 1) Yahoo Finance primeiro
      const yahooPrices = await mapWithConcurrency(upper, 3, async (t) => ({
        t,
        price: await fetchYahooQuote(t),
      }));
      for (const { t, price } of yahooPrices) {
        if (price != null) result[t] = price;
      }

      // 2) Fallback via Brapi proxy apenas para os que falharam
      const missing = upper.filter(t => result[t] == null);
      if (missing.length === 0) return result;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sem sessão');

      const url = `${SUPABASE_URL}/functions/v1/brapi-proxy?tickers=${encodeURIComponent(missing.join(','))}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.error && data.results?.length) {
          for (const item of data.results) {
            if (item.symbol && item.regularMarketPrice != null && result[item.symbol.toUpperCase()] == null) {
              result[item.symbol.toUpperCase()] = Number(item.regularMarketPrice.toFixed(2));
            }
          }
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
