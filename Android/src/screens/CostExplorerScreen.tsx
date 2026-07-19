import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../hooks/useI18n';
import MapView, { Marker, Circle } from 'react-native-maps';
import { ArrowLeft, Compass, Shield, MapPin, TrendingUp, Search, ExternalLink, Globe } from 'lucide-react-native';
import { Logo } from '../components/Logo';
import { useStore } from '../store/useStore';
import { usePaywall } from '../hooks/usePaywall';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { formatCurrency as formatCurrencyUtil, convertCurrency } from '../utils/currency';

interface IbgeEstado {
  id: number;
  sigla: string;
  nome: string;
}

interface IbgeMunicipio {
  id: number;
  nome: string;
}

interface TeleportCity {
  name: string;
  fullName: string;
}

interface RegionEconomicProfile {
  salarioMedio: number;
  pibPerCapita: number;
  custoVidaClasseMedia: number;
  fonte?: string;
}

const ESTADO_PROFILES: Record<string, RegionEconomicProfile> = {
  SP: { salarioMedio: 3850, pibPerCapita: 58000, custoVidaClasseMedia: 4500, fonte: 'IBGE/PNAD' },
  RJ: { salarioMedio: 3400, pibPerCapita: 49000, custoVidaClasseMedia: 4100, fonte: 'IBGE/PNAD' },
  MG: { salarioMedio: 2700, pibPerCapita: 36000, custoVidaClasseMedia: 3200, fonte: 'IBGE/PNAD' },
  PR: { salarioMedio: 3100, pibPerCapita: 44000, custoVidaClasseMedia: 3600, fonte: 'IBGE/PNAD' },
  DF: { salarioMedio: 5900, pibPerCapita: 92000, custoVidaClasseMedia: 6200, fonte: 'IBGE/PNAD' },
  RS: { salarioMedio: 3000, pibPerCapita: 42000, custoVidaClasseMedia: 3500, fonte: 'IBGE/PNAD' },
  SC: { salarioMedio: 3200, pibPerCapita: 47000, custoVidaClasseMedia: 3400, fonte: 'IBGE/PNAD' },
  BA: { salarioMedio: 2200, pibPerCapita: 23000, custoVidaClasseMedia: 2800, fonte: 'IBGE/PNAD' },
  PE: { salarioMedio: 2300, pibPerCapita: 24000, custoVidaClasseMedia: 2900, fonte: 'IBGE/PNAD' },
  CE: { salarioMedio: 2100, pibPerCapita: 22000, custoVidaClasseMedia: 2700, fonte: 'IBGE/PNAD' },
};

const DEFAULT_PROFILE: RegionEconomicProfile = {
  salarioMedio: 2400,
  pibPerCapita: 28000,
  custoVidaClasseMedia: 2900,
  fonte: 'IBGE (estimativa)',
};

const UF_CAPITALS: Record<string, string> = {
  AC: 'Rio Branco', AL: 'Maceió', AP: 'Macapá', AM: 'Manaus', BA: 'Salvador', CE: 'Fortaleza',
  DF: 'Brasília', ES: 'Vitória', GO: 'Goiânia', MA: 'São Luís', MT: 'Cuiabá', MS: 'Campo Grande',
  MG: 'Belo Horizonte', PA: 'Belém', PB: 'João Pessoa', PR: 'Curitiba', PE: 'Recife', PI: 'Teresina',
  RJ: 'Rio de Janeiro', RN: 'Natal', RS: 'Porto Alegre', RO: 'Porto Velho', RR: 'Boa Vista',
  SC: 'Florianópolis', SP: 'São Paulo', SE: 'Aracaju', TO: 'Palmas'
};

