import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MangosIcon } from './MangosIcon';

export interface LogoProps {
  variant?: 'full' | 'icon' | 'horizontal';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  light?: boolean;
  gradient?: boolean;
  withLeaf?: boolean;
  style?: any;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  light = false,
  gradient = false,
  withLeaf = false,
  style = {}
}) => {
  const iconSizes = {
    xs: 14,
    sm: 18,
    md: 24,
    lg: 32,
    xl: 48
  };

  const fontSizes = {
    xs: 16,
    sm: 20,
    md: 26,
    lg: 36,
    xl: 52
  };

  const dim = iconSizes[size] || 24;
  const fontSize = fontSizes[size] || 26;

  const textColor = light ? '#FFFFFF' : '#1045A1';
  const iconColor = gradient ? undefined : (light ? '#FFFFFF' : '#FFB800');

  if (variant === 'icon') {
    return (
      <View style={[styles.container, style]}>
        <MangosIcon size={dim * 1.3} color={iconColor} gradient={gradient} withLeaf={withLeaf} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, { fontSize, color: textColor }]}>
        mang
      </Text>
      <View style={[styles.iconWrapper, { width: dim, height: dim, marginTop: fontSize * 0.1 }]}>
        <MangosIcon size={dim} color={iconColor ?? '#00E5FF'} gradient={gradient} withLeaf={withLeaf} />
      </View>
      <Text style={[styles.text, { fontSize, color: textColor }]}>
        s
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'System',
    fontWeight: '800',
    letterSpacing: -1,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  }
});
