import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { theme } from '../lib/theme';

interface ConfirmModalProps {
  visible: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title = 'Confirmação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={[styles.iconWrapper, danger ? styles.iconDanger : styles.iconInfo]}>
                <AlertTriangle size={28} color={danger ? theme.colors.negative : theme.colors.primary} />
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                  <Text style={styles.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, danger ? styles.confirmDanger : styles.confirmInfo]}
                  onPress={onConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...theme.modalStyles.overlay,
  },
  card: {
    ...theme.modalStyles.card,
    padding: theme.layout.paddingLg * 1.75,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconDanger: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  iconInfo: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.layout.gapMd * 0.75,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.layout.radiusMd / 1.5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.layout.radiusMd / 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDanger: {
    backgroundColor: theme.colors.negative,
  },
  confirmInfo: {
    backgroundColor: theme.colors.primary,
  },
  confirmText: {
    color: theme.colors.bg,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
