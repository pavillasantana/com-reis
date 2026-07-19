import { useState, useEffect, useCallback } from 'react';

export interface TeleportCity {
  id: string;
  name: string;
  fullName: string;
  slug: string;
  href: string;
}

export interface TeleportCost {
  currency: string;
  salarioMedio: number;
  custoVida: number;
  fonte: string;
}

const TELEPORT_CACHE_KEY = 'comreis_teleport_cities';
const TELEPORT_CACHE_DURATION = 1000 * 60 * 60 * 24;

interface TeleportApiResponse {
  count: number;
  _links: {
    'ua:item': Array<{
      name: string;
      href: string;
    }>;
  };
}

const FALLBACK_CITIES: TeleportCity[] = [
  { id: 'slug:new-york', name: 'New York', fullName: 'New York (USA)', slug: 'new-york', href: 'https://api.teleport.org/api/urban_areas/slug:new-york/' },
  { id: 'slug:london', name: 'London', fullName: 'London (UK)', slug: 'london', href: 'https://api.teleport.org/api/urban_areas/slug:london/' },
  { id: 'slug:tokyo', name: 'Tokyo', fullName: 'Tokyo (Japan)', slug: 'tokyo', href: 'https://api.teleport.org/api/urban_areas/slug:tokyo/' },
  { id: 'slug:paris', name: 'Paris', fullName: 'Paris (France)', slug: 'paris', href: 'https://api.teleport.org/api/urban_areas/slug:paris/' },
  { id: 'slug:berlin', name: 'Berlin', fullName: 'Berlin (Germany)', slug: 'berlin', href: 'https://api.teleport.org/api/urban_areas/slug:berlin/' },
  { id: 'slug:toronto', name: 'Toronto', fullName: 'Toronto (Canada)', slug: 'toronto', href: 'https://api.teleport.org/api/urban_areas/slug:toronto/' },
  { id: 'slug:sydney', name: 'Sydney', fullName: 'Sydney (Australia)', slug: 'sydney', href: 'https://api.teleport.org/api/urban_areas/slug:sydney/' },
  { id: 'slug:lisbon', name: 'Lisbon', fullName: 'Lisbon (Portugal)', slug: 'lisbon', href: 'https://api.teleport.org/api/urban_areas/slug:lisbon/' },
  { id: 'slug:dubai', name: 'Dubai', fullName: 'Dubai (UAE)', slug: 'dubai', href: 'https://api.teleport.org/api/urban_areas/slug:dubai/' },
  { id: 'slug:buenos-aires', name: 'Buenos Aires', fullName: 'Buenos Aires (Argentina)', slug: 'buenos-aires', href: 'https://api.teleport.org/api/urban_areas/slug:buenos-aires/' },
  { id: 'slug:miami', name: 'Miami', fullName: 'Miami (USA)', slug: 'miami', href: 'https://api.teleport.org/api/urban_areas/slug:miami/' },
  { id: 'slug:madrid', name: 'Madrid', fullName: 'Madrid (Spain)', slug: 'madrid', href: 'https://api.teleport.org/api/urban_areas/slug:madrid/' },
  { id: 'slug:los-angeles', name: 'Los Angeles', fullName: 'Los Angeles (USA)', slug: 'los-angeles', href: 'https://api.teleport.org/api/urban_areas/slug:los-angeles/' },
  { id: 'slug:mexico-city', name: 'Mexico City', fullName: 'Mexico City (Mexico)', slug: 'mexico-city', href: 'https://api.teleport.org/api/urban_areas/slug:mexico-city/' },
  { id: 'slug:sao-paulo', name: 'São Paulo', fullName: 'São Paulo (Brazil)', slug: 'sao-paulo', href: 'https://api.teleport.org/api/urban_areas/slug:sao-paulo/' },
  { id: 'slug:rio-de-janeiro', name: 'Rio de Janeiro', fullName: 'Rio de Janeiro (Brazil)', slug: 'rio-de-janeiro', href: 'https://api.teleport.org/api/urban_areas/slug:rio-de-janeiro/' },
];

