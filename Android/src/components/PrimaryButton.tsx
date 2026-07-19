import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';
import { theme } from '../lib/theme';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'green' | 'blue';
}

export const PrimaryButton = ({ title, variant = 'green', style, ...props }: PrimaryButtonProps) => {
  const buttonStyle = variant === 'green' ? styles.btnGreen : styles.btnBlue;
  
  return (
    <TouchableOpacity style={[styles.button, buttonStyle, style]} {...props}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: theme.layout.radiusMd / 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.layout.paddingLg,
  },
  btnGreen: {
    backgroundColor: theme.colors.positive,
  },
  btnBlue: {
    backgroundColor: theme.colors.primary,
  },
  text: {
    color: theme.colors.bg,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
