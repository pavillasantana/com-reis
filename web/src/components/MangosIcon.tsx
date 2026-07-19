import React from 'react';

export interface MangosIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  color?: string;
  gradient?: boolean;
  withLeaf?: boolean;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const MangosIcon: React.FC<MangosIconProps> = ({
  size = 'md',
  color = '#FFB800',
  gradient = false,
  withLeaf = false,
  glow = false,
  className = '',
  style = {}
}) => {
  const sizeMap: Record<string, number> = {
    xs: 16,
    sm: 20,
    md: 28,
    lg: 38,
    xl: 52
  };

  const dim = typeof size === 'number' ? size : (sizeMap[size] || 28);

  const reactId = React.useId().replace(/:/g, '');
  const gradientId = `mangos-grad-${reactId}`;
  const filterId = `mangos-glow-${reactId}`;

  const fillColor = gradient ? `url(#${gradientId})` : color;

  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`mangos-icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: glow ? `url(#${filterId})` : undefined,
        ...style
      }}
    >
      <defs>
        {gradient ? (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFC800" />
            <stop offset="70%" stopColor="#FFB800" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        ) : null}
        {glow && (
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#FFB800" floodOpacity="0.4" />
          </filter>
        )}
      </defs>

      {/* Organic Mango Fruit Shape as seen in official concept */}
      <path
        d="M 52 14 C 64 14, 78 20, 84 34 C 92 50, 88 72, 66 86 C 48 98, 24 92, 14 74 C 4 56, 12 34, 28 20 C 38 14, 46 14, 52 14 Z"
        fill={fillColor}
      />

      {/* Top right stem/highlight curve */}
      <path
        d="M 72 22 C 78 28, 82 34, 80 42"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Optional Leaf Accent */}
      {withLeaf && (
        <path
          d="M 66 12 C 76 2, 88 4, 92 8 C 92 20, 78 22, 66 12 Z"
          fill="#10B981"
        />
      )}
    </svg>
  );
};

