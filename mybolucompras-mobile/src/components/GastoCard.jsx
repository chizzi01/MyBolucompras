import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getCuotasRestantes, gastoEntraEsteMes } from '../utils/cuotas';
import { formatPrecioEuropeo, parsePrecio } from '../utils/formatters';

const DELETE_WIDTH_SINGLE = 80;
const DELETE_WIDTH_DOUBLE = 160;

const MEDIO_ICON_MAP = {
  'Visa':             { lib: 'fa5', name: 'cc-visa' },
  'MasterCard':       { lib: 'fa5', name: 'cc-mastercard' },
  'Mastercard':       { lib: 'fa5', name: 'cc-mastercard' },
  'American Express': { lib: 'fa5', name: 'cc-amex' },
  'Efectivo':         { lib: 'ion', name: 'cash-outline' },
  'Transferencia':    { lib: 'ion', name: 'swap-horizontal-outline' },
  'Mercado Pago':     { lib: 'mci', name: 'credit-card-fast-outline' },
};

function MedioIcon({ medio, dark }) {
  const def = MEDIO_ICON_MAP[medio];
  const color = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  if (!def) return <Text style={{ ...typography.caption, color }}>{medio}</Text>;
  if (def.lib === 'fa5') return <FontAwesome5 name={def.name} size={22} color={color} brand />;
  if (def.lib === 'mci') return <MaterialCommunityIcons name={def.name} size={18} color={color} />;
  return <Ionicons name={def.name} size={18} color={color} />;
}

const resolveEtiqueta = (nombre, etiquetas = []) => {
  const found = etiquetas.find(e => (typeof e === 'string' ? e : e.nombre) === nombre);
  if (!found) return { nombre, color: colors.primary };
  return typeof found === 'string' ? { nombre: found, color: colors.primary } : found;
};

function BoardingPassContent({ gasto, precioDisplay, dark }) {
  const mainBg = dark ? '#1e1b4b' : '#f8faff';
  const titleColor = dark ? '#e2e8f0' : '#1e1b4b';
  const priceColor = dark ? '#818cf8' : '#4338ca';
  const labelColor = dark ? '#6366f1' : '#818cf8';
  const dateColor = dark ? '#64748b' : '#94a3b8';
  const dividerColor = dark ? '#4338ca' : '#c7d2fe';

  return (
    <View style={bpStyles.card}>
      <View style={[bpStyles.main, { backgroundColor: mainBg, borderRightColor: dividerColor }]}>
        <Text style={[bpStyles.tripLabel, { color: labelColor }]}>VIAJE</Text>
        <Text style={[bpStyles.objeto, { color: titleColor }]} numberOfLines={2}>{gasto.objeto}</Text>
        <Text style={[bpStyles.precio, { color: priceColor }]}>{precioDisplay}</Text>
        <Text style={[bpStyles.fecha, { color: dateColor }]}>{gasto.fecha}</Text>
      </View>
      <View style={bpStyles.stub}>
        <Text style={bpStyles.planeEmoji}>✈️</Text>
        <Text style={bpStyles.stubText} numberOfLines={5}>{gasto.viajeNombre}</Text>
      </View>
    </View>
  );
}

const bpStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 80,
  },
  main: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
  },
  tripLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  objeto: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  precio: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  fecha: {
    fontSize: 10,
  },
  stub: {
    width: 64,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  planeEmoji: {
    fontSize: 20,
  },
  stubText: {
    color: '#e0e7ff',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
});