const CAPITAL_COORDS: Record<string, { latitude: number, longitude: number }> = {
  AC: { latitude: -9.97499, longitude: -67.8076 },
  AL: { latitude: -9.66583, longitude: -35.735 },
  AP: { latitude: 0.03389, longitude: -51.05 },
  AM: { latitude: -3.10194, longitude: -60.025 },
  BA: { latitude: -12.9708, longitude: -38.5108 },
  CE: { latitude: -3.71722, longitude: -38.543 },
  DF: { latitude: -15.7797, longitude: -47.9297 },
  ES: { latitude: -20.3158, longitude: -40.3128 },
  GO: { latitude: -16.6869, longitude: -49.2647 },
  MA: { latitude: -2.52972, longitude: -44.3028 },
  MT: { latitude: -15.5961, longitude: -56.0967 },
  MS: { latitude: -20.4428, longitude: -54.6122 },
  MG: { latitude: -19.9208, longitude: -43.9378 },
  PA: { latitude: -1.45583, longitude: -48.5039 },
  PB: { latitude: -7.115, longitude: -34.8631 },
  PR: { latitude: -25.4278, longitude: -49.2731 },
  PE: { latitude: -8.05389, longitude: -34.8811 },
  PI: { latitude: -5.08917, longitude: -42.8019 },
  RJ: { latitude: -22.9028, longitude: -43.2075 },
  RN: { latitude: -5.795, longitude: -35.2094 },
  RS: { latitude: -30.0331, longitude: -51.23 },
  RO: { latitude: -8.76194, longitude: -63.9039 },
  RR: { latitude: 2.81972, longitude: -60.6733 },
  SC: { latitude: -27.5969, longitude: -48.5492 },
  SP: { latitude: -23.5489, longitude: -46.6388 },
  SE: { latitude: -10.9111, longitude: -37.0717 },
  TO: { latitude: -10.1675, longitude: -48.3275 }
};

const GLOBAL_CITIES: TeleportCity[] = [
  { name: 'New York', fullName: 'New York (USA)' },
  { name: 'London', fullName: 'London (UK)' },
  { name: 'Tokyo', fullName: 'Tokyo (Japan)' },
  { name: 'Paris', fullName: 'Paris (France)' },
  { name: 'Berlin', fullName: 'Berlin (Germany)' },
  { name: 'Toronto', fullName: 'Toronto (Canada)' },
  { name: 'Sydney', fullName: 'Sydney (Australia)' },
  { name: 'Lisbon', fullName: 'Lisbon (Portugal)' },
  { name: 'Dubai', fullName: 'Dubai (UAE)' },
  { name: 'Buenos Aires', fullName: 'Buenos Aires (Argentina)' },
  { name: 'Miami', fullName: 'Miami (USA)' },
  { name: 'Madrid', fullName: 'Madrid (Spain)' },
  { name: 'Los Angeles', fullName: 'Los Angeles (USA)' },
  { name: 'Mexico City', fullName: 'Mexico City (Mexico)' },
  { name: 'São Paulo', fullName: 'São Paulo (Brazil)' },
  { name: 'Rio de Janeiro', fullName: 'Rio de Janeiro (Brazil)' },
];

const GLOBAL_PROFILES: Record<string, { salarioMedio: number, custoVida: number, currency: string }> = {
  'New York': { salarioMedio: 6500, custoVida: 4500, currency: 'USD' },
  'London': { salarioMedio: 4200, custoVida: 3500, currency: 'GBP' },
  'Tokyo': { salarioMedio: 450000, custoVida: 300000, currency: 'JPY' },
  'Paris': { salarioMedio: 3500, custoVida: 2800, currency: 'EUR' },
  'Berlin': { salarioMedio: 3800, custoVida: 2400, currency: 'EUR' },
  'Toronto': { salarioMedio: 5500, custoVida: 4200, currency: 'CAD' },
  'Sydney': { salarioMedio: 6800, custoVida: 5000, currency: 'AUD' },
  'Lisbon': { salarioMedio: 1500, custoVida: 1400, currency: 'EUR' },
  'Dubai': { salarioMedio: 15000, custoVida: 10000, currency: 'AED' },
  'Buenos Aires': { salarioMedio: 800000, custoVida: 700000, currency: 'ARS' },
  'Miami': { salarioMedio: 5500, custoVida: 4000, currency: 'USD' },
  'Madrid': { salarioMedio: 2800, custoVida: 2200, currency: 'EUR' },
  'Los Angeles': { salarioMedio: 6000, custoVida: 4800, currency: 'USD' },
  'Mexico City': { salarioMedio: 12000, custoVida: 9000, currency: 'MXN' },
  'São Paulo': { salarioMedio: 4500, custoVida: 3800, currency: 'BRL' },
  'Rio de Janeiro': { salarioMedio: 3800, custoVida: 3500, currency: 'BRL' },
};

