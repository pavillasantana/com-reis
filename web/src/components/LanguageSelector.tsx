import { useRef, useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { useI18n, LOCALE_LABELS, LOCALES, type Locale } from '../i18n';

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const localeFlags: Record<Locale, string> = {
    'pt-BR': '🇧🇷',
    'pt-PT': '🇵🇹',
    'en-US': '🇺🇸',
    'es-ES': '🇪🇸',
    'es-AR': '🇦🇷',
    'fr-FR': '🇫🇷',
    'it-IT': '🇮🇹',
  };

  const localeShort: Record<Locale, string> = {
    'pt-BR': 'PT',
    'pt-PT': 'PT',
    'en-US': 'EN',
    'es-ES': 'ES',
    'es-AR': 'ES',
    'fr-FR': 'FR',
    'it-IT': 'IT',
  };

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
          padding: '8px 12px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s',
          minWidth: '80px',
          justifyContent: 'center',
        }}
        title={t('select_language') || 'Selecionar idioma'}
      >
        <Globe size={14} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.5px' }}>
          {localeShort[locale] || locale}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
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
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            minWidth: '150px',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'slideUp 0.15s ease-out',
          }}
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: locale === l ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                color: locale === l ? 'var(--accent-blue)' : 'var(--text-primary)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'background 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = locale === l ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.04)'}
              onMouseOut={(e) => e.currentTarget.style.background = locale === l ? 'rgba(0, 229, 255, 0.1)' : 'transparent'}
            >
              <span style={{ fontSize: '1rem' }}>{localeFlags[l]}</span>
              <span style={{ flex: 1 }}>{LOCALE_LABELS[l]}</span>
              {locale === l && <span style={{ color: 'var(--accent-blue)', fontSize: '0.9rem' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}