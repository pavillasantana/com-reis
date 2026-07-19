// ─── Mapa Completo de Investimentos Globais ──────────────────────────

export interface Subcategoria {
  id: string;
  nome: string;
  descricao: string;
}

export interface CategoriaInvestimento {
  id: string;
  nome: string;
  cor: string;
  subcategorias: Subcategoria[];
}

export const CATEGORIAS_INVESTIMENTO: CategoriaInvestimento[] = [
  {
    id: 'renda_fixa_br',
    nome: 'Renda Fixa Nacional',
    cor: '#10B981',
    subcategorias: [
      { id: 'tesouro_direto', nome: 'Tesouro Direto', descricao: 'Títulos públicos federais (IPCA+, Selic, Prefixado)' },
      { id: 'cdb_rdb', nome: 'CDB / RDB', descricao: 'Certificados e Recibos de Depósito Bancário' },
      { id: 'lci_lca', nome: 'LCI / LCA', descricao: 'Letras de Crédito Imobiliário e do Agronegócio (sem IR)' },
      { id: 'cri_cra', nome: 'CRI / CRA', descricao: 'Certificados de Recebíveis Imobiliários e do Agronegócio' },
      { id: 'debentures', nome: 'Debêntures', descricao: 'Títulos de dívida de grandes empresas' },
      { id: 'poupanca', nome: 'Poupança', descricao: 'Conta de poupança tradicional' },
    ],
  },
  {
    id: 'renda_variavel_br',
    nome: 'Renda Variável Nacional',
    cor: '#3B82F6',
    subcategorias: [
      { id: 'acoes', nome: 'Ações', descricao: 'Pequenas participações em empresas listadas na B3' },
      { id: 'fiis', nome: 'FIIs', descricao: 'Fundos Imobiliários — cotas de imóveis com renda de aluguéis' },
      { id: 'fiagro', nome: 'FIAGRO', descricao: 'Fundos de Investimento do Agronegócio' },
      { id: 'etfs_br', nome: 'ETFs', descricao: 'Fundos de Índice que copiam o mercado (BOVA11, SMAL11)' },
      { id: 'bdrs', nome: 'BDRs', descricao: 'Recibos de ações de empresas estrangeiras negociados no Brasil' },
      { id: 'derivativos', nome: 'Opções / Derivativos', descricao: 'Contratos de opções e derivativos de alto risco' },
    ],
  },
  {
    id: 'internacional',
    nome: 'Internacional',
    cor: '#8B5CF6',
    subcategorias: [
      { id: 'stocks', nome: 'Stocks', descricao: 'Ações diretas em bolsas americanas/europeias' },
      { id: 'reits', nome: 'REITs', descricao: 'Fundos Imobiliários dos EUA e global' },
      { id: 'bonds', nome: 'Bonds', descricao: 'Renda fixa internacional (governos e empresas)' },
      { id: 'etfs_intl', nome: 'ETFs Internacionais', descricao: 'Fundos de índice globais (S&P 500, NASDAQ, etc)' },
    ],
  },
  {
    id: 'fundos',
    nome: 'Fundos de Investimento',
    cor: '#F59E0B',
    subcategorias: [
      { id: 'fundo_rf', nome: 'Renda Fixa', descricao: 'Fundos focados em títulos conservadores' },
      { id: 'fundo_acoes', nome: 'Ações', descricao: 'Fundos que selecionam empresas com potencial' },
      { id: 'fundo_multimercado', nome: 'Multimercado', descricao: 'Misturam dólar, juros, ações e ouro' },
      { id: 'fundo_cambial', nome: 'Cambiais', descricao: 'Acompanham a variação de moedas estrangeiras' },
    ],
  },
  {
    id: 'alternativos',
    nome: 'Alternativos & Nova Economia',
    cor: '#EF4444',
    subcategorias: [
      { id: 'crypto', nome: 'Criptomoedas', descricao: 'Bitcoin, Ethereum e moedas digitais (blockchain)' },
      { id: 'ouro_metais', nome: 'Ouro & Metais', descricao: 'Metais preciosos como proteção contra crises' },
      { id: 'venture_capital', nome: 'Venture Capital', descricao: 'Investimento em startups e empresas de tecnologia' },
      { id: 'p2p', nome: 'Peer-to-Peer', descricao: 'Empréstimo direto entre pessoas via plataformas digitais' },
      { id: 'crowdfunding', nome: 'Crowdfunding', descricao: 'Financiamento coletivo regulamentado de projetos' },
    ],
  },
];

