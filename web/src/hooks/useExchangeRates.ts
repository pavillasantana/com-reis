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

// Rate sanity bounds: [min, max] for 1 unit of currency in BRL
const RATE_BOUNDS: Record<string, [number, number]> = {
  USD: [0.5, 20],
  EUR: [0.5, 25],
  ARS: [0.0001, 0.1],
  GBP: [0.5, 30],
  JPY: [0.001, 0.2],
  CAD: [0.5, 15],
  AUD: [0.5, 15],
  CHF: [0.5, 25],
  CNY: [0.01, 5],
  MXN: [0.01, 3],
  AED: [0.1, 10],
};

function clampRate(currency: string, value: number, fallback: number): number {
  if (isNaN(value) || value <= 0) return fallback;
  const bounds = RATE_BOUNDS[currency];
  if (bounds && (value < bounds[0] || value > bounds[1])) {
    console.warn(`[Rates] ${currency} rate ${value} out of bounds [${bounds[0]}, ${bounds[1]}], using fallback ${fallback}`);
    return fallback;
  }
  return value;
}

async function fetchExchangeRates(): Promise<ExchangeRates> {
  const pairs = 'USD-BRL,EUR-BRL,ARS-BRL,GBP-BRL,JPY-BRL,CAD-BRL,AUD-BRL,CHF-BRL,CNY-BRL,MXN-BRL,AED-BRL';
  const res = await fetch(`https://economia.awesomeapi.com.br/json/last/${pairs}`);
  if (!res.ok) {
    throw new Error('Falha ao consultar AwesomeAPI');
  }
  const data = await res.json();

  return {
    BRL: 1.0,
    USD: clampRate('USD', parseFloat(data.USDBRL?.bid), DEFAULT_RATES.USD),
    EUR: clampRate('EUR', parseFloat(data.EURBRL?.bid), DEFAULT_RATES.EUR),
    ARS: clampRate('ARS', parseFloat(data.ARSBRL?.bid), DEFAULT_RATES.ARS),
    GBP: clampRate('GBP', parseFloat(data.GBPBRL?.bid), DEFAULT_RATES.GBP),
    JPY: clampRate('JPY', parseFloat(data.JPYBRL?.bid), DEFAULT_RATES.JPY),
    CAD: clampRate('CAD', parseFloat(data.CADBRL?.bid), DEFAULT_RATES.CAD),
    AUD: clampRate('AUD', parseFloat(data.AUDBRL?.bid), DEFAULT_RATES.AUD),
    CHF: clampRate('CHF', parseFloat(data.CHFBRL?.bid), DEFAULT_RATES.CHF),
    CNY: clampRate('CNY', parseFloat(data.CNYBRL?.bid), DEFAULT_RATES.CNY),
    MXN: clampRate('MXN', parseFloat(data.MXNBRL?.bid), DEFAULT_RATES.MXN),
    AED: clampRate('AED', parseFloat(data.AEDBRL?.bid), DEFAULT_RATES.AED),
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