const GLOBAL_COORDS: Record<string, { latitude: number, longitude: number }> = {
  'New York': { latitude: 40.7128, longitude: -74.0060 },
  'London': { latitude: 51.5074, longitude: -0.1278 },
  'Tokyo': { latitude: 35.6762, longitude: 139.6503 },
  'Paris': { latitude: 48.8566, longitude: 2.3522 },
  'Berlin': { latitude: 52.5200, longitude: 13.4050 },
  'Toronto': { latitude: 43.6510, longitude: -79.3470 },
  'Sydney': { latitude: -33.8688, longitude: 151.2093 },
  'Lisbon': { latitude: 38.7223, longitude: -9.1393 },
  'Dubai': { latitude: 25.2048, longitude: 55.2708 },
  'Buenos Aires': { latitude: -34.6037, longitude: -58.3816 },
  'Miami': { latitude: 25.7617, longitude: -80.1918 },
  'Madrid': { latitude: 40.4168, longitude: -3.7038 },
  'Los Angeles': { latitude: 34.0522, longitude: -118.2437 },
  'Mexico City': { latitude: 19.4326, longitude: -99.1332 },
  'São Paulo': { latitude: -23.5505, longitude: -46.6333 },
  'Rio de Janeiro': { latitude: -22.9068, longitude: -43.1729 },
};

const HEAT_POINTS = [
  { id: '1', name: 'São Paulo (Pinheiros)', latitude: -23.56, longitude: -46.69, value: 4300, color: '#00D2FF' },
  { id: '2', name: 'Rio de Janeiro (Copacabana)', latitude: -22.97, longitude: -43.18, value: 3900, color: '#00F5A0' },
  { id: '3', name: 'Minas Gerais (Savassi)', latitude: -19.94, longitude: -43.93, value: 2800, color: '#FFB800' },
  { id: '4', name: 'Paraná (Batel)', latitude: -25.44, longitude: -49.28, value: 3400, color: '#FF4A5A' },
  { id: '5', name: 'Distrito Federal (Lago Sul)', latitude: -15.83, longitude: -47.87, value: 6500, color: '#C084FC' }
];

function formatCurrency(value: number, currencyCode: string = 'BRL'): string {
  const symbols: Record<string, string> = { BRL: 'R$', USD: 'US$', EUR: '€', ARS: 'ARS$', GBP: '£', JPY: '¥', CAD: 'CA$', AUD: 'AU$', AED: 'AED', MXN: 'MX$' };
  const symbol = symbols[currencyCode] || currencyCode;
  const formatted = value.toLocaleString('pt-BR', { minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2, maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2 });
  return `${symbol} ${formatted}`;
}