async function fetchTeleportCities(): Promise<TeleportCity[]> {
  const res = await fetch('https://api.teleport.org/api/urban_areas/', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('Falha ao buscar cidades no Teleport');

  const data: TeleportApiResponse = await res.json();
  const items = data?._links?.['ua:item'] || [];

  return items.map((item) => {
    const slugMatch = item.href.match(/slug:([^/]+)/);
    const slug = slugMatch ? slugMatch[1] : item.name.toLowerCase().replace(/\s+/g, '-');
    return {
      id: `slug:${slug}`,
      name: item.name,
      fullName: item.name,
      slug,
      href: item.href,
    };
  });
}

async function getCachedCities(): Promise<TeleportCity[]> {
  try {
    const cached = localStorage.getItem(TELEPORT_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < TELEPORT_CACHE_DURATION) {
        return data;
      }
    }
  } catch {}
  return [];
}

async function setCachedCities(cities: TeleportCity[]): Promise<void> {
  try {
    localStorage.setItem(TELEPORT_CACHE_KEY, JSON.stringify({ data: cities, timestamp: Date.now() }));
  } catch {}
}

export function useGlobalCities() {
  const [data, setData] = useState<TeleportCity[]>(FALLBACK_CITIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cached = await getCachedCities();
      if (cached.length > 0 && !cancelled) {
        setData(cached);
        setIsLoading(false);
        return;
      }

      try {
        const cities = await fetchTeleportCities();
        if (!cancelled) {
          setData(cities.length > 0 ? cities : FALLBACK_CITIES);
          if (cities.length > 0) {
            await setCachedCities(cities);
          }
          setIsError(false);
        }
      } catch {
        if (!cancelled) {
          setIsError(true);
          setData(FALLBACK_CITIES);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const cities = await fetchTeleportCities();
      setData(cities.length > 0 ? cities : FALLBACK_CITIES);
      if (cities.length > 0) {
        await setCachedCities(cities);
      }
      setIsError(false);
    } catch {
      setIsError(true);
      setData(FALLBACK_CITIES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, isError, refetch };
}

async function fetchTeleportCitySalary(slug: string): Promise<{ salarioMedio: number; currency: string } | null> {
  try {
    const res = await fetch(`https://api.teleport.org/api/urban_areas/slug:${slug}/salaries/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();

    const salaries = data?.salaries || [];
    if (salaries.length > 0) {
      const avgSalary = salaries[0];
      const netSalary = avgSalary?.salary_percentiles?.percentile_50;
      const currencyCode = avgSalary?.currency ?? 'USD';

      if (netSalary && !isNaN(Number(netSalary))) {
        return { salarioMedio: Math.round(Number(netSalary)), currency: currencyCode };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchTeleportCityCost(slug: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.teleport.org/api/urban_areas/slug:${slug}/details/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const categories = data?.categories || [];
    const costCategory = categories.find((c: any) =>
      c?.id === 'COST_OF_LIVING' || c?.label?.toLowerCase().includes('cost of living')
    );

    if (costCategory?.data) {
      const scores = costCategory.data;
      const avgScore = scores.reduce((sum: number, d: any) => sum + (d?.score ?? 0), 0) / scores.length;
      return Math.round(avgScore * 100);
    }
    return null;
  } catch {
    return null;
  }
}

const FALLBACK_PROFILES: Record<string, TeleportCost> = {
  'new-york': { currency: 'USD', salarioMedio: 6500, custoVida: 4500, fonte: 'Teleport (dados de referência)' },
  'london': { currency: 'GBP', salarioMedio: 4200, custoVida: 3500, fonte: 'Teleport (dados de referência)' },
  'tokyo': { currency: 'JPY', salarioMedio: 450000, custoVida: 300000, fonte: 'Teleport (dados de referência)' },
  'paris': { currency: 'EUR', salarioMedio: 3500, custoVida: 2800, fonte: 'Teleport (dados de referência)' },
  'berlin': { currency: 'EUR', salarioMedio: 3800, custoVida: 2400, fonte: 'Teleport (dados de referência)' },
  'toronto': { currency: 'CAD', salarioMedio: 5500, custoVida: 4200, fonte: 'Teleport (dados de referência)' },
  'sydney': { currency: 'AUD', salarioMedio: 6800, custoVida: 5000, fonte: 'Teleport (dados de referência)' },
  'lisbon': { currency: 'EUR', salarioMedio: 1500, custoVida: 1400, fonte: 'Teleport (dados de referência)' },
  'dubai': { currency: 'AED', salarioMedio: 15000, custoVida: 10000, fonte: 'Teleport (dados de referência)' },
  'buenos-aires': { currency: 'ARS', salarioMedio: 800000, custoVida: 700000, fonte: 'Teleport (dados de referência)' },
};

const CITY_PROFILES_CACHE = new Map<string, TeleportCost>();

export async function getTeleportCityProfile(cityName: string, countryName: string): Promise<TeleportCost> {
  const normalizedCity = cityName.toLowerCase().trim();
  const normalizedCountry = countryName.toLowerCase().trim();
  const cacheKey = `${normalizedCity}|${normalizedCountry}`;

  const cached = CITY_PROFILES_CACHE.get(cacheKey);
  if (cached) return cached;

  const fallbackProfile = FALLBACK_PROFILES[normalizedCity];
  if (!fallbackProfile) {
    const generated = generateFallbackProfile(normalizedCity, normalizedCountry);
    CITY_PROFILES_CACHE.set(cacheKey, generated);
    return generated;
  }

  const slug = normalizedCity.toLowerCase().replace(/[\s.]+/g, '-');
  const [salaryData, costData] = await Promise.all([
    fetchTeleportCitySalary(slug),
    fetchTeleportCityCost(slug),
  ]);

  if (salaryData && salaryData.salarioMedio > 0) {
    const result: TeleportCost = {
      currency: salaryData.currency,
      salarioMedio: salaryData.salarioMedio,
      custoVida: costData ?? (fallbackProfile?.custoVida ?? salaryData.salarioMedio * 0.7),
      fonte: 'Teleport API (2024)',
    };
    CITY_PROFILES_CACHE.set(cacheKey, result);
    return result;
  }

  CITY_PROFILES_CACHE.set(cacheKey, fallbackProfile);
  return fallbackProfile;
}

function generateFallbackProfile(city: string, country: string): TeleportCost {
  const seed = city.length + country.length;
  let currency = 'USD';
  let salarioBase = 2000;
  let custoBase = 1500;

  if (country.includes('united states') || country === 'us') {
    currency = 'USD';
    salarioBase = 4000 + (seed * 100);
    custoBase = 3000 + (seed * 80);
  } else if (country.includes('united kingdom') || country === 'uk') {
    currency = 'GBP';
    salarioBase = 3000 + (seed * 50);
    custoBase = 2200 + (seed * 40);
  } else if (['france', 'germany', 'italy', 'spain', 'portugal', 'netherlands', 'belgium', 'switzerland'].includes(country)) {
    currency = 'EUR';
    salarioBase = 2500 + (seed * 50);
    custoBase = 1800 + (seed * 40);
  } else if (country === 'argentina') {
    currency = 'ARS';
    salarioBase = 400000 + (seed * 10000);
    custoBase = 350000 + (seed * 8000);
  } else if (country === 'japan') {
    currency = 'JPY';
    salarioBase = 300000 + (seed * 5000);
    custoBase = 220000 + (seed * 4000);
  } else if (['brazil', 'brasil'].includes(country)) {
    currency = 'BRL';
    salarioBase = 2500 + (seed * 50);
    custoBase = 2200 + (seed * 40);
  } else {
    salarioBase = 1500 + (seed * 50);
    custoBase = 1000 + (seed * 40);
  }

  return {
    currency,
    salarioMedio: salarioBase,
    custoVida: custoBase,
    fonte: 'Teleport/Numbeo (estimativa)',
  };
}

export async function searchTeleportCities(query: string): Promise<TeleportCity[]> {
  const { data } = await import('./useTeleportData').then(m => m.useGlobalCities());
  const cities = data || FALLBACK_CITIES;

  if (!query) return cities;

  const q = query.toLowerCase();
  return cities.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.fullName.toLowerCase().includes(q)
  );
}