export default function GastoCard({ gasto, mydata, onPress, onDelete, onMarkPaid }) {
  const { dark } = useTheme();

  const hasDoubleAction = !!onMarkPaid;
  const DELETE_WIDTH = hasDoubleAction ? DELETE_WIDTH_DOUBLE : DELETE_WIDTH_SINGLE;

  const s = styles(dark, gasto.pagado && !!gasto.compartidoConNombre);

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

  const cuotasRest = getCuotasRestantes(gasto, mydata);
  const cuotasColor = getCuotasColor(cuotasRest, dark);
  const entraEsteMes = gastoEntraEsteMes(gasto, mydata);

  const esCuotado = !gasto.isFijo && Number(gasto.cuotas) > 1;
  const precioNum = parsePrecio(gasto.precio);
  const precioCuota = esCuotado ? precioNum / Number(gasto.cuotas) : precioNum;
  const precioDisplay = formatPrecioEuropeo(precioCuota, gasto.moneda);
  const precioTotal = esCuotado ? formatPrecioEuropeo(precioNum, gasto.moneda) : null;
  const etiquetaObj = gasto.etiqueta ? resolveEtiqueta(gasto.etiqueta, mydata.etiquetas) : null;

  const isPaidShared = gasto.pagado && !!gasto.compartidoConNombre;

  return (
    <View style={s.row}>
      <View style={[s.actionsContainer, { width: DELETE_WIDTH }]}>
        {hasDoubleAction && (
          <TouchableOpacity style={s.paidBtn} onPress={handleMarkPaid} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={s.actionText}>Pagado</Text>
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
          style={gasto.viajeId ? null : s.card}
          onPress={() => { if (open) { close(); } else { onPress(); } }}
          activeOpacity={0.75}
        >
          {gasto.viajeId ? (
            <BoardingPassContent
              gasto={gasto}
              precioDisplay={precioDisplay}
              dark={dark}
            />
          ) : (
            <View style={[s.left, !entraEsteMes && s.contentDimmed]}>
              <Text style={s.objeto} numberOfLines={1}>{gasto.objeto}</Text>
              <View style={s.meta}>
                <MedioIcon medio={gasto.medio} dark={dark} />
                {etiquetaObj ? (
                  <View style={[s.tag, { backgroundColor: etiquetaObj.color + '25', borderColor: etiquetaObj.color }]}>
                    <Text style={[s.tagText, { color: etiquetaObj.color }]}>{etiquetaObj.nombre}</Text>
                  </View>
                ) : null}
                {isPaidShared ? (
                  <View style={s.paidBadge}>
                    <Ionicons name="checkmark-circle" size={10} color={colors.accent} />
                    <Text style={s.paidBadgeText}>Pagado</Text>
                  </View>
                ) : gasto.compartidoConNombre ? (
                  <View style={s.sharedBadge}>
                    <Ionicons name="people-outline" size={10} color={dark ? '#94A3B8' : '#64748B'} />
                    <Text style={s.sharedBadgeText} numberOfLines={1}>{gasto.compartidoConNombre}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
          {!gasto.viajeId && (
            <View style={[s.right, !entraEsteMes && s.contentDimmed]}>
              <Text style={s.precio}>{precioDisplay}</Text>
              {precioTotal && <Text style={s.precioTotal}>{precioTotal}</Text>}
              <View style={s.badgesRow}>
                {!entraEsteMes && (
                  <View style={s.nextMonthBadge}>
                    <Ionicons name="time-outline" size={11} color={dark ? '#64748B' : '#94A3B8'} />
                  </View>
                )}
                <View style={[s.cuotasBadge, { backgroundColor: cuotasColor.bg }]}>
                  <Text style={[s.cuotasText, { color: cuotasColor.text }]}>
                    {gasto.isFijo ? '∞' : `${cuotasRest}/${gasto.cuotas}`}
                  </Text>
                </View>
              </View>
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

const styles = (dark, isPaidShared) => StyleSheet.create({
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
    borderWidth: isPaidShared ? 2 : 1,
    borderColor: isPaidShared
      ? colors.accent
      : dark ? colors.border.dark : colors.border.light,
  },
  contentDimmed: { opacity: 0.4 },
  left: { flex: 1, marginRight: spacing.sm },
  objeto: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { ...typography.captionMed },
  right: { alignItems: 'flex-end', marginRight: spacing.sm },
  precio: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 },
  precioTotal: { ...typography.caption, color: dark ? '#475569' : '#94A3B8', marginBottom: 4 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cuotasBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, minWidth: 44, alignItems: 'center' },
  cuotasText: { ...typography.captionMed, fontWeight: '600' },
  nextMonthBadge: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
    borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light,
  },
  actionsContainer: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  paidBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
  },
  deleteBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error,
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  sharedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    maxWidth: 120,
  },
  sharedBadgeText: {
    ...typography.caption, fontSize: 10,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  paidBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: dark ? '#0d2e1e' : '#D1FAE5',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.accent,
    maxWidth: 120,
  },
  paidBadgeText: {
    ...typography.caption, fontSize: 10,
    color: colors.accent, fontWeight: '600',
  },
});
