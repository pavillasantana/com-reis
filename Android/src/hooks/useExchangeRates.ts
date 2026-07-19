import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useStore } from '../store/useStore';

export interface ExchangeRates {
  [key: string]: number;
  BRL: number;
  USD: number;
  EUR: number;
  ARS: number;
  GBP: number;
  JPY: number;
  CAD: number;
  CHF: number;
  AUD: number;
  CNY: number;
  MXN: number;
}

const DEFAULT_RATES: ExchangeRates = {
  BRL: 1.0,
  USD: 5.10,
  EUR: 5.83,
  ARS: 0.0035,
  GBP: 6.90,
  JPY: 0.031,
  CAD: 3.62,
  CHF: 6.32,
  AUD: 3.56,
  CNY: 0.75,
  MXN: 0.29
};

const getCacheKey = () => {
  const today = new Date().toISOString().split('T')[0];
  return `exchange_rate_${today}`;
};

export function useExchangeRates(options?: { skipAutoFetch?: boolean }) {
  const { setCotacoesMoedas, cotacoes_moedas } = useStore();
  const [loading, setLoading] = useState(false);

  const fetchRates = async (force: boolean = false) => {
    setLoading(true);
    const cacheKey = getCacheKey();
    
    try {
      if (!force) {
        // Tenta obter o cache do dia atual
        const cached = await SecureStore.getItemAsync(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as ExchangeRates;
          setCotacoesMoedas(parsed);
          setLoading(false);
          return;
        }
      }

      // Se forçar ou se não houver cache do dia atual, busca na API
      console.log('[useExchangeRates] Buscando cotações da AwesomeAPI...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,ARS-BRL,GBP-BRL,JPY-BRL,CAD-BRL,CHF-BRL,AUD-BRL,CNY-BRL,MXN-BRL', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error('Falha ao consultar AwesomeAPI');
      }
      
      const data = await res.json();
      
      const newRates: ExchangeRates = {
        BRL: 1.0,
        USD: parseFloat(data.USDBRL?.bid || '5.10'),
        EUR: parseFloat(data.EURBRL?.bid || '5.83'),
        ARS: parseFloat(data.ARSBRL?.bid || '0.0035'),
        GBP: parseFloat(data.GBPBRL?.bid || '6.90'),
        JPY: parseFloat(data.JPYBRL?.bid || '0.031'),
        CAD: parseFloat(data.CADBRL?.bid || '3.62'),
        CHF: parseFloat(data.CHFBRL?.bid || '6.32'),
        AUD: parseFloat(data.AUDBRL?.bid || '3.56'),
        CNY: parseFloat(data.CNYBRL?.bid || '0.75'),
        MXN: parseFloat(data.MXNBRL?.bid || '0.29')
      };

      // Salva no SecureStore
      await SecureStore.setItemAsync(cacheKey, JSON.stringify(newRates));
      setCotacoesMoedas(newRates);
    } catch (error) {
      // Se já temos cotações válidas persistidas na Store, logamos de forma informativa (silenciosa)
      if (cotacoes_moedas && Object.keys(cotacoes_moedas).length > 0) {
        console.log('[useExchangeRates] AwesomeAPI indisponível. Utilizando cotações armazenadas no Zustand:', error);
      } else {
        console.warn('[useExchangeRates] Erro ao buscar taxas de câmbio na AwesomeAPI:', error);
      }
      
      // Fallback: tenta carregar cache de hoje novamente (pode ter sido escrito entre tanto)
      try {
        const retryCached = await SecureStore.getItemAsync(cacheKey);
        if (retryCached) {
          setCotacoesMoedas(JSON.parse(retryCached));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('[useExchangeRates] Erro ao recarregar cache de contingência:', e);
      }

      // Se tudo falhar, mantém as cotações atuais do Zustand ou usa DEFAULT_RATES
      if (!cotacoes_moedas || Object.keys(cotacoes_moedas).length === 0) {
        setCotacoesMoedas(DEFAULT_RATES);
      }
    } finally {
      setLoading(false);
    }
  };

  const limparCache = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `exchange_rate_${today}`;
      await SecureStore.deleteItemAsync(key);
      console.log('[useExchangeRates] Cache de cotações limpo com sucesso.');
    } catch (e) {
      console.error('[useExchangeRates] Erro ao limpar cache de cotações:', e);
    }
  };

  useEffect(() => {
    if (!options?.skipAutoFetch) {
      fetchRates();
    }
  }, []);

  return { rates: cotacoes_moedas, loading, refetch: () => fetchRates(true), limparCache };
}
