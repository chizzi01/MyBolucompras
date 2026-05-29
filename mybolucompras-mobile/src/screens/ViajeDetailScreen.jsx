import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useViajeDetalle } from '../hooks/queries/useViajeDetalle';
import { colors } from '../constants/theme';
import { formatMontoEuropeo } from '../utils/formatters';
import ViajeGastosTab from '../components/viajes/ViajeGastosTab';
import ViajeBalanceTab from '../components/viajes/ViajeBalanceTab';
import ViajeNotasTab from '../components/viajes/ViajeNotasTab';
import ViajeOpcionesSheet from '../components/viajes/ViajeOpcionesSheet';

const TABS = ['💸 Gastos', '⚖️ Balance', '✅ Notas'];
const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const MAX_AVATARS = 4;

export default function ViajeDetailScreen() {
  const { dark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { viajeId } = route.params;
  const insets = useSafeAreaInsets();

  const { viaje, gastos, pagos, loading, isRefetching, refetch } = useViajeDetalle(viajeId);
  const [tabIdx, setTabIdx] = useState(0);
  const [showOpciones, setShowOpciones] = useState(false);

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const participantColor = (userId) => {
    if (!viaje) return PARTICIPANT_COLORS[0];
    const idx = viaje.participantes.findIndex(p => p.userId === userId);
    return PARTICIPANT_COLORS[Math.max(0, idx) % PARTICIPANT_COLORS.length];
  };

  const totalGastado = gastos.reduce((sum, g) => sum + g.precio, 0);
  const activo = viaje?.estado === 'activo';
  const porPersona = viaje && viaje.participantes.length > 0
    ? totalGastado / viaje.participantes.length
    : 0;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? colors.background.dark : colors.background.light }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!viaje) return null;

  const visibleParticipants = viaje.participantes.slice(0, MAX_AVATARS);
  const overflowCount = viaje.participantes.length - MAX_AVATARS;

  const headerContent = (
    <View style={[styles.headerInner, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.backText}>Mis Viajes</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Tabs')}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            accessibilityLabel="Ir al inicio"
            accessibilityRole="button"
          >
            <Ionicons name="home-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowOpciones(true)}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            accessibilityLabel="Opciones del viaje"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.emojiBox}>
          <Text style={{ fontSize: 24 }}>{viaje.emoji}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.viajeTitulo} numberOfLines={1}>{viaje.titulo}</Text>
          <View style={[styles.badge, {
            backgroundColor: activo ? 'rgba(16,185,129,0.22)' : 'rgba(100,116,139,0.22)',
            borderColor: activo ? 'rgba(16,185,129,0.35)' : 'rgba(100,116,139,0.35)',
          }]}>
            <View style={[styles.badgeDot, { backgroundColor: activo ? '#10B981' : '#64748B' }]} />
            <Text style={[styles.badgeText, { color: activo ? '#6EE7B7' : '#CBD5E1' }]}>
              {activo ? 'Activo' : 'Archivado'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.avatarsRow}>
        {visibleParticipants.map((p, i) => (
          <View
            key={p.userId}
            style={[styles.av, { backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length], marginLeft: i === 0 ? 0 : -7, zIndex: MAX_AVATARS - i }]}
          >
            <Text style={styles.avText}>{p.nombre[0]?.toUpperCase()}</Text>
          </View>
        ))}
        {overflowCount > 0 && (
          <View style={[styles.av, styles.avOverflow, { marginLeft: -7, zIndex: 0 }]}>
            <Text style={styles.avText}>+{overflowCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL</Text>
          <Text style={styles.statVal}>${formatMontoEuropeo(totalGastado)}</Text>
          <Text style={styles.statSub}>{gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>POR PERSONA</Text>
          <Text style={styles.statVal}>${formatMontoEuropeo(porPersona)}</Text>
          <Text style={styles.statSub}>{viaje.participantes.length} {viaje.participantes.length === 1 ? 'persona' : 'personas'}</Text>
        </View>
      </View>

      <View style={styles.segmented}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[styles.segTab, tabIdx === i && styles.segTabActive]}
            onPress={() => setTabIdx(i)}
          >
            <Text style={[styles.segTabText, tabIdx === i && styles.segTabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light }} edges={['bottom']}>
      {viaje.imagenUrl ? (
        <ImageBackground
          source={{ uri: viaje.imagenUrl }}
          style={styles.headerBg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.65)']}
            style={StyleSheet.absoluteFill}
          />
          {headerContent}
        </ImageBackground>
      ) : (
        <LinearGradient colors={['#6366F1', '#4338CA']} style={styles.headerBg}>
          {headerContent}
        </LinearGradient>
      )}

      {tabIdx === 0 && (
        <ViajeGastosTab
          viaje={viaje}
          gastos={gastos}
          onGastoAdded={refetch}
          participantColor={participantColor}
          dark={dark}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
      {tabIdx === 1 && (
        <ViajeBalanceTab
          viaje={viaje}
          gastos={gastos}
          pagos={pagos}
          participantColor={participantColor}
          dark={dark}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
      {tabIdx === 2 && (
        <ViajeNotasTab
          viaje={viaje}
          dark={dark}
        />
      )}

      <ViajeOpcionesSheet
        visible={showOpciones}
        onClose={() => setShowOpciones(false)}
        viaje={viaje}
        gastos={gastos}
        onUpdated={refetch}
        onDeleted={() => navigation.goBack()}
        dark={dark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBg: { width: '100%' },
  headerInner: { paddingHorizontal: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#fff', fontSize: 15 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emojiBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: { flex: 1 },
  viajeTitulo: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 4 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  avatarsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  av: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avOverflow: { backgroundColor: 'rgba(255,255,255,0.2)' },
  avText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, padding: 9,
  },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  statVal: { fontSize: 20, color: '#fff', fontWeight: '800', marginBottom: 2 },
  statSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  segmented: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 11, padding: 3, gap: 3 },
  segTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segTabActive: { backgroundColor: '#fff' },
  segTabText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  segTabTextActive: { color: colors.primary, fontWeight: '800' },
});
