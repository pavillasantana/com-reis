import React from 'react';
import { MangosIcon } from './MangosIcon';

export interface LogoProps {
  variant?: 'full' | 'icon' | 'card' | 'badge' | 'horizontal' | 'monogram';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  light?: boolean;
  gradient?: boolean;
  withLeaf?: boolean;
  glow?: boolean;
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  light = false,
  gradient = false,
  withLeaf = false,
  glow = false,
  subtitle,
  className = '',
  style = {},
  onClick
}) => {
  // Dimensions map
  const iconSizes = {
    xs: 16,
    sm: 22,
    md: 30,
    lg: 40,
    xl: 56
  };

  const fontSizes = {
    xs: '18px',
    sm: '24px',
    md: '32px',
    lg: '42px',
    xl: '58px'
  };

  const dim = iconSizes[size] || 30;
  const fontSize = fontSizes[size] || '32px';

  // Exact brand colors from design reference (Aligned to Com Réis Clean theme)
  const brandBlue = '#1045A1';
  const mangoYellow = '#FFB800';

  // Helper to render the unified wordmark "com[réi]s" where the icon replaces part of the name
  const renderWordmark = (textColor: string, iconColor: string) => (
    <div 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        lineHeight: 1,
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
        fontWeight: 800,
        fontSize,
        letterSpacing: '-0.04em',
        color: textColor,
        userSelect: 'none'
      }}
    >
      <span style={{ textTransform: 'lowercase' }}>com</span>
      <span 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 1px',
          transform: 'translateY(-1px)'
        }}
      >
        <MangosIcon 
          size={dim} 
          color={iconColor} 
          gradient={gradient} 
          withLeaf={withLeaf} 
          glow={glow} 
        />
      </span>
      <span style={{ textTransform: 'lowercase' }}>réis</span>
    </div>
  );

  // 1. Icon Only Variant
  if (variant === 'icon') {
    return (
      <div 
        className={`mangos-logo-icon ${className}`} 
        style={{ cursor: onClick ? 'pointer' : 'default', display: 'inline-flex', ...style }}
        onClick={onClick}
      >
        <MangosIcon 
          size={dim * 1.3} 
          color={light ? '#FFFFFF' : mangoYellow} 
          gradient={gradient} 
          withLeaf={withLeaf} 
          glow={glow} 
        />
      </div>
    );
  }

  // 2. Card / Badge App Tile Variant
  if (variant === 'card' || variant === 'badge') {
    const cardPaddings = {
      xs: '8px 14px',
      sm: '10px 18px',
      md: '14px 24px',
      lg: '18px 32px',
      xl: '24px 42px'
    };

    const cardRadii = {
      xs: '10px',
      sm: '12px',
      md: '16px',
      lg: '22px',
      xl: '28px'
    };

    return (
      <div
        className={`mangos-logo-card ${className}`}
        onClick={onClick}
        style={{
          background: light ? 'linear-gradient(135deg, #0038A8 0%, #002570 100%)' : '#FFFFFF',
          padding: cardPaddings[size],
          borderRadius: cardRadii[size],
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: light 
            ? '0 10px 25px rgba(0, 56, 168, 0.35)' 
            : '0 10px 25px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0,0,0,0.04)',
          border: light ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 56, 168, 0.08)',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          ...style
        }}
      >
        {renderWordmark(light ? '#FFFFFF' : '#0038A8', light ? '#FFFFFF' : mangoYellow)}
        {subtitle && (
          <span style={{ fontSize: '10px', color: light ? 'rgba(255,255,255,0.75)' : '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  // 3. Monogram Emblem Variant
  if (variant === 'monogram') {
    return (
      <div
        className={`mangos-logo-monogram ${className}`}
        onClick={onClick}
        style={{
          width: dim * 1.8,
          height: dim * 1.8,
          borderRadius: '50%',
          background: light ? '#FFFFFF' : '#0038A8',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,56,168,0.2)',
          cursor: onClick ? 'pointer' : 'default',
          ...style
        }}
      >
        <MangosIcon size={dim * 1.1} color={light ? '#0038A8' : mangoYellow} gradient={gradient} withLeaf={withLeaf} />
      </div>
    );
  }

  // 4. Horizontal Pill Variant
  if (variant === 'horizontal') {
    return (
      <div
        className={`mangos-logo-horizontal ${className}`}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '9px 16px',
          background: light ? 'rgba(255,255,255,0.15)' : 'rgba(0, 56, 168, 0.06)',
          backdropFilter: 'blur(8px)',
          borderRadius: '999px',
          border: light ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0, 56, 168, 0.1)',
          cursor: onClick ? 'pointer' : 'default',
          ...style
        }}
      >
        {renderWordmark(brandBlue, light ? '#FFFFFF' : mangoYellow)}
      </div>
    );
  }

  // 5. Default Standard Wordmark Logo (mangOs)
  return (
    <div
      className={`mangos-logo-full ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {renderWordmark(brandBlue, light ? '#FFFFFF' : mangoYellow)}
      {subtitle && (
        <span style={{ fontSize: '11px', color: light ? 'rgba(255,255,255,0.7)' : '#64748B', fontWeight: 600, marginTop: '2px', paddingLeft: '2px' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