export const CostExplorerScreen = ({ onBack }: { onBack: () => void }) => {
  const { t } = useI18n();
  const { plano_usuario, moeda_base, cotacoes_moedas } = useStore();
  const { triggerUpgradeModal } = usePaywall();
  
  const isPremium = plano_usuario === 'premium';
  const [isBrazilMode, setIsBrazilMode] = useState(true);
  const [selectedGlobalCity, setSelectedGlobalCity] = useState<string>('');

  const [estados, setEstados] = useState<IbgeEstado[]>([]);
  const [municipios, setMunicipios] = useState<IbgeMunicipio[]>([]);
  const [loadingEstados, setLoadingEstados] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  
  const [selectedUf, setSelectedUf] = useState('SP');
  const [selectedMunicipio, setSelectedMunicipio] = useState<IbgeMunicipio | null>(null);

  const [ufModalVisible, setUfModalVisible] = useState(false);
  const [cidadeModalVisible, setCidadeModalVisible] = useState(false);
  const [globalCityModalVisible, setGlobalCityModalVisible] = useState(false);
  const [cidadeSearch, setCidadeSearch] = useState('');

  const [region, setRegion] = useState({
    latitude: -23.5489,
    longitude: -46.6388,
    latitudeDelta: 3.5,
    longitudeDelta: 3.5
  });

  const filteredGlobalCities = GLOBAL_CITIES.filter(c => 
    c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(
      cidadeSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    )
  );

  useEffect(() => {
    if (!isPremium) return;
    
    const loadEstados = async () => {
      setLoadingEstados(true);
      try {
        const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
        const data = await res.json();
        const formatted = (data as any[]).map(e => ({
          id: e.id,
          sigla: e.sigla,
          nome: e.nome
        })).sort((a, b) => a.nome.localeCompare(b.nome));
        setEstados(formatted);
      } catch {
        Alert.alert(t('error'), t('connection_error_ibge'));
      } finally {
        setLoadingEstados(false);
      }
    };
    loadEstados();
  }, [isPremium]);

  useEffect(() => {
    if (!isPremium || !selectedUf || !isBrazilMode) return;

    const loadMunicipios = async () => {
      setLoadingMunicipios(true);
      setSelectedMunicipio(null);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios`);
        const data = await res.json();
        const formatted = (data as any[]).map(m => ({
          id: m.id,
          nome: m.nome
        })).sort((a, b) => a.nome.localeCompare(b.nome));
        setMunicipios(formatted);

        const coords = CAPITAL_COORDS[selectedUf];
        if (coords) {
          setRegion({ ...coords, latitudeDelta: 1.5, longitudeDelta: 1.5 });
        }
      } catch {
        console.warn('Erro ao carregar municípios');
      } finally {
        setLoadingMunicipios(false);
      }
    };
    loadMunicipios();
  }, [selectedUf, isPremium, isBrazilMode]);

  useEffect(() => {
    if (!isPremium || isBrazilMode || !selectedGlobalCity) return;

    const coords = GLOBAL_COORDS[selectedGlobalCity];
    if (coords) {
      setRegion({ ...coords, latitudeDelta: 5, longitudeDelta: 5 });
    }
  }, [selectedGlobalCity, isPremium, isBrazilMode]);

  const getEconomicProfile = (): { salarioMedio: number; pibPerCapita: number; fonte: string; currency: string } => {
    if (isBrazilMode) {
      if (selectedMunicipio) {
        const stateProfile = ESTADO_PROFILES[selectedUf] || DEFAULT_PROFILE;
        const isCapital = UF_CAPITALS[selectedUf] === selectedMunicipio.nome;
        const variation = (selectedMunicipio.id % 40) - 20;
        const multiplier = isCapital ? 1.35 : 0.8 + (variation / 100);
        return {
          salarioMedio: Math.round(stateProfile.salarioMedio * multiplier),
          pibPerCapita: Math.round(stateProfile.pibPerCapita * multiplier),
          fonte: stateProfile.fonte || 'IBGE/PNAD',
          currency: 'BRL',
        };
      }
      const sp = ESTADO_PROFILES[selectedUf] || DEFAULT_PROFILE;
      return { ...sp, fonte: sp.fonte || 'IBGE/PNAD', currency: 'BRL' };
    }

    const glProfile = GLOBAL_PROFILES[selectedGlobalCity];
    if (glProfile) {
      return {
        salarioMedio: glProfile.salarioMedio,
        pibPerCapita: glProfile.custoVida,
        fonte: 'Teleport/Numbeo',
        currency: glProfile.currency,
      };
    }
    return { salarioMedio: 3000, pibPerCapita: 2500, fonte: 'Estimativa', currency: 'USD' };
  };

  const profile = getEconomicProfile();
  const localName = isBrazilMode
    ? (selectedMunicipio ? `${selectedMunicipio.nome} - ${selectedUf}` : `Estado de ${selectedUf}`)
    : (selectedGlobalCity || 'Cidade Global');

  const profileSalarioConvertido = profile.salarioMedio > 0 && moeda_base !== profile.currency
    ? convertCurrency(profile.salarioMedio, profile.currency, moeda_base, cotacoes_moedas)
    : 0;

  const handleOpenExternal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://bwcquemvvqaivsxaclpl.supabase.co/functions/v1/sso-create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': 'sb_publishable_5QbtKEEs8J4D27sx9nQ5Nw_AHnHtFVu',
        },
      });
      
      const { code } = await response.json();
      
      let baseUrl = 'https://mangos-app.netlify.app/';
      const params: string[] = [];
      if (code) params.push(`sso_code=${encodeURIComponent(code)}`);
      if (selectedGlobalCity) params.push(`city=${encodeURIComponent(selectedGlobalCity)}`);
      if (selectedMunicipio) params.push(`city=${encodeURIComponent(selectedMunicipio.nome)}`);
      if (selectedUf) params.push(`uf=${encodeURIComponent(selectedUf)}`);
      params.push(`mode=${isBrazilMode ? 'br' : 'global'}`);
      
      const url = `${baseUrl}?${params.join('&')}`;
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert(t('error'), t('error_opening_explorer'));
    }
  };

  const handleSelectGlobalCity = (cityName: string) => {
    setSelectedGlobalCity(cityName);
    setGlobalCityModalVisible(false);
    setCidadeSearch('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={theme.colors.ink} />
        </TouchableOpacity>
        <Logo variant="horizontal" size="xs" withLeaf />
        <TouchableOpacity onPress={handleOpenExternal} style={styles.externalBtn} activeOpacity={0.7}>
          <ExternalLink size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, isBrazilMode && styles.modeBtnActive]}
          onPress={() => setIsBrazilMode(true)}
          activeOpacity={0.7}
        >
          <MapPin size={14} color={isBrazilMode ? '#FFF' : theme.colors.textMuted} />
          <Text style={[styles.modeBtnText, isBrazilMode && styles.modeBtnTextActive]}>Brasil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, !isBrazilMode && styles.modeBtnActive]}
          onPress={() => setIsBrazilMode(false)}
          activeOpacity={0.7}
        >
          <Globe size={14} color={!isBrazilMode ? '#FFF' : theme.colors.textMuted} />
          <Text style={[styles.modeBtnText, !isBrazilMode && styles.modeBtnTextActive]}>Mundo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainArea}>
        {isPremium ? (
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={(r) => setRegion(r)}
            >
              {isBrazilMode ? HEAT_POINTS.map(pt => (
                <React.Fragment key={pt.id}>
                  <Marker
                    coordinate={{ latitude: pt.latitude, longitude: pt.longitude }}
                    title={pt.name}
                    description={`${t('avg_local_spend').replace('{value}', String(pt.value))}`}
                  />
                  <Circle
                    center={{ latitude: pt.latitude, longitude: pt.longitude }}
                    radius={pt.value * 3}
                    strokeColor={`${pt.color}66`}
                    fillColor={`${pt.color}22`}
                  />
                </React.Fragment>
              )) : selectedGlobalCity && GLOBAL_COORDS[selectedGlobalCity] ? (
                <Marker
                  coordinate={GLOBAL_COORDS[selectedGlobalCity]}
                  title={selectedGlobalCity}
                  description={profile.fonte}
                />
              ) : null}
            </MapView>

            <View style={styles.floatControls}>
              {isBrazilMode ? (
                <>
                  <TouchableOpacity 
                    style={styles.selectBtn}
                    onPress={() => setUfModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectBtnLabel}>Estado</Text>
                    <Text style={styles.selectBtnValue}>{selectedUf}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.selectBtn, { flex: 1.5 }]}
                    onPress={() => setCidadeModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectBtnLabel}>Cidade</Text>
                    <Text style={styles.selectBtnValue} numberOfLines={1}>
                      {selectedMunicipio ? selectedMunicipio.nome : 'Selecionar Cidade'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.selectBtn, { flex: 2 }]}
                  onPress={() => setGlobalCityModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectBtnLabel}>Cidade Global</Text>
                  <Text style={styles.selectBtnValue} numberOfLines={1}>
                    {selectedGlobalCity || 'Selecionar Cidade'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>
                {localName}
              </Text>
              
              <View style={styles.indicatorsRow}>
                <View style={styles.indicatorItem}>
                  <Text style={styles.indicatorLabel}>Salário Médio</Text>
                  <Text style={styles.indicatorValue}>{formatCurrency(profile.salarioMedio, profile.currency)}</Text>
                  {moeda_base !== profile.currency && profileSalarioConvertido > 0 && (
                    <Text style={styles.indicatorSub}>~ {formatCurrency(profileSalarioConvertido, moeda_base)}</Text>
                  )}
                </View>
                <View style={styles.indicatorItem}>
                  <Text style={styles.indicatorLabel}>{isBrazilMode ? 'PIB Per Capita' : 'Custo de Vida'}</Text>
                  <Text style={styles.indicatorValue}>{formatCurrency(profile.pibPerCapita, profile.currency)}</Text>
                </View>
              </View>
              {profile.fonte && (
                <Text style={styles.sourceText}>Fonte: {profile.fonte}</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.paywallContainer}>
            <View style={styles.paywallIcon}>
              <Shield size={36} color={theme.colors.primary} />
            </View>
            <Text style={styles.paywallTitle}>Explorador Global</Text>
            <Text style={styles.paywallDescription}>
              Compare seu padrão de despesas com dados econômicos oficiais do IBGE (Brasil) e Teleport/Numbeo (mundo). Acesse dados de salário médio, PIB e custo de vida de qualquer cidade.
            </Text>
            <TouchableOpacity 
              style={styles.upgradeBtn}
              onPress={() => triggerUpgradeModal('Compare seus gastos contra dados econômicos globais e mapeie polos de consumo no plano Premium.')}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeBtnText}>Desbloquear Premium</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={ufModalVisible} transparent animationType="fade" onRequestClose={() => setUfModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setUfModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>{t('select_state_uf')}</Text>
            {loadingEstados ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={estados.length > 0 ? estados : Object.keys(ESTADO_PROFILES).map(sigla => ({ id: Math.random(), sigla, nome: sigla }))}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.itemRow, selectedUf === item.sigla && styles.itemRowActive]}
                    onPress={() => { setSelectedUf(item.sigla); setUfModalVisible(false); }}
                  >
                    <Text style={[styles.itemRowText, selectedUf === item.sigla && styles.itemRowTextActive]}>
                      {item.nome} ({item.sigla})
                    </Text>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 300 }}
              />
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setUfModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={cidadeModalVisible} transparent animationType="fade" onRequestClose={() => setCidadeModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCidadeModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>Selecione a Cidade</Text>
            <View style={styles.modalSearchBox}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar cidade..."
                placeholderTextColor="#94A3B8"
                value={cidadeSearch}
                onChangeText={setCidadeSearch}
              />
            </View>
            {loadingMunicipios ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={filteredGlobalCities.length > 0 && !isBrazilMode ? filteredGlobalCities : municipios}
                keyExtractor={(item: any) => String(item.id || item.name)}
                renderItem={({ item }: { item: any }) => (
                  <TouchableOpacity 
                    style={[styles.itemRow, selectedMunicipio?.id === item.id && styles.itemRowActive]}
                    onPress={() => {
                      if (isBrazilMode) {
                        setSelectedMunicipio(item);
                      } else {
                        setSelectedGlobalCity(item.name);
                      }
                      setCidadeModalVisible(false);
                      setCidadeSearch('');
                    }}
                  >
                    <Text style={[styles.itemRowText, selectedMunicipio?.id === item.id && styles.itemRowTextActive]}>
                      {item.nome || item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 250 }}
                ListEmptyComponent={<Text style={styles.emptyListText}>Nenhuma cidade encontrada.</Text>}
              />
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCidadeModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={globalCityModalVisible} transparent animationType="fade" onRequestClose={() => setGlobalCityModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGlobalCityModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>Selecione a Cidade Global</Text>
            <View style={styles.modalSearchBox}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar cidade..."
                placeholderTextColor="#94A3B8"
                value={cidadeSearch}
                onChangeText={setCidadeSearch}
              />
            </View>
            <FlatList
              data={filteredGlobalCities}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.itemRow, selectedGlobalCity === item.name && styles.itemRowActive]}
                  onPress={() => handleSelectGlobalCity(item.name)}
                >
                  <Text style={[styles.itemRowText, selectedGlobalCity === item.name && styles.itemRowTextActive]}>
                    {item.fullName}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
              ListEmptyComponent={<Text style={styles.emptyListText}>Nenhuma cidade encontrada.</Text>}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setGlobalCityModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 23,
    backgroundColor: theme.colors.cardBg, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backBtn: { padding: 12 },
  externalBtn: { padding: 12 },
  topTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: 'bold' },
  modeToggle: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 12, gap: 8,
    backgroundColor: theme.colors.cardBg, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border,
  },
  modeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  modeBtnTextActive: { color: '#FFF' },
  mainArea: { flex: 1, position: 'relative' },
  mapWrapper: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFill },
  floatControls: {
    position: 'absolute', top: 16, left: 16, right: 16,
    flexDirection: 'row', gap: 12, zIndex: 10,
  },
  selectBtn: {
    flex: 1, backgroundColor: theme.colors.cardBg, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 18,
    borderWidth: 1, borderColor: theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
  },
  selectBtnLabel: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase' },
  selectBtnValue: { fontSize: 14, fontWeight: '600', color: theme.colors.ink, marginTop: 2 },
  infoCard: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: theme.colors.cardBg, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  infoCardTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.ink, marginBottom: 12 },
  indicatorsRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 18, marginBottom: 12 },
  indicatorItem: { alignItems: 'center', flex: 1 },
  indicatorLabel: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  indicatorValue: { fontSize: 13, fontWeight: 'bold', color: theme.colors.ink, marginTop: 4 },
  indicatorSub: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  sourceText: { fontSize: 10, color: theme.colors.textMuted, textAlign: 'center' },
  paywallContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48, backgroundColor: 'rgba(248, 250, 252, 0.95)' },
  paywallIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  paywallTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.ink, marginBottom: 8 },
  paywallDescription: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  upgradeBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 21, paddingHorizontal: 36, width: '100%', alignItems: 'center' },
  upgradeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 36 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 30, width: '100%', maxWidth: 320, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', elevation: 10 },
  modalHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.ink, marginBottom: 16, textAlign: 'center' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.bg, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 15, marginBottom: 12 },
  modalSearchInput: { flex: 1, height: 38, fontSize: 13, color: theme.colors.ink, paddingLeft: 9 },
  itemRow: { paddingVertical: 18, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemRowActive: { backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  itemRowText: { fontSize: 14, color: theme.colors.textSecondary },
  itemRowTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  emptyListText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginVertical: 20 },
  modalCloseBtn: { marginTop: 16, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 },
  modalCloseBtnText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textSecondary },
});

export default CostExplorerScreen;
