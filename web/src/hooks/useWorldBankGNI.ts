/**
 * useWorldBankGNI.ts
 * Hook para buscar Renda Nacional Bruta (GNI) per capita do World Bank API.
 *
 * API: https://api.worldbank.org/v2/country/all/indicator/NY.GNP.PCAP.CD
 * Indicador: GNI per capita, Atlas method (US$ corrente).
 *
 * Usado como fonte real de renda média por país no Explorador de Custo de
 * Vida (substituindo a API Teleport, descontinuada em 2023).
 * Salário mensal ≈ GNI anual / 12.
 */

import { useState, useEffect } from 'react';

export interface GNIEntry {
  iso3: string;
  iso2: string;
  gniUSD: number;
  year: number;
}

export function useWorldBankGNI() {
  const [gniData, setGniData] = useState<Record<string, GNIEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchGNI = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = 'https://api.worldbank.org/v2/country/all/indicator/NY.GNP.PCAP.CD?format=json&per_page=300&date=2020:2025&source=2';
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`World Bank API error: ${response.status}`);
        }

        const json = await response.json();

        if (!json || !Array.isArray(json[1])) {
          throw new Error('Invalid response format');
        }

        const countryMap: Record<string, GNIEntry> = {};

        for (const item of json[1]) {
          if (item.value === null || !item.country?.id) continue;

          const iso3 = item.country.id;

          if (!countryMap[iso3] || item.date > String(countryMap[iso3].year)) {
            countryMap[iso3] = {
              iso3,
              iso2: item.countryiso2code,
              gniUSD: parseFloat(item.value),
              year: parseInt(item.date),
            };
          }
        }

        if (!cancelled) {
          setGniData(countryMap);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch GNI data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchGNI();
    return () => { cancelled = true; };
  }, []);

  return { gniData, loading, error };
}
