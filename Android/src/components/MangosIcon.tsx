import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface MangosIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  color?: string;
  gradient?: boolean;
  withLeaf?: boolean;
  glow?: boolean;
  style?: any;
}

export const MangosIcon: React.FC<MangosIconProps> = ({
  size = 'md',
  color = '#FFB800',
  gradient = false,
  withLeaf = false,
  glow = false,
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
  const gradientId = `mangos-grad-mobile`;

  const fillColor = gradient ? `url(#${gradientId})` : color;

  return (
    <Svg
      width={dim}
      height={dim}
      viewBox="0 0 100 100"
      fill="none"
      style={style}
    >
      <Defs>
        {gradient && (
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFC800" />
            <Stop offset="70%" stopColor="#FFB800" />
            <Stop offset="100%" stopColor="#F59E0B" />
          </LinearGradient>
        )}
      </Defs>

      {/* Organic Mango Fruit Shape */}
      <Path
        d="M 52 14 C 64 14, 78 20, 84 34 C 92 50, 88 72, 66 86 C 48 98, 24 92, 14 74 C 4 56, 12 34, 28 20 C 38 14, 46 14, 52 14 Z"
        fill={fillColor}
      />

      {/* Top right stem/highlight curve */}
      <Path
        d="M 72 22 C 78 28, 82 34, 80 42"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Optional Leaf Accent */}
      {withLeaf && (
        <Path
          d="M 66 12 C 76 2, 88 4, 92 8 C 92 20, 78 22, 66 12 Z"
          fill="#10B981"
        />
      )}
    </Svg>
  );
};
