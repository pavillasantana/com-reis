import { useQuery } from '@tanstack/react-query';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

export interface StockQuote {
  symbol: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
}

export interface NetWorthData {
  mes: string;
  patrimonio: number;
}

interface InvestmentsResponse {
  quotes: StockQuote[];
  netWorthHistory: NetWorthData[];
}

const MOCK_RESPONSE: InvestmentsResponse = {
  quotes: [
    { symbol: 'PETR4', longName: 'Petrobras S.A.', regularMarketPrice: 38.50, regularMarketChangePercent: 1.25 },
    { symbol: 'VALE3', longName: 'Vale S.A.', regularMarketPrice: 62.10, regularMarketChangePercent: -0.45 },
    { symbol: 'WEGE3', longName: 'Weg S.A.', regularMarketPrice: 42.80, regularMarketChangePercent: 2.15 },
    { symbol: 'IVVB11', longName: 'iShares S&P 500 Fundo de Índice', regularMarketPrice: 312.40, regularMarketChangePercent: 0.85 },
  ],
  netWorthHistory: [
    { mes: 'Jan', patrimonio: 10000 },
    { mes: 'Fev', patrimonio: 11500 },
    { mes: 'Mar', patrimonio: 13200 },
    { mes: 'Abr', patrimonio: 14500 },
    { mes: 'Mai', patrimonio: 18000 },
    { mes: 'Jun', patrimonio: 22400 },
  ],
};

async function fetchInvestments(): Promise<InvestmentsResponse> {
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sem sessão');

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/brapi-proxy?tickers=PETR4,VALE3,WEGE3,IVVB11`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
      }
    );
    if (!res.ok) throw new Error('Brapi proxy falhou');
    const data = await res.json();
    
    const quotes = (data.results || []).map((q: { symbol: string; longName?: string; regularMarketPrice?: number; regularMarketChangePercent?: number }) => ({
      symbol: q.symbol,
      longName: q.longName || q.symbol,
      regularMarketPrice: q.regularMarketPrice || 0,
      regularMarketChangePercent: q.regularMarketChangePercent || 0,
    }));

    return {
      quotes: quotes.length > 0 ? quotes : MOCK_RESPONSE.quotes,
      netWorthHistory: MOCK_RESPONSE.netWorthHistory,
    };
  } catch {
    console.warn('Erro ao carregar cotações reais (Brapi), usando fallback de investimentos.');
    return MOCK_RESPONSE;
  }
}

export function useInvestments(enabled: boolean = true) {
  return useQuery<InvestmentsResponse>({
    queryKey: ['investments'],
    queryFn: fetchInvestments,
    placeholderData: MOCK_RESPONSE,
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: enabled,
  });
}