// ─── Mapeamento de Tickers para Categoria ──────────────────────────

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

  // Internacional — Stocks
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

// ─── Funções Auxiliares ──────────────────────────────────────────

export function getCategoriaByTicker(ticker: string): TickerMapEntry | null {
  return TICKER_CATEGORY_MAP[ticker.toUpperCase()] || null;
}

export function getCategoriaInfo(categoriaId: string): CategoriaInvestimento | undefined {
  return CATEGORIAS_INVESTIMENTO.find(c => c.id === categoriaId);
}

export function getSubcategoriaInfo(categoriaId: string, subcategoriaId: string): Subcategoria | undefined {
  const cat = getCategoriaInfo(categoriaId);
  return cat?.subcategorias.find(s => s.id === subcategoriaId);
}

export function getNomeCategoria(categoriaId: string): string {
  return getCategoriaInfo(categoriaId)?.nome || categoriaId;
}

export function getNomeSubcategoria(categoriaId: string, subcategoriaId: string): string {
  return getSubcategoriaInfo(categoriaId, subcategoriaId)?.nome || subcategoriaId;
}

// ─── Banco Completo de Tickers (Auto-identificação) ────────────────

export const TICKER_DB: Record<string, string> = {
  // ── Renda Variável Nacional — Ações ──
  'PETR3': 'Petrobras ON', 'PETR4': 'Petrobras PN', 'PETR11': 'Petrobras UNT',
  'VALE3': 'Vale ON', 'VALE5': 'Vale PN',
  'ITUB3': 'Itaú Unibanco ON', 'ITUB4': 'Itaú Unibanco PN',
  'BBDC3': 'Bradesco ON', 'BBDC4': 'Bradesco PN',
  'BBAS3': 'Banco do Brasil ON', 'BBAS11': 'Banco do Brasil UNT',
  'BPAC11': 'BTG Pactual UNT', 'BPAC5': 'BTG Pactual PN',
  'ABEV3': 'Ambev ON', 'ABEV4': 'Ambev PN',
  'MGLU3': 'Magazine Luiza ON', 'WEGE3': 'Weg ON', 'RENT3': 'Localiza ON',
  'LREN3': 'Lojas Renner ON', 'TOTS3': 'TOTVS ON',
  'RADL3': 'RD Renner ON', 'ELET3': 'Eletrobras ON', 'ELET6': 'Eletrobras PN',
  'SUZB3': 'Suzano ON', 'KLBN11': 'Klabin UNT', 'CSNA3': 'CSN ON',
  'GGBR4': 'Gerdau PN', 'USIM5': 'Usiminas PN', 'COGN3': 'Cogna ON',
  'HAPV3': 'Hapvida ON', 'RDOR3': 'Rede D\'Or ON', 'ASAI3': 'Assai ON',
  'VIIA3': 'Via Varejo ON', 'CVCB3': 'CVC Brasil ON',
  'AZUL4': 'Azul PN', 'EMBR3': 'Embraer ON',
  'NTCO3': 'Natura ON', 'ENEV3': 'Eneva ON', 'PRIO3': 'PRIO ON',
  'RAIL3': 'Rumo ON', 'CPLE6': 'Copel PN', 'TAEE11': 'Taesa UNT',
  'VIVT3': 'Telefônica Vivo ON', 'CMIG4': 'Cemig PN',
  'CCRO3': 'CCR ON', 'ECOR3': 'Ecorodovias ON', 'VVAR3': 'Via Varejo ON',
  'YDUQ3': 'Yduqs ON', 'QUAL3': 'Qualicorp ON', 'IRBR3': 'IRB Brasil ON',
  'SBSP3': 'Sabesp ON', 'CMIN3': 'CMIN3 ON', 'LAME4': 'Lojas Americanas PN',
  'ARZZ3': 'Arezzo ON', 'SOMA3': 'Soma ON', 'ARTR3': 'Artescê ON',
  'MRFG3': 'Marfrig ON', 'BEEF3': 'JBS ON', 'JBSS3': 'JBS PN',
  'MRVE3': 'MRV ON', 'MULT3': 'Multiplan ON', 'LPSB3': 'Lopes ON',
  'EZTC3': 'EZtec ON', 'JHSF3': 'JHSF ON', 'DIRR3': 'Direcional ON',
  'EVEN3': 'Even ON', 'TEND3': 'Trisul ON', 'CYRE3': 'Cyrela ON',
  'AURA33': 'Aura Minerals ON', 'HYPE3': 'Hypera ON',
  'GEPA3': 'Ger Paraná ON', 'FESA4': 'Ferbasa PN', 'PETZ3': 'Petz ON',
  'LWSA3': 'Locaweb ON', 'CASH3': 'Méliuz ON', 'POSI3': 'Positivo ON',
  'IFCM3': 'Intfrutas ON', 'MELI3': 'Mercado Livre ON',
  'Rumo3': 'Rumo ON', 'Rumo11': 'Rumo UNT',

  // ── Renda Variável Nacional — FIIs ──
  'MXRF11': 'Maxi Renda FII', 'HGLG11': 'CSHG Logística FII',
  'XPML11': 'XP Malls FII', 'KNRI11': 'Kinea Renda Imob FII',
  'HGRU11': 'CSHG Renda Urbana FII', 'BCFF11': 'BC FUND FII',
  'IRDM11': 'Iridium Renda Imob FII', 'BTLG11': 'BTG Pactual Log FII',
  'HSML11': 'HSI Mall FII', 'KNCR11': 'Kinea CR FII',
  'PVBI11': 'VBI Logístico FII', 'VISC11': 'Vinci Shopping FII',
  'HFOF11': 'Hedge Offshore FII', 'MXRI11': 'Max Renda Imob FII',
  'VGIR11': 'Vinci Renda Imob FII', 'BZLI11': 'Bzyp FII',
  'TRXL11': 'TRX实物 FII', 'CPTS11': 'Capitânia FII',
  'RECR11': 'REC Renda Imob FII', 'KNHY11': 'Kinea High Yield FII',
  'OUJP11': 'Ourinvest JPP FII', 'OULG11': 'Ourinvest Logística FII',
  'VRTA11': 'Vertice Renda Imob FII', 'TGAR11': 'TGRE FII',
  'HCTR11': 'Hectors FII', 'HGCR11': 'CSHG Crédito FII',
  'DMCR11': 'Dynamo CR FII', 'CROI11': 'Cris Créd Imob FII',
  'MXMO11': 'Max Renda Multi FII', 'RBLG11': 'Realty Renda Log FII',
  'REIT11': 'BR FI Imob FII', 'RBRR11': 'RBR Renda Imob FII',
  'RBRY11': 'RBR Ryzen FII', 'BLMG11': 'Boa Vista Log FII',
  'BLMC11': 'Boa Vista Malls FII', 'BLCR11': 'Boa Vista Créd FII',
  'BTAL11': 'BTG Pactual Agro FII', 'KNAG11': 'Kinea Agro FII',
  'FAFI11': 'Fator Agro FII', 'FIAG11': 'FII Agro',

  // ── Renda Variável Nacional — FIAGRO ──
  'AGXY11': 'Agro Galaxy FII', 'BGRI11': 'BR Real Estate FII',
  'DALY3': 'Dalog Agro', 'FIIG11': 'FII Agrícola',

  // ── Renda Variável Nacional — ETFs ──
  'BOVA11': 'iShares Ibovespa ETF', 'SMAL11': 'iShares Small Cap ETF',
  'IVVB11': 'iShares S&P 500 ETF', 'HASH11': 'Hashdex NCI ETF',
  'QBTC11': 'Hashdex Bitcoin ETF', 'ETHE11': 'Hashdex Ethereum ETF',
  'USDVAL': 'Dólar Comercial ETF', 'BBSE3': 'BB Seguridade ON',
  'DIVO11': 'DIVO11 ETF', 'GOGL11': 'Investo Google ETF',
  'NASD11': 'Investo Nasdaq ETF', 'QQQX': 'QQQ NASDAQ ETF',

  // ── Internacional — Stocks (EUA) ──
  'AAPL': 'Apple Inc', 'MSFT': 'Microsoft Corp', 'GOOGL': 'Alphabet Inc',
  'GOOG': 'Alphabet Inc', 'AMZN': 'Amazon.com Inc', 'TSLA': 'Tesla Inc',
  'NVDA': 'NVIDIA Corp', 'META': 'Meta Platforms Inc', 'NFLX': 'Netflix Inc',
  'AMD': 'AMD Inc', 'DIS': 'Walt Disney Co', 'BABA': 'Alibaba Group',
  'NIO': 'NIO Inc', 'JPM': 'JPMorgan Chase', 'V': 'Visa Inc',
  'MA': 'Mastercard Inc', 'JNJ': 'Johnson & Johnson', 'WMT': 'Walmart Inc',
  'PG': 'Procter & Gamble', 'KO': 'Coca-Cola Co', 'PEP': 'PepsiCo Inc',
  'BRK.B': 'Berkshire Hathaway', 'UNH': 'UnitedHealth Group',
  'CRM': 'Salesforce Inc', 'INTC': 'Intel Corp', 'ORCL': 'Oracle Corp',
  'CSCO': 'Cisco Systems', 'ACN': 'Accenture plc', 'ABT': 'Abbott Labs',
  'NKE': 'Nike Inc', 'MRK': 'Merck & Co', 'PFE': 'Pfizer Inc',
  'LLY': 'Eli Lilly & Co', 'ABBV': 'AbbVie Inc', 'TMO': 'Thermo Fisher',
  'AVGO': 'Broadcom Inc', 'COST': 'Costco Wholesale', 'HD': 'Home Depot',
  'MCD': "McDonald's Corp", 'SPGI': 'S&P Global Inc', 'GILD': 'Gilead Sciences',
  'TXN': 'Texas Instruments', 'PM': 'Philip Morris Intl', 'NEE': 'NextEra Energy',
  'UPS': 'United Parcel Service', 'RTX': 'RTX Corp', 'BA': 'Boeing Co',
  'CAT': 'Caterpillar Inc', 'DE': 'Deere & Co', 'GS': 'Goldman Sachs',
  'MS': 'Morgan Stanley', 'BLK': 'BlackRock Inc', 'SCHW': 'Charles Schwab',
  'AXP': 'American Express', 'T': 'AT&T Inc', 'VZ': 'Verizon Communications',
  'XOM': 'Exxon Mobil Corp', 'CVX': 'Chevron Corp', 'COP': 'ConocoPhillips',
  'PYPL': 'PayPal Holdings', 'SQ': 'Block Inc', 'SNAP': 'Snap Inc',
  'PINS': 'Pinterest Inc', 'SPOT': 'Spotify Technology',
  'UBER': 'Uber Technologies', 'ABNB': 'Airbnb Inc', 'COIN': 'Coinbase Global',
  'PLTR': 'Palantir Technologies', 'SOFI': 'SoFi Technologies',
  'RIVN': 'Rivian Automotive', 'LCID': 'Lucid Group',

  // ── Internacional — REITs (EUA) ──
  'VNQ': 'Vanguard Real Estate ETF', 'SCHH': 'Schwab US REIT ETF',
  'O': 'Realty Income Corp', 'PLD': 'Prologis Inc', 'AMT': 'American Tower',
  'CCI': 'Crown Castle', 'SPG': 'Simon Property Group',
  'PSA': 'Public Storage', 'OHI': 'Omega Healthcare Investors',
  'WELL': 'Welltower Inc', 'DLR': 'Digital Realty Trust',
  'AVB': 'AvalonBay Communities', 'EQR': 'Equity Residential',
  'VICI': 'VICI Properties', 'WY': 'Weyerhaeuser Co',

  // ── Internacional — ETFs Internacionais ──
  'VOO': 'Vanguard S&P 500 ETF', 'SPY': 'SPDR S&P 500 ETF',
  'QQQ': 'Invesco Nasdaq 100', 'VTI': 'Vanguard Total Stock Market',
  'ARKK': 'ARK Innovation ETF', 'EEM': 'iShares MSCI Emerging Markets',
  'VWO': 'Vanguard FTSE Emerging', 'VXUS': 'Vanguard Intl Stock',
  'BND': 'Vanguard Total Bond Market', 'TLT': 'iShares 20+ Year Treasury',
  'GLD': 'SPDR Gold Shares', 'SLV': 'iShares Silver Trust',
  'DBC': 'Invesco Commodity Index', 'HYG': 'iShares High Yield Corporate',
  'LQD': 'iShares IG Corporate Bond', 'SCHD': 'Schwab US Dividend Equity',
  'DIA': 'SPDR Dow Jones Industrial', 'IWM': 'iShares Russell 2000',
  'VEA': 'Vanguard FTSE Developed Markets', 'VGK': 'Vanguard FTSE Europe',
  'EFA': 'iShares MSCI EAFE', 'AGG': 'iShares Core US Aggregate',
  'XLF': 'Financial Select SPDR', 'XLK': 'Technology Select SPDR',
  'XLE': 'Energy Select SPDR', 'XLV': 'Health Care Select SPDR',
  'XLI': 'Industrial Select SPDR', 'XLP': 'Consumer Staples Select SPDR',
  'XLY': 'Consumer Discretionary Select', 'XLU': 'Utilities Select SPDR',
  'XLRE': 'Real Estate Select SPDR', 'XLC': 'Communication Services Select SPDR',
  'ARKG': 'ARK Genomic Revolution', 'ARKF': 'ARK Fintech Innovation',
  'ARKW': 'ARK Next Gen Internet', 'ARKQ': 'ARK Autonomous Tech & Robotics',
  'SOXL': 'Direxion Semiconductor Bull 3X', 'TQQQ': 'ProShares UltraPro QQQ',
  'SQQQ': 'ProShares UltraPro Short QQQ', 'UVXY': 'ProShares Ultra VIX',
  'BITO': 'ProShares Bitcoin Strategy', 'IBIT': 'iShares Bitcoin Trust',
  'GBTC': 'Grayscale Bitcoin Trust',

  // ── Alternativos — Criptomoedas ──
  'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana',
  'ADA': 'Cardano', 'XRP': 'Ripple', 'DOT': 'Polkadot',
  'AVAX': 'Avalanche', 'LINK': 'Chainlink', 'MATIC': 'Polygon',
  'DOGE': 'Dogecoin', 'SHIB': 'Shiba Inu', 'UNI': 'Uniswap',
  'ATOM': 'Cosmos', 'LTC': 'Litecoin', 'BNB': 'Binance Coin',
  'TRX': 'TRON', 'FIL': 'Filecoin', 'NEAR': 'NEAR Protocol',
  'APT': 'Aptos', 'ARB': 'Arbitrum', 'OP': 'Optimism',
  'SUI': 'Sui', 'SEI': 'Sei Network', 'INJ': 'Injective',
  'RENDER': 'Render Network', 'FET': 'Fetch.ai', 'WLD': 'Worldcoin',
  'TIA': 'Celestia', 'JUP': 'Jupiter', 'PEPE': 'Pepe',
  'WIF': 'dogwifhat', 'BONK': 'Bonk', 'FLOKI': 'Floki',
  'MANA': 'Decentraland', 'SAND': 'The Sandbox', 'AXS': 'Axie Infinity',
  'GALA': 'Gala Games', 'IMX': 'Immutable X', 'ENJ': 'Enjin Coin',
  'CHZ': 'Chiliz', 'THETA': 'Theta Network', 'HBAR': 'Hedera Hashgraph',
  'VET': 'VeChain', 'ICP': 'Internet Computer', 'ALGO': 'Algorand',
  'XLM': 'Stellar Lumens', 'EOS': 'EOS', 'BCH': 'Bitcoin Cash',
  'ETC': 'Ethereum Classic', 'AAVE': 'Aave', 'CRV': 'Curve DAO',
  'MKR': 'Maker', 'COMP': 'Compound', 'SNX': 'Synthetix',
  '1INCH': '1inch', 'YFI': 'yearn.finance', 'SUSHI': 'SushiSwap',

  // ── Renda Fixa Nacional (Títulos) ──
  'TESOURO IPCA+': 'Tesouro IPCA+ (NTN-B)', 'TESOURO SELIC': 'Tesouro Selic (LFT)',
  'TESOURO PREFIXADO': 'Tesouro Prefixado (LTN)', 'TESOURO IPCA+ 2029': 'Tesouro IPCA+ 2029',
  'TESOURO IPCA+ 2035': 'Tesouro IPCA+ 2035', 'TESOURO IPCA+ 2045': 'Tesouro IPCA+ 2045',
  'TESOURO PREFIXADO 2026': 'Tesouro Prefixado 2026', 'TESOURO PREFIXADO 2029': 'Tesouro Prefixado 2029',
  'NTN-B': 'Tesouro IPCA+', 'LTN': 'Tesouro Prefixado', 'LFT': 'Tesouro Selic',
};

// ─── Busca com tolerância a erros ──────────────────────────────────

export function getTickerName(ticker: string): string {
  return TICKER_DB[ticker.toUpperCase()] || '';
}

export function searchTickers(query: string, limit = 8): Array<{ ticker: string; nome: string }> {
  const q = query.toUpperCase().trim();
  if (q.length < 1) return [];
  const results: Array<{ ticker: string; nome: string }> = [];

  // 1. Match exato no início do ticker
  for (const [ticker, nome] of Object.entries(TICKER_DB)) {
    if (ticker.startsWith(q)) {
      results.push({ ticker, nome });
      if (results.length >= limit) return results;
    }
  }

  // 2. Match no nome
  for (const [ticker, nome] of Object.entries(TICKER_DB)) {
    if (nome.toUpperCase().includes(q) && !results.some(r => r.ticker === ticker)) {
      results.push({ ticker, nome });
      if (results.length >= limit) return results;
    }
  }

  return results;
}
