import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const DELETE_WIDTH_SINGLE = 80;
const DELETE_WIDTH_DOUBLE = 160;

const TIPO_LABEL = { debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia' };
const TIPO_COLOR = { debito: '#3B82F6', credito: '#8B5CF6', transferencia: '#10B981' };

export default function DeudaCard({ deuda, onMarkPaid, onDelete, onPress }) {
  const { dark } = useTheme();

  const hasDoubleAction = !!onMarkPaid && !deuda.pagado;
  const DELETE_WIDTH = hasDoubleAction ? DELETE_WIDTH_DOUBLE : DELETE_WIDTH_SINGLE;

  const s = styles(dark, deuda.pagado);

  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const base = open ? -DELETE_WIDTH : 0;
        const next = Math.min(0, Math.max(base + g.dx, -DELETE_WIDTH));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (!open && g.dx < -DELETE_WIDTH / 2) {
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(true);
        } else if (open && g.dx > DELETE_WIDTH / 2) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(false);
        } else {
          Animated.spring(translateX, { toValue: open ? -DELETE_WIDTH : 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setOpen(false);
  };

  const handleDelete = () => { close(); onDelete(); };
  const handleMarkPaid = () => { close(); onMarkPaid(); };

  const tipoColor = TIPO_COLOR[deuda.tipo] || colors.primary;
  const montoFormatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(deuda.monto);

  return (
    <View style={s.row}>
      <View style={[s.actionsContainer, { width: DELETE_WIDTH }]}>
        {hasDoubleAction && (
          <TouchableOpacity style={s.paidBtn} onPress={handleMarkPaid} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={s.actionText}>Pagada</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={s.actionText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }], flex: 1 }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={s.card}
          onPress={() => { if (open) { close(); } else { onPress?.(); } }}
          activeOpacity={0.75}
        >
          <View style={s.left}>
            <Text style={s.nombre} numberOfLines={1}>{deuda.nombre}</Text>
            {!!deuda.descripcion && (
              <Text style={s.descripcion} numberOfLines={1}>{deuda.descripcion}</Text>
            )}
            <View style={s.meta}>
              {!!deuda.tipo && (
                <View style={[s.tipoBadge, { backgroundColor: tipoColor + '20', borderColor: tipoColor }]}>
                  <Text style={[s.tipoBadgeText, { color: tipoColor }]}>
                    {TIPO_LABEL[deuda.tipo] || deuda.tipo}
                  </Text>
                </View>
              )}
              {!!deuda.medio && (
                <Text style={s.medio}>{deuda.medio}</Text>
              )}
              {deuda.pagado && (
                <View style={s.pagadaBadge}>
                  <Ionicons name="checkmark-circle" size={10} color={colors.accent} />
                  <Text style={s.pagadaBadgeText}>Pagada</Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.right}>
            <Text style={s.monto}>
              {deuda.moneda === 'ARS' ? '$' : deuda.moneda} {montoFormatted}
            </Text>
            <Text style={s.fecha}>{deuda.fechaDeuda}</Text>
            {deuda.pagado && deuda.fechaPago && (
              <Text style={s.fechaPago}>Cobrado {deuda.fechaPago}</Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = (dark, isPaid) => StyleSheet.create({
  row: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: dark ? 0.3 : 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: isPaid ? 2 : 1,
    borderColor: isPaid
      ? colors.accent
      : dark ? colors.border.dark : colors.border.light,
  },
  left: { flex: 1, marginRight: spacing.sm },
  nombre: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 },
  descripcion: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  tipoBadge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  tipoBadgeText: { ...typography.captionMed },
  medio: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  pagadaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: dark ? '#0d2e1e' : '#D1FAE5',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.accent,
  },
  pagadaBadgeText: { ...typography.caption, fontSize: 10, color: colors.accent, fontWeight: '600' },
  right: { alignItems: 'flex-end' },
  monto: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 },
  fecha: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  fechaPago: { ...typography.caption, fontSize: 10, color: colors.accent, marginTop: 2 },
  actionsContainer: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden',
  },
  paidBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: colors.accent },
  deleteBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: colors.error },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
