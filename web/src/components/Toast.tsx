import React, { useState, useCallback, createContext, useContext, useRef, useEffect } from 'react';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── ESTILOS INLINE ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ToastType, { color: string; bg: string; icon: string }> = {
  success: { color: '#00f5a0', bg: 'rgba(0, 245, 160, 0.12)', icon: '✓' },
  error:   { color: '#ff4a5a', bg: 'rgba(255, 74, 90, 0.12)',  icon: '✕' },
  warning: { color: '#ffb800', bg: 'rgba(255, 184, 0, 0.12)',  icon: '⚠' },
  info:    { color: '#00d2ff', bg: 'rgba(0, 210, 255, 0.12)',  icon: 'ℹ' },
};

// ─── COMPONENTE INDIVIDUAL ───────────────────────────────────────────────────

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const cfg = TYPE_CONFIG[item.type];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrada
    const t1 = setTimeout(() => setVisible(true), 10);
    // Trigger saída antes de remover
    const t2 = setTimeout(() => setVisible(false), (item.duration ?? 4000) - 300);
    // Remove após saída
    const t3 = setTimeout(() => onDismiss(item.id), item.duration ?? 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '18px',
        padding: '21px 16px',
        background: 'rgba(18, 26, 47, 0.95)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${cfg.color}33`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: '12px',
        boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 12px ${cfg.color}22`,
        maxWidth: '380px',
        width: '100%',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(24px)',
        cursor: 'pointer',
      }}
      onClick={() => onDismiss(item.id)}
    >
      {/* Ícone */}
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: cfg.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '14px',
        color: cfg.color,
        fontWeight: 700,
      }}>
        {cfg.icon}
      </div>

      {/* Texto */}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
          {item.title}
        </p>
        {item.message && (
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4'}}>
            {item.message}
          </p>
        )}
      </div>

      {/* Botão fechar */}
      <button
        aria-label="Fechar notificação"
        onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
        style={{
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: '3px',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── CONTAINER ────────────────────────────────────────────────────────────────

function ToastContainer({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div
      aria-label="Notificações"
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        pointerEvents: 'none',
      }}
    >
      {items.map(item => (
        <div key={item.id} style={{ pointerEvents: 'all' }}>
          <ToastCard item={item} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((options: Omit<ToastItem, 'id'>) => {
    const id = `toast-${++counterRef.current}`;
    setItems(prev => [...prev.slice(-4), { ...options, id }]); // máximo 5 toasts
  }, []);

  const success = useCallback((title: string, message?: string) =>
    toast({ type: 'success', title, message }), [toast]);
  const error = useCallback((title: string, message?: string) =>
    toast({ type: 'error', title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) =>
    toast({ type: 'warning', title, message }), [toast]);
  const info = useCallback((title: string, message?: string) =>
    toast({ type: 'info', title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <ToastContainer items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
