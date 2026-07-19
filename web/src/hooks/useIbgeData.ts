import { useQuery } from '@tanstack/react-query';

export interface IbgeEstado {
  id: number;
  sigla: string;
  nome: string;
}

export interface IbgeMunicipio {
  id: number;
  nome: string;
}

export interface RegionEconomicProfile {
  salarioMedio: number;
  pibPerCapita: number;
  custoVidaClasseMedia: number;
  fonte?: string;
}

export const MOCK_ESTADO_PROFILES: Record<string, RegionEconomicProfile> = {
  SP: { salarioMedio: 3850, pibPerCapita: 58000, custoVidaClasseMedia: 4500, fonte: 'IBGE/PNAD (referência)' },
  RJ: { salarioMedio: 3400, pibPerCapita: 49000, custoVidaClasseMedia: 4100, fonte: 'IBGE/PNAD (referência)' },
  MG: { salarioMedio: 2700, pibPerCapita: 36000, custoVidaClasseMedia: 3200, fonte: 'IBGE/PNAD (referência)' },
  PR: { salarioMedio: 3100, pibPerCapita: 44000, custoVidaClasseMedia: 3600, fonte: 'IBGE/PNAD (referência)' },
  DF: { salarioMedio: 5900, pibPerCapita: 92000, custoVidaClasseMedia: 6200, fonte: 'IBGE/PNAD (referência)' },
  RS: { salarioMedio: 3000, pibPerCapita: 42000, custoVidaClasseMedia: 3500, fonte: 'IBGE/PNAD (referência)' },
  SC: { salarioMedio: 3200, pibPerCapita: 47000, custoVidaClasseMedia: 3400, fonte: 'IBGE/PNAD (referência)' },
  BA: { salarioMedio: 2200, pibPerCapita: 23000, custoVidaClasseMedia: 2800, fonte: 'IBGE/PNAD (referência)' },
  PE: { salarioMedio: 2300, pibPerCapita: 24000, custoVidaClasseMedia: 2900, fonte: 'IBGE/PNAD (referência)' },
  CE: { salarioMedio: 2100, pibPerCapita: 22000, custoVidaClasseMedia: 2700, fonte: 'IBGE/PNAD (referência)' },
};

const DEFAULT_PROFILE: RegionEconomicProfile = {
  salarioMedio: 2400,
  pibPerCapita: 28000,
  custoVidaClasseMedia: 2900,
  fonte: 'IBGE/PNAD (estimativa)',
};

const ESTADO_PROFILES_CACHE = new Map<string, RegionEconomicProfile>();

const UF_IBGE_CODES: Record<string, number> = {
  AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32, GO: 52,
  MA: 21, MT: 51, MS: 50, MG: 31, PA: 15, PB: 25, PR: 41, PE: 26, PI: 22,
  RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42, SP: 35, SE: 28, TO: 17,
};

