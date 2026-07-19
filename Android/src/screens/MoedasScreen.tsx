import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../store/useStore';
import { divideMoney, convertCurrency } from '../utils/currency';
import { ArrowLeft, Check, Info, Coins } from 'lucide-react-native';
import { Logo } from '../components/Logo';
import { theme } from '../lib/theme';
import { AdBanner } from '../components/AdBanner';

interface MoedasScreenProps {
  onBack: () => void;
}

const OPCOES_MOEDA = [
  { codigo: 'BRL', nome: 'Real Brasileiro', simbolo: 'R$', flag: '🇧🇷' },
  { codigo: 'USD', nome: 'Dólar Americano', simbolo: '$', flag: '🇺🇸' },
  { codigo: 'EUR', nome: 'Euro', simbolo: '€', flag: '🇪🇺' },
  { codigo: 'ARS', nome: 'Peso Argentino', simbolo: '$', flag: '🇦🇷' },
  { codigo: 'GBP', nome: 'Libra Esterlina', simbolo: '£', flag: '🇬🇧' },
  { codigo: 'JPY', nome: 'Iene Japonês', simbolo: '¥', flag: '🇯🇵' },
  { codigo: 'CAD', nome: 'Dólar Canadense', simbolo: '$', flag: '🇨🇦' },
  { codigo: 'CHF', nome: 'Franco Suíço', simbolo: 'CHF', flag: '🇨🇭' },
  { codigo: 'AUD', nome: 'Dólar Australiano', simbolo: '$', flag: '🇦🇺' },
  { codigo: 'CNY', nome: 'Yuan Chinês', simbolo: '¥', flag: '🇨🇳' },
  { codigo: 'MXN', nome: 'Peso Mexicano', simbolo: '$', flag: '🇲🇽' },
];

const VALORES_EM_BRL: Record<string, number> = {
  BRL: 1.0,
  USD: 5.20,
  EUR: 5.90,
  ARS: 0.0035,
  GBP: 6.90,
  JPY: 0.034,
  CAD: 3.80,
  CHF: 6.10,
  AUD: 3.45,
  CNY: 0.72,
  MXN: 0.28
};

export const MoedasScreen = ({ onBack }: MoedasScreenProps) => {
  const { t } = useI18n();
  const { moeda_base, setMoedaBase, cotacoes_moedas } = useStore();
  const [loading, setLoading] = useState(false);

  const handleSelecionarMoeda = async (codigo: string) => {
    if (codigo === moeda_base) return;

    setLoading(true);
    try {
      await setMoedaBase(codigo);
      Alert.alert(t('currency_updated'), t('currency_updated_message').replace('{code}', codigo));
    } catch (err: any) {
      Alert.alert(t('error'), t('cannot_change_currency') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Logo variant="horizontal" size="xs" withLeaf />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info size={20} color={theme.colors.primary} style={{ marginTop: 2 }} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>{t('unified_base_currency')}</Text>
            <Text style={styles.infoDescription}>
              {t('base_currency_description')}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('choose_base_currency')}</Text>

        {/* Lista de Moedas */}
        <View style={styles.optionsWrapper}>
          {OPCOES_MOEDA.map(opcao => {
            const isSelected = opcao.codigo === moeda_base;
            return (
              <TouchableOpacity
                key={opcao.codigo}
                style={[styles.coinOption, isSelected && styles.coinOptionSelected]}
                onPress={() => handleSelecionarMoeda(opcao.codigo)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.coinLeft}>
                  <Text style={styles.flagText}>{opcao.flag}</Text>
                  <View>
                    <Text style={styles.coinName}>{opcao.nome}</Text>
                    <Text style={styles.coinCode}>{opcao.codigo} ({opcao.simbolo})</Text>
                  </View>
                </View>
                {isSelected && (
                  <View style={styles.checkWrapper}>
                    <Check size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Taxas de Câmbio de Referência */}
        <Text style={styles.sectionTitle}>{t('reference_exchange_rates')}</Text>
        <View style={styles.ratesCard}>
          <View style={styles.ratesHeader}>
            <Coins size={18} color={theme.colors.textMuted} />
            <Text style={styles.ratesHeaderText}>Conversão de 1 unidade para {moeda_base}</Text>
          </View>

          {OPCOES_MOEDA.filter(o => o.codigo !== moeda_base).map(opcaoOrigem => {
            const valorConvertido = convertCurrency(1, opcaoOrigem.codigo, moeda_base, cotacoes_moedas);
            const simboloBase = OPCOES_MOEDA.find(o => o.codigo === moeda_base)?.simbolo || '';
            const taxaFormatada = `${simboloBase} ${valorConvertido >= 0.1 ? valorConvertido.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : valorConvertido.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
            
            return (
              <View key={opcaoOrigem.codigo} style={styles.rateRow}>
                <Text style={styles.rateRowLeft}>{opcaoOrigem.flag} 1 {opcaoOrigem.codigo}</Text>
                <Text style={styles.rateRowRight}>{taxaFormatada}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
        <AdBanner />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 23,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 12,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 30,
  },
  infoCard: {
    backgroundColor: 'rgba(44, 95, 141, 0.08)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoDescription: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  optionsWrapper: {
    gap: 8,
    marginBottom: 24,
  },
  coinOption: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  coinOptionSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  coinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flagText: {
    fontSize: 24,
  },
  coinName: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
  },
  coinCode: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  checkWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratesCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ratesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 18,
    marginBottom: 12,
  },
  ratesHeaderText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: 'bold',
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rateRowLeft: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  rateRowRight: {
    color: theme.colors.ink,
    fontWeight: 'bold',
    fontSize: 13,
  },
});

export default MoedasScreen;
