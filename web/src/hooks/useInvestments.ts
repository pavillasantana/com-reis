import { useQuery } from '@tanstack/react-query';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';
import { getCategoriaByTicker, CRYPTO_COINGECKO_IDS } from '../utils/investmentCategories';

export interface StockQuote {
  symbol: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
}

export interface PortfolioMetrics {
  totalInvestido: number;
  totalAtual: number;
  totalDividendos: number;
  rentabilidadePercent: number;
  quantidadeAtivos: number;
  quantidadeOperacoes: number;
}

export interface MarketRankingItem {
  ticker: string;
  nome: string;
  categoria: string;
  subcategoria: string;
  preco: number;
  changePercent: number;
  changeCurrency: string;
}

interface BrapiResult {
  symbol: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  currency?: string;
}

const CRYPTO_TICKERS = CRYPTO_COINGECKO_IDS;

function isCryptoTicker(ticker: string): boolean {
  return ticker in CRYPTO_TICKERS;
}

async function fetchBrapiQuotes(tickers: string[]): Promise<StockQuote[]> {
  if (tickers.length === 0) return [];
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sem sessão');

    const tickersStr = tickers.join(',');
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/brapi-proxy?tickers=${tickersStr}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
      }
    );
    if (!res.ok) throw new Error('Brapi proxy falhou');
    const data = await res.json();
    return (data.results || []).map((q: BrapiResult) => ({
      symbol: q.symbol,
      longName: q.longName || q.symbol,
      regularMarketPrice: q.regularMarketPrice || 0,
      regularMarketChangePercent: q.regularMarketChangePercent || 0,
    }));
  } catch {
    console.warn('Brapi proxy falhou');
    return [];
  }
}

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

// Fonte primária de cotações: Yahoo Finance (100% grátis, sem chave).
// O endpoint v7/finance/quote foi descontinuado pela Yahoo (401) — v8/finance/chart
// segue aberto e cobre tickers B3 (sufixo .SA) e internacionais (símbolo nativo).
// Yahoo chart usa hífen para classes de ação dos EUA (BRK-B, não BRK.B).
function toYahooSymbol(ticker: string): string {
  const t = ticker.toUpperCase();
  const cat = getCategoriaByTicker(t);
  if (cat?.categoria === 'internacional') {
    // BDRs (AAPL34, MSFT34) são negociados na B3 e no Yahoo usam sufixo .SA
    if (cat.subcategoria === 'bdrs') return `${t}.SA`;
    return /^[A-Z0-9]+\.[A-Z]$/.test(t) ? t.replace('.', '-') : t;
  }
  return `${t}.SA`;
}

async function fetchYahooQuotes(tickers: string[]): Promise<StockQuote[]> {
  if (tickers.length === 0) return [];
  try {
    const quotes = await mapWithConcurrency(tickers, 3, async (t) => {
      try {
        const res = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(t))}?range=1d&interval=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta || meta.regularMarketPrice == null) return null;
        const changePercent = meta.chartPreviousClose
          ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
          : 0;
        return {
          symbol: t,
          longName: meta.longName || meta.shortName || t,
          regularMarketPrice: meta.regularMarketPrice,
          regularMarketChangePercent: changePercent,
        };
      } catch {
        return null;
      }
    });
    return quotes.filter((q): q is StockQuote => q !== null);
  } catch {
    return [];
  }
}

async function fetchQuotesBatch(stocks: string[]): Promise<StockQuote[]> {
  const yahoo = await fetchYahooQuotes(stocks);
  const got = new Set(yahoo.map(q => q.symbol.toUpperCase()));
  const missing = stocks.filter(t => !got.has(t.toUpperCase()));
  if (missing.length === 0) return yahoo;
  const brapi = await fetchBrapiQuotes(missing);
  return [...yahoo, ...brapi];
}

async function fetchCoinGeckoTickers(tickers: string[]): Promise<StockQuote[]> {
  const cryptoIds = tickers
    .map(t => CRYPTO_TICKERS[t])
    .filter(Boolean);
  if (cryptoIds.length === 0) return [];

  try {
    const ids = cryptoIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('CoinGecko falhou');
    const data = await res.json();

    const reverseMap: Record<string, string> = {};
    for (const [ticker, id] of Object.entries(CRYPTO_TICKERS)) {
      reverseMap[id] = ticker;
    }

    return Object.entries(data).map(([id, values]: [string, any]) => ({
      symbol: reverseMap[id] || id,
      longName: id,
      regularMarketPrice: values.usd || 0,
      regularMarketChangePercent: values.usd_24h_change || 0,
    }));
  } catch {
    console.warn('CoinGecko falhou');
    return [];
  }
}

