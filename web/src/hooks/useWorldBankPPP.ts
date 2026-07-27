/**
 * useWorldBankPPP.ts
 * Hook para buscar dados de Purchasing Power Parity (PPP) do World Bank API.
 * 
 * API: https://api.worldbank.org/v2/country/{iso2}/indicator/PA.NUS.PPP
 * 
 * PPP permite comparar poder de compra entre países:
 * - Se o PPP do Brasil é 2.69 e o dos EUA é 1.0, significa que
 *   1 dólar nos EUA equivale a R$2,69 no Brasil em poder de compra.
 * 
 * Fonte: World Bank International Comparison Program
 */

import { useState, useEffect } from 'react';

export interface PPPData {
  country: string;
  iso2: string;
  iso3: string;
  pppRate: number;       // Fator PPP (1 USD equivale a X na moeda local)
  year: number;
  currency: string;
}

// Mapeamento de ISO3 para moeda local
const CURRENCY_MAP: Record<string, string> = {
  BRA: 'BRL', USA: 'USD', GBR: 'GBP', EUR: 'EUR', JPN: 'JPY',
  CHN: 'CNY', IND: 'INR', RUS: 'RUB', CAN: 'CAD', AUS: 'AUD',
  KOR: 'KRW', MEX: 'MXN', ARG: 'ARS', TUR: 'TRY', SAU: 'SAR',
  ZAF: 'ZAR', NGA: 'NGA', EGY: 'EGP', COL: 'COP', CHL: 'CLP',
  PER: 'PEN', POL: 'PLN', THA: 'THB', IDN: 'IDR', MYS: 'MYR',
  VNM: 'VND', PHL: 'PHL', BGD: 'BDG', PAK: 'PKS', NPL: 'NPR',
  LKA: 'LKR', KEN: 'KES', ETH: 'ETB', GHA: 'GHS', TZA: 'TZS',
  MAR: 'MAD', TUN: 'TND', DZA: 'DZD', IRQ: 'IQD', IRN: 'IRR',
  ARE: 'AED', QAT: 'QAR', KWT: 'KWD', BHR: 'BHD', OMN: 'OMR',
   JOR: 'JOD', LBN: 'LBP', ISR: 'ILS', NZL: 'NZD',
  SGP: 'SGD', HKG: 'HKD', TWN: 'TWD', CZE: 'CZK', HUN: 'HUN',
  ROU: 'RON', BGR: 'BGR', HRV: 'HRK', SRB: 'RSD', UKR: 'UAH',
  KAZ: 'KZT', UZB: 'UZB', GEO: 'GEO', AZE: 'AZE', ARM: 'AMD',
  NOR: 'NOK', SWE: 'SEK', DNK: 'DKK', FIN: 'FIN', ISL: 'ISK',
  CHE: 'CHF', AUT: 'EUR', BEL: 'EUR', NLD: 'EUR', DEU: 'EUR',
  FRA: 'EUR', ITA: 'EUR', ESP: 'EUR', PRT: 'EUR', IRL: 'EUR',
  GRC: 'EUR', CYP: 'EUR', EST: 'EUR', LVA: 'EUR', LTU: 'EUR',
  SVK: 'EUR', SVN: 'EUR', LUX: 'EUR', MLT: 'EUR', PRY: 'PYG',
  URY: 'UYU', BOL: 'BOB', ECU: 'USD', VEN: 'VES', GTM: 'GTQ',
  HND: 'HNL', SLV: 'SVC', NIC: 'NIO', CRI: 'CRC', PAN: 'PAB',
  CUB: 'CUP', JAM: 'JMD', TTO: 'TTD', DOM: 'DOP', HTI: 'HTG',
  GUY: 'GYD', SUR: 'SRD', BLZ: 'BZD', BHS: 'BSD',
};

export function useWorldBankPPP() {
  const [pppData, setPppData] = useState<Record<string, PPPData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPPP = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar os últimos 100 países com dados PPP atualizados
        const url = 'https://api.worldbank.org/v2/country/all/indicator/PA.NUS.PPP?format=json&per_page=300&date=2020:2024&source=2';
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`World Bank API error: ${response.status}`);
        }

        const json = await response.json();
        
        if (!json || !Array.isArray(json[1])) {
          throw new Error('Invalid response format');
        }

        // Agrupar por país, pegando o dado mais recente
        const countryMap: Record<string, PPPData> = {};
        
        for (const item of json[1]) {
          if (item.value === null || !item.country?.id) continue;
          
          const iso3 = item.country.id;
          const iso2 = item.countryiso2code;
          
          // Pegar apenas o dado mais recente de cada país
          if (!countryMap[iso3] || item.date > String(countryMap[iso3].year)) {
            countryMap[iso3] = {
              country: item.country.value,
              iso2: iso2,
              iso3: iso3,
              pppRate: parseFloat(item.value),
              year: parseInt(item.date),
              currency: CURRENCY_MAP[iso3] || iso3,
            };
          }
        }

        if (!cancelled) {
          setPppData(countryMap);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch PPP data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPPP();
    return () => { cancelled = true; };
  }, []);

  return { pppData, loading, error };
}

/**
 * Calcula o equivalente em moeda local de um gasto em outra moeda
 * usando o fator PPP.
 * 
 * Exemplo: Gasto de R$3000 no Brasil, PPP Brasil = 2.69, PPP EUA = 1.0
 * - O valor "equivalente" em USD seria: R$3000 / 2.69 ≈ USD 1115
 * - Isso significa que R$3000 no Brasil tem o mesmo poder de compra
 *   que USD 1115 nos EUA
 */
export function convertViaPPP(
  amountInLocalCurrency: number,
  sourcePPP: number,
  targetPPP: number
): number {
  if (sourcePPP <= 0 || targetPPP <= 0) return 0;
  // Converter de moeda local → USD via PPP source, depois USD → moeda destino via PPP target
  return (amountInLocalCurrency / sourcePPP) * targetPPP;
}
