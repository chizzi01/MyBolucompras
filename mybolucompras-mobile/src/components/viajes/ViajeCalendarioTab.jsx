// src/components/viajes/ViajeCalendarioTab.jsx
import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
  Animated, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { toISODate, parseISODate } from '../../utils/formatters';
import { useViajeActividades } from '../../hooks/queries/useViajeActividades';
import { useViajeActividadMutations } from '../../hooks/mutations/useViajeActividadMutations';
import AgregarActividadModal from './AgregarActividadModal';
import EditarViajeModal from './EditarViajeModal';

function computeDias(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return [];
  const start = parseISODate(fechaDesde);
  const end = parseISODate(fechaHasta);
  if (end < start) return [];
  const dias = [];
  const cursor = new Date(start);
  let n = 1;
  while (cursor <= end) {
    dias.push({
      n,
      iso: toISODate(cursor),
      label: `Día ${n}`,
      dateLabel: cursor.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
    });
    cursor.setDate(cursor.getDate() + 1);
    n++;
  }
  return dias;
}

const CHIP_WIDTH = 68;
const CHIP_GAP = spacing.sm;
const ITEM_WIDTH = CHIP_WIDTH + CHIP_GAP;

function sortActividades(list) {
  return list.slice().sort((a, b) => {
    if (!a.hora && !b.hora) return 0;
    if (!a.hora) return 1;
    if (!b.hora) return -1;
    return a.hora.localeCompare(b.hora);
  });
}

