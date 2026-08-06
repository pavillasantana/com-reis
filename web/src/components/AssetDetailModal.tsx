import React, { useState, useMemo, useEffect } from 'react';
import { X, Trash2, Check, Calendar, Tag } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { deleteTransacaoAtivo, updateTransacoesAtivosByTicker } from '../services/supabaseService';
import type { TransacaoAtivo } from '../services/supabaseService';
import type { StockQuote } from '../hooks/useInvestments';
import { getTickerName, getCategoriaInfo, getNomeSubcategoria, CATEGORIAS_INVESTIMENTO, INDICES_RENDA_FIXA, formatIndexacao } from '../utils/investmentCategories';
import { useToast } from './Toast';
import { useI18n } from '../i18n';
import { ConfirmModal } from './ConfirmModal';

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
  const [bulkConfirm, setBulkConfirm] = useState<{ title: string; message: string } | null>(null);
  const [catId, setCatId] = useState('');
  const [subId, setSubId] = useState('');
  const [indice, setIndice] = useState('');
  const [percentual, setPercentual] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
    const tx = allTxs[0];
    setCatId(tx?.categoria || '');
    setSubId(tx?.subcategoria || '');
    setIndice(tx?.indice || '');
    setPercentual(tx?.percentual_indexacao != null ? String(tx.percentual_indexacao) : '');
    setVencimento(tx?.data_vencimento || '');
  }, [allTxs]);

  const handleSaveCategoria = async () => {
    if (!catId) {
      toast.warning('Selecione uma categoria', 'Escolha a categoria antes de salvar.');
      return;
    }
    setSavingCat(true);
    const pct = percentual.trim() === '' ? undefined : parseFloat(percentual.replace(',', '.'));
    const { error } = await updateTransacoesAtivosByTicker(ticker, {
      categoria: catId,
      subcategoria: subId || undefined,
      indice: indice || undefined,
      percentual_indexacao: Number.isFinite(pct as number) ? pct : undefined,
      data_vencimento: vencimento || undefined,
    });
    setSavingCat(false);
    if (error) {
      toast.error(`Falha ao atualizar categoria: ${error}`);
    } else {
      toast.success('Categoria atualizada para todos os lotes.');
      onUpdate();
    }
  };

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
    const total = selectedIds.size;
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
      toast.success(`${total} lote(s) excluído(s)!`);
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
              {firstTx?.emissor && ` • ${firstTx.emissor}`}
              {firstTx && formatIndexacao(firstTx.indice, firstTx.percentual_indexacao, firstTx.data_vencimento) && (
                <span style={{
                  display: 'inline-block', marginLeft: '8px', padding: '2px 8px', borderRadius: '10px',
                  background: 'rgba(16,69,161,0.08)', color: ACCENT_BLUE, fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {formatIndexacao(firstTx.indice, firstTx.percentual_indexacao, firstTx.data_vencimento)}
                </span>
              )}
              {firstTx?.forma && (
                <span style={{
                  display: 'inline-block', marginLeft: '6px', padding: '2px 8px', borderRadius: '10px',
                  background: 'rgba(16,185,129,0.1)', color: '#047857', fontSize: '0.7rem', fontWeight: 700,
                  textTransform: 'capitalize',
                }}>
                  {firstTx.forma === 'pos_fixado' ? 'Pós-fixado' : firstTx.forma === 'hibrido' ? 'Híbrido' : 'Prefixado'}
                </span>
              )}
              {firstTx?.liquidez_diaria && (
                <span style={{
                  display: 'inline-block', marginLeft: '6px', padding: '2px 8px', borderRadius: '10px',
                  background: 'rgba(14,165,233,0.1)', color: '#0369A1', fontSize: '0.7rem', fontWeight: 700,
                }}>
                  Liquidez diária
                </span>
              )}
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

            <div style={{
              marginBottom: '20px', padding: '16px',
              background: 'rgba(16,69,161,0.04)', border: `1px solid rgba(16,69,161,0.15)`,
              borderRadius: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Tag size={14} color={ACCENT_BLUE} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: CLEAN_TEXT, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Categoria do ativo
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <select value={catId} onChange={e => { setCatId(e.target.value); setSubId(''); }} style={{
                  background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
                  borderRadius: '10px', padding: '9px 12px', color: CLEAN_TEXT, fontSize: '0.82rem', cursor: 'pointer',
                }}>
                  <option value="">Selecione a categoria...</option>
                  {CATEGORIAS_INVESTIMENTO.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                </select>
                <select value={subId} onChange={e => setSubId(e.target.value)} style={{
                  background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
                  borderRadius: '10px', padding: '9px 12px', color: CLEAN_TEXT, fontSize: '0.82rem', cursor: 'pointer',
                }} disabled={!catId}>
                  <option value="">Subcategoria...</option>
                  {getCategoriaInfo(catId)?.subcategorias.map(sub => <option key={sub.id} value={sub.id}>{sub.nome}</option>)}
                </select>
              </div>
              {catId === 'renda_fixa_br' && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: CLEAN_TEXT_MUTED, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Indexação
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <select value={indice} onChange={e => setIndice(e.target.value)} style={{
                      background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
                      borderRadius: '10px', padding: '9px 12px', color: CLEAN_TEXT, fontSize: '0.82rem', cursor: 'pointer',
                    }}>
                      <option value="">Índice...</option>
                      {INDICES_RENDA_FIXA.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={indice === 'ipca' || indice === 'prefixado' ? 'Taxa a.a.' : '% do índice'}
                      value={percentual}
                      onChange={e => setPercentual(e.target.value)}
                      style={{
                        background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
                        borderRadius: '10px', padding: '9px 12px', color: CLEAN_TEXT, fontSize: '0.82rem',
                      }}
                    />
                    <input
                      type="date"
                      value={vencimento}
                      onChange={e => setVencimento(e.target.value)}
                      style={{
                        background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
                        borderRadius: '10px', padding: '9px 12px', color: CLEAN_TEXT, fontSize: '0.82rem',
                      }}
                    />
                  </div>
                  {indice && formatIndexacao(indice, percentual === '' ? null : parseFloat(percentual.replace(',', '.')), vencimento) && (
                    <div style={{ marginTop: '8px', fontSize: '0.78rem', color: ACCENT_BLUE, fontWeight: 700 }}>
                      {formatIndexacao(indice, percentual === '' ? null : parseFloat(percentual.replace(',', '.')), vencimento)}
                    </div>
                  )}
                </div>
              )}
              <button onClick={handleSaveCategoria} disabled={savingCat} style={{
                background: ACCENT_BLUE, border: 'none', color: '#fff',
                padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.8rem', opacity: savingCat ? 0.6 : 1,
              }}>
                {savingCat ? 'Salvando...' : 'Salvar (todos os lotes)'}
              </button>
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
              <button onClick={() => {
                const total = selectedIds.size;
                setBulkConfirm({
                  title: 'Excluir Lotes',
                  message: `Excluir permanentemente ${total} lote(s)?`,
                });
              }} style={{
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

      {bulkConfirm && (
        <ConfirmModal
          isOpen={true}
          title={bulkConfirm.title}
          message={bulkConfirm.message}
          onConfirm={() => { setBulkConfirm(null); handleBulkDelete(); }}
          onCancel={() => setBulkConfirm(null)}
        />
      )}
    </div>
  );
};
