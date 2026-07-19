import { useState, useCallback, useRef } from 'react';

export interface AssetSuggestion {
  ticker: string;
  nome: string;
  tipo: 'acao' | 'fiis' | 'cripto' | 'moeda';
  preco?: number;
  moeda?: string;
}

/**
 * Hook de autocomplete de ativos.
 * Consulta o Yahoo Finance Search API para sugestões enquanto o usuário digita.
 * Uso: const { sugestoes, buscar, carregando, limpar } = useAssetSearch();
 */
export const useAssetSearch = () => {
  const [sugestoes, setSugestoes] = useState<AssetSuggestion[]>([]);
  const [carregando, setCarregando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const classificarTipo = (symbol: string, quoteType?: string): AssetSuggestion['tipo'] => {
    const upper = symbol.toUpperCase();
    if (quoteType === 'CRYPTOCURRENCY' || upper === 'BTC' || upper === 'ETH' || upper === 'SOL') return 'cripto';
    if (quoteType === 'CURRENCY' || upper === 'USD' || upper === 'EUR' || upper === 'ARS') return 'moeda';
    if (upper.endsWith('11') || (quoteType === 'ETF' && upper.includes('11'))) return 'fiis';
    return 'acao';
  };

  const normalizarTicker = (symbol: string): string => {
    return symbol.replace('.SA', '').toUpperCase();
  };

  const buscar = useCallback((texto: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!texto || texto.trim().length < 2) {
      setSugestoes([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setCarregando(true);
      try {
        // Busca no Yahoo Finance (sem CORS em React Native)
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(texto)}&lang=pt-BR&region=BR&quotesCount=8&newsCount=0`;
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (!resp.ok) throw new Error('Falha na busca de ativos');

        const data = await resp.json();
        const quotes: any[] = data?.quotes || [];

        const resultados: AssetSuggestion[] = quotes
          .filter((q) => q.symbol && q.shortname)
          .map((q) => ({
            ticker: normalizarTicker(q.symbol),
            nome: q.shortname || q.longname || q.symbol,
            tipo: classificarTipo(q.symbol, q.quoteType),
            preco: q.regularMarketPrice,
            moeda: q.currency,
          }));

        setSugestoes(resultados);
      } catch (err) {
        console.warn('Erro no useAssetSearch:', err);
        // Fallback: sugestões estáticas conhecidas
        const textoLower = texto.toLowerCase();
        const fallback: AssetSuggestion[] = ([
          { ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'acao' },
          { ticker: 'VALE3', nome: 'Vale ON', tipo: 'acao' },
          { ticker: 'BBAS3', nome: 'Banco do Brasil ON', tipo: 'acao' },
          { ticker: 'ITUB4', nome: 'Itaú Unibanco PN', tipo: 'acao' },
          { ticker: 'MXRF11', nome: 'Maxi Renda FII', tipo: 'fiis' },
          { ticker: 'HGLG11', nome: 'CSHG Logística FII', tipo: 'fiis' },
          { ticker: 'BTC', nome: 'Bitcoin', tipo: 'cripto' },
          { ticker: 'ETH', nome: 'Ethereum', tipo: 'cripto' },
          { ticker: 'USD', nome: 'Dólar Americano', tipo: 'moeda' },
          { ticker: 'EUR', nome: 'Euro', tipo: 'moeda' },
        ] as const).filter(
          (a) =>
            a.ticker.toLowerCase().includes(textoLower) ||
            a.nome.toLowerCase().includes(textoLower)
        ) as AssetSuggestion[];
        setSugestoes(fallback);
      } finally {
        setCarregando(false);
      }
    }, 300);
  }, []);

  const limpar = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSugestoes([]);
  }, []);

  return { sugestoes, buscar, carregando, limpar };
};
