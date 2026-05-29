import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { formatMontoEuropeo } from '../../utils/formatters';

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

export default function ViajeGastosTab({ viaje, gastos, onGastoAdded, participantColor, dark }) {
  const navigation = useNavigation();
  const activo = viaje.estado === 'activo';
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

  const flatItems = useMemo(() => groupGastos(gastos), [gastos]);

  const renderItem = ({ item }) => {
    if (item.type === 'sep') {
      return <Text style={[styles.dateSep, { color: subtextColor }]}>{item.label}</Text>;
    }

    const g = item;
    const color = participantColor(g.pagadoPor);
    const initial = g.pagadorNombre?.[0]?.toUpperCase() || '?';
    const n = g.participantes.length || viaje.participantes.length;
    const splitText = g.modoSplit === 'solo' ? 'solo él/ella' : `÷ ${n} personas`;

    return (
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
    </View>
  );
}

const styles = StyleSheet.create({
  dateSep: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 12, marginBottom: 4,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 5,
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
