// src/components/viajes/ViajeGastosTab.jsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function ViajeGastosTab({ viaje, gastos, onGastoAdded, participantColor, dark }) {
  const navigation = useNavigation();
  const activo = viaje.estado === 'activo';
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const handleAgregarGasto = () => {
    navigation.navigate('Tabs', { screen: 'Agregar', params: { viajeId: viaje.id, viajeNombre: `${viaje.emoji} ${viaje.titulo}` } });
  };

  const renderItem = ({ item: g }) => {
    const color = participantColor(g.pagadoPor);
    const initial = g.pagadorNombre?.[0]?.toUpperCase() || '?';
    const n = g.participantes.length || viaje.participantes.length;
    const splitText = g.modoSplit === 'solo'
      ? 'solo él/ella'
      : `÷ ${n}`;

    return (
      <View style={[styles.item, { backgroundColor: surfaceBg }]}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.objeto, { color: textColor }]} numberOfLines={1}>{g.objeto}</Text>
          <Text style={[styles.meta, { color: subtextColor }]}>
            {g.pagadorNombre} pagó · {splitText}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.monto, { color: textColor }]}>${g.precio.toFixed(0)}</Text>
          {g.modoSplit !== 'solo' && n > 1 && (
            <Text style={[styles.ppp, { color: subtextColor }]}>
              ${(g.precio / n).toFixed(0)} c/u
            </Text>
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
        data={gastos}
        keyExtractor={g => g.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
          <Text style={styles.fabText}>Gasto al viaje</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  objeto: { ...typography.bodyMed },
  meta: { ...typography.caption, marginTop: 2 },
  monto: { ...typography.bodyBold },
  ppp: { fontSize: 11 },
  readonlyBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B20', padding: spacing.sm, paddingHorizontal: spacing.md },
  readonlyText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.body },
  fab: {
    position: 'absolute', bottom: 24, right: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.full,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
