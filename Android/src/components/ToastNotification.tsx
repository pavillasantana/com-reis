import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react-native';
import { theme } from '../lib/theme';

export const ToastNotification = () => {
  const { toast, hideToast } = useStore();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast?.visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        handleClose();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      hideToast();
    });
  };

  if (!toast?.visible) return null;

  const getTheme = () => {
    switch (toast.type) {
      case 'success':
        return {
          barColor: theme.colors.positive,
          icon: <CheckCircle size={20} color={theme.colors.positive} />,
        };
      case 'error':
        return {
          barColor: theme.colors.negative,
          icon: <AlertCircle size={20} color={theme.colors.negative} />,
        };
      default:
        return {
          barColor: theme.colors.primary,
          icon: <Info size={20} color={theme.colors.primary} />,
        };
    }
  };

  const currentTheme = getTheme();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.toastCard, { borderLeftColor: currentTheme.barColor }]}>
        <View style={styles.iconContainer}>
          {currentTheme.icon}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.messageText}>{toast.message}</Text>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <X size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.layout.radiusMd,
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: '100%',
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.bg,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  messageText: {
    fontSize: 14,
    color: theme.colors.ink,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeButton: {
    padding: 6,
    borderRadius: theme.layout.radiusMd / 2,
    backgroundColor: theme.colors.bg,
  },
});