export default function ViajeCalendarioTab({ viaje, dark }) {
  const { user } = useAuth();
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const esCreador = viaje.createdBy === user?.id;
  const activo = viaje.estado === 'activo';
  const dias = useMemo(() => computeDias(viaje.fechaDesde, viaje.fechaHasta), [viaje.fechaDesde, viaje.fechaHasta]);
  const todayIso = toISODate(new Date());
  const [selectedIso, setSelectedIso] = useState(() => {
    if (dias.some(d => d.iso === todayIso)) return todayIso;
    return dias[0]?.iso ?? null;
  });

  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const selectedOtherBg = dark ? '#334155' : '#475569';
  const sidePadding = (windowWidth - ITEM_WIDTH) / 2;

  const initialIndex = useMemo(() => {
    const idx = dias.findIndex(d => d.iso === todayIso);
    return idx >= 0 ? idx : 0;
  }, [dias, todayIso]);

  const handleMomentumScrollEnd = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.min(Math.max(Math.round(offsetX / ITEM_WIDTH), 0), dias.length - 1);
    setSelectedIso(dias[idx].iso);
  };

  const scrollToIndex = (index) => {
    setSelectedIso(dias[index].iso);
    scrollRef.current?.scrollTo({ x: index * ITEM_WIDTH, animated: true });
  };
  const [showModal, setShowModal] = useState(false);
  const [showEditarViaje, setShowEditarViaje] = useState(false);
  const [editingActividad, setEditingActividad] = useState(null);

  const { actividades, loading } = useViajeActividades(viaje.id);
  const { crear, editar, eliminar } = useViajeActividadMutations(viaje.id);

  const actividadesDelDia = sortActividades(actividades.filter(a => a.fecha === selectedIso));

  const abrirNueva = () => { setEditingActividad(null); setShowModal(true); };
  const abrirEditar = (act) => { setEditingActividad(act); setShowModal(true); };

  const handleSave = async (campos) => {
    if (editingActividad) {
      await editar.mutateAsync({ id: editingActividad.id, campos });
    } else {
      await crear.mutateAsync({ fecha: selectedIso, ...campos });
    }
  };

  const handleDelete = (id) => {
    eliminar.mutate(id, { onError: (err) => Alert.alert('Error', err.message) });
  };

  if (dias.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: bg }]}>
        <Ionicons name="calendar-outline" size={40} color={subtextColor} />
        <Text style={[styles.emptyTitle, { color: textColor }]}>Este viaje no tiene fechas cargadas</Text>
        <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
          Cargá las fechas del viaje para armar el itinerario día por día.
        </Text>
        {esCreador ? (
          <>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowEditarViaje(true)}>
              <Text style={styles.emptyBtnText}>Cargar fechas</Text>
            </TouchableOpacity>
            <EditarViajeModal
              visible={showEditarViaje}
              onClose={() => setShowEditarViaje(false)}
              viaje={viaje}
              dark={dark}
            />
          </>
        ) : (
          <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
            El creador del viaje aún no cargó las fechas.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.diasStrip}
        contentContainerStyle={styles.diasStripContent}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentOffset={{ x: initialIndex * ITEM_WIDTH, y: 0 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        <LinearGradient
          colors={dark ? ['rgba(99,102,241,0.30)', 'rgba(99,102,241,0.04)'] : ['rgba(99,102,241,0.18)', 'rgba(99,102,241,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.edgeFiller, { width: sidePadding }]}
        >
          <Text style={styles.edgeFillerIcon}>🧳</Text>
          <Text style={[styles.edgeFillerText, { color: textColor }]}>Arranca{'\n'}el viaje</Text>
        </LinearGradient>
        {dias.map((dia, index) => {
          const isToday = dia.iso === todayIso;
          const isSelected = dia.iso === selectedIso;
          const chipBg = isSelected ? (isToday ? colors.primary : selectedOtherBg) : surfaceBg;
          const chipTextColor = isSelected ? '#fff' : textColor;
          const chipSubTextColor = isSelected ? 'rgba(255,255,255,0.8)' : subtextColor;

          const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];
          const scale = scrollX.interpolate({ inputRange, outputRange: [0.82, 1, 0.82], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' });

          return (
            <View key={dia.iso} style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
              <Animated.View style={{ transform: [{ scale }], opacity }}>
                <TouchableOpacity
                  style={[styles.diaChip, { width: CHIP_WIDTH, backgroundColor: chipBg }]}
                  onPress={() => scrollToIndex(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.diaChipLabel, { color: chipTextColor }]}>{dia.label}</Text>
                  <Text style={[styles.diaChipDate, { color: chipSubTextColor }]}>{dia.dateLabel}</Text>
                  {isToday && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
              </Animated.View>
            </View>
          );
        })}
        <LinearGradient
          colors={dark ? ['rgba(16,185,129,0.30)', 'rgba(16,185,129,0.04)'] : ['rgba(16,185,129,0.18)', 'rgba(16,185,129,0.02)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.edgeFiller, { width: sidePadding }]}
        >
          <Text style={styles.edgeFillerIcon}>🎉</Text>
          <Text style={[styles.edgeFillerText, { color: textColor }]}>Fin del{'\n'}viaje</Text>
        </LinearGradient>
      </Animated.ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: subtextColor }]}>ITINERARIO</Text>
        {activo && (
          <TouchableOpacity onPress={abrirNueva}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: 0, paddingBottom: 40 }}>
          {actividadesDelDia.length === 0 && (
            <Text style={[styles.emptyDia, { color: subtextColor }]}>Sin actividades para este día</Text>
          )}
          {actividadesDelDia.map(act => (
            <TouchableOpacity
              key={act.id}
              style={[styles.actCard, { backgroundColor: surfaceBg }]}
              onPress={() => activo && abrirEditar(act)}
              activeOpacity={activo ? 0.7 : 1}
            >
              <View style={styles.actHoraBox}>
                <Text style={styles.actHoraText}>{act.hora || 'Todo el día'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actTitulo, { color: textColor }]}>{act.titulo}</Text>
                {!!act.ubicacion && (
                  <View style={styles.actUbicacionRow}>
                    <Ionicons name="location-outline" size={12} color={subtextColor} />
                    <Text style={[styles.actUbicacion, { color: subtextColor }]}>{act.ubicacion}</Text>
                  </View>
                )}
                {!!act.nota && <Text style={[styles.actNota, { color: subtextColor }]}>{act.nota}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <AgregarActividadModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        dark={dark}
        actividad={editingActividad}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { ...typography.h3, marginTop: spacing.md, textAlign: 'center' },
  emptySubtitle: { ...typography.body, marginTop: spacing.xs, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, marginTop: spacing.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
  diasStrip: { flexGrow: 0, paddingVertical: spacing.md },
  diasStripContent: { alignItems: 'center' },
  diaChip: { borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  todayDot: { position: 'absolute', bottom: 6, width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary },
  edgeFiller: { height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  edgeFillerIcon: { fontSize: 20, marginBottom: 3 },
  edgeFillerText: { fontSize: 10, fontWeight: '800', textAlign: 'center', lineHeight: 12 },
  diaChipLabel: { fontSize: 13, fontWeight: '700' },
  diaChipDate: { fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.8 },
  emptyDia: { ...typography.body, textAlign: 'center', paddingVertical: spacing.md },
  actCard: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  actHoraBox: { minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  actHoraText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  actTitulo: { ...typography.bodyMed },
  actUbicacionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  actUbicacion: { fontSize: 12 },
  actNota: { fontSize: 12, marginTop: 4 },
});
