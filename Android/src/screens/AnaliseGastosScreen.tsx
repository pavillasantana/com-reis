import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Tag, Users, ChevronRight, Share2, Filter } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { useI18n } from '../hooks/useI18n';
import { theme } from '../lib/theme';
import { formatCurrency, convertCurrency } from '../utils/currency';
import { Card } from '../components/Card';

interface AnaliseGastosScreenProps {
  onBack: () => void;
}

type PeriodType = 'month' | 'week' | 'year' | 'custom';

const COLORS_PALETTE = [
  '#1045A1', '#FFB800', '#10B981', '#EF4444', '#8B5CF6',
  '#F59E0B', '#EC4899', '#06B6D4', '#84CC16', '#F97316',
  '#6366F1', '#14B8A6', '#E11D48', '#A855F7', '#22D3EE',
];

export const AnaliseGastosScreen = ({ onBack }: AnaliseGastosScreenProps) => {
  const { t } = useI18n();
  const {
    transacoes,
    contas,
    id_espaco_ativo,
    moeda_base,
    cotacoes_moedas,
    tags,
    transacoes_participantes,
  } = useStore();

  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showDrillDown, setShowDrillDown] = useState<string | null>(null);

  const activeAccountIds = useMemo(
    () => contas.filter((c) => c.id_espaco === id_espaco_ativo).map((c) => c.id),
    [contas, id_espaco_ativo]
  );

  const getMonthRange = (ref: string): { start: string; end: string } => {
    const [y, m] = ref.split('-').map(Number);
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  };

  const getWeekRange = (): { start: string; end: string } => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10),
    };
  };

  const getYearRange = (): { start: string; end: string } => {
    const y = new Date().getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  };

  const dateRange = useMemo(() => {
    switch (periodType) {
      case 'month': return getMonthRange(selectedMonth);
      case 'week': return getWeekRange();
      case 'year': return getYearRange();
      default: return getMonthRange(selectedMonth);
    }
  }, [periodType, selectedMonth]);

  const converterValor = (t: any) => {
    const conta = contas.find(c => c.id === t.id_conta);
    const moedaTx = conta?.moeda_conta || moeda_base;
    return convertCurrency(t.valor, moedaTx, moeda_base, cotacoes_moedas);
  };

  const filteredTransactions = useMemo(() => {
    return transacoes.filter((t) => {
      if (!activeAccountIds.includes(t.id_conta)) return false;
      if (t.tipo !== 'despesa') return false;
      const d = t.data_transacao;
      if (!d) return false;
      const dateStr = d.includes('/') ? `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}` : d;
      if (dateStr < dateRange.start || dateStr > dateRange.end) return false;
      if (selectedTagId && t.id_tag !== selectedTagId) return false;
      return true;
    });
  }, [transacoes, activeAccountIds, dateRange, selectedTagId]);

  const totalDespesas = useMemo(
    () => filteredTransactions.reduce((acc, t) => acc + converterValor(t), 0),
    [filteredTransactions, contas, moeda_base, cotacoes_moedas]
  );

  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      map[t.categoria] = (map[t.categoria] || 0) + converterValor(t);
    });
    return Object.entries(map)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [filteredTransactions, totalDespesas, contas, moeda_base, cotacoes_moedas]);

  const porTag = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      const tagId = t.id_tag || 'sem_tag';
      map[tagId] = (map[tagId] || 0) + converterValor(t);
    });
    return Object.entries(map)
      .map(([tagId, valor]) => {
        const tag = tags.find((tg) => tg.id === tagId);
        return {
          tagId,
          tagName: tag ? tag.nome : t('no_tag'),
          valor,
          percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0,
        };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [filteredTransactions, totalDespesas, tags]);

  const sharedExpenses = useMemo(() => {
    return filteredTransactions.filter((t) => {
      const isComp = t.is_compartilhada;
      return Boolean(isComp) && String(isComp).toLowerCase() !== 'false' && String(isComp) !== '0';
    });
  }, [filteredTransactions]);

  const totalCompartilhado = useMemo(
    () => sharedExpenses.reduce((acc, t) => acc + converterValor(t), 0),
    [sharedExpenses, contas, moeda_base, cotacoes_moedas]
  );

  const metadeDevida = totalCompartilhado / 2;

  const categoriaDrillDown = useMemo(() => {
    if (!showDrillDown) return [];
    return filteredTransactions
      .filter((t) => t.categoria === showDrillDown)
      .sort((a, b) => converterValor(b) - converterValor(a));
  }, [filteredTransactions, showDrillDown, contas, moeda_base, cotacoes_moedas]);

  const obterNomeMes = (mesRef: string) => {
    const partes = mesRef.split('-');
    if (partes.length === 2) {
      const meses = [
        t('month_january'), t('month_february'), t('month_march'), t('month_april'),
        t('month_may'), t('month_june'), t('month_july'), t('month_august'),
        t('month_september'), t('month_october'), t('month_november'), t('month_december'),
      ];
      const index = parseInt(partes[1], 10) - 1;
      return `${meses[index]} / ${partes[0]}`;
    }
    return mesRef;
  };

  const getPeriodLabel = () => {
    switch (periodType) {
      case 'month': return obterNomeMes(selectedMonth);
      case 'week': return t('this_week');
      case 'year': return `${new Date().getFullYear()}`;
      default: return '';
    }
  };

  const navigateMonth = (direction: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const newDate = new Date(y, m - 1 + direction, 1);
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleShare = async () => {
    let text = `📊 *${t('expense_analysis')}*\n`;
    text += `📅 ${getPeriodLabel()}\n`;
    text += `💰 ${t('total_expenses')}: ${formatCurrency(totalDespesas, moeda_base)}\n\n`;
    text += `*${t('by_category')}*\n`;
    porCategoria.forEach((c) => {
      text += `• ${c.categoria}: ${formatCurrency(c.valor, moeda_base)} (${c.percentual.toFixed(1)}%)\n`;
    });
    if (totalCompartilhado > 0) {
      text += `\n*${t('shared_expenses')}*: ${formatCurrency(totalCompartilhado, moeda_base)}\n`;
      text += `${t('each_share')}: ${formatCurrency(metadeDevida, moeda_base)}\n`;
    }
    text += `\n${t('auto_generated')}`;
    await Share.share({ message: text });
  };

  const maxBarValue = porCategoria.length > 0 ? porCategoria[0].valor : 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('expense_analysis')}</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.7}>
          <Share2 size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['month', 'week', 'year'] as PeriodType[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, periodType === p && styles.periodChipActive]}
              onPress={() => setPeriodType(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodChipText, periodType === p && styles.periodChipTextActive]}>
                {p === 'month' ? t('monthly') : p === 'week' ? t('weekly') : t('yearly')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Month Navigation (only for month period) */}
        {periodType === 'month' && (
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => navigateMonth(-1)} activeOpacity={0.7}>
              <Text style={styles.monthNavArrow}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthNavLabel}>{obterNomeMes(selectedMonth)}</Text>
            <TouchableOpacity onPress={() => navigateMonth(1)} activeOpacity={0.7}>
              <Text style={styles.monthNavArrow}>▶</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Total Card */}
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>{t('total_expenses')}</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalDespesas, moeda_base)}</Text>
          <Text style={styles.totalSub}>{filteredTransactions.length} {t('transactions')}</Text>
        </Card>

        {/* Tag Filter */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Tag size={16} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>{t('filter_by_tag')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
            <TouchableOpacity
              style={[styles.tagChip, !selectedTagId && styles.tagChipActive]}
              onPress={() => setSelectedTagId(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tagChipText, !selectedTagId && styles.tagChipTextActive]}>
                {t('filter_all')}
              </Text>
            </TouchableOpacity>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[styles.tagChip, selectedTagId === tag.id && styles.tagChipActive]}
                onPress={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.tagDot, { backgroundColor: tag.cor || theme.colors.primary }]} />
                <Text style={[styles.tagChipText, selectedTagId === tag.id && styles.tagChipTextActive]}>
                  {tag.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bar Chart by Category */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={16} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>{t('by_category')}</Text>
          </View>
          {porCategoria.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('no_expenses_current_month')}</Text>
            </Card>
          ) : (
            porCategoria.map((cat, idx) => (
              <TouchableOpacity
                key={cat.categoria}
                style={styles.barRow}
                onPress={() => setShowDrillDown(showDrillDown === cat.categoria ? null : cat.categoria)}
                activeOpacity={0.7}
              >
                <View style={styles.barLabelRow}>
                  <View style={[styles.barDot, { backgroundColor: COLORS_PALETTE[idx % COLORS_PALETTE.length] }]} />
                  <Text style={styles.barLabel} numberOfLines={1}>{cat.categoria}</Text>
                  <Text style={styles.barValue}>{formatCurrency(cat.valor, moeda_base)}</Text>
                  <Text style={styles.barPercent}>{cat.percentual.toFixed(1)}%</Text>
                  <ChevronRight
                    size={14}
                    color={theme.colors.textMuted}
                    style={{ transform: [{ rotate: showDrillDown === cat.categoria ? '90deg' : '0deg' }] }}
                  />
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(cat.valor / maxBarValue) * 100}%`,
                        backgroundColor: COLORS_PALETTE[idx % COLORS_PALETTE.length],
                      },
                    ]}
                  />
                </View>
                {/* Drill Down */}
                {showDrillDown === cat.categoria && (
                  <View style={styles.drillDown}>
                    {categoriaDrillDown.slice(0, 10).map((tx) => (
                      <View key={tx.id} style={styles.drillDownRow}>
                        <Text style={styles.drillDownDesc} numberOfLines={1}>{tx.descricao || tx.categoria}</Text>
                        <Text style={styles.drillDownDate}>{tx.data_transacao}</Text>
                        <Text style={styles.drillDownValue}>{formatCurrency(converterValor(tx), moeda_base)}</Text>
                      </View>
                    ))}
                    {categoriaDrillDown.length > 10 && (
                      <Text style={styles.drillDownMore}>
                        +{categoriaDrillDown.length - 10} {t('more_items')}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* By Tag Section */}
        {porTag.length > 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Filter size={16} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{t('by_tag')}</Text>
            </View>
            {porTag.map((item, idx) => (
              <View key={item.tagId} style={styles.tagBarRow}>
                <View style={styles.tagBarLabelRow}>
                  <View style={[styles.barDot, { backgroundColor: COLORS_PALETTE[(porCategoria.length + idx) % COLORS_PALETTE.length] }]} />
                  <Text style={styles.barLabel} numberOfLines={1}>{item.tagName}</Text>
                  <Text style={styles.barValue}>{formatCurrency(item.valor, moeda_base)}</Text>
                  <Text style={styles.barPercent}>{item.percentual.toFixed(1)}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${item.percentual}%`,
                        backgroundColor: COLORS_PALETTE[(porCategoria.length + idx) % COLORS_PALETTE.length],
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Shared Expenses Section */}
        {totalCompartilhado > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={16} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{t('shared_expenses')}</Text>
            </View>
            <Card style={styles.sharedCard}>
              <View style={styles.sharedRow}>
                <View>
                  <Text style={styles.sharedLabel}>{t('total_general')}</Text>
                  <Text style={styles.sharedValue}>{formatCurrency(totalCompartilhado, moeda_base)}</Text>
                </View>
                <View style={styles.sharedDivider} />
                <View>
                  <Text style={styles.sharedLabel}>{t('each_share')}</Text>
                  <Text style={[styles.sharedValue, { color: theme.colors.primary }]}>
                    {formatCurrency(metadeDevida, moeda_base)}
                  </Text>
                </View>
              </View>
              <Text style={styles.sharedCount}>
                {sharedExpenses.length} {t('shared_items')}
              </Text>
            </Card>
          </View>
        )}

        <View style={{ height: 100 }} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.cardBg,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.ink,
  },
  shareBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  periodChipTextActive: {
    color: theme.colors.white,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  monthNavArrow: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  monthNavLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.ink,
    minWidth: 140,
    textAlign: 'center',
  },
  totalCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.negative,
    marginTop: 6,
  },
  totalSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tagChipTextActive: {
    color: theme.colors.white,
  },
  barRow: {
    marginBottom: 12,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  barDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  barLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  barValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.ink,
  },
  barPercent: {
    fontSize: 11,
    color: theme.colors.textMuted,
    minWidth: 40,
    textAlign: 'right',
  },
  barTrack: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  drillDown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  drillDownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  drillDownDesc: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.ink,
  },
  drillDownDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  drillDownValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.negative,
  },
  drillDownMore: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  tagBarRow: {
    marginBottom: 12,
  },
  tagBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sharedCard: {
    padding: 20,
  },
  sharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sharedLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  sharedValue: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.ink,
    marginTop: 4,
  },
  sharedDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: 20,
  },
  sharedCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
