import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, LogIn } from 'lucide-react';
import { Logo } from '../components/Logo';

interface AdminAuthProps {
  onAuthorized: (userId: string) => void;
}

export function AdminAuth({ onAuthorized }: AdminAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const ok = await checkAdminRole(session.user.id);
        if (ok) { onAuthorized(session.user.id); return; }
      }
      setLoading(false);
    })();
  }, []);

  async function checkAdminRole(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('role')
        .eq('id', userId)
        .single();
      if (error) return false;
      return data?.role === 'admin';
    } catch {
      return false;
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLogging(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLogging(false);
      return;
    }

    if (data.user) {
      const ok = await checkAdminRole(data.user.id);
      if (ok) {
        onAuthorized(data.user.id);
      } else {
        setError('Acesso negado. Esta conta não possui permissão de administrador.');
        await supabase.auth.signOut();
      }
    }
    setLogging(false);
  }

  if (loading) {
    return (
      <div className="admin-auth">
        <div className="admin-loading">
          <div className="admin-spinner" />
          Verificando autenticação...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-auth">
      <div className="admin-auth-card">
        <div style={{ marginBottom: '24px' }}>
          <Logo variant="icon" size="lg" withLeaf />
        </div>
        <h1>Com Réis Admin</h1>
        <p>Painel Administrativo — Acesso restrito</p>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 16px', borderRadius: '10px',
            background: 'var(--admin-red-light)', color: 'var(--admin-red)',
            fontSize: '0.82rem', fontWeight: 600, marginBottom: '20px',
            textAlign: 'left',
          }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px', textAlign: 'left' }}>
            <label style={{
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px',
            }}>Email</label>
            <input
              type="email"
              className="admin-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@comreis.com"
              required
            />
          </div>
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <label style={{
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px',
            }}>Senha</label>
            <input
              type="password"
              className="admin-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={logging}
            className="admin-btn admin-btn-primary"
            style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
          >
            {logging ? (
              <><div className="admin-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Entrando...</>
            ) : (
              <><LogIn size={16} /> Entrar</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
