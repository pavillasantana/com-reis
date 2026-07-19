import { useRef, useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { useI18n, LOCALE_LABELS, type Locale } from '../i18n';

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const locales: Locale[] = ['pt-BR', 'en-US', 'es-ES'];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`language-selector ${className}`} style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--card-border)',
          padding: '12px 16px',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          minWidth: '140px',
        }}
        title={t('select_language') || 'Selecionar idioma'}
      >
        <Globe size={16} />
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
          {LOCALE_LABELS[locale] || locale}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            right: 0,
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            minWidth: '160px',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'slideUp 0.15s ease-out',
          }}
        >
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: locale === l ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                color: locale === l ? 'var(--accent-blue)' : 'var(--text-primary)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'background 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = locale === l ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.04)'}
              onMouseOut={(e) => e.currentTarget.style.background = locale === l ? 'rgba(0, 229, 255, 0.1)' : 'transparent'}
            >
              {LOCALE_LABELS[l]}
              {locale === l && <span style={{ marginLeft: 'auto', color: 'var(--accent-blue)' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}