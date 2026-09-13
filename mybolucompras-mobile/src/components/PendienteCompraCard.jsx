import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { formatPrecioEuropeo } from '../utils/formatters';

const ACTION_WIDTH = 160;

export default function PendienteCompraCard({ pendiente, onConfirmar, onDescartar }) {
  const { dark } = useTheme();
  const s = styles(dark);
  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const base = open ? -ACTION_WIDTH : 0;
        const next = Math.min(0, Math.max(base + g.dx, -ACTION_WIDTH));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (!open && g.dx < -ACTION_WIDTH / 2) {
          Animated.spring(translateX, { toValue: -ACTION_WIDTH, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(true);
        } else if (open && g.dx > ACTION_WIDTH / 2) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(false);
        } else {
          Animated.spring(translateX, { toValue: open ? -ACTION_WIDTH : 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setOpen(false);
  };

  const precioDisplay = pendiente.monto != null
    ? formatPrecioEuropeo(pendiente.monto, pendiente.moneda || 'ARS')
    : '—';

  return (
    <View style={s.row}>
      <View style={s.actionsContainer}>
        <TouchableOpacity style={s.descartarBtn} onPress={onDescartar} activeOpacity={0.8}>
          <Ionicons name="close-circle-outline" size={22} color="#fff" />
          <Text style={s.actionText}>Descartar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.confirmarBtn} onPress={onConfirmar} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={s.actionText}>Confirmar</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }], zIndex: 1, elevation: 1 }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={s.card}
          onPress={() => { if (open) { close(); } else { onConfirmar(); } }}
          activeOpacity={0.75}
        >
          <View style={s.left}>
            <Text style={s.comercio} numberOfLines={1}>
              {pendiente.comercioRaw || 'Comercio desconocido'}
            </Text>
            <Text style={s.meta} numberOfLines={1}>
              {pendiente.banco || 'Banco no identificado'}
              {pendiente.medio ? ` · ${pendiente.medio}` : ''}
              {pendiente.ultimos4 ? ` ····${pendiente.ultimos4}` : ''}
            </Text>
          </View>
          <Text style={s.precio}>{precioDisplay}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  row: { marginHorizontal: spacing.md, marginVertical: spacing.xs, overflow: 'hidden' },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 6,
    elevation: 1, zIndex: 1,
  },
  left: { flex: 1, marginRight: spacing.sm },
  comercio: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 },
  meta: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  precio: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
  actionsContainer: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden', zIndex: 0, elevation: 0,
  },
  descartarBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: colors.error },
  confirmarBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: colors.accent },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