export async function fetchQuotes(tickers: string[]): Promise<StockQuote[]> {
  const unique = [...new Set(tickers.map(t => t.toUpperCase()))];
  if (unique.length === 0) return [];

  const crypto = unique.filter(isCryptoTicker);
  const stocks = unique.filter(t => !isCryptoTicker(t));

  const BATCH_SIZE = 25;
  const batches: string[][] = [];
  for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
    batches.push(stocks.slice(i, i + BATCH_SIZE));
  }

  const stockResults = await Promise.all(
    batches.map(batch => fetchQuotesBatch(batch))
  );
  const allStockQuotes = stockResults.flat();
  const cryptoQuotes = await fetchCoinGeckoTickers(crypto);

  return [...allStockQuotes, ...cryptoQuotes];
}

export function useQuotes(tickers: string[], enabled: boolean = true) {
  const sortedTickers = [...new Set(tickers.map(t => t.toUpperCase()))].sort();
  const queryKey = sortedTickers.join(',');

  return useQuery<StockQuote[]>({
    queryKey: ['quotes', queryKey],
    queryFn: () => fetchQuotes(sortedTickers),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && sortedTickers.length > 0,
  });
}

export function useMarketQuotesByCategory(categoriaId: string | null) {
  return useQuery<StockQuote[]>({
    queryKey: ['market-quotes', categoriaId],
    queryFn: async () => {
      if (!categoriaId) return [];
      const { getTickersPorCategoria } = await import('../utils/investmentCategories');
      const tickers = getTickersPorCategoria(categoriaId).map(t => t.ticker);
      if (tickers.length === 0) return [];
      return fetchQuotes(tickers);
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!categoriaId,
  });
}

export function calcularMetricas(
  posicoes: Array<{
    ticker: string; qtd: number; custoTotal: number;
    categoria?: string; subcategoria?: string;
  }>,
  quotes: StockQuote[],
  dividendosTotal: number
): PortfolioMetrics {
  const quoteMap = new Map(quotes.map(q => [q.symbol.toUpperCase(), q]));

  let totalAtual = 0;
  const totalInvestido = posicoes.reduce((s, p) => s + p.custoTotal, 0);

  posicoes.forEach(p => {
    const quote = quoteMap.get(p.ticker.toUpperCase());
    if (quote) {
      totalAtual += quote.regularMarketPrice * p.qtd;
    } else {
      totalAtual += p.custoTotal;
    }
  });

  const baseInvestido = totalInvestido || 1;
  const rentabilidadePercent = ((totalAtual + dividendosTotal - totalInvestido) / baseInvestido) * 100;

  return {
    totalInvestido,
    totalAtual,
    totalDividendos: dividendosTotal,
    rentabilidadePercent,
    quantidadeAtivos: posicoes.length,
    quantidadeOperacoes: 0,
  };
}

export function calcularRanking(
  posicoes: Array<{
    ticker: string; qtd: number; custoTotal: number;
    categoria?: string; subcategoria?: string;
  }>,
  quotes: StockQuote[]
): Array<{
  ticker: string; nome: string; categoria: string;
  subcategoria: string; precoMedio: number; precoAtual: number;
  quantidade: number; totalInvestido: number; totalAtual: number;
  lucroPrej: number; retornoPercent: number;
}> {
  const quoteMap = new Map(quotes.map(q => [q.symbol.toUpperCase(), q]));

  return posicoes.map(p => {
    const precoMedio = p.qtd > 0 ? p.custoTotal / p.qtd : 0;
    const quote = quoteMap.get(p.ticker.toUpperCase());
    const precoAtual = quote?.regularMarketPrice || precoMedio;
    const totalAtual = precoAtual * p.qtd;
    const lucroPrej = totalAtual - p.custoTotal;
    const retornoPercent = p.custoTotal > 0 ? (lucroPrej / p.custoTotal) * 100 : 0;

    return {
      ticker: p.ticker,
      nome: quote?.longName || p.ticker,
      categoria: p.categoria || 'sem_categoria',
      subcategoria: p.subcategoria || '',
      precoMedio,
      precoAtual,
      quantidade: p.qtd,
      totalInvestido: p.custoTotal,
      totalAtual,
      lucroPrej,
      retornoPercent,
    };
  }).sort((a, b) => b.retornoPercent - a.retornoPercent);
}

export function calcularMarketRanking(
  tickers: Array<{ ticker: string; nome: string }>,
  quotes: StockQuote[]
): MarketRankingItem[] {
  const quoteMap = new Map(quotes.map(q => [q.symbol.toUpperCase(), q]));

  return tickers.map(t => {
    const quote = quoteMap.get(t.ticker.toUpperCase());
    return {
      ticker: t.ticker,
      nome: t.nome,
      categoria: '',
      subcategoria: '',
      preco: quote?.regularMarketPrice || 0,
      changePercent: quote?.regularMarketChangePercent || 0,
      changeCurrency: '',
    };
  });
}