async function fetchSidraIncomeByState(uf: string): Promise<number | null> {
  try {
    const ufCode = UF_IBGE_CODES[uf?.toUpperCase()];
    if (!ufCode) return null;

    const url = `https://apisidra.ibge.gov.br/values/t/5436/n3/${ufCode}/v/1199/p/last/c1/1/all`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    const valor = entry?.resuls?.[0]?.[0]?.v;
    if (valor && !isNaN(Number(valor))) {
      return Math.round(Number(valor));
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchSidraGdpByState(uf: string): Promise<number | null> {
  try {
    const ufCode = UF_IBGE_CODES[uf?.toUpperCase()];
    if (!ufCode) return null;

    const url = `https://apisidra.ibge.gov.br/values/t/5938/n3/${ufCode}/v/10447/p/last/c1/1/all`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    const valor = entry?.resuls?.[0]?.[0]?.v;
    if (valor && !isNaN(Number(valor))) {
      return Math.round(Number(valor));
    }
    return null;
  } catch {
    return null;
  }
}

function estimateLivingCost(income: number, gdp: number): number {
  return Math.round(income * 0.85 + gdp * 0.02);
}

export async function fetchRealEstadoProfile(uf: string): Promise<RegionEconomicProfile | null> {
  if (ESTADO_PROFILES_CACHE.has(uf)) {
    return ESTADO_PROFILES_CACHE.get(uf)!;
  }

  const [income, gdp] = await Promise.all([
    fetchSidraIncomeByState(uf),
    fetchSidraGdpByState(uf),
  ]);

  if (income && income > 0) {
    const profile: RegionEconomicProfile = {
      salarioMedio: income,
      pibPerCapita: gdp ?? MOCK_ESTADO_PROFILES[uf]?.pibPerCapita ?? DEFAULT_PROFILE.pibPerCapita,
      custoVidaClasseMedia: gdp ? estimateLivingCost(income, gdp) : (MOCK_ESTADO_PROFILES[uf]?.custoVidaClasseMedia ?? DEFAULT_PROFILE.custoVidaClasseMedia),
      fonte: 'IBGE/SIDRA (2024)',
    };
    ESTADO_PROFILES_CACHE.set(uf, profile);
    return profile;
  }

  return null;
}

async function fetchEstados(): Promise<IbgeEstado[]> {
  const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
  if (!res.ok) throw new Error('Erro ao buscar estados no IBGE');
  const data = await res.json();
  return (data as { id: number; sigla: string; nome: string }[]).map(e => ({
    id: e.id,
    sigla: e.sigla,
    nome: e.nome
  })).sort((a, b) => a.nome.localeCompare(b.nome));
}

async function fetchMunicipios(uf: string): Promise<IbgeMunicipio[]> {
  if (!uf) return [];
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
  if (!res.ok) throw new Error('Erro ao buscar municípios no IBGE');
  const data = await res.json();
  return (data as { id: number; nome: string }[]).map(m => ({
    id: m.id,
    nome: m.nome
  })).sort((a, b) => a.nome.localeCompare(b.nome));
}

export function useIbgeEstados() {
  return useQuery<IbgeEstado[]>({
    queryKey: ['ibgeEstados'],
    queryFn: fetchEstados,
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useIbgeMunicipios(uf: string) {
  return useQuery<IbgeMunicipio[]>({
    queryKey: ['ibgeMunicipios', uf],
    queryFn: () => fetchMunicipios(uf),
    enabled: Boolean(uf),
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function getRegionalProfile(uf: string): RegionEconomicProfile {
  return MOCK_ESTADO_PROFILES[uf?.toUpperCase()] || DEFAULT_PROFILE;
}

const UF_CAPITALS: Record<string, string> = {
  AC: 'Rio Branco', AL: 'Maceió', AP: 'Macapá', AM: 'Manaus', BA: 'Salvador',
  CE: 'Fortaleza', DF: 'Brasília', ES: 'Vitória', GO: 'Goiânia', MA: 'São Luís',
  MT: 'Cuiabá', MS: 'Campo Grande', MG: 'Belo Horizonte', PA: 'Belém',
  PB: 'João Pessoa', PR: 'Curitiba', PE: 'Recife', PI: 'Teresina',
  RJ: 'Rio de Janeiro', RN: 'Natal', RS: 'Porto Alegre', RO: 'Porto Velho',
  RR: 'Boa Vista', SC: 'Florianópolis', SP: 'São Paulo', SE: 'Aracaju', TO: 'Palmas'
};

export function getMunicipioProfile(uf: string, name: string, id: number): RegionEconomicProfile {
  const stateProfile = getRegionalProfile(uf);
  if (!name) return stateProfile;

  const isCapital = UF_CAPITALS[uf?.toUpperCase()] === name;
  const variation = (id % 40) - 20;
  const multiplier = isCapital ? 1.35 : 0.8 + (variation / 100);

  return {
    salarioMedio: Math.round(stateProfile.salarioMedio * multiplier),
    pibPerCapita: Math.round(stateProfile.pibPerCapita * multiplier),
    custoVidaClasseMedia: Math.round(stateProfile.custoVidaClasseMedia * multiplier),
    fonte: stateProfile.fonte,
  };
}
