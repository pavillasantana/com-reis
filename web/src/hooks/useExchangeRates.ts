import { useQuery } from '@tanstack/react-query';

export interface ExchangeRates {
  [key: string]: number;
  BRL: number;
  USD: number;
  EUR: number;
  ARS: number;
  GBP: number;
  JPY: number;
  CAD: number;
  AUD: number;
  CHF: number;
  CNY: number;
  MXN: number;
  AED: number;
}

const DEFAULT_RATES: ExchangeRates = {
  BRL: 1.0,
  USD: 5.4,
  EUR: 5.8,
  ARS: 0.006,
  GBP: 6.9,
  JPY: 0.038,
  CAD: 4.0,
  AUD: 3.6,
  CHF: 6.2,
  CNY: 0.75,
  MXN: 0.28,
  AED: 1.47,
};

async function fetchExchangeRates(): Promise<ExchangeRates> {
  const pairs = 'USD-BRL,EUR-BRL,ARS-BRL,GBP-BRL,JPY-BRL,CAD-BRL,AUD-BRL,CHF-BRL,CNY-BRL,MXN-BRL,AED-BRL';
  const res = await fetch(`https://economia.awesomeapi.com.br/json/last/${pairs}`);
  if (!res.ok) {
    throw new Error('Falha ao consultar AwesomeAPI');
  }
  const data = await res.json();

  return {
    BRL: 1.0,
    USD: parseFloat(data.USDBRL?.bid || '5.4'),
    EUR: parseFloat(data.EURBRL?.bid || '5.8'),
    ARS: parseFloat(data.ARSBRL?.bid || '0.006'),
    GBP: parseFloat(data.GBPBRL?.bid || '6.9'),
    JPY: parseFloat(data.JPYBRL?.bid || '0.038'),
    CAD: parseFloat(data.CADBRL?.bid || '4.0'),
    AUD: parseFloat(data.AUDBRL?.bid || '3.6'),
    CHF: parseFloat(data.CHFBRL?.bid || '6.2'),
    CNY: parseFloat(data.CNYBRL?.bid || '0.75'),
    MXN: parseFloat(data.MXNBRL?.bid || '0.28'),
    AED: parseFloat(data.AEDBRL?.bid || '1.47'),
  };
}

export function useExchangeRates(enabled: boolean = true) {
  return useQuery<ExchangeRates>({
    queryKey: ['exchangeRates'],
    queryFn: fetchExchangeRates,
    placeholderData: DEFAULT_RATES,
    staleTime: 1000 * 60 * 10,
    enabled,
  });
}
