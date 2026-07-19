import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, CreditCard, TrendingUp, DollarSign, Crown, UserX } from 'lucide-react';

interface DashboardStats {
  totalUsuarios: number;
  premiumCount: number;
  freeCount: number;
  totalAssinaturas: number;
  assinaturasAtivas: number;
  assinaturasExpiradas: number;
  receitaEstimada: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    const [usuariosRes, assinaturasRes] = await Promise.all([
      supabase.from('usuarios').select('plano'),
      supabase.from('assinaturas').select('status, valor_pago'),
    ]);

    const usuarios = usuariosRes.data || [];
    const assinaturas = assinaturasRes.data || [];

    const premiumCount = usuarios.filter(u => u.plano === 'premium').length;
    const assinaturasAtivas = assinaturas.filter(a => a.status === 'active').length;
    const receitaEstimada = assinaturas
      .filter(a => a.status === 'active')
      .reduce((s, a) => s + (a.valor_pago || 0), 0);

    setStats({
      totalUsuarios: usuarios.length,
      premiumCount,
      freeCount: usuarios.length - premiumCount,
      totalAssinaturas: assinaturas.length,
      assinaturasAtivas,
      assinaturasExpiradas: assinaturas.filter(a => a.status === 'expired').length,
      receitaEstimada,
    });
    setLoading(false);
  }

  if (loading) {
    return <div className="admin-loading"><div className="admin-spinner" /> Carregando métricas...</div>;
  }

  if (!stats) {
    return <div className="admin-empty"><p>Erro ao carregar dados.</p></div>;
  }

  const conversionRate = stats.totalUsuarios > 0
    ? ((stats.premiumCount / stats.totalUsuarios) * 100).toFixed(1)
    : '0.0';

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Dashboard</h2>
        <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
          Visão geral do Com Réis
        </p>
      </div>

      <div className="admin-metrics-grid">
        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-accent)' }}>
            <Users size={16} /> Total de Usuários
          </div>
          <div className="value">{stats.totalUsuarios}</div>
          <div className="subtitle">contas registradas</div>
        </div>

        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-green)' }}>
            <Crown size={16} /> Premium
          </div>
          <div className="value" style={{ color: 'var(--admin-green)' }}>{stats.premiumCount}</div>
          <div className="subtitle">{conversionRate}% de conversão</div>
        </div>

        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-text-muted)' }}>
            <UserX size={16} /> Free
          </div>
          <div className="value">{stats.freeCount}</div>
          <div className="subtitle">usuários gratuitos</div>
        </div>

        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-cyan)' }}>
            <CreditCard size={16} /> Assinaturas Ativas
          </div>
          <div className="value" style={{ color: 'var(--admin-cyan)' }}>{stats.assinaturasAtivas}</div>
          <div className="subtitle">{stats.assinaturasExpiradas} expiradas</div>
        </div>

        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-amber)' }}>
            <DollarSign size={16} /> Receita Estimada
          </div>
          <div className="value" style={{ color: 'var(--admin-amber)' }}>
            R$ {stats.receitaEstimada.toFixed(2).replace('.', ',')}
          </div>
          <div className="subtitle">mensal (assinaturas ativas)</div>
        </div>

        <div className="admin-metric-card">
          <div className="label" style={{ color: 'var(--admin-purple)' }}>
            <TrendingUp size={16} /> Taxa de Conversão
          </div>
          <div className="value" style={{ color: 'var(--admin-purple)' }}>{conversionRate}%</div>
          <div className="subtitle">free → premium</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h3>Atalhos Rápidos</h3>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>
            Acesse <strong>Usuários</strong> para gerenciar planos, <strong>Assinaturas</strong> para acompanhar pagamentos, ou <strong>Configurações</strong> para ajustar features do app.
          </span>
        </div>
      </div>
    </div>
  );
}
