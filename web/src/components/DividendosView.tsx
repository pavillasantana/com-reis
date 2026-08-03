import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';
import { fetchDividendos, createDividendo, deleteDividendo } from '../services/supabaseService';
import { usePremium } from '../hooks/usePremium';
import {
  Plus,
  TrendingUp,
  Trash2,
  Upload,
  CalendarDays,
  BadgeDollarSign,
  Search,
} from 'lucide-react';

interface Dividendo {
  id: string;
  id_usuario: string;
  ticker: string;
  valor: number;
  data_recebimento: string;
  tipo: 'dividendo' | 'juros' | 'cupom' | 'rendimento';
  descricao: string;
}

interface PrevisaoDividendo {
  ticker: string;
  tipo: string;
  tipoEvento: string;
  dataPrevisao: string;
  quantidade: number;
  precoUnitario: number;
  valorLiquido: number;
  instituicao: string;
}

const TIPO_LABELS: Record<string, string> = {
  dividendo: 'Dividendo',
  juros: 'Juros s/ Capital',
  cupom: 'Cupom (FII)',
  rendimento: 'Rendimento (RF)',
};

const TIPO_OPTIONS = [
  { value: 'dividendo', label: 'Dividendo' },
  { value: 'juros', label: 'Juros sobre Capital' },
  { value: 'cupom', label: 'Cupom (FII)' },
  { value: 'rendimento', label: 'Rendimento (RF)' },
];

