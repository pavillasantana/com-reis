import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { theme } from '../lib/theme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  isPassword?: boolean;
}

export const InputField = ({ label, isPassword, style, secureTextEntry, ...props }: InputFieldProps) => {
  const [hidePassword, setHidePassword] = useState(secureTextEntry ?? true);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={isPassword ? hidePassword : secureTextEntry}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity 
            style={styles.iconContainer} 
            onPress={() => setHidePassword(!hidePassword)}
            activeOpacity={0.7}
          >
            {hidePassword ? (
              <EyeOff color={theme.colors.textMuted} size={20} />
            ) : (
              <Eye color={theme.colors.primary} size={20} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    borderRadius: theme.layout.radiusMd / 2,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: theme.layout.paddingMd,
    color: theme.colors.ink,
    fontSize: 14,
  },
  iconContainer: {
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
