import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useViajes } from '../context/ViajesContext';
import { viajesService } from '../services/viajesService';
import { viajeGastosService } from '../services/viajeGastosService';
import { colors, spacing, radius, typography } from '../constants/theme';
import ViajeGastosTab from '../components/viajes/ViajeGastosTab';
import ViajeBalanceTab from '../components/viajes/ViajeBalanceTab';
import ViajeNotasTab from '../components/viajes/ViajeNotasTab';
import ViajeOpcionesSheet from '../components/viajes/ViajeOpcionesSheet';

const TABS = ['💸 Gastos', '⚖️ Balance', '✅ Notas'];
const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ViajeDetailScreen() {
  const { dark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { viajeId } = route.params;
  const { cargarViajes } = useViajes();

  const [viaje, setViaje] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabIdx, setTabIdx] = useState(0);
  const [showOpciones, setShowOpciones] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [v, g] = await Promise.all([
        viajesService.getById(viajeId),
        viajeGastosService.getByViaje(viajeId),
      ]);
      setViaje(v);
      setGastos(g);
    } catch (err) {
      console.warn('[ViajeDetail] cargar:', err.message);
    } finally {
      setLoading(false);
    }
  }, [viajeId]);

  useEffect(() => { cargar(); }, [cargar]);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const participantColor = (userId) => {
    if (!viaje) return PARTICIPANT_COLORS[0];
    const idx = viaje.participantes.findIndex(p => p.userId === userId);
    return PARTICIPANT_COLORS[Math.max(0, idx) % PARTICIPANT_COLORS.length];
  };

  const totalGastado = gastos.reduce((sum, g) => sum + g.precio, 0);
  const activo = viaje?.estado === 'activo';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? colors.background.dark : colors.background.light }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!viaje) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light }} edges={['bottom']}>
      <LinearGradient colors={['#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backText}>Mis Viajes</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Tabs')}
              style={styles.optionsBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              accessibilityLabel="Ir al inicio"
              accessibilityRole="button"
            >
              <Ionicons name="home-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowOpciones(true)}
              style={styles.optionsBtn}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              accessibilityLabel="Opciones del viaje"
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.viajeEmoji}>{viaje.emoji}</Text>
        <Text style={styles.viajeTitulo}>{viaje.titulo}</Text>
        <Text style={styles.viajeParticipantes}>
          {viaje.participantes.map(p => p.nombre.split(' ')[0]).join(' · ')}
        </Text>

        <View style={styles.pills}>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Total</Text>
            <Text style={styles.pillValue}>${totalGastado.toFixed(0)}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Gastos</Text>
            <Text style={styles.pillValue}>{gastos.length}</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: activo ? '#10B98130' : '#64748B30' }]}>
            <Text style={[styles.badgeText, { color: activo ? '#6EE7B7' : '#CBD5E1' }]}>
              {activo ? '● Activo' : '🔒 Archivado'}
            </Text>
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
      </LinearGradient>

      {tabIdx === 0 && (
        <ViajeGastosTab
          viaje={viaje}
          gastos={gastos}
          onGastoAdded={cargar}
          participantColor={participantColor}
          dark={dark}
        />
      )}
      {tabIdx === 1 && (
        <ViajeBalanceTab
          viaje={viaje}
          gastos={gastos}
          participantColor={participantColor}
          dark={dark}
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
        onUpdated={() => { cargar(); cargarViajes(); }}
        onDeleted={() => { navigation.goBack(); cargarViajes(); }}
        dark={dark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingHorizontal: spacing.md, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#fff', fontSize: 15 },
  optionsBtn: { padding: 4 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viajeEmoji: { fontSize: 36, marginBottom: 4 },
  viajeTitulo: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  viajeParticipantes: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.md },
  pills: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  pill: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, alignItems: 'center' },
  pillLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  pillValue: { fontSize: 15, color: '#fff', fontWeight: '700' },
  badgeRow: { marginBottom: spacing.md },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  segmented: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: radius.md, padding: 3 },
  segTab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  segTabActive: { backgroundColor: '#fff' },
  segTabText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  segTabTextActive: { color: colors.primary, fontWeight: '700' },
});
