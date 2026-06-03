import React, { useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Animated, PanResponder } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { formatMontoEuropeo } from '../../utils/formatters';
import { useViajeGastoMutations } from '../../hooks/mutations/useViajeGastoMutations';
import { useModal } from '../../hooks/useModal';

const DELETE_WIDTH = 68;

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function parseFecha(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateSep(dateStr) {
  const d = parseFecha(dateStr);
  if (!d) return 'Sin fecha';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return 'Hoy';
  if (isSameDay(d, yesterday)) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function groupGastos(gastos) {
  const sorted = [...gastos].sort((a, b) => {
    const da = parseFecha(a.fecha);
    const db = parseFecha(b.fecha);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db - da;
  });
  const items = [];
  let lastKey = null;
  for (const g of sorted) {
    const dateKey = g.fecha ? g.fecha.slice(0, 10) : 'sin-fecha';
    if (dateKey !== lastKey) {
      items.push({ type: 'sep', label: formatDateSep(g.fecha), key: `sep-${dateKey}-${items.length}` });
      lastKey = dateKey;
    }
    items.push({ type: 'gasto', ...g, key: g.id });
  }
  return items;
}

function SwipeableGastoRow({ g, activo, surfaceBg, textColor, subtextColor, borderColor, dark, onDelete, participantColor, viaje }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        const base = open ? -DELETE_WIDTH : 0;
        const next = Math.min(0, Math.max(base + gs.dx, -DELETE_WIDTH));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gs) => {
        if (!open && gs.dx < -DELETE_WIDTH / 2) {
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(true);
        } else if (open && gs.dx > DELETE_WIDTH / 2) {
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

  const color = participantColor(g.pagadoPor);
  const initial = g.pagadorNombre?.[0]?.toUpperCase() || '?';
  const n = g.participantes.length || viaje.participantes.length;
  const splitText = g.modoSplit === 'solo' ? 'solo él/ella' : `÷ ${n} personas`;

  return (
    <View style={swipeStyles.row}>
      {activo && (
        <View style={[swipeStyles.deleteAction, { width: DELETE_WIDTH }]}>
          <TouchableOpacity style={swipeStyles.deleteBtn} onPress={() => { close(); onDelete(g); }} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={swipeStyles.deleteText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      )}
      <Animated.View
        style={{ transform: [{ translateX }], flex: 1, backgroundColor: surfaceBg }}
        {...(activo ? panResponder.panHandlers : {})}
      >
        <View style={[styles.item, { backgroundColor: surfaceBg, borderColor }]}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.objeto, { color: textColor }]} numberOfLines={1}>{g.objeto}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: subtextColor }]}>{g.pagadorNombre}</Text>
              <View style={[styles.metaDot, { backgroundColor: dark ? '#334155' : '#CBD5E1' }]} />
              <Text style={[styles.metaText, { color: subtextColor }]}>{splitText}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.monto, { color: textColor }]}>${formatMontoEuropeo(g.precio)}</Text>
            {g.modoSplit !== 'solo' && n > 1 && (
              <Text style={styles.ppp}>${formatMontoEuropeo(g.precio / n)} c/u</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export default function ViajeGastosTab({ viaje, gastos, onGastoAdded, participantColor, dark, onRefresh, refreshing }) {
  const navigation = useNavigation();
  const activo = viaje.estado === 'activo';
  const { eliminar } = useViajeGastoMutations(viaje.id);
  const { showModal, modal } = useModal();
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  const handleAgregarGasto = () => {
    navigation.navigate('Tabs', {
      screen: 'Agregar',
      params: { viajeId: viaje.id, viajeNombre: `${viaje.emoji} ${viaje.titulo}` },
    });
  };

  const handleDeleteGasto = (g) => {
    showModal({
      type: 'danger',
      title: 'Eliminar gasto',
      message: `¿Eliminar "${g.objeto}"?`,
      onConfirm: () => eliminar.mutate(g.id),
    });
  };

  const flatItems = useMemo(() => groupGastos(gastos), [gastos]);

  const renderItem = ({ item }) => {
    if (item.type === 'sep') {
      return <Text style={[styles.dateSep, { color: subtextColor }]}>{item.label}</Text>;
    }

    return (
      <SwipeableGastoRow
        g={item}
        activo={activo}
        surfaceBg={surfaceBg}
        textColor={textColor}
        subtextColor={subtextColor}
        borderColor={borderColor}
        dark={dark}
        onDelete={handleDeleteGasto}
        participantColor={participantColor}
        viaje={viaje}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {!activo && (
        <View style={styles.readonlyBanner}>
          <Ionicons name="lock-closed-outline" size={14} color="#F59E0B" />
          <Text style={styles.readonlyText}>Solo lectura</Text>
        </View>
      )}
      <FlatList
        data={flatItems}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>💸</Text>
            <Text style={[styles.emptyText, { color: subtextColor }]}>Sin gastos todavía</Text>
          </View>
        }
      />
      {activo && (
        <TouchableOpacity style={styles.fab} onPress={handleAgregarGasto} activeOpacity={0.9}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Agregar gasto</Text>
        </TouchableOpacity>
      )}
      {modal}
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  row: {
    marginBottom: 5,
    overflow: 'hidden',
    borderRadius: 10,
  },
  deleteAction: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    borderRadius: 10,
    overflow: 'hidden',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});

const styles = StyleSheet.create({
  dateSep: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 12, marginBottom: 4,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: 10, paddingVertical: 14, borderRadius: 10, borderWidth: 1,
  },
  avatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  objeto: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5 },
  metaText: { fontSize: 11 },
  monto: { fontSize: 14, fontWeight: '800' },
  ppp: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  readonlyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F59E0B20', padding: spacing.sm, paddingHorizontal: spacing.md,
  },
  readonlyText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.body },
  fab: {
    position: 'absolute', bottom: 24, right: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.full,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
