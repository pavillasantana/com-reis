import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, ChevronLeft, ChevronRight, Crown, UserX,
  ToggleLeft, ToggleRight, UserPlus, X, RefreshCw,
  Gift, Clock,
} from 'lucide-react';

interface Usuario {
  id: string;
  email: string;
  nome_completo: string | null;
  plano: string;
  moeda_base: string | null;
  status?: string;
  data_criacao?: string;
  role?: string | null;
}

const PAGE_SIZE = 20;

export function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroPlano, setFiltroPlano] = useState<'todos' | 'free' | 'premium'>('todos');
  const [page, setPage] = useState(0);
  const [toggling, setToggling] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [newNome, setNewNome] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const [freeDaysOpen, setFreeDaysOpen] = useState<Usuario | null>(null);
  const [freeDaysQty, setFreeDaysQty] = useState(15);
  const [giving, setGiving] = useState(false);
  const [giveError, setGiveError] = useState('');
  const [giveSuccess, setGiveSuccess] = useState('');

  useEffect(() => { loadUsuarios(); }, []);

  async function loadUsuarios() {
    setLoading(true);
    setLoadError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadError('Sessão expirada. Faça login novamente.');
        setLoading(false);
        return;
      }

      const res = await supabase.functions.invoke('admin-list-users', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) {
        setLoadError(res.error.message || 'Erro ao buscar usuários');
        // Fallback: tentar query direta
        await loadUsuariosFallback();
      } else if (res.data?.users) {
        setUsuarios(res.data.users);
      } else if (res.data?.error) {
        setLoadError(res.data.error);
        await loadUsuariosFallback();
      }
    } catch {
      await loadUsuariosFallback();
    }
    setLoading(false);
  }

  async function loadUsuariosFallback() {
    // Fallback: query direta (só mostra próprio usuário se RLS ativo)
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome_completo, plano, moeda_base, status, data_criacao')
      .order('data_criacao', { ascending: false });

    if (data && !error) {
      setUsuarios(data as Usuario[]);
    }
  }

  const filtered = useMemo(() =>
    usuarios.filter(u => {
      if (filtroPlano !== 'todos' && u.plano !== filtroPlano) return false;
      const q = busca.toLowerCase();
      if (q && !u.email?.toLowerCase().includes(q) && !u.nome_completo?.toLowerCase().includes(q) && !u.id.toLowerCase().includes(q)) return false;
      return true;
    }),
    [usuarios, busca, filtroPlano]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [busca, filtroPlano]);

  async function togglePlano(usuario: Usuario) {
    const newPlano = usuario.plano === 'premium' ? 'free' : 'premium';
    setToggling(usuario.id);
    const { error } = await supabase.from('usuarios').update({ plano: newPlano }).eq('id', usuario.id);
    if (!error) {
      setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, plano: newPlano } : u));
    }
    setToggling(null);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { email: newEmail, password: newSenha, nome: newNome },
      });

      if (error) {
        setCreateError(error.message || 'Erro ao criar usuário');
      } else if (data?.error) {
        setCreateError(data.error);
      } else {
        setCreateSuccess(`Usuário ${newEmail} criado com sucesso!`);
        setNewEmail(''); setNewSenha(''); setNewNome('');
        loadUsuarios();
        setTimeout(() => { setCreateSuccess(''); setCreateOpen(false); }, 2000);
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Erro ao criar usuário.');
    }
    setCreating(false);
  }

  async function handleGiveFreeDays() {
    if (!freeDaysOpen) return;
    setGiveError('');
    setGiveSuccess('');
    setGiving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-give-free-days', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { user_id: freeDaysOpen.id, days: freeDaysQty },
      });

      if (error) {
        setGiveError(error.message || 'Erro ao conceder dias');
      } else if (data?.error) {
        setGiveError(data.error);
      } else {
        setGiveSuccess(data?.message || `${freeDaysQty} dias grátis concedidos!`);
        // Atualizar localmente
        setUsuarios(prev => prev.map(u => u.id === freeDaysOpen.id
          ? { ...u, plano: 'premium' } : u));
        setTimeout(() => { setGiveSuccess(''); setFreeDaysOpen(null); }, 2500);
      }
    } catch (err: any) {
      setGiveError(err?.message || 'Erro ao conceder dias.');
    }
    setGiving(false);
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  if (loading) {
    return <div className="admin-loading"><div className="admin-spinner" /> Carregando usuários...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Usuários</h2>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.88rem', margin: '4px 0 0' }}>
            {filtered.length} usuário(s) encontrado(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadUsuarios} className="admin-btn admin-btn-secondary" style={{ gap: '6px' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => setCreateOpen(true)} className="admin-btn admin-btn-primary" style={{ gap: '6px' }}>
            <UserPlus size={14} /> Criar Usuário
          </button>
        </div>
      </div>

      {loadError && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', background: 'var(--admin-amber-light)',
          color: '#92400E', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px',
        }}>
          {loadError}
        </div>
      )}

      {/* ── Modal Criar Usuário ── */}
      {createOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px',
        }}>
          <div style={{
            background: 'var(--admin-card)', border: '1px solid var(--admin-card-border)',
            borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '420px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Criar Usuário</h3>
              <button onClick={() => setCreateOpen(false)} style={{
                background: 'transparent', border: '1px solid var(--admin-card-border)',
                borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--admin-text-muted)',
              }}><X size={16} /></button>
            </div>

            {createError && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', background: 'var(--admin-red-light)',
                color: 'var(--admin-red)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px',
              }}>{createError}</div>
            )}
            {createSuccess && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', background: 'var(--admin-green-light)',
                color: 'var(--admin-green)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px',
              }}>{createSuccess}</div>
            )}

            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nome</label>
                <input className="admin-input" value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome completo" required />
              </div>
              <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Email</label>
                <input className="admin-input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="usuario@email.com" required />
              </div>
              <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Senha</label>
                <input className="admin-input" type="password" value={newSenha} onChange={e => setNewSenha(e.target.value)} placeholder="Mínimo 8 caracteres" required minLength={8} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setCreateOpen(false)} style={{
                  flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--admin-card-border)',
                  borderRadius: '12px', cursor: 'pointer', color: 'var(--admin-text-secondary)', fontWeight: 600,
                }}>Cancelar</button>
                <button type="submit" disabled={creating} style={{
                  flex: 1.5, padding: '12px', background: 'var(--admin-accent)', border: 'none',
                  borderRadius: '12px', cursor: 'pointer', color: '#fff', fontWeight: 700, opacity: creating ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  {creating ? <><div className="admin-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Criando...</> : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Dar Dias Grátis ── */}
      {freeDaysOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px',
        }}>
          <div style={{
            background: 'var(--admin-card)', border: '1px solid var(--admin-card-border)',
            borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '400px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={18} color="var(--admin-green)" /> Dar Dias Grátis
              </h3>
              <button onClick={() => { setFreeDaysOpen(null); setGiveError(''); setGiveSuccess(''); }} style={{
                background: 'transparent', border: '1px solid var(--admin-card-border)',
                borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--admin-text-muted)',
              }}><X size={16} /></button>
            </div>

            <div style={{
              padding: '14px', borderRadius: '12px', background: '#F8FAFC',
              marginBottom: '20px', fontSize: '0.85rem',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--admin-accent)' }}>{freeDaysOpen.email}</div>
              <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                {freeDaysOpen.nome_completo || 'Sem nome'} · Plano atual: {freeDaysOpen.plano}
              </div>
            </div>

            {giveError && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', background: 'var(--admin-red-light)',
                color: 'var(--admin-red)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px',
              }}>{giveError}</div>
            )}
            {giveSuccess && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', background: 'var(--admin-green-light)',
                color: 'var(--admin-green)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px',
              }}>{giveSuccess}</div>
            )}

            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
              Quantidade de dias
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {[7, 15, 30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setFreeDaysQty(d)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: freeDaysQty === d ? '2px solid var(--admin-accent)' : '1px solid var(--admin-card-border)',
                    background: freeDaysQty === d ? 'var(--admin-accent-light)' : 'var(--admin-card)',
                    color: freeDaysQty === d ? 'var(--admin-accent)' : 'var(--admin-text-secondary)',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setFreeDaysOpen(null); setGiveError(''); setGiveSuccess(''); }} style={{
                flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--admin-card-border)',
                borderRadius: '12px', cursor: 'pointer', color: 'var(--admin-text-secondary)', fontWeight: 600,
              }}>Cancelar</button>
              <button onClick={handleGiveFreeDays} disabled={giving} style={{
                flex: 1.5, padding: '12px', background: 'var(--admin-green)', border: 'none',
                borderRadius: '12px', cursor: 'pointer', color: '#fff', fontWeight: 700, opacity: giving ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                {giving ? <><div className="admin-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processando...</>
                  : <><Clock size={14} /> Conceder {freeDaysQty} Dias</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabela ── */}
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
            {(['todos', 'free', 'premium'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroPlano(f)}
                className={`admin-btn admin-btn-sm ${filtroPlano === f ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              >
                {f === 'todos' ? 'Todos' : f === 'free' ? 'Free' : 'Premium'}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card-body" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nome</th>
                <th>Plano</th>
                <th>Moeda</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--admin-text-muted)' }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : paged.map(u => (
                <tr key={u.id}>
                  <td className="email-cell">{u.email}</td>
                  <td>{u.nome_completo || <span className="muted">—</span>}</td>
                  <td>
                    <span className={`admin-badge ${u.plano === 'premium' ? 'admin-badge-premium' : 'admin-badge-free'}`}>
                      {u.plano === 'premium' ? <Crown size={10} /> : <UserX size={10} />}
                      {u.plano}
                    </span>
                  </td>
                  <td><span className="muted">{u.moeda_base || 'BRL'}</span></td>
                  <td><span className="muted">{formatDate(u.data_criacao || null)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => togglePlano(u)}
                        disabled={toggling === u.id}
                        className="admin-btn admin-btn-sm admin-btn-secondary"
                        style={{ gap: '4px' }}
                      >
                        {u.plano === 'premium' ? <ToggleRight size={12} color="var(--admin-green)" /> : <ToggleLeft size={12} />}
                        {u.plano === 'premium' ? 'Free' : 'Premium'}
                      </button>
                      <button
                        onClick={() => { setFreeDaysOpen(u); setFreeDaysQty(15); setGiveError(''); setGiveSuccess(''); }}
                        className="admin-btn admin-btn-sm"
                        style={{
                          gap: '4px', background: 'var(--admin-green-light)', color: 'var(--admin-green)',
                          border: '1px solid rgba(16,185,129,0.2)',
                        }}
                        title="Dar dias grátis de premium"
                      >
                        <Gift size={11} /> Dias Grátis
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-pagination">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            <span className="info">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
