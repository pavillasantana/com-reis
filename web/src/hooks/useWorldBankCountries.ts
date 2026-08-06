/**
 * useWorldBankCountries.ts
 * Hook para buscar metadados de países (capital, coordenadas) da World Bank API.
 *
 * API: https://api.worldbank.org/v2/country/all?format=json&per_page=500
 * Retorna latitude/longitude da capital de cada país — usado para o mapa do
 * Explorador de Custo de Vida centralizar no país selecionado (por ISO3).
 */

import { useState, useEffect } from 'react';

export interface WorldCountry {
  iso3: string;
  iso2: string;
  name: string;
  capitalCity: string;
  latitude: number;
  longitude: number;
}

export function useWorldBankCountries() {
  const [countries, setCountries] = useState<Record<string, WorldCountry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCountries = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = 'https://api.worldbank.org/v2/country/all?format=json&per_page=500';
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`World Bank API error: ${response.status}`);
        }

        const json = await response.json();

        if (!json || !Array.isArray(json[1])) {
          throw new Error('Invalid response format');
        }

        const map: Record<string, WorldCountry> = {};

        for (const item of json[1]) {
          if (!item?.id) continue;
          const lat = parseFloat(item.latitude);
          const lng = parseFloat(item.longitude);
          map[item.id] = {
            iso3: item.id,
            iso2: item.iso2Code || '',
            name: item.name || '',
            capitalCity: item.capitalCity || '',
            latitude: Number.isFinite(lat) ? lat : 0,
            longitude: Number.isFinite(lng) ? lng : 0,
          };
        }

        if (!cancelled) {
          setCountries(map);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch country data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCountries();
    return () => { cancelled = true; };
  }, []);

  return { countries, loading, error };
}
