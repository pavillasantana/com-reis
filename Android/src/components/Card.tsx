import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { theme } from '../lib/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export const Card = ({ children, style, ...props }: CardProps) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.layout.radiusMd,
    padding: theme.layout.paddingLg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#121A2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
});
