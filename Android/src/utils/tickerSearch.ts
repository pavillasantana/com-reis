const WHITELIST_MOEDAS = ['USD', 'EUR', 'ARS', 'BRL', 'GBP', 'JPY', 'CAD', 'CHF', 'AUD', 'CNY', 'MXN'];
const WHITELIST_CRIPTOS = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'LINK', 'UNI', 'LTC'];

/**
 * Busca tickers sugeridos de ativos na API do Yahoo Finance com fallback para whitelists locais.
 */
export const buscarTickers = async (query: string): Promise<{ ticker: string; nome: string }[]> => {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim().toUpperCase();

  // Resultados locais da whitelist para busca rápida
  const resultadosLocais: { ticker: string; nome: string }[] = [];
  WHITELIST_MOEDAS.forEach((m) => {
    if (m.startsWith(q)) {
      resultadosLocais.push({ ticker: m, nome: `Moeda Global (${m})` });
    }
  });
  WHITELIST_CRIPTOS.forEach((c) => {
    if (c.startsWith(q)) {
      resultadosLocais.push({ ticker: c, nome: `Criptomoeda (${c})` });
    }
  });

  try {
    const response = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return resultadosLocais;
    }

    const data = await response.json();
    const quotes = data.quotes || [];

    const resultadosYahoo = quotes
      .filter((item: any) => item.quoteType === 'EQUITY' || item.quoteType === 'ETF' || item.quoteType === 'MUTUALFUND' || item.quoteType === 'CRYPTO')
      .map((item: any) => {
        let ticker = item.symbol;
        // Remove .SA das ações brasileiras para compatibilidade com o formato interno
        if (ticker.endsWith('.SA')) {
          ticker = ticker.replace('.SA', '');
        }
        // Remove -USD de criptos do Yahoo (ex: BTC-USD -> BTC)
        if (ticker.endsWith('-USD')) {
          ticker = ticker.replace('-USD', '');
        }
        
        const nome = item.longname || item.shortname || item.symbol;
        return { ticker, nome };
      });

    // Mesclar locais e Yahoo, removendo duplicatas de ticker
    const todos = [...resultadosLocais, ...resultadosYahoo];
    const vistos = new Set<string>();
    return todos.filter((item) => {
      const chave = item.ticker.toUpperCase();
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
  } catch (error) {
    console.warn('Erro ao buscar tickers no Yahoo Finance:', error);
    return resultadosLocais;
  }
};

/**
 * Valida se o ticker existe oficialmente. Retorna true se estiver nas whitelists
 * ou se for encontrado na pesquisa do Yahoo Finance.
 */
export const validarTicker = async (ticker: string): Promise<boolean> => {
  if (!ticker) return false;
  const t = ticker.trim().toUpperCase();

  // Whitelists locais de moedas e criptos
  if (WHITELIST_MOEDAS.includes(t) || WHITELIST_CRIPTOS.includes(t)) {
    return true;
  }

  // Regex para Ações/Fundos B3: 4 letras + 1 ou 2 números (ex: PETR4, MXRF11)
  const isB3Format = /^[A-Z]{4}[0-9]{1,2}$/.test(t);
  
  // Regex para Ações/ETFs USA: de 1 a 5 letras maiúsculas (ex: AAPL, TSLA, O)
  const isUSFormat = /^[A-Z]{1,5}$/.test(t);

  // Se não corresponder a nenhum formato válido, rejeita imediatamente
  if (!isB3Format && !isUSFormat) {
    return false;
  }

  let query = t;
  if (isB3Format) {
    query = `${t}.SA`;
  }

  try {
    const response = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) return false;

    const data = await response.json();
    const quotes = data.quotes || [];

    // Verifica se existe algum item na lista que bata exatamente com o símbolo que buscamos
    const existeMatch = quotes.some((item: any) => {
      const symbol = item.symbol.toUpperCase();
      return symbol === query || symbol.replace('.SA', '') === t || symbol.replace('-USD', '') === t;
    });

    return existeMatch;
  } catch (error) {
    console.warn('Erro ao validar ticker no Yahoo Finance:', error);
    // Em caso de falha de rede/API, se o formato for válido, permitimos
    return true;
  }
};
