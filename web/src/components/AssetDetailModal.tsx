import React, { useState, useMemo } from 'react';
import { X, Trash2, Check, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { deleteTransacaoAtivo } from '../services/supabaseService';
import type { TransacaoAtivo } from '../services/supabaseService';
import type { StockQuote } from '../hooks/useInvestments';
import { getTickerName, getCategoriaInfo, getNomeSubcategoria } from '../utils/investmentCategories';
import { useToast } from './Toast';
import { useI18n } from '../i18n';

interface AssetDetailModalProps {
  ticker: string;
  txs: TransacaoAtivo[];
  quotes: StockQuote[];
  moedaBase: string;
  dividendosTotal: number;
  onClose: () => void;
  onUpdate: () => void;
}

const CLEAN_CARD = '#FFFFFF';
const CLEAN_TEXT = '#1A2744';
const CLEAN_TEXT_SECONDARY = '#64748B';
const CLEAN_TEXT_MUTED = '#94A3B8';
const CLEAN_BORDER = '#E2E8F0';
const ACCENT_BLUE = '#1045A1';
const ACCENT_GREEN = '#10B981';
const ACCENT_RED = '#EF4444';
const ACCENT_CYAN = '#0EA5E9';

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  ticker, txs, quotes, moedaBase, dividendosTotal, onClose, onUpdate,
}) => {
  const { t } = useI18n();
  const toast = useToast();

  const allTxs = useMemo(() =>
    txs.filter(t => t.ticker.toUpperCase() === ticker.toUpperCase())
      .sort((a, b) => b.data_transacao.localeCompare(a.data_transacao)),
    [txs, ticker]
  );

  const quote = quotes.find(q => q.symbol.toUpperCase() === ticker.toUpperCase());

  const { totalInvestido, precoMedio, qtdAtual } = useMemo(() => {
    let qtd = 0, custo = 0, vendaTotal = 0;
    allTxs.forEach(t => {
      const vol = t.quantidade * t.preco_unitario;
      if (t.tipo === 'compra') { qtd += t.quantidade; custo += vol; }
      else { qtd -= t.quantidade; vendaTotal += vol; }
    });
    const pm = qtd > 0 ? custo / qtd : 0;
    return {
      totalInvestido: custo,
      precoMedio: pm,
      qtdAtual: qtd,
    };
  }, [allTxs]);

  const valorAtual = quote ? quote.regularMarketPrice * qtdAtual : totalInvestido;
  const lucroPrej = valorAtual + dividendosTotal - totalInvestido;
  const retornoPercent = totalInvestido > 0 ? (lucroPrej / totalInvestido) * 100 : 0;

  const firstTx = allTxs[0];
  const catInfo = firstTx?.categoria ? getCategoriaInfo(firstTx.categoria) : null;

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string) => {
    if (!id.startsWith('local-')) {
      await deleteTransacaoAtivo(id);
    }
    onUpdate();
    setDeleteConfirm(null);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Excluir permanentemente ${selectedIds.size} lote(s)?`)) return;

    let erros = 0;
    for (const id of selectedIds) {
      if (!id.startsWith('local-')) {
        const { error } = await deleteTransacaoAtivo(id);
        if (error) erros++;
      }
    }

    if (erros > 0) {
      toast.error(`Falha ao excluir ${erros} lote(s).`);
    } else {
      toast.success(`${selectedIds.size} lote(s) excluído(s)!`);
    }
    setSelectedIds(new Set());
    onUpdate();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px',
    }}>
      <div style={{
        background: CLEAN_CARD, borderRadius: '20px', width: '100%', maxWidth: '640px',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px 28px', borderBottom: `1px solid ${CLEAN_BORDER}`,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {catInfo && (
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: catInfo.cor, flexShrink: 0,
                }} />
              )}
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: ACCENT_BLUE }}>
                {ticker}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: CLEAN_TEXT_MUTED }}>
              {getTickerName(ticker) || ticker}
              {firstTx?.categoria && ` • ${getNomeSubcategoria(firstTx.categoria, firstTx.subcategoria || '')}`}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
            borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: CLEAN_TEXT_MUTED,
          }}><X size={16} /></button>
        </div>

        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED, fontWeight: 600, marginBottom: '4px' }}>
                {t('web_invest_value_invested')}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: CLEAN_TEXT }}>
                {formatCurrency(totalInvestido, moedaBase)}
              </div>
            </div>
            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED, fontWeight: 600, marginBottom: '4px' }}>
                {t('web_invest_current_value')}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: ACCENT_GREEN }}>
                {formatCurrency(valorAtual, moedaBase)}
              </div>
            </div>
            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED, fontWeight: 600, marginBottom: '4px' }}>
                {t('web_invest_detail_return')}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: lucroPrej >= 0 ? ACCENT_GREEN : ACCENT_RED }}>
                {lucroPrej >= 0 ? '+' : ''}{formatCurrency(lucroPrej, moedaBase)}
                <span style={{ fontSize: '0.78rem', marginLeft: '6px' }}>
                  ({retornoPercent >= 0 ? '+' : ''}{retornoPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: CLEAN_TEXT_MUTED, fontWeight: 600, marginBottom: '4px' }}>
                {t('web_invest_detail_dividends')}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: ACCENT_CYAN }}>
                {formatCurrency(dividendosTotal, moedaBase)}
              </div>
            </div>
          </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.82rem', color: CLEAN_TEXT_SECONDARY, marginBottom: '8px' }}>
                <strong>{qtdAtual.toFixed(4)}</strong> cotas • PM <strong>{formatCurrency(precoMedio, moedaBase)}</strong>
                {quote && (
                  <span> • Cotação atual <strong>{formatCurrency(quote.regularMarketPrice, moedaBase)}</strong></span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: CLEAN_TEXT }}>
                {allTxs.length} {t('web_invest_detail_lots')}
              </h3>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkDelete} style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
                color: ACCENT_RED, fontWeight: 700, fontSize: '0.78rem',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Trash2 size={13} /> Excluir ({selectedIds.size})
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allTxs.map(tx => {
              const isCompra = tx.tipo === 'compra';
              const total = tx.quantidade * tx.preco_unitario;
              const selected = selectedIds.has(tx.id);
              return (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', background: selected ? 'rgba(16,69,161,0.04)' : '#F8FAFC',
                  borderRadius: '12px', border: selected ? `1px solid ${ACCENT_BLUE}30` : `1px solid ${CLEAN_BORDER}`,
                  cursor: 'pointer', transition: 'all 0.12s',
                }} onClick={() => toggleSelection(tx.id)}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '4px',
                    border: selected ? 'none' : `2px solid ${CLEAN_TEXT_MUTED}`,
                    background: selected ? ACCENT_BLUE : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}>
                    {selected && <Check size={12} color="#fff" />}
                  </div>
                  <div style={{
                    padding: '4px 8px', borderRadius: '6px',
                    background: isCompra ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: isCompra ? ACCENT_RED : ACCENT_GREEN,
                    fontWeight: 700, fontSize: '0.72rem',
                    flexShrink: 0,
                  }}>
                    {isCompra ? 'COMPRA' : 'VENDA'}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: CLEAN_TEXT }}>
                      {tx.quantidade.toFixed(4)} {tx.ticker}
                    </span>
                    <span style={{ color: CLEAN_TEXT_SECONDARY, fontSize: '0.8rem' }}>
                      {formatCurrency(tx.preco_unitario, moedaBase)}/un
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isCompra ? ACCENT_RED : ACCENT_GREEN }}>
                      {isCompra ? '-' : '+'} {formatCurrency(total, moedaBase)}
                    </span>
                    <span style={{ color: CLEAN_TEXT_MUTED, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} /> {tx.data_transacao}
                    </span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm(tx.id); }} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: CLEAN_TEXT_MUTED, padding: '4px',
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
        }}>
          <div style={{
            background: CLEAN_CARD, borderRadius: '16px', padding: '28px', maxWidth: '360px',
            textAlign: 'center',
          }}>
              <p style={{ color: CLEAN_TEXT, fontWeight: 700, marginBottom: '20px' }}>
                {t('web_invest_detail_delete_lot_confirm')}
              </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                padding: '10px 20px', borderRadius: '10px', border: `1px solid ${CLEAN_BORDER}`,
                background: 'transparent', cursor: 'pointer', color: CLEAN_TEXT_SECONDARY, fontWeight: 600,
              }}>Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: ACCENT_RED, cursor: 'pointer', color: '#fff', fontWeight: 700,
              }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
