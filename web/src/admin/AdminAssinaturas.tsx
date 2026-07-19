import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, RefreshCw, Ban, CheckCircle } from 'lucide-react';

interface Assinatura {
  id: string;
  id_usuario: string;
  status: string;
  valor_pago: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  data_criacao: string | null;
  usuarios?: { email: string; nome_completo: string | null } | null;
}

export function AdminAssinaturas() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'active' | 'expired' | 'cancelled'>('todos');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { loadAssinaturas(); }, []);

  async function loadAssinaturas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('assinaturas')
      .select('*, usuarios(email, nome_completo)')
      .order('data_inicio', { ascending: false });

    if (data && !error) {
      setAssinaturas(data as Assinatura[]);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    const { error } = await supabase
      .from('assinaturas')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setAssinaturas(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
    setUpdating(null);
  }

  const filtered = assinaturas.filter(a => {
    if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return a.usuarios?.email?.toLowerCase().includes(q) ||
        a.usuarios?.nome_completo?.toLowerCase().includes(q) ||
        a.id_usuario.toLowerCase().includes(q);
    }
    return true;
  });

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'admin-badge-active';
      case 'expired': return 'admin-badge-expired';
      case 'cancelled': return 'admin-badge-cancelled';
      default: return 'admin-badge-free';
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-spinner" /> Carregando assinaturas...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Assinaturas</h2>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.88rem', margin: '4px 0 0' }}>
            {filtered.length} assinatura(s)
          </p>
        </div>
        <button onClick={loadAssinaturas} className="admin-btn admin-btn-secondary">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-search-wrapper" style={{ flex: 1, maxWidth: '320px' }}>
            <Search />
            <input
              className="admin-input"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por email ou ID..."
            />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['todos', 'active', 'expired', 'cancelled'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`admin-btn admin-btn-sm ${filtroStatus === s ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              >
                {s === 'todos' ? 'Todas' : s === 'active' ? 'Ativas' : s === 'expired' ? 'Expiradas' : 'Canceladas'}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card-body" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--admin-text-muted)' }}>
                    Nenhuma assinatura encontrada.
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.usuarios?.email || a.id_usuario}</div>
                    {a.usuarios?.nome_completo && (
                      <div className="muted">{a.usuarios.nome_completo}</div>
                    )}
                  </td>
                  <td>
                    <span className={`admin-badge ${statusBadgeClass(a.status)}`}>
                      {a.status === 'active' ? '● Ativa' : a.status === 'expired' ? '○ Expirada' : '✕ Cancelada'}
                    </span>
                  </td>
                  <td>
                    {a.valor_pago != null
                      ? `R$ ${a.valor_pago.toFixed(2).replace('.', ',')}`
                      : '—'}
                  </td>
                  <td className="muted">{formatDate(a.data_inicio)}</td>
                  <td className="muted">{formatDate(a.data_fim)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {a.status !== 'active' && (
                        <button
                          onClick={() => updateStatus(a.id, 'active')}
                          disabled={updating === a.id}
                          className="admin-btn admin-btn-sm admin-btn-secondary"
                          title="Reativar"
                          style={{ gap: '4px' }}
                        >
                          <CheckCircle size={11} color="var(--admin-green)" /> Ativar
                        </button>
                      )}
                      {a.status === 'active' && (
                        <button
                          onClick={() => updateStatus(a.id, 'cancelled')}
                          disabled={updating === a.id}
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          title="Cancelar"
                          style={{ gap: '4px' }}
                        >
                          <Ban size={11} /> Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
