import { useState } from 'react';
import { AdminAuth } from './AdminAuth';
import { AdminDashboard } from './AdminDashboard';
import { AdminUsuarios } from './AdminUsuarios';
import { AdminAssinaturas } from './AdminAssinaturas';
import { AdminPagamentos } from './AdminPagamentos';
import { AdminConfig } from './AdminConfig';
import { AdminLogs } from './AdminLogs';
import { LayoutDashboard, Users, CreditCard, Settings, ScrollText, LogOut, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';

type AdminView = 'dashboard' | 'usuarios' | 'assinaturas' | 'pagamentos' | 'config' | 'logs';

const NAV_ITEMS: { key: AdminView; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'usuarios', label: 'Usuários', icon: Users },
  { key: 'assinaturas', label: 'Assinaturas', icon: CreditCard },
  { key: 'pagamentos', label: 'Pagamentos', icon: DollarSign },
  { key: 'config', label: 'Configurações', icon: Settings },
  { key: 'logs', label: 'Logs', icon: ScrollText },
];

export function AdminApp() {
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<AdminView>('dashboard');

  if (!userId) {
    return <AdminAuth onAuthorized={setUserId} />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <Logo variant="icon" size="md" withLeaf />
          <div>
            <h2>Com Réis</h2>
            <span>ADMIN</span>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`admin-nav-item ${view === item.key ? 'active' : ''}`}
              onClick={() => setView(item.key)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            className="admin-nav-item"
            onClick={handleLogout}
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
          <div style={{ marginTop: '12px', fontSize: '0.65rem', opacity: 0.5 }}>
            v1.0 · Com Réis Admin
          </div>
        </div>
      </aside>

      <main className="admin-main">
        {view === 'dashboard' && <AdminDashboard />}
        {view === 'usuarios' && <AdminUsuarios />}
        {view === 'assinaturas' && <AdminAssinaturas />}
        {view === 'pagamentos' && <AdminPagamentos />}
        {view === 'config' && <AdminConfig />}
        {view === 'logs' && <AdminLogs />}
      </main>
    </div>
  );
}
