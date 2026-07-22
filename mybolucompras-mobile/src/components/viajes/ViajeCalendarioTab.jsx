// src/components/viajes/ViajeCalendarioTab.jsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diasStrip} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
        {dias.map(dia => {
          const active = dia.iso === selectedIso;
          return (
            <TouchableOpacity
              key={dia.iso}
              style={[styles.diaChip, { backgroundColor: active ? colors.primary : surfaceBg }]}
              onPress={() => setSelectedIso(dia.iso)}
              activeOpacity={0.7}
            >
              <Text style={[styles.diaChipLabel, { color: active ? '#fff' : textColor }]}>{dia.label}</Text>
              <Text style={[styles.diaChipDate, { color: active ? 'rgba(255,255,255,0.8)' : subtextColor }]}>{dia.dateLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
  diaChip: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, alignItems: 'center' },
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
