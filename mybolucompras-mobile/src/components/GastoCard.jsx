import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getCuotasRestantes, gastoEntraEsteMes } from '../utils/cuotas';
import { formatPrecio, parsePrecio } from '../utils/formatters';

const DELETE_WIDTH = 80;

const resolveEtiqueta = (nombre, etiquetas = []) => {
  const found = etiquetas.find(e => (typeof e === 'string' ? e : e.nombre) === nombre);
  if (!found) return { nombre, color: colors.primary };
  return typeof found === 'string' ? { nombre: found, color: colors.primary } : found;
};

export default function GastoCard({ gasto, mydata, onPress, onDelete }) {
  const { dark } = useTheme();
  const s = styles(dark);

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

  const handleDelete = () => {
    close();
    onDelete();
  };

  const cuotasRest = getCuotasRestantes(gasto, mydata);
  const cuotasColor = getCuotasColor(cuotasRest, dark);
  const entraEsteMes = gastoEntraEsteMes(gasto, mydata);

  const esCuotado = !gasto.isFijo && Number(gasto.cuotas) > 1;
  const precioNum = parsePrecio(gasto.precio);
  const precioCuota = esCuotado ? precioNum / Number(gasto.cuotas) : precioNum;
  const precioDisplay = formatPrecio(precioCuota, gasto.moneda);
  const precioTotal = esCuotado ? formatPrecio(precioNum, gasto.moneda) : null;
  const etiquetaObj = gasto.etiqueta ? resolveEtiqueta(gasto.etiqueta, mydata.etiquetas) : null;

  return (
    <View style={s.row}>
      {/* Delete button behind the card */}
      <View style={s.deleteAction}>
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={s.deleteActionText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable card */}
      <Animated.View style={{ transform: [{ translateX }], flex: 1 }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={s.card}
          onPress={() => { if (open) { close(); } else { onPress(); } }}
          activeOpacity={0.75}
        >
          <View style={[s.left, !entraEsteMes && s.dimmed]}>
            <Text style={s.objeto} numberOfLines={1}>{gasto.objeto}</Text>
            <View style={s.meta}>
              <Text style={s.metaText}>{gasto.medio}</Text>
              {etiquetaObj ? (
                <View style={[s.tag, { backgroundColor: etiquetaObj.color + '25', borderColor: etiquetaObj.color }]}>
                  <Text style={[s.tagText, { color: etiquetaObj.color }]}>{etiquetaObj.nombre}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[s.right, !entraEsteMes && s.dimmed]}>
            <Text style={s.precio}>{precioDisplay}</Text>
            {precioTotal && <Text style={s.precioTotal}>{precioTotal}</Text>}
            <View style={[s.cuotasBadge, { backgroundColor: cuotasColor.bg }]}>
              <Text style={[s.cuotasText, { color: cuotasColor.text }]}>
                {gasto.isFijo ? '∞' : `${cuotasRest}/${gasto.cuotas}`}
              </Text>
            </View>
          </View>

          {!entraEsteMes && (
            <View pointerEvents="none" style={s.nextMonthOverlay}>
              <Ionicons name="time-outline" size={13} color={dark ? '#94A3B8' : '#64748B'} />
              <Text style={s.nextMonthText}>Entra el próximo mes</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function getCuotasColor(cuotasRest, dark) {
  if (cuotasRest === '∞') return { bg: dark ? '#1a3a2e' : '#D1FAE5', text: '#10B981' };
  if (cuotasRest === 'N/A') return { bg: dark ? '#1e293b' : '#F1F5F9', text: dark ? '#94A3B8' : '#64748B' };
  if (cuotasRest <= 0) return { bg: dark ? '#1e293b' : '#F1F5F9', text: dark ? '#475569' : '#94A3B8' };
  if (cuotasRest === 1) return { bg: dark ? '#2d2010' : '#FEF3C7', text: '#F59E0B' };
  return { bg: dark ? '#1a3a2e' : '#D1FAE5', text: '#10B981' };
}

const styles = (dark) => StyleSheet.create({
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
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
  },
  left: { flex: 1, marginRight: spacing.sm },
  objeto: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tag: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { ...typography.captionMed },
  right: { alignItems: 'flex-end', marginRight: spacing.sm },
  precio: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 },
  precioTotal: { ...typography.caption, color: dark ? '#475569' : '#94A3B8', marginBottom: 4 },
  cuotasBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, minWidth: 44, alignItems: 'center' },
  cuotasText: { ...typography.captionMed, fontWeight: '600' },
  dimmed: { opacity: 0.3 },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    backgroundColor: colors.error,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  deleteBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  nextMonthOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: dark ? 'rgba(2, 6, 23, 0.62)' : 'rgba(248, 250, 252, 0.70)',
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  nextMonthText: {
    ...typography.caption,
    color: dark ? '#94A3B8' : '#475569',
    fontStyle: 'italic',
  },
});
