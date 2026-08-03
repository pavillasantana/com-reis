/**
 * InvestmentImportModal
 * Modal de revisão da importação de investimentos (espelho do web InvestImportReviewModal).
 * Permite selecionar linhas, editar ticker/quantidade/preço/tipo/data e remover linhas
 * antes de confirmar a importação.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, FlatList, StyleSheet,
} from 'react-native';
import { CheckSquare, Square, Trash2 } from 'lucide-react-native';
import { theme } from '../lib/theme';

type AnyRow = any;

interface Props {
  visible: boolean;
  mode: 'ativos' | 'aportes';
  rows: AnyRow[];
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (selected: AnyRow[]) => void;
}

const deIsoParaBr = (dataIso: string): string => {
  if (!dataIso) return '';
  const parts = dataIso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dataIso;
};

const deBrParaIso = (dataBr: string): string => {
  const parts = dataBr.split('/');
  if (parts.length === 3) {
    const dia = parts[0].padStart(2, '0');
    const mes = parts[1].padStart(2, '0');
    const ano = parts[2];
    if (ano.length === 4) return `${ano}-${mes}-${dia}`;
  }
  return new Date().toISOString().split('T')[0];
};

const applyDataMask = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  const limited = cleaned.slice(0, 8);
  if (limited.length <= 2) return limited;
  if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
};

export const InvestmentImportModal = ({
  visible, mode, rows, isSaving, onClose, onConfirm,
}: Props) => {
  const [data, setData] = useState<AnyRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible) {
      setData(rows.map((r) => ({ ...r })));
      const sel: Record<string, boolean> = {};
      rows.forEach((r) => { sel[r._key] = true; });
      setSelected(sel);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const update = (key: string, patch: Record<string, any>) => {
    setData((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  };

  const toggle = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const allChecked = data.every((r) => prev[r._key]);
      const next: Record<string, boolean> = {};
      data.forEach((r) => { next[r._key] = !allChecked; });
      return next;
    });
  };

  const remove = (key: string) => {
    setData((prev) => prev.filter((r) => r._key !== key));
    setSelected((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const summary = useMemo(() => {
    const list = data.filter((r) => selected[r._key]);
    const total = list.reduce((acc, r) => {
      if (mode === 'aportes') return acc + (Number(r.quantidade) || 0) * (Number(r.precoUnitario) || 0);
      return acc + (Number(r.quantidade) || 0) * (Number(r.precoMedio) || 0);
    }, 0);
    return { count: list.length, total };
  }, [data, selected, mode]);

  const allChecked = data.length > 0 && data.every((r) => selected[r._key]);

  const renderRow = ({ item }: { item: AnyRow }) => {
    const isChecked = !!selected[item._key];
    const priceField = mode === 'aportes' ? 'precoUnitario' : 'precoMedio';
    const qtyField = 'quantidade';
    const total = (Number(item[qtyField]) || 0) * (Number(item[priceField]) || 0);

    return (
      <View style={styles.row}>
        <View style={styles.rowHeader}>
          <TouchableOpacity onPress={() => toggle(item._key)} style={styles.checkBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {isChecked ? <CheckSquare size={20} color={theme.colors.primary} /> : <Square size={20} color={theme.colors.textMuted} />}
          </TouchableOpacity>
          <TextInput
            style={styles.tickerInput}
            value={item.ticker}
            autoCapitalize="characters"
            onChangeText={(text) => update(item._key, { ticker: text.toUpperCase().trim() })}
          />
          <Text style={styles.totalText}>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
          <TouchableOpacity onPress={() => remove(item._key)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Trash2 size={16} color={theme.colors.negative} />
          </TouchableOpacity>
        </View>

        {!!item.nome && <Text style={styles.nomeText} numberOfLines={1}>{item.nome}</Text>}

        <View style={styles.rowFields}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Qtd</Text>
            <TextInput
              style={styles.fieldInput}
              value={String(item[qtyField] ?? '')}
              keyboardType="numeric"
              onChangeText={(text) => update(item._key, { [qtyField]: text })}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{mode === 'aportes' ? 'Preço unit.' : 'Preço médio'}</Text>
            <TextInput
              style={styles.fieldInput}
              value={String(item[priceField] ?? '')}
              keyboardType="numeric"
              onChangeText={(text) => update(item._key, { [priceField]: text })}
            />
          </View>
          {mode === 'aportes' && (
            <>
              <TouchableOpacity
                style={[styles.tipoBtn, item.tipo === 'compra' ? styles.tipoCompra : styles.tipoVenda]}
                onPress={() => update(item._key, { tipo: item.tipo === 'compra' ? 'venda' : 'compra' })}
              >
                <Text style={[styles.tipoText, item.tipo === 'compra' ? { color: theme.colors.positive } : { color: theme.colors.negative }]}>
                  {item.tipo === 'compra' ? 'Compra' : 'Venda'}
                </Text>
              </TouchableOpacity>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Data</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={deIsoParaBr(item.dataTransacao)}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const masked = applyDataMask(text);
                    update(item._key, { dataTransacao: deBrParaIso(masked) });
                  }}
                />
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'ativos' ? 'Revisar ativos' : 'Revisar aportes'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <TouchableOpacity onPress={toggleAll}>
              <Text style={styles.summaryText}>
                {allChecked ? 'Desmarcar todos' : 'Selecionar todos'} · {summary.count} selecionado(s)
              </Text>
            </TouchableOpacity>
            <Text style={styles.summaryTotal}>
              {summary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>

          <FlatList
            data={data}
            keyExtractor={(item) => item._key}
            renderItem={renderRow}
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma linha reconhecida.</Text>}
          />

          <Text style={styles.hint}>
            Ticker, categoria e subtipo são derivados automaticamente.
            {mode === 'ativos' ? ' Cada ativo virará uma compra (posição inicial).' : ' As operações vão para o histórico.'}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, (summary.count === 0 || isSaving) && { opacity: 0.5 }]}
              disabled={summary.count === 0 || isSaving}
              onPress={() => onConfirm(data.filter((r) => selected[r._key]))}
            >
              <Text style={styles.confirmText}>
                {isSaving ? 'Salvando...' : `Importar ${summary.count} registro(s)`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeText: {
    color: theme.colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.lightAccent,
    borderRadius: 10,
    marginBottom: 12,
  },
  summaryText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryTotal: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    backgroundColor: theme.colors.cardBg,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkBtn: {
    padding: 2,
  },
  tickerInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    paddingVertical: 4,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  nomeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginLeft: 30,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    alignItems: 'flex-end',
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 10,
    color: theme.colors.text,
    fontSize: 13,
  },
  tipoBtn: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  tipoCompra: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  tipoVenda: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  tipoText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    padding: 30,
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: theme.colors.lightAccent,
    borderColor: theme.colors.border,
    borderWidth: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
