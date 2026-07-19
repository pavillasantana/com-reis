import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, Trash2, X, Check, Search
} from 'lucide-react';
import { Card } from './Card';
import { formatCurrency } from '../utils/currency';
import {
  fetchBensPatrimonio, createBemPatrimonio, deleteBemPatrimonio
} from '../services/supabaseService';

interface Bem {
  id: string;
  id_espaco: string;
  nome: string;
  valor_compra: number;
  data_aquisicao: string;
  categoria: string;
  descricao: string;
}

interface Props {
  moedaBase: string;
  idEspaco: string | null;
}

const CATEGORIAS = ['Eletrônicos', 'Móveis', 'Veículos', 'Imóveis', 'Equipamentos', 'Estoque', 'Ferramentas', 'Outros'];

export const InventarioView: React.FC<Props> = ({ moedaBase, idEspaco }) => {

  const [bens, setBens] = useState<Bem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [fNome, setFNome] = useState('');
  const [fValor, setFValor] = useState('');
  const [fData, setFData] = useState(new Date().toISOString().split('T')[0]);
  const [fCategoria, setFCategoria] = useState('Outros');
  const [fDesc, setFDesc] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await fetchBensPatrimonio();
      if (data) setBens(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() =>
    bens.filter(b => b.nome.toLowerCase().includes(busca.toLowerCase())),
    [bens, busca]
  );

  const totalPatrimonio = bens.reduce((s, b) => s + b.valor_compra, 0);

  const handleAdd = async () => {
    if (!fNome.trim() || !fValor || !idEspaco) return;
    const val = parseFloat(fValor);
    if (isNaN(val) || val <= 0) return;
    const { data } = await createBemPatrimonio({
      id_espaco: idEspaco,
      nome: fNome.trim(),
      valor_compra: val,
      data_aquisicao: fData,
      categoria: fCategoria,
      descricao: fDesc.trim(),
    });
    if (data) setBens(prev => [data, ...prev]);
    setModalOpen(false);
    setFNome(''); setFValor(''); setFDesc(''); setFCategoria('Outros');
  };

  const handleDelete = async (id: string) => {
    await deleteBemPatrimonio(id);
    setBens(prev => prev.filter(b => b.id !== id));
    setDeleteConfirm(null);
  };

  const inputSt: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)',
    fontSize: '0.88rem', width: '100%', outline: 'none',
  };

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px'}}>
            <Package size={24} style={{ verticalAlign: 'middle', marginRight: '12px' }} />
            Inventário de Bens
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>
            Registre bens físicos, equipamentos e estoque para controle patrimonial.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'linear-gradient(135deg, #00E5FF, #0070FF)', border: 'none', borderRadius: '12px', color: '#000', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
          <Plus size={16} /> Novo Bem
        </button>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar bem..." style={{ ...inputSt, paddingLeft: '34px' }} />
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Total: <strong style={{ color: 'var(--accent-blue)' }}>{formatCurrency(totalPatrimonio, moedaBase)}</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Package size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Nenhum bem registrado ainda.<br />Clique em "Novo Bem" para começar.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {filtered.map(bem => (
              <div key={bem.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{bem.nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {bem.categoria} | {bem.data_aquisicao}
                    </div>
                    {bem.descricao && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{bem.descricao}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-blue)' }}>{formatCurrency(bem.valor_compra, moedaBase)}</span>
                    {deleteConfirm === bem.id ? (
                      <span style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleDelete(bem.id)} style={{ background: 'rgba(255,82,82,0.15)', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#FF5252' }}><Check size={12} /></button>
                        <button onClick={() => setDeleteConfirm(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={12} /></button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(bem.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,10,18,0.88)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
          <div style={{ background: 'linear-gradient(160deg, #161D2E 0%, #0F1625 100%)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Cadastrar Novo Bem</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nome do Bem</label>
            <input value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Ex: Notebook Dell XPS" style={{ ...inputSt, marginBottom: '16px' }} />

            <div className="rg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Valor de Compra</label>
                <input type="number" min="0" step="0.01" value={fValor} onChange={e => setFValor(e.target.value)} placeholder="0,00" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Data de Aquisição</label>
                <input type="date" value={fData} onChange={e => setFData(e.target.value)} style={inputSt} />
              </div>
            </div>

            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Categoria</label>
            <select value={fCategoria} onChange={e => setFCategoria(e.target.value)} style={{ ...inputSt, marginBottom: '16px', cursor: 'pointer' }}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Descrição (opcional)</label>
            <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Ex: Número de série, estado de conservação..." style={{ ...inputSt, marginBottom: '24px' }} />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}>Cancelar</button>
              <button onClick={handleAdd} disabled={!fNome || !fValor} style={{ flex: 1.5, padding: '12px', background: 'linear-gradient(135deg, #00E5FF, #0070FF)', border: 'none', borderRadius: '12px', cursor: 'pointer', color: '#000', fontWeight: 700, opacity: (!fNome || !fValor) ? 0.5 : 1 }}>
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
