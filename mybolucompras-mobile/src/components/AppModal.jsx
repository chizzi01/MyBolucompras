import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { colors, radius, spacing, typography } from '../constants/theme';

const TYPE_CONFIG = {
  success: { icon: 'checkmark-circle', color: '#10B981', bg: 'rgba(16,185,129,0.13)', closeText: 'Entendido' },
  error:   { icon: 'close-circle',     color: '#EF4444', bg: 'rgba(239,68,68,0.13)',  closeText: 'Entendido' },
  warning: { icon: 'alert-circle',     color: '#F59E0B', bg: 'rgba(245,158,11,0.13)', closeText: 'Entendido' },
  info:    { icon: 'information-circle', color: colors.primary, bg: 'rgba(99,102,241,0.12)', closeText: 'Entendido' },
  danger:  { icon: 'trash-outline',    color: '#EF4444', bg: 'rgba(239,68,68,0.13)',  closeText: 'Eliminar' },
  confirm: { icon: 'log-out-outline',  color: '#F59E0B', bg: 'rgba(245,158,11,0.13)', closeText: 'Salir' },
};

export default function AppModal({
  visible,
  type = 'info',
  title,
  message,
  onClose,
  onConfirm,
  confirmText,
  cancelText = 'Cancelar',
  actions,
}) {
  const { dark } = useTheme();
  const s = styles(dark);

  if (type === 'actionsheet') {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
        <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            {!!title && <Text style={s.sheetTitle}>{title}</Text>}
            {!!message && <Text style={s.sheetMessage}>{message}</Text>}

            {actions?.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[s.sheetAction, i < actions.length - 1 && s.sheetActionBorder]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                {!!action.icon && (
                  <View style={[s.sheetActionIcon, { backgroundColor: action.danger ? 'rgba(239,68,68,0.12)' : `${colors.primary}18` }]}>
                    <Ionicons
                      name={action.icon}
                      size={20}
                      color={action.danger ? '#EF4444' : colors.primary}
                    />
                  </View>
                )}
                <Text style={[s.sheetActionText, action.danger && { color: '#EF4444' }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={s.sheetDivider} />
            <TouchableOpacity style={s.sheetCancel} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.sheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const hasConfirm = !!onConfirm;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={[s.iconCircle, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={46} color={cfg.color} />
          </View>

          <Text style={s.title}>{title}</Text>
          {!!message && <Text style={s.message}>{message}</Text>}

          <View style={s.actions}>
            {hasConfirm ? (
              <>
                <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={s.cancelText}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.primaryBtn, type === 'danger' && s.dangerBtn]}
                  onPress={onConfirm}
                  activeOpacity={0.85}
                >
                  <Text style={s.primaryBtnText}>{confirmText || cfg.closeText}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={onClose} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>{confirmText || cfg.closeText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = (dark) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: dark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderRadius: 20,
    padding: spacing.lg + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: dark ? 0.5 : 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: dark ? colors.text.dark : colors.text.light,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
  },
  cancelText: {
    ...typography.bodyMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  dangerBtn: {
    backgroundColor: '#EF4444',
  },
  primaryBtnText: {
    ...typography.bodyMed,
    color: '#fff',
    fontWeight: '700',
  },

  // Action sheet styles
  sheetBackdrop: {
    flex: 1,
    backgroundColor: dark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingBottom: 34,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: dark ? colors.border.dark : colors.border.light,
  },
  sheetTitle: {
    ...typography.h2,
    color: dark ? colors.text.dark : colors.text.light,
    textAlign: 'center',
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  sheetMessage: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.sm,
  },
  sheetActionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: dark ? colors.border.dark : colors.border.light,
  },
  sheetActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionText: {
    ...typography.bodyMed,
    color: dark ? colors.text.dark : colors.text.light,
    flex: 1,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: dark ? colors.border.dark : colors.border.light,
    marginVertical: spacing.sm,
    marginHorizontal: -spacing.md,
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
  },
  sheetCancelText: {
    ...typography.bodyMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    fontWeight: '600',
  },
});
