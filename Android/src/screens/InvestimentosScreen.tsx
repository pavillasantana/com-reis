import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Logo } from '../components/Logo';
import { AdBanner } from '../components/AdBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useI18n } from '../hooks/useI18n';
import { formatCurrency } from '../utils/currency';
import { theme } from '../lib/theme';

export const InvestimentosScreen = () => {
  const { t } = useI18n();
  const { moeda_base, cotacoes_moedas } = useStore();

  const mockAtivos = [
    { id: '1', nome: 'Petrobras (PETR4)', quant: 100, valor: 38.5, total: 3850 },
    { id: '2', nome: 'Vale (VALE3)', quant: 50, valor: 62.1, total: 3105 },
    { id: '3', nome: 'S&P 500 ETF (IVVB11)', quant: 15, valor: 290.4, total: 4356 },
  ];

  const cotacoes = {
    USD: cotacoes_moedas?.USD || 5.20,
    EUR: cotacoes_moedas?.EUR || 5.90,
    ARS: cotacoes_moedas?.ARS || 0.0035,
  };

  const totalInvestido = mockAtivos.reduce((acc, ativo) => acc + ativo.total, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Logo variant="horizontal" size="sm" withLeaf style={{ marginBottom: 16 }} />
        <Text style={styles.title}>{t('investments_exchange_title')}</Text>
        <Text style={styles.subtitle}>{t('investments_subtitle')}</Text>

        {/* Card de Patrimônio */}
        <View style={styles.patrimonyCard}>
          <Text style={styles.patrimonyLabel}>{t('asset_equity')}</Text>
          <Text style={styles.patrimonyValue}>{formatCurrency(totalInvestido, moeda_base)}</Text>
        </View>

        {/* Seção Cotações */}
        <Text style={styles.sectionTitle}>{t('foreign_currencies')}</Text>
        <View style={styles.ratesContainer}>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>{t('commercial_dollar')}</Text>
            <Text style={styles.rateValue}>{formatCurrency(cotacoes.USD, 'BRL')}</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>{t('euro')}</Text>
            <Text style={styles.rateValue}>{formatCurrency(cotacoes.EUR, 'BRL')}</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>{t('argentine_peso')}</Text>
            <Text style={styles.rateValue}>{formatCurrency(cotacoes.ARS, 'BRL')}</Text>
          </View>
        </View>

        {/* Seção de Ativos */}
        <Text style={styles.sectionTitle}>{t('portfolio_assets')}</Text>
        {mockAtivos.map(ativo => (
          <View key={ativo.id} style={styles.ativoCard}>
            <View>
              <Text style={styles.ativoNome}>{ativo.nome}</Text>
              <Text style={styles.ativoQuant}>{ativo.quant} cotas • {formatCurrency(ativo.valor, moeda_base)}</Text>
            </View>
            <Text style={styles.ativoTotal}>{formatCurrency(ativo.total, moeda_base)}</Text>
          </View>
        ))}
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
  scrollContainer: {
    padding: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 24,
    marginTop: 4,
  },
  patrimonyCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 30,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  patrimonyLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginBottom: 6,
  },
  patrimonyValue: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 12,
  },
  ratesContainer: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rateLabel: {
    color: theme.colors.text,
    fontSize: 14,
  },
  rateValue: {
    color: theme.colors.positive,
    fontWeight: 'bold',
    fontSize: 14,
  },
  ativoCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ativoNome: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  ativoQuant: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  ativoTotal: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
