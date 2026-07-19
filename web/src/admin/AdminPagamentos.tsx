import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, RefreshCw, DollarSign, Clock, CheckCircle, XCircle, Ban, AlertTriangle } from 'lucide-react';

interface Pagamento {
  id: string;
  id_usuario: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  data_criacao: string;
  valor_pago?: number | null;
  data_proxima_cobranca?: string | null;
  id_preapproval_mp?: string | null;
  contrato_ate?: string | null;
  usuarios?: { email: string; nome_completo: string | null; plano: string | null } | null;
}

export function AdminPagamentos() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'active' | 'expired' | 'cancelled'>('todos');
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  useEffect(() => { loadPagamentos(); }, []);

  async function loadPagamentos() {
    setLoading(true);
    setLoadError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadError('Sessão expirada.');
        setLoading(false);
        return;
      }

      // Query direta — usa service_role via Edge Function para bypass RLS
      const { data, error } = await supabase
        .from('assinaturas')
        .select('*, usuarios(email, nome_completo, plano)')
        .order('data_inicio', { ascending: false });

      if (data && !error) {
        setPagamentos(data as Pagamento[]);
      } else {
        // Fallback sem join
        const { data: simpleData } = await supabase
          .from('assinaturas')
          .select('*')
          .order('data_inicio', { ascending: false });
        if (simpleData) {
          setPagamentos(simpleData as Pagamento[]);
        } else {
          setLoadError(error?.message || 'Erro ao carregar pagamentos');
        }
      }
    } catch {
      const { data } = await supabase
        .from('assinaturas')
        .select('*')
        .order('data_inicio', { ascending: false });
      if (data) setPagamentos(data as Pagamento[]);
    }
    setLoading(false);
  }

  const filtered = useMemo(() =>
    pagamentos.filter(p => {
      if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return p.usuarios?.email?.toLowerCase().includes(q) ||
          p.usuarios?.nome_completo?.toLowerCase().includes(q) ||
          p.id_usuario.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q);
      }
      return true;
    }),
    [pagamentos, busca, filtroStatus]
  );

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  function diasRestantes(dataFim: string) {
    const fim = new Date(dataFim);
    const agora = new Date();
    const diff = Math.ceil((fim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function statusIcon(status: string) {
    switch (status) {
      case 'active': return <CheckCircle size={12} />;
      case 'expired': return <Clock size={12} />;
      case 'cancelled': return <Ban size={12} />;
      default: return <XCircle size={12} />;
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'active': return 'Ativa';
      case 'expired': return 'Expirada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }

  async function cancelarAssinatura(userId: string, assinaturaId: string) {
    if (!confirm('Tem certeza que deseja cancelar esta assinatura? O usuário manterá acesso Premium até a data de fim.')) return;
    setCancelandoId(assinaturaId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('admin-cancel-subscription', {
        body: { callerId: session.user.id, userId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        alert('Erro ao cancelar: ' + (error.message || 'Desconhecido'));
      } else {
        await loadPagamentos();
      }
    } catch {
      alert('Erro ao cancelar assinatura.');
    }
    setCancelandoId(null);
  }

  function proximaCobrancaStatus(dataProxima: string | null) {
    if (!dataProxima) return null;
    const diff = Math.ceil((new Date(dataProxima).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 3) return { color: 'var(--admin-red)', label: `${diff} dia(s)` };
    if (diff <= 7) return { color: 'var(--admin-amber)', label: `${diff} dia(s)` };
    return { color: 'var(--admin-green)', label: `${diff} dia(s)` };
  }

  // Métricas
  const countActive = pagamentos.filter(p => p.status === 'active').length;
  const countExpired = pagamentos.filter(p => p.status === 'expired').length;
  const countCancelled = pagamentos.filter(p => p.status === 'cancelled').length;
  const mrr = pagamentos
    .filter(p => p.status === 'active' && p.valor_pago)
    .reduce((s, p) => s + (p.valor_pago || 0), 0);

  if (loading) {
    return <div className="admin-loading"><div className="admin-spinner" /> Carregando pagamentos...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Pagamentos Realizados</h2>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Histórico de assinaturas e pagamentos
          </p>
        </div>
        <button onClick={loadPagamentos} className="admin-btn admin-btn-secondary" style={{ gap: '6px' }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {loadError && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', background: 'var(--admin-amber-light)',
          color: '#92400E', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px',
        }}>{loadError}</div>
      )}

      {/* Métricas */}
      <div className="admin-metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-accent)' }}>
            <DollarSign size={16} /> Total Registros
          </div>
          <div className="value">{pagamentos.length}</div>
        </div>
        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-green)' }}>
            <CheckCircle size={16} /> Ativas
          </div>
          <div className="value" style={{ color: 'var(--admin-green)' }}>{countActive}</div>
        </div>
        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-amber)' }}>
            <Clock size={16} /> Expiradas
          </div>
          <div className="value" style={{ color: 'var(--admin-amber)' }}>{countExpired}</div>
        </div>
        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-text-muted)' }}>
            <Ban size={16} /> Canceladas
          </div>
          <div className="value">{countCancelled}</div>
        </div>
        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-green)' }}>
            <DollarSign size={16} /> MRR
          </div>
          <div className="value" style={{ color: 'var(--admin-green)' }}>
            R$ {mrr.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-search-wrapper" style={{ flex: 1, maxWidth: '320px' }}>
            <Search />
            <input
              className="admin-input"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por email, nome ou ID..."
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
                <th>Início</th>
                <th>Fim</th>
                <th>Dias Restantes</th>
                <th>Próx. Cobrança</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--admin-text-muted)' }}>
                    <DollarSign size={36} style={{ opacity: 0.25, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              ) : filtered.map(p => {
                const dias = diasRestantes(p.data_fim);
                const proxStatus = proximaCobrancaStatus(p.data_proxima_cobranca ?? null);
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.usuarios?.email || p.id_usuario}</div>
                      {p.usuarios?.nome_completo && (
                        <div className="muted">{p.usuarios.nome_completo}</div>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge-${p.status === 'active' ? 'active' : p.status === 'expired' ? 'expired' : 'cancelled'}`}>
                        {statusIcon(p.status)} {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="muted">{formatDate(p.data_inicio)}</td>
                    <td className="muted">{formatDate(p.data_fim)}</td>
                    <td>
                      {p.status === 'active' ? (
                        <span style={{
                          fontWeight: 700,
                          color: dias <= 7 ? 'var(--admin-red)' : dias <= 30 ? 'var(--admin-amber)' : 'var(--admin-green)',
                          fontSize: '0.82rem',
                        }}>
                          {dias} dia(s)
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {p.status === 'active' && proxStatus ? (
                        <span style={{ fontWeight: 600, color: proxStatus.color, fontSize: '0.82rem' }}>
                          {formatDate(p.data_proxima_cobranca!)}
                          <br />
                          <span style={{ fontSize: '0.75rem' }}>({proxStatus.label})</span>
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {p.valor_pago ? (
                        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>R$ {p.valor_pago.toFixed(2)}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {p.status === 'active' && (
                        <button
                          onClick={() => cancelarAssinatura(p.id_usuario, p.id)}
                          disabled={cancelandoId === p.id}
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          style={{ gap: '4px', fontSize: '0.75rem' }}
                        >
                          {cancelandoId === p.id ? (
                            <span className="admin-spinner" style={{ width: 12, height: 12 }} />
                          ) : (
                            <>
                              <AlertTriangle size={12} />
                              Cancelar
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
