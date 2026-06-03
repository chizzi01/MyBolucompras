// src/screens/ViajesScreen.jsx
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useViajes } from '../hooks/queries/useViajes';
import { colors, spacing, radius, typography } from '../constants/theme';
import ViajeCard from '../components/viajes/ViajeCard';
import CrearViajeModal from '../components/viajes/CrearViajeModal';
import ViajeResumenModal from '../components/viajes/ViajeResumenModal';

export default function ViajesScreen() {
  const { dark } = useTheme();
  const { viajes, loading, refetch } = useViajes();
  const navigation = useNavigation();
  const [showCrear, setShowCrear] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCerrado, setSelectedCerrado] = useState(null);

  const activos = viajes.filter(v => v.estado === 'activo');
  const archivados = viajes.filter(v => v.estado === 'cerrado');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderSection = (title, data, cerrado = false) => {
    if (!data.length) return null;
    return (
      <>
        <Text style={[styles.sectionTitle, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
          {title}
        </Text>
        {data.map(v => (
          <ViajeCard
            key={v.id}
            viaje={v}
            dark={dark}
            onPress={cerrado
              ? () => setSelectedCerrado(v)
              : () => navigation.navigate('ViajeDetail', { viajeId: v.id })}
          />
        ))}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: dark ? colors.background.dark : colors.background.light }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Tabs')}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Ir al inicio"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={[styles.backBtnText, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
            Inicio
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: dark ? colors.text.dark : colors.text.light }]}>
            Mis Viajes ✈️
          </Text>
          <Text style={[styles.subtitle, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
            {activos.length} activo{activos.length !== 1 ? 's' : ''} · {archivados.length} archivado{archivados.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.rightSlot}>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => setShowCrear(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newBtnText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => 'empty'}
        renderItem={null}
        ListHeaderComponent={
          <View style={{ padding: spacing.md }}>
            {renderSection('ACTIVOS', activos)}
            {renderSection('ARCHIVADOS', archivados, true)}
            {!viajes.length && !loading && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>✈️</Text>
                <Text style={[styles.emptyText, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
                  No tenés viajes todavía.{'\n'}¡Creá uno para empezar!
                </Text>
              </View>
            )}
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <CrearViajeModal visible={showCrear} onClose={() => setShowCrear(false)} />
      <ViajeResumenModal
        viaje={selectedCerrado}
        visible={!!selectedCerrado}
        onClose={() => setSelectedCerrado(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  backBtnText: {
    fontSize: 14,
  },
  rightSlot: {
    minWidth: 72,
    alignItems: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: { ...typography.h2 },
  subtitle: { ...typography.caption, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyEmoji: { fontSize: 56 },
  emptyText: { ...typography.body, textAlign: 'center', lineHeight: 24 },
});
