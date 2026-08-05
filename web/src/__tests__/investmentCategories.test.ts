/**
 * investmentCategories.test.ts
 * Testes de consistência dos mapas de investimento:
 * - Sem chaves duplicadas em TICKER_CATEGORY_MAP e TICKER_DB
 * - Todo cripto com ID CoinGecko tem categoria alternativos/crypto
 * - Heurísticas de renda fixa por prefixo
 */

import { describe, it, expect } from 'vitest';
import {
  TICKER_CATEGORY_MAP,
  TICKER_DB,
  CRYPTO_COINGECKO_IDS,
  getCategoriaByTicker,
  formatIndexacao,
} from '../utils/investmentCategories';

function checkDuplicates(obj: Record<string, unknown>) {
  const keys = Object.keys(obj);
  const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  expect(dup).toEqual([]);
}

describe('mapas sem duplicatas', () => {
  it('TICKER_CATEGORY_MAP não tem chaves repetidas', () => {
    checkDuplicates(TICKER_CATEGORY_MAP);
  });
  it('TICKER_DB não tem chaves repetidas', () => {
    checkDuplicates(TICKER_DB);
  });
});

describe('consistência cripto', () => {
  it('todo cripto com ID CoinGecko está categorizado como alternativos/crypto', () => {
    for (const ticker of Object.keys(CRYPTO_COINGECKO_IDS)) {
      const cat = getCategoriaByTicker(ticker);
      expect(cat, `ticker ${ticker}`).toMatchObject({ categoria: 'alternativos', subcategoria: 'crypto' });
    }
  });
  it('toda cripto do mapa de categorias tem ID CoinGecko para cotação', () => {
    for (const [ticker, entry] of Object.entries(TICKER_CATEGORY_MAP)) {
      if (entry.categoria === 'alternativos' && entry.subcategoria === 'crypto') {
        expect(CRYPTO_COINGECKO_IDS[ticker], `ticker ${ticker}`).toBeTruthy();
      }
    }
  });
});

describe('getCategoriaByTicker — renda fixa por prefixo', () => {
  const cases: Array<[string, string, string]> = [
    ['CDB', 'renda_fixa_br', 'cdb_rdb'],
    ['CDB INTER', 'renda_fixa_br', 'cdb_rdb'],
    ['RDB', 'renda_fixa_br', 'cdb_rdb'],
    ['LCI', 'renda_fixa_br', 'lci_lca'],
    ['LCA', 'renda_fixa_br', 'lci_lca'],
    ['CRI', 'renda_fixa_br', 'cri_cra'],
    ['CRA', 'renda_fixa_br', 'cri_cra'],
    ['LC', 'renda_fixa_br', 'lc'],
    ['LC 105% CDI', 'renda_fixa_br', 'lc'],
    ['LF', 'renda_fixa_br', 'lf'],
    ['DEBENTURE', 'renda_fixa_br', 'debentures'],
    ['FIDC', 'renda_fixa_br', 'fidc'],
    ['POUPANCA', 'renda_fixa_br', 'poupanca'],
    ['TESOURO', 'renda_fixa_br', 'tesouro_direto'],
    ['NTN-B', 'renda_fixa_br', 'tesouro_direto'],
    ['COE', 'renda_fixa_br', 'outros_rf'],
  ];
  for (const [ticker, cat, sub] of cases) {
    it(`categoriza ${ticker} como ${cat}/${sub}`, () => {
      expect(getCategoriaByTicker(ticker)).toMatchObject({ categoria: cat, subcategoria: sub });
    });
  }

  it('não classifica tickers de bolsa com prefixo LC/LF', () => {
    expect(getCategoriaByTicker('PETR4')).toMatchObject({ categoria: 'renda_variavel_br', subcategoria: 'acoes' });
    expect(getCategoriaByTicker('LINK')).toMatchObject({ categoria: 'alternativos', subcategoria: 'crypto' });
    expect(getCategoriaByTicker('LFT')).toMatchObject({ categoria: 'renda_fixa_br', subcategoria: 'tesouro_direto' });
  });
});

describe('formatIndexacao', () => {
  it('formata percentual do CDI', () => {
    expect(formatIndexacao('cdi', 120, null)).toBe('120% CDI');
  });
  it('formata IPCA + spread', () => {
    expect(formatIndexacao('ipca', 5.5, '2035-08-15')).toBe('IPCA + 5.5% a.a. • venc 15/08');
  });
  it('formata prefixado com taxa anual', () => {
    expect(formatIndexacao('prefixado', 14, null)).toBe('14% a.a.');
  });
  it('formata Selic', () => {
    expect(formatIndexacao('selic', 100, null)).toBe('100% Selic');
  });
  it('retorna vazio sem índice', () => {
    expect(formatIndexacao(undefined, null, null)).toBe('');
    expect(formatIndexacao('', 120, null)).toBe('');
  });
});