export const DividendosView: React.FC<{ id_usuario?: string | null }> = ({ id_usuario }) => {
  const toast = useToast();
  const { verificarAcessoImportacao } = usePremium();

  const [dividendos, setDividendos] = useState<Dividendo[]>([]);
  const [previsoes, setPrevisoes] = useState<PrevisaoDividendo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'historico' | 'previsao'>('historico');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formTicker, setFormTicker] = useState('');
  const [formTipo, setFormTipo] = useState<'dividendo' | 'juros' | 'cupom' | 'rendimento'>('dividendo');
  const [formValor, setFormValor] = useState('');
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0]);
  const [formDescricao, setFormDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; ticker: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredDividendos = useMemo(() => {
    if (!searchQuery.trim()) return dividendos;
    const q = searchQuery.toLowerCase();
    return dividendos.filter(d =>
      d.ticker.toLowerCase().includes(q) ||
      d.descricao.toLowerCase().includes(q)
    );
  }, [dividendos, searchQuery]);

  const carregarDividendos = async () => {
    setLoading(true);
    const { data } = await fetchDividendos();
    if (data) setDividendos(data);
    setLoading(false);
  };

  useEffect(() => {
    carregarDividendos();
    const saved = localStorage.getItem('comreis_previsao_dividendos');
    if (saved) {
      try { setPrevisoes(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const totalRecebido = useMemo(() =>
    dividendos.reduce((s, d) => s + d.valor, 0),
    [dividendos]
  );

  const totalPrevisto = useMemo(() =>
    previsoes.reduce((s, p) => s + p.valorLiquido, 0),
    [previsoes]
  );

  const dividendosPorMes = useMemo(() => {
    const mapa: Record<string, { recebido: number; previsto: number }> = {};
    for (const d of dividendos) {
      const chave = d.data_recebimento.substring(0, 7);
      if (!mapa[chave]) mapa[chave] = { recebido: 0, previsto: 0 };
      mapa[chave].recebido += d.valor;
    }
    for (const p of previsoes) {
      const chave = p.dataPrevisao.substring(0, 7);
      if (!mapa[chave]) mapa[chave] = { recebido: 0, previsto: 0 };
      mapa[chave].previsto += p.valorLiquido;
    }
    return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b));
  }, [dividendos, previsoes]);

  const handleAddDividendo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTicker.trim() || !formValor || !formData) {
      toast.warning('Campos obrigatórios', 'Preencha ticker, valor e data.');
      return;
    }
    const valorNum = parseFloat(formValor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.warning('Valor inválido', 'Digite um valor maior que zero.');
      return;
    }
    setSaving(true);
    const { error } = await createDividendo({
      id_usuario: id_usuario || '',
      ticker: formTicker.trim().toUpperCase(),
      valor: valorNum,
      data_recebimento: formData,
      tipo: formTipo,
      descricao: formDescricao || `Provento ${formTicker.trim().toUpperCase()}`,
    });
    setSaving(false);
    if (error) {
      toast.error('Erro', error);
      return;
    }
    toast.success('Provento registrado!', `${formTicker.trim().toUpperCase()} - ${formatValor(valorNum)}`);
    setShowAddModal(false);
    setFormTicker('');
    setFormValor('');
    setFormDescricao('');
    carregarDividendos();
  };

  const handleDeleteDividendo = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    const { error } = await deleteDividendo(id);
    if (error) {
      toast.error('Erro', error);
      setDeleteConfirm(null);
      return;
    }
    setDividendos(prev => prev.filter(d => d.id !== id));
    toast.success('Provento removido');
    setDeleteConfirm(null);
  };

  const handleImportPrevisao = () => {
    if (!verificarAcessoImportacao()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      try {
        const buffer = await file.arrayBuffer();
        const { parseDividendXLSX } = await import('../utils/importer');
        const result = parseDividendXLSX(buffer);
        if (result.length === 0) {
          toast.warning('Nenhum dado encontrado', 'Verifique o formato do arquivo.');
          return;
        }
        setPrevisoes(result);
        localStorage.setItem('comreis_previsao_dividendos', JSON.stringify(result));
        toast.success('Previsão importada!', `${result.length} registro(s) de proventos futuros.`);
      } catch (err: any) {
        toast.error('Erro ao importar', err.message || 'Falha ao processar o arquivo.');
      }
    };
    input.click();
  };

  const formatValor = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'dividendo': return 'var(--accent-green)';
      case 'juros': return 'var(--accent-blue)';
      case 'cupom': return '#FFB400';
      case 'rendimento': return 'var(--accent-cyan)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <BadgeDollarSign size={28} color="var(--accent-green)" />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Proventos
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>
          Histórico e previsão de dividendos, JCP, cupons e rendimentos
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Card style={{ flex: 1, minWidth: '180px', padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Total Recebido
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-green)', marginTop: '8px' }}>
            + {formatValor(totalRecebido)}
          </div>
        </Card>
        <Card style={{ flex: 1, minWidth: '180px', padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Previsão Futura
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '8px' }}>
            ~ {formatValor(totalPrevisto)}
          </div>
        </Card>
        <Card style={{ flex: 1, minWidth: '180px', padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Proventos Registrados
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--modal-text)', marginTop: '8px' }}>
            {dividendos.length}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setTab('historico')}
            style={{
              padding: '8px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer',
              background: tab === 'historico' ? 'var(--accent-green)' : 'transparent',
              color: tab === 'historico' ? '#fff' : 'var(--text-secondary)',
              border: tab === 'historico' ? 'none' : '1px solid var(--card-border)',
            }}
          >
            <TrendingUp size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Histórico
          </button>
          <button
            onClick={() => setTab('previsao')}
            style={{
              padding: '8px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer',
              background: tab === 'previsao' ? 'var(--accent-blue)' : 'transparent',
              color: tab === 'previsao' ? '#fff' : 'var(--text-secondary)',
              border: tab === 'previsao' ? 'none' : '1px solid var(--card-border)',
            }}
          >
            <CalendarDays size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Previsão
          </button>
        </div>
        <div style={{ flex: 1 }} />
        {tab === 'previsao' && (
          <button
            onClick={handleImportPrevisao}
            style={{
              background: 'rgba(0,210,255,0.1)', border: 'none',
              color: 'var(--accent-blue)', padding: '8px 16px',
              borderRadius: '10px', cursor: 'pointer', fontWeight: 700,
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <Upload size={14} />
            Importar Previsão (XLSX/CSV)
          </button>
        )}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'rgba(0,230,118,0.1)', border: 'none',
            color: 'var(--accent-green)', padding: '8px 16px',
            borderRadius: '10px', cursor: 'pointer', fontWeight: 700,
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <Plus size={14} />
          Registrar Provento
        </button>
      </div>

      {tab === 'historico' && (
        <Card>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Buscar por ticker ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: 'var(--modal-text)', fontSize: '0.9rem', outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  X
                </button>
              )}
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 120px 130px 100px 40px',
            gap: '8px',
            padding: '12px 24px',
            background: 'var(--bg-color)',
            borderBottom: '1px solid var(--card-border)',
            fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}>
            <span>Data</span>
            <span>Ticker</span>
            <span>Tipo</span>
            <span style={{ textAlign: 'right' }}>Valor</span>
            <span style={{ textAlign: 'right' }}>Descrição</span>
            <span />
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Carregando...</div>
            ) : filteredDividendos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <BadgeDollarSign size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0 }}>Nenhum provento registrado.</p>
                <PrimaryButton onClick={() => setShowAddModal(true)} style={{ marginTop: '16px' }}>
                  <Plus size={14} /> Registrar Primeiro Provento
                </PrimaryButton>
              </div>
            ) : (
              filteredDividendos.map((div) => (
                <div
                  key={div.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 120px 130px 100px 40px',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '12px 24px',
                    borderBottom: '1px solid var(--card-border)',
                    fontSize: '0.85rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {div.data_recebimento}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                    {div.ticker}
                  </span>
                  <span style={{ color: getTipoColor(div.tipo), fontWeight: 600, fontSize: '0.75rem' }}>
                    {TIPO_LABELS[div.tipo] || div.tipo}
                  </span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-green)' }}>
                    + {formatValor(div.valor)}
                  </span>
                  <span style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {div.descricao}
                  </span>
                  <button
                    onClick={() => setDeleteConfirm({ id: div.id, ticker: div.ticker })}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', padding: '4px',
                    }}
                    title="Remover provento"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {tab === 'previsao' && (
        <Card>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              Previsão de Proventos
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {previsoes.length > 0
                ? `${previsoes.length} proventos futuros importados`
                : 'Importe um extrato de proventos (XLSX/CSV) para ver a previsão.'}
            </p>
          </div>
          {previsoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <CalendarDays size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0 }}>Nenhuma previsão importada.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                Use o botão "Importar Previsão" para carregar um extrato de proventos futuros.
              </p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 80px 70px 120px 100px',
                gap: '8px',
                padding: '12px 24px',
                background: 'var(--bg-color)',
                borderBottom: '1px solid var(--card-border)',
                fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}>
                <span>Previsão</span>
                <span>Ativo</span>
                <span>Qtd</span>
                <span>PU</span>
                <span>Valor Líquido</span>
                <span>Evento</span>
              </div>
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {previsoes.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px 1fr 80px 70px 120px 100px',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '12px 24px',
                      borderBottom: '1px solid var(--card-border)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ color: 'var(--accent-blue)', fontSize: '0.8rem', fontWeight: 600 }}>
                      {p.dataPrevisao}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--modal-text)' }}>
                      {p.ticker}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {p.quantidade}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {formatValor(p.precoUnitario)}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-green)', textAlign: 'right' }}>
                      + {formatValor(p.valorLiquido)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.tipoEvento}
                    </span>
                  </div>
                ))}
              </div>
              {previsoes.length > 0 && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>Total Previsto:</span>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-green)' }}>
                      + {formatValor(totalPrevisto)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {dividendosPorMes.length > 0 && (
        <Card style={{ marginTop: '20px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              Proventos por Mês
            </h3>
          </div>
          <div style={{ padding: '16px 24px' }}>
            {dividendosPorMes.map(([mes, valores]) => (
              <div
                key={mes}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--card-border)',
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ fontWeight: 600 }}>{mes}</span>
                <div style={{ display: 'flex', gap: '20px' }}>
                  {valores.recebido > 0 && (
                    <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
                      Recebido: + {formatValor(valores.recebido)}
                    </span>
                  )}
                  {valores.previsto > 0 && (
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                      Previsto: ~ {formatValor(valores.previsto)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showAddModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1200, padding: '16px',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '20px',
              width: '100%', maxWidth: '460px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              padding: '28px',
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700 }}>
              Registrar Provento
            </h3>
            <form onSubmit={handleAddDividendo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Ativo (Ticker)
                </label>
                <input
                  type="text"
                  placeholder="PETR4, MXRF11, etc."
                  value={formTicker}
                  onChange={(e) => setFormTicker(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                    borderRadius: '10px', color: 'var(--modal-text)',
                    fontSize: '0.9rem', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Tipo
                </label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value as any)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                    borderRadius: '10px', color: 'var(--modal-text)',
                    fontSize: '0.9rem', outline: 'none',
                  }}
                >
                  {TIPO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Valor Recebido (R$)
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={formValor}
                  onChange={(e) => setFormValor(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                    borderRadius: '10px', color: 'var(--modal-text)',
                    fontSize: '0.9rem', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Data de Recebimento
                </label>
                <input
                  type="date"
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                    borderRadius: '10px', color: 'var(--modal-text)',
                    fontSize: '0.9rem', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dividendos PETR4 referente ao mês"
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                    borderRadius: '10px', color: 'var(--modal-text)',
                    fontSize: '0.9rem', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: 'transparent', border: '1px solid var(--card-border)',
                    color: 'var(--text-secondary)', padding: '10px 20px',
                    borderRadius: '10px', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Cancelar
                </button>
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Registrar'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Remover Provento"
        message={`Deseja mesmo remover o provento de ${deleteConfirm?.ticker || ''}?`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleDeleteDividendo}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
