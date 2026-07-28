import { useQuery } from '@tanstack/react-query';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

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

interface BrapiResult {
  symbol: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  currency?: string;
}

interface CoinGeckoResult {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  name: string;
}

const CRYPTO_TICKERS: Record<string, string> = {
  'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
  'ADA': 'cardano', 'XRP': 'ripple', 'DOT': 'polkadot',
  'AVAX': 'avalanche-2', 'LINK': 'chainlink', 'MATIC': 'matic-network',
  'DOGE': 'dogecoin', 'SHIB': 'shiba-inu', 'UNI': 'uniswap',
  'ATOM': 'cosmos', 'LTC': 'litecoin', 'BNB': 'binancecoin',
  'TRX': 'tron', 'FIL': 'filecoin', 'NEAR': 'near',
  'APT': 'aptos', 'ARB': 'arbitrum', 'OP': 'optimism',
  'SUI': 'sui', 'SEI': 'sei-network', 'INJ': 'injective',
  'RENDER': 'render-token', 'FET': 'fetch-ai', 'WLD': 'worldcoin',
  'TIA': 'celestia', 'PEPE': 'pepe', 'WIF': 'dogwifcoin',
  'BONK': 'bonk', 'FLOKI': 'floki', 'AAVE': 'aave',
  'CRV': 'curve-dao-token', 'MKR': 'maker', 'SUSHI': 'sushi',
  '1INCH': '1inch', 'YFI': 'yearn-finance', 'SNX': 'synthetix',
  'COMP': 'compound-governance-token',
};

const CRYPTO_COINGECKO_IDS = Object.values(CRYPTO_TICKERS);

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
    console.warn('Brapi proxy falhou, tentando fallback direto...');
    return fetchYahooFallback(tickers);
  }
}

async function fetchYahooFallback(tickers: string[]): Promise<StockQuote[]> {
  try {
    const query = tickers.map(t => `${t}.SA`).join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${query}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) throw new Error('Yahoo falhou');
    const data = await res.json();
    return (data.quoteResponse?.result || []).map((q: any) => ({
      symbol: (q.symbol || '').replace('.SA', ''),
      longName: q.longName || q.shortName || q.symbol,
      regularMarketPrice: q.regularMarketPrice || 0,
      regularMarketChangePercent: q.regularMarketChangePercent || 0,
    }));
  } catch {
    return [];
  }
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
  const crypto = unique.filter(isCryptoTicker);
  const stocks = unique.filter(t => !isCryptoTicker(t));

  const [stockQuotes, cryptoQuotes] = await Promise.all([
    fetchBrapiQuotes(stocks),
    fetchCoinGeckoTickers(crypto),
  ]);

  return [...stockQuotes, ...cryptoQuotes];
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
