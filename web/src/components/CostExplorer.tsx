import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  useIbgeEstados, 
  useIbgeMunicipios, 
  getRegionalProfile,
  getMunicipioProfile,
  fetchRealEstadoProfile,
  type RegionEconomicProfile,
} from '../hooks/useIbgeData';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { formatCurrency, convertCurrency } from '../utils/currency';
import { MapPin, Shield, ExternalLink, RefreshCw } from 'lucide-react';
import { getTeleportCityProfile, type TeleportCost } from '../hooks/useTeleportData';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useGlobalCountries, useGlobalStates, useGlobalCitiesForCountry } from '../hooks/useGlobalLocationData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CostExplorerProps {
  planoUsuario: 'free' | 'premium';
  userAverageExpense: number;
  moedaBase: string;
  onUpgrade: () => void;
}

interface DisplayProfile {
  salarioMedio: number;
  pibPerCapita: number;
  currency: string;
  fonte: string;
}

export function CostExplorer({ 
  planoUsuario, 
  userAverageExpense, 
  moedaBase,
  onUpgrade 
}: CostExplorerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Circle[]>([]);

  const [selectedCountry, setSelectedCountry] = useState('Brazil');
  const [selectedUf, setSelectedUf] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [profile, setProfile] = useState<DisplayProfile>({ salarioMedio: 0, pibPerCapita: 0, currency: 'BRL', fonte: '' });
  const [localName, setLocalName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const isBrazil = selectedCountry.toLowerCase() === 'brazil' || selectedCountry.toLowerCase() === 'brasil';

  const { data: estados, isLoading: loadingEstados, isError: errorEstados, refetch: refetchEstados } = useIbgeEstados();
  const { data: municipios, isLoading: loadingMunicipios, isError: errorMunicipios, refetch: refetchMunicipios } = useIbgeMunicipios(isBrazil ? selectedUf : '');

  const { data: globalCountries, isLoading: loadingCountries } = useGlobalCountries();
  const { data: globalStates, isLoading: loadingGlobalStates } = useGlobalStates(selectedCountry);
  const { data: globalCities, isLoading: loadingGlobalCities } = useGlobalCitiesForCountry(selectedCountry);

  const { data: rates } = useExchangeRates(planoUsuario === 'premium');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }: { data: { session?: { access_token?: string } } | null }) => {
      if (data?.session?.access_token) {
        setJwtToken(data.session.access_token);
      }
    });
  }, []);

  const filteredMunicipios = municipios?.filter(m => 
    m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(
      citySearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    )
  ) || [];

  const filteredGlobalCities = globalCities?.filter(c => 
    c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(
      citySearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    )
  ) || [];

  const selectedMunicipio = municipios?.find(m => String(m.id) === selectedCity);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);

      if (isBrazil) {
        let brProfile: RegionEconomicProfile;

        if (selectedMunicipio) {
          brProfile = getMunicipioProfile(selectedUf, selectedMunicipio.nome, selectedMunicipio.id);
        } else {
          const realProfile = selectedUf ? await fetchRealEstadoProfile(selectedUf) : null;
          brProfile = realProfile || getRegionalProfile(selectedUf);
        }

        if (!cancelled) {
          setProfile({ ...brProfile, currency: 'BRL', fonte: brProfile.fonte || 'IBGE/PNAD' });
          const activeEstadoObj = estados?.find(e => e.sigla === selectedUf);
          setLocalName(selectedMunicipio ? `${selectedMunicipio.nome} (${selectedUf})` : (activeEstadoObj?.nome || selectedUf));
        }
      } else {
        const cityToLookup = selectedCity || selectedCountry;
        if (cityToLookup) {
          const glProfile: TeleportCost = await getTeleportCityProfile(cityToLookup, selectedCountry);
          if (!cancelled) {
            setProfile({
              salarioMedio: glProfile.salarioMedio,
              pibPerCapita: glProfile.custoVida,
              currency: glProfile.currency,
              fonte: glProfile.fonte,
            });
            setLocalName(selectedCity ? `${selectedCity} (${selectedCountry})` : selectedCountry);
          }
        }
      }

      if (!cancelled) setProfileLoading(false);
    };

    loadProfile();
    return () => { cancelled = true; };
  }, [selectedUf, selectedCity, selectedCountry, isBrazil, selectedMunicipio, estados]);

  const rateToBRL = rates ? (profile.currency === 'BRL' ? 1 : (rates[profile.currency] || 1)) : 1;
  const profileSalarioBRL = profile.salarioMedio * rateToBRL;

  const baseRateToBRL = rates ? (moedaBase === 'BRL' ? 1 : (rates[moedaBase] || 1)) : 1;
  const userAverageExpenseBRL = userAverageExpense * baseRateToBRL;

  const percentDiff = userAverageExpenseBRL > 0 && profileSalarioBRL > 0
    ? Math.round(((userAverageExpenseBRL - profileSalarioBRL) / profileSalarioBRL) * 100)
    : 0;

  useEffect(() => {
    if (planoUsuario !== 'premium' || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-19.92, -47.92],
      zoom: 4,
      zoomControl: true
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    const heatPoints = [
      { name: 'São Paulo (Pinheiros)', lat: -23.56, lng: -46.69, value: 4300, uf: 'SP', color: 'var(--accent-blue)' },
      { name: 'Rio de Janeiro (Copacabana)', lat: -22.97, lng: -43.18, value: 3900, uf: 'RJ', color: 'var(--accent-green)' },
      { name: 'Minas Gerais (Savassi)', lat: -19.94, lng: -43.93, value: 2800, uf: 'MG', color: '#ffb800' },
      { name: 'Paraná (Batel)', lat: -25.44, lng: -49.28, value: 3400, uf: 'PR', color: '#ff4a5a' },
      { name: 'Distrito Federal (Lago Sul)', lat: -15.83, lng: -47.87, value: 6500, uf: 'DF', color: '#c084fc' }
    ];

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    heatPoints.forEach(pt => {
      const circle = L.circle([pt.lat, pt.lng], {
        color: pt.color,
        fillColor: pt.color,
        fillOpacity: 0.35,
        radius: pt.value * 15
      }).addTo(map);

      circle.bindPopup(`
        <div style="color: #fff; background: #0b0f19; padding: 14px; border-radius: 8px; font-family: sans-serif;">
          <strong style="display: block; font-size: 0.9rem;">${pt.name}</strong>
          <span style="font-size: 0.8rem; color: #94a3b8;">Gasto Médio: ${formatCurrency(pt.value, 'BRL')}</span>
        </div>
      `, {
        closeButton: false,
        className: 'custom-popup'
      });

      circle.on('click', () => {
        setSelectedUf(pt.uf);
      });

      markersRef.current.push(circle);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [planoUsuario]);

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (isBrazil) {
      const stateCoords: Record<string, [number, number]> = {
        SP: [-23.55, -46.63], RJ: [-22.90, -43.17], MG: [-19.81, -43.95],
        PR: [-25.42, -49.27], DF: [-15.79, -47.89], RS: [-30.03, -51.21],
        SC: [-27.59, -48.54], BA: [-12.97, -38.50], PE: [-8.05, -34.88],
        CE: [-3.71, -38.54]
      };

      const brCoords = stateCoords[selectedUf];
      if (brCoords) {
        mapRef.current.setView(brCoords, 8);
      }
    } else {
      const globalCoords: Record<string, [number, number]> = {
        'new york': [40.7128, -74.0060],
        'london': [51.5074, -0.1278],
        'tokyo': [35.6762, 139.6503],
        'paris': [48.8566, 2.3522],
        'berlin': [52.5200, 13.4050],
        'toronto': [43.6510, -79.3470],
        'sydney': [-33.8688, 151.2093],
        'lisbon': [38.7223, -9.1393],
        'dubai': [25.2048, 55.2708],
        'buenos aires': [-34.6037, -58.3816]
      };
      const glCoords = globalCoords[selectedCity?.toLowerCase()] || [20, 0];
      if (glCoords) {
        mapRef.current.setView(glCoords, 5);
      }
    }
  }, [selectedUf, selectedCity, isBrazil]);

  const handleOpenExternal = async () => {
    let token = jwtToken || '';

    if (!token && isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || '';
    }

    if (!token) {
      token = btoa(JSON.stringify({ userId: 'guest', exp: Date.now() + 3600000 }));
    }

    const baseUrl = 'https://explorer.comreis.com';
    const params = new URLSearchParams({
      token,
      view: 'costExplorer',
      city: selectedCity || '',
      country: selectedCountry,
      uf: selectedUf || '',
    });
    window.open(`${baseUrl}/auth?${params.toString()}`, '_blank');
  };

  const profileCurrency = profile.currency || 'BRL';
  const profileSalarioConvertido = profile.salarioMedio > 0 && rates
    ? convertCurrency(profile.salarioMedio, profileCurrency, moedaBase, rates)
    : 0;

  return (
    <Card style={{ position: 'relative', overflow: 'hidden', padding: 0 }}>
      <div className="explorer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: '450px', flexWrap: 'wrap' }}>
        
        <div style={{ position: 'relative', minHeight: '300px', background: '#080c14' }}>
          {planoUsuario === 'premium' ? (
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '450px', zIndex: 1 }} />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundImage: 'radial-gradient(circle at center, #1b2640 10%, #0b0f19 80%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '450px'
            }}>
              <div style={{ opacity: 0.35, textAlign: 'center' }}>
                <MapPin size={48} color="var(--accent-blue)" style={{ margin: '0 auto 12px' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mapa Geográfico Termográfico Interativo</span>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: '36px',
          background: 'rgba(20, 28, 47, 0.95)',
          borderLeft: '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 2
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem', color: 'var(--text-primary)'}}>
                <MapPin size={18} color="var(--accent-blue)" />
                Comparador Global
              </h3>
              <button 
                onClick={handleOpenExternal}
                style={{
                  background: 'rgba(0, 210, 255, 0.1)',
                  color: 'var(--accent-blue)',
                  border: '1px solid var(--accent-blue)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ExternalLink size={12} /> Abrir Externo
              </button>
            </div>

            {(isBrazil && (errorEstados || errorMunicipios)) ? (
              <div style={{
                background: 'rgba(255, 74, 90, 0.1)',
                border: '1px solid rgba(255, 74, 90, 0.2)',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '16px',
                fontSize: '0.85rem',
                color: 'var(--color-danger)'
              }}>
                <p style={{ margin: 0, marginBottom: '12px', lineHeight: '1.4' }}>
                  Não foi possível obter dados oficiais. Verifique sua conexão com a internet.
                </p>
                <button
                  onClick={() => {
                    if (errorEstados) refetchEstados();
                    if (errorMunicipios) refetchMunicipios();
                  }}
                  style={{
                    background: 'var(--color-danger)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px 12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    width: '100%'
                  }}
                >
                  Tentar Novamente
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px'}}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>País</label>
                  {loadingCountries ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Carregando países...</div>
                  ) : (
                    <select 
                      className="select-input" 
                      style={{ background: 'var(--card-bg)', borderRadius: '8px', fontSize: '0.85rem', padding: '15px', width: '100%', color: 'var(--text-primary)', border: '1px solid var(--card-border)'}}
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setSelectedUf('');
                        setSelectedCity('');
                        setCitySearchQuery('');
                      }}
                    >
                      <option value="Brazil">Brazil (Brasil)</option>
                      {globalCountries?.filter(c => c.country.toLowerCase() !== 'brazil').map(c => (
                        <option key={c.iso3} value={c.country}>{c.country}</option>
                      ))}
                    </select>
                  )}
                </div>

                {isBrazil ? (
                  <>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Estado (IBGE)</label>
                      {loadingEstados ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Carregando estados...</div>
                      ) : (
                        <select 
                          className="select-input" 
                          style={{ background: 'var(--card-bg)', borderRadius: '8px', fontSize: '0.85rem', padding: '15px', width: '100%', color: 'var(--text-primary)', border: '1px solid var(--card-border)'}}
                          value={selectedUf}
                          onChange={(e) => {
                            setSelectedUf(e.target.value);
                            setSelectedCity('');
                            setCitySearchQuery('');
                          }}
                        >
                          <option value="">Selecione um Estado</option>
                          {estados?.map(e => (
                            <option key={e.id} value={e.sigla}>{e.nome} ({e.sigla})</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {selectedUf && (
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Filtrar Cidades</label>
                        <input 
                          type="text"
                          placeholder="Digite para buscar..."
                          style={{ 
                            background: 'var(--card-bg)', 
                            borderRadius: '8px', 
                            fontSize: '0.85rem', 
                            padding: '15px 12px',
                            border: '1px solid var(--card-border)',
                            color: 'var(--text-primary)',
                            width: '100%',
                            boxSizing: 'border-box'
                          }}
                          value={citySearchQuery}
                          onChange={(e) => setCitySearchQuery(e.target.value)}
                        />
                      </div>
                    )}

                    {selectedUf && (
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Cidade (IBGE)</label>
                        {loadingMunicipios ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Carregando cidades...</div>
                        ) : (
                          <select 
                            className="select-input" 
                            style={{ background: 'var(--card-bg)', borderRadius: '8px', fontSize: '0.85rem', padding: '15px', width: '100%', color: 'var(--text-primary)', border: '1px solid var(--card-border)'}}
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                          >
                            <option value="">Geral do Estado</option>
                            {filteredMunicipios.map(m => (
                              <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {globalStates && globalStates.length > 0 && (
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Estado</label>
                        {loadingGlobalStates ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Carregando estados...</div>
                        ) : (
                          <select 
                            className="select-input" 
                            style={{ background: 'var(--card-bg)', borderRadius: '8px', fontSize: '0.85rem', padding: '15px', width: '100%', color: 'var(--text-primary)', border: '1px solid var(--card-border)'}}
                            value={selectedUf}
                            onChange={(e) => setSelectedUf(e.target.value)}
                          >
                            <option value="">Selecione um Estado (Opcional)</option>
                            {globalStates.map(s => (
                              <option key={s.state_code} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Filtrar Cidades</label>
                      <input 
                        type="text"
                        placeholder="Digite para buscar..."
                        style={{ 
                          background: 'var(--card-bg)', 
                          borderRadius: '8px', 
                          fontSize: '0.85rem', 
                          padding: '15px 12px',
                          border: '1px solid var(--card-border)',
                          color: 'var(--text-primary)',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                        value={citySearchQuery}
                        onChange={(e) => setCitySearchQuery(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Cidade</label>
                      {loadingGlobalCities ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Carregando cidades...</div>
                      ) : (
                        <select 
                          className="select-input" 
                          style={{ background: 'var(--card-bg)', borderRadius: '8px', fontSize: '0.85rem', padding: '15px', width: '100%', color: 'var(--text-primary)', border: '1px solid var(--card-border)'}}
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                        >
                          <option value="">Geral do País</option>
                          {filteredGlobalCities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ marginTop: '24px', borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Indicadores Demográficos {isBrazil ? '(IBGE/SIDRA)' : '(Teleport/Numbeo)'}
                </span>
                {profileLoading && (
                  <RefreshCw size={14} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
                )}
              </div>

              {profile.fonte && (
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>
                  Fonte: {profile.fonte}
                </span>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Salário Médio Local:</span>
                  <span style={{ fontWeight: 700 }}>
                    {formatCurrency(profile.salarioMedio, profileCurrency)}
                    {moedaBase !== profileCurrency && profileSalarioConvertido > 0 && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                        (~ {formatCurrency(profileSalarioConvertido, moedaBase)})
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{isBrazil ? 'PIB per capita' : 'Custo de Vida Local'}:</span>
                  <span style={{ fontWeight: 700 }}>
                    {formatCurrency(profile.pibPerCapita, profileCurrency)}
                    {moedaBase !== profileCurrency && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                        (~ {formatCurrency(
                          rates ? convertCurrency(profile.pibPerCapita, profileCurrency, moedaBase, rates) : 0,
                          moedaBase
                        )})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', background: 'var(--card-border)', padding: '21px', borderRadius: '12px', border: '1px solid var(--card-border)'}}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Comparativo de Gastos Pessoais
            </span>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
              {userAverageExpense === 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Adicione despesas no dashboard para calcular a comparação de custo de vida.</span>
              ) : (
                <>
                  Seus gastos mensais de{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(userAverageExpense, moedaBase)}</strong>{' '}
                  {profileCurrency !== moedaBase && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      (aprox. {formatCurrency(
                        rates ? convertCurrency(userAverageExpense, moedaBase, profileCurrency, rates) : userAverageExpense,
                        profileCurrency
                      )})
                    </span>
                  )}{' '}
                  são{' '}
                  <strong style={{ color: percentDiff > 0 ? 'var(--color-danger)' : 'var(--accent-green)' }}>
                    {percentDiff > 0 ? `+${percentDiff}%` : `${percentDiff}%`}{' '}
                  </strong>
                  {percentDiff > 0 ? 'maiores' : 'menores'} do que o salário médio em{' '}
                  <strong>{localName}</strong>{' '}
                  <span style={{ color: 'var(--text-muted)' }}>
                    ({formatCurrency(profile.salarioMedio, profileCurrency)}
                    {profileCurrency !== moedaBase && profileSalarioConvertido > 0 && (
                      <> ou aprox. {formatCurrency(profileSalarioConvertido, moedaBase)}</>
                    )})
                  </span>.
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {planoUsuario === 'free' && (
        <div className="premium-blur-overlay">
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(0, 210, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <Shield size={24} color="var(--accent-blue)" />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Explorador de Custo de Vida
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '24px', lineHeight: '1.5' }}>
            Compare seus gastos contra dados econômicos oficiais do IBGE/SIDRA e Teleport (salário médio, PIB, custo de vida global). Mapeie termograficamente suas despesas geolocalizadas.
          </p>
          <PrimaryButton onClick={onUpgrade}>
            Desbloquear Inteligência Geográfica Premium
          </PrimaryButton>
        </div>
      )}
    </Card>
  );
}
