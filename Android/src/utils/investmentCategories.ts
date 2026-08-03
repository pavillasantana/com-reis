/**
 * investmentCategories.ts (Android)
 * Mapa de tickers → categoria/subcategoria, espelho do web.
 * Usado pela importação de investimentos para derivar categoria automaticamente.
 */

type TickerMapEntry = { categoria: string; subcategoria: string };

const TICKER_CATEGORY_MAP: Record<string, TickerMapEntry> = {
  // Renda Fixa Nacional
  'TESOURO IPCA+':     { categoria: 'renda_fixa_br', subcategoria: 'tesouro_direto' },
  'TESOURO SELIC':     { categoria: 'renda_fixa_br', subcategoria: 'tesouro_direto' },
  'TESOURO PREFIXADO': { categoria: 'renda_fixa_br', subcategoria: 'tesouro_direto' },
  'NTN-B':             { categoria: 'renda_fixa_br', subcategoria: 'tesouro_direto' },
  'LTN':               { categoria: 'renda_fixa_br', subcategoria: 'tesouro_direto' },
  'LFT':               { categoria: 'renda_fixa_br', subcategoria: 'tesouro_direto' },

  // Renda Variável Nacional — Ações
  'PETR4':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'PETR3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'VALE3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'VALE5':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'ITUB4':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'ITUB3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'BBDC4':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'BBDC3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'BBAS3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'BBAS11': { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'MGLU3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'WEGE3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'RENT3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'LREN3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'ABEV3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'ABEV4':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'RADL3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'ELET3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'ELET6':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'SUZB3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'KLBN11': { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'CSNA3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'GGBR4':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'USIM5':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'COGN3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'HAPV3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'RDOR3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'ASAI3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'VIIA3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'CVCB3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'AZUL4':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'EMBR3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'TOTS3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'BPAC11': { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'BPAC5':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'NTCO3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'ENEV3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'PRIO3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'RAIL3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'CPLE6':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'TAEE11': { categoria: 'renda_variavel_br', subcategoria: 'acoes' },
  'VIVT3':  { categoria: 'renda_variavel_br', subcategoria: 'acoes' },

  // Renda Variável Nacional — FIIs
  'MXRF11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'HGLG11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'XPML11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'KNRI11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'HGRU11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'BCFF11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'IRDM11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'BTLG11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'HSML11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'KNCR11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'PVBI11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'VISC11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'HFOF11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'MXRI11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'VGIR11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'BZLI11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'TRXL11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },
  'CPTS11': { categoria: 'renda_variavel_br', subcategoria: 'fiis' },

  // Renda Variável Nacional — FIAGRO
  'AGXY11': { categoria: 'renda_variavel_br', subcategoria: 'fiagro' },
  'FIAG11': { categoria: 'renda_variavel_br', subcategoria: 'fiagro' },
  'BGRI11': { categoria: 'renda_variavel_br', subcategoria: 'fiagro' },
  'DALY3':  { categoria: 'renda_variavel_br', subcategoria: 'fiagro' },

  // Renda Variável Nacional — ETFs
  'BOVA11': { categoria: 'renda_variavel_br', subcategoria: 'etfs_br' },
  'SMAL11': { categoria: 'renda_variavel_br', subcategoria: 'etfs_br' },
  'IVVB11': { categoria: 'renda_variavel_br', subcategoria: 'etfs_br' },
  'USDVAL': { categoria: 'renda_variavel_br', subcategoria: 'etfs_br' },
  'HASH11': { categoria: 'renda_variavel_br', subcategoria: 'etfs_br' },
  'QBTC11': { categoria: 'renda_variavel_br', subcategoria: 'etfs_br' },
  'ETHE11': { categoria: 'renda_variavel_br', subcategoria: 'etfs_br' },

  // Europa — Stocks (Espanha)
  'SAN':  { categoria: 'internacional', subcategoria: 'stocks' },
  'SAN.MC': { categoria: 'internacional', subcategoria: 'stocks' },
  'BBVA': { categoria: 'internacional', subcategoria: 'stocks' },
  'TEF':  { categoria: 'internacional', subcategoria: 'stocks' },
  'IBE':  { categoria: 'internacional', subcategoria: 'stocks' },
  'REP':  { categoria: 'internacional', subcategoria: 'stocks' },
  'ITX':  { categoria: 'internacional', subcategoria: 'stocks' },

  // Europa — Stocks (França)
  'MC':   { categoria: 'internacional', subcategoria: 'stocks' },
  'MC.PA': { categoria: 'internacional', subcategoria: 'stocks' },
  'OR':   { categoria: 'internacional', subcategoria: 'stocks' },
  'OR.PA': { categoria: 'internacional', subcategoria: 'stocks' },
  'AIR':  { categoria: 'internacional', subcategoria: 'stocks' },
  'AIR.PA': { categoria: 'internacional', subcategoria: 'stocks' },
  'SAN.PA': { categoria: 'internacional', subcategoria: 'stocks' },

  // Europa — Stocks (Alemanha)
  'SAP':  { categoria: 'internacional', subcategoria: 'stocks' },
  'SAP.DE': { categoria: 'internacional', subcategoria: 'stocks' },
  'SIE':  { categoria: 'internacional', subcategoria: 'stocks' },
  'SIE.DE': { categoria: 'internacional', subcategoria: 'stocks' },
  'DTE':  { categoria: 'internacional', subcategoria: 'stocks' },
  'DTE.DE': { categoria: 'internacional', subcategoria: 'stocks' },
  'BMW':  { categoria: 'internacional', subcategoria: 'stocks' },
  'BMW.DE': { categoria: 'internacional', subcategoria: 'stocks' },
  'VOW3': { categoria: 'internacional', subcategoria: 'stocks' },
  'VOW3.DE': { categoria: 'internacional', subcategoria: 'stocks' },

  // Europa — Stocks (Holanda)
  'ASML': { categoria: 'internacional', subcategoria: 'stocks' },
  'ASML.AS': { categoria: 'internacional', subcategoria: 'stocks' },
  'PHIA': { categoria: 'internacional', subcategoria: 'stocks' },
  'PHIA.AS': { categoria: 'internacional', subcategoria: 'stocks' },

  // Europa — Stocks (Reino Unido)
  'HSBA': { categoria: 'internacional', subcategoria: 'stocks' },
  'HSBA.L': { categoria: 'internacional', subcategoria: 'stocks' },
  'BP':   { categoria: 'internacional', subcategoria: 'stocks' },
  'BP.L': { categoria: 'internacional', subcategoria: 'stocks' },
  'ULVR': { categoria: 'internacional', subcategoria: 'stocks' },
  'ULVR.L': { categoria: 'internacional', subcategoria: 'stocks' },
  'RIO':  { categoria: 'internacional', subcategoria: 'stocks' },
  'RIO.L': { categoria: 'internacional', subcategoria: 'stocks' },
  'GSK':  { categoria: 'internacional', subcategoria: 'stocks' },
  'GSK.L': { categoria: 'internacional', subcategoria: 'stocks' },

  // Europa — Stocks (Suíça)
  'NESN': { categoria: 'internacional', subcategoria: 'stocks' },
  'NESN.SW': { categoria: 'internacional', subcategoria: 'stocks' },
  'ROG':  { categoria: 'internacional', subcategoria: 'stocks' },
  'ROG.SW': { categoria: 'internacional', subcategoria: 'stocks' },
  'NOVN': { categoria: 'internacional', subcategoria: 'stocks' },
  'NOVN.SW': { categoria: 'internacional', subcategoria: 'stocks' },

  // Europa — Stocks (Itália)
  'ENI':  { categoria: 'internacional', subcategoria: 'stocks' },
  'ENI.MI': { categoria: 'internacional', subcategoria: 'stocks' },
  'ISP':  { categoria: 'internacional', subcategoria: 'stocks' },
  'ISP.MI': { categoria: 'internacional', subcategoria: 'stocks' },

  // América Latina — Argentina
  'GGAL': { categoria: 'internacional', subcategoria: 'stocks' },
  'GGAL.BA': { categoria: 'internacional', subcategoria: 'stocks' },
  'YPFD': { categoria: 'internacional', subcategoria: 'stocks' },
  'YPFD.BA': { categoria: 'internacional', subcategoria: 'stocks' },
  'PAMP': { categoria: 'internacional', subcategoria: 'stocks' },
  'PAMP.BA': { categoria: 'internacional', subcategoria: 'stocks' },
  'MELI': { categoria: 'internacional', subcategoria: 'stocks' },
  'BMA':  { categoria: 'internacional', subcategoria: 'stocks' },

  // América Latina — México
  'FEMSA': { categoria: 'internacional', subcategoria: 'stocks' },
  'FEMSA.MX': { categoria: 'internacional', subcategoria: 'stocks' },
  'WALMEX': { categoria: 'internacional', subcategoria: 'stocks' },
  'WALMEX.MX': { categoria: 'internacional', subcategoria: 'stocks' },

  // América Latina — Chile
  'COPEC': { categoria: 'internacional', subcategoria: 'stocks' },
  'COPEC.SN': { categoria: 'internacional', subcategoria: 'stocks' },
  'BSANTANDER': { categoria: 'internacional', subcategoria: 'stocks' },
  'BSANTANDER.SN': { categoria: 'internacional', subcategoria: 'stocks' },

  // América Latina — Peru
  'BAP':  { categoria: 'internacional', subcategoria: 'stocks' },

  // Internacional — Stocks (EUA)
  'AAPL':  { categoria: 'internacional', subcategoria: 'stocks' },
  'MSFT':  { categoria: 'internacional', subcategoria: 'stocks' },
  'GOOGL': { categoria: 'internacional', subcategoria: 'stocks' },
  'GOOG':  { categoria: 'internacional', subcategoria: 'stocks' },
  'AMZN':  { categoria: 'internacional', subcategoria: 'stocks' },
  'TSLA':  { categoria: 'internacional', subcategoria: 'stocks' },
  'META':  { categoria: 'internacional', subcategoria: 'stocks' },
  'NVDA':  { categoria: 'internacional', subcategoria: 'stocks' },
  'NFLX':  { categoria: 'internacional', subcategoria: 'stocks' },
  'AMD':   { categoria: 'internacional', subcategoria: 'stocks' },
  'DIS':   { categoria: 'internacional', subcategoria: 'stocks' },
  'BABA':  { categoria: 'internacional', subcategoria: 'stocks' },
  'NIO':   { categoria: 'internacional', subcategoria: 'stocks' },
  'JPM':   { categoria: 'internacional', subcategoria: 'stocks' },
  'V':     { categoria: 'internacional', subcategoria: 'stocks' },
  'MA':    { categoria: 'internacional', subcategoria: 'stocks' },
  'JNJ':   { categoria: 'internacional', subcategoria: 'stocks' },
  'WMT':   { categoria: 'internacional', subcategoria: 'stocks' },
  'PG':    { categoria: 'internacional', subcategoria: 'stocks' },
  'KO':    { categoria: 'internacional', subcategoria: 'stocks' },
  'PEP':   { categoria: 'internacional', subcategoria: 'stocks' },
  'BRK.B': { categoria: 'internacional', subcategoria: 'stocks' },
  'UNH':   { categoria: 'internacional', subcategoria: 'stocks' },
  'CRM':   { categoria: 'internacional', subcategoria: 'stocks' },
  'INTC':  { categoria: 'internacional', subcategoria: 'stocks' },
  'ORCL':  { categoria: 'internacional', subcategoria: 'stocks' },

  // Internacional — REITs
  'VNQ':  { categoria: 'internacional', subcategoria: 'reits' },
  'SCHH': { categoria: 'internacional', subcategoria: 'reits' },
  'O':    { categoria: 'internacional', subcategoria: 'reits' },
  'PLD':  { categoria: 'internacional', subcategoria: 'reits' },
  'AMT':  { categoria: 'internacional', subcategoria: 'reits' },

  // Internacional — ETFs Internacionais
  'VOO':  { categoria: 'internacional', subcategoria: 'etfs_intl' },
  'SPY':  { categoria: 'internacional', subcategoria: 'etfs_intl' },
  'QQQ':  { categoria: 'internacional', subcategoria: 'etfs_intl' },
  'VTI':  { categoria: 'internacional', subcategoria: 'etfs_intl' },
  'ARKK': { categoria: 'internacional', subcategoria: 'etfs_intl' },
  'EEM':  { categoria: 'internacional', subcategoria: 'etfs_intl' },
  'VWO':  { categoria: 'internacional', subcategoria: 'etfs_intl' },

  // Alternativos — Criptomoedas
  'BTC':   { categoria: 'alternativos', subcategoria: 'crypto' },
  'ETH':   { categoria: 'alternativos', subcategoria: 'crypto' },
  'SOL':   { categoria: 'alternativos', subcategoria: 'crypto' },
  'ADA':   { categoria: 'alternativos', subcategoria: 'crypto' },
  'XRP':   { categoria: 'alternativos', subcategoria: 'crypto' },
  'DOT':   { categoria: 'alternativos', subcategoria: 'crypto' },
  'AVAX':  { categoria: 'alternativos', subcategoria: 'crypto' },
  'LINK':  { categoria: 'alternativos', subcategoria: 'crypto' },
  'MATIC': { categoria: 'alternativos', subcategoria: 'crypto' },
  'DOGE':  { categoria: 'alternativos', subcategoria: 'crypto' },
  'SHIB':  { categoria: 'alternativos', subcategoria: 'crypto' },
  'UNI':   { categoria: 'alternativos', subcategoria: 'crypto' },
  'ATOM':  { categoria: 'alternativos', subcategoria: 'crypto' },
  'LTC':   { categoria: 'alternativos', subcategoria: 'crypto' },
  'BNB':   { categoria: 'alternativos', subcategoria: 'crypto' },
};

export function getCategoriaByTicker(ticker: string): TickerMapEntry | null {
  return TICKER_CATEGORY_MAP[ticker.toUpperCase()] || null;
}
