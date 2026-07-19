import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, LogIn, Crown, CreditCard, UserMinus, Settings } from 'lucide-react';

interface LogEntry {
  id: string;
  event_type: string;
  user_email?: string;
  user_id: string;
  description: string;
  created_at: string;
  meta?: Record<string, unknown>;
}

export function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);

    // Try to fetch from audit_log table if it exists
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (data && !error) {
        setLogs(data as LogEntry[]);
        setLoading(false);
        return;
      }
    } catch {
      // Table doesn't exist
    }

    // Fallback: build synthetic logs from recent activity
    const syntheticLogs: LogEntry[] = [];

    // Recent users (from auth signups approximation)
    const { data: recentUsers } = await supabase
      .from('usuarios')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentUsers) {
      recentUsers.forEach((u: { email: string; id: string; created_at: string | null }, i: number) => {
        syntheticLogs.push({
          id: `user-${i}`,
          event_type: 'signup',
          user_email: u.email,
          user_id: u.id,
          description: 'Conta criada',
          created_at: u.created_at || new Date().toISOString(),
        });
      });
    }

    // Recent subscriptions
    const { data: recentSubs } = await supabase
      .from('assinaturas')
      .select('id, id_usuario, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentSubs) {
      recentSubs.forEach((s: { status: string; id_usuario: string; created_at: string | null }, i: number) => {
        syntheticLogs.push({
          id: `sub-${i}`,
          event_type: s.status === 'active' ? 'subscription_active' : 'subscription_expired',
          user_id: s.id_usuario,
          description: s.status === 'active' ? 'Assinatura ativada' : `Assinatura ${s.status}`,
          created_at: s.created_at || new Date().toISOString(),
        });
      });
    }

    syntheticLogs.sort((a, b) => b.created_at.localeCompare(a.created_at));
    setLogs(syntheticLogs.slice(0, 50));
    setLoading(false);
  }

  function getEventInfo(type: string): { color: string; icon: typeof LogIn; label: string } {
    switch (type) {
      case 'signup': return { color: 'var(--admin-cyan)', icon: LogIn, label: 'Cadastro' };
      case 'subscription_active': return { color: 'var(--admin-green)', icon: CreditCard, label: 'Assinatura' };
      case 'subscription_expired': return { color: 'var(--admin-red)', icon: CreditCard, label: 'Expiração' };
      case 'plan_change': return { color: 'var(--admin-amber)', icon: Crown, label: 'Plano' };
      case 'cancellation': return { color: 'var(--admin-red)', icon: UserMinus, label: 'Cancelamento' };
      case 'config_change': return { color: 'var(--admin-purple)', icon: Settings, label: 'Config' };
      default: return { color: 'var(--admin-text-muted)', icon: LogIn, label: type };
    }
  }

  function formatDate(d: string) {
    try {
      return new Date(d).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return d;
    }
  }

  if (loading) {
    return <div className="admin-loading"><div className="admin-spinner" /> Carregando logs...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Logs de Atividade</h2>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.88rem', margin: '4px 0 0' }}>
            {logs.length} registro(s) recente(s)
          </p>
        </div>
        <button onClick={loadLogs} className="admin-btn admin-btn-secondary" style={{ gap: '6px' }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="admin-card">
        {logs.length === 0 ? (
          <div className="admin-empty">
            <LogIn size={40} />
            <p>Nenhum log encontrado.<br />Crie a tabela <code>audit_log</code> no Supabase para rastrear atividades automaticamente.</p>
          </div>
        ) : (
          <div className="admin-log-list">
            {logs.map(log => {
              const event = getEventInfo(log.event_type);
              const Icon = event.icon;
              return (
                <div key={log.id} className="admin-log-item">
                  <div className="admin-log-dot" style={{ background: event.color }} />
                  <div className="admin-log-content">
                    <p className="msg">
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem',
                        fontWeight: 700, background: `${event.color}15`, color: event.color,
                        marginRight: '8px',
                      }}>
                        <Icon size={10} /> {event.label}
                      </span>
                      {log.description}
                    </p>
                    <div className="meta">
                      {log.user_email && <span>{log.user_email} · </span>}
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
