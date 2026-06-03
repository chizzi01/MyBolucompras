import React from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useViajeDetalle } from '../../hooks/queries/useViajeDetalle';
import { viajeGastosService } from '../../services/viajeGastosService';
import { formatMontoEuropeo } from '../../utils/formatters';
import { colors, spacing, radius, typography } from '../../constants/theme';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ViajeResumenModal({ viaje, visible, onClose }) {
  const { dark } = useTheme();
  const navigation = useNavigation();
  const { gastos, pagos, loading } = useViajeDetalle(viaje?.id);

  const bg = dark ? '#0F172A' : '#fff';
  const surface = dark ? '#1E293B' : '#F1F5F9';
  const textPrimary = dark ? colors.text.dark : colors.text.light;
  const textSecondary = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const border = dark ? colors.border.dark : colors.border.light;

  const totalGastado = viaje ? gastos.reduce((sum, g) => sum + g.precio, 0) : 0;
  const porPersona = viaje && viaje.participantes.length > 0
    ? totalGastado / viaje.participantes.length
    : 0;

  const { porPersona: balancePP } = viaje
    ? viajeGastosService.calcularBalance(gastos, viaje.participantes, pagos)
    : { porPersona: [] };

  const handleVerDetalle = () => {
    onClose();
    navigation.navigate('ViajeDetail', { viajeId: viaje.id });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: bg }]}>
          <View style={[s.handle, { backgroundColor: dark ? '#334155' : '#CBD5E1' }]} />

          {/* Header */}
          <View style={[s.header, { borderBottomColor: border }]}>
            <View style={s.headerLeft}>
              <Text style={s.emoji}>{viaje?.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.titulo, { color: textPrimary }]} numberOfLines={1}>
                  {viaje?.titulo}
                </Text>
                <View style={s.cerradoBadge}>
                  <View style={[s.cerradoDot, { backgroundColor: '#64748B' }]} />
                  <Text style={[s.cerradoText, { color: '#64748B' }]}>Archivado</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <ScrollView
              style={s.scroll}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Stats */}
              <View style={s.statsRow}>
                <View style={[s.statCard, { backgroundColor: surface }]}>
                  <Text style={[s.statLabel, { color: textSecondary }]}>TOTAL</Text>
                  <Text style={[s.statVal, { color: textPrimary }]}>
                    ${formatMontoEuropeo(totalGastado)}
                  </Text>
                  <Text style={[s.statSub, { color: textSecondary }]}>
                    {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'}
                  </Text>
                </View>
                <View style={[s.statCard, { backgroundColor: surface }]}>
                  <Text style={[s.statLabel, { color: textSecondary }]}>POR PERSONA</Text>
                  <Text style={[s.statVal, { color: textPrimary }]}>
                    ${formatMontoEuropeo(porPersona)}
                  </Text>
                  <Text style={[s.statSub, { color: textSecondary }]}>
                    {viaje?.participantes.length ?? 0}{' '}
                    {(viaje?.participantes.length ?? 0) === 1 ? 'persona' : 'personas'}
                  </Text>
                </View>
              </View>

              {/* Participantes */}
              {balancePP.length > 0 && (
                <View style={s.section}>
                  <Text style={[s.sectionTitle, { color: textSecondary }]}>PARTICIPANTES</Text>
                  <View style={[s.sectionCard, { backgroundColor: surface }]}>
                    {balancePP.map((p, i) => (
                      <View
                        key={p.userId}
                        style={[
                          s.participanteRow,
                          i < balancePP.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: border,
                          },
                        ]}
                      >
                        <View style={[s.avatar, { backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length] }]}>
                          <Text style={s.avatarText}>{p.nombre[0]?.toUpperCase()}</Text>
                        </View>
                        <Text style={[s.participanteNombre, { color: textPrimary }]} numberOfLines={1}>
                          {p.nombre}
                        </Text>
                        <Text style={[s.participanteMonto, { color: textSecondary }]}>
                          ${formatMontoEuropeo(p.total)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Gastos */}
              {gastos.length > 0 && (
                <View style={s.section}>
                  <Text style={[s.sectionTitle, { color: textSecondary }]}>DETALLE DE GASTOS</Text>
                  <View style={[s.sectionCard, { backgroundColor: surface }]}>
                    {gastos.map((g, i) => (
                      <View
                        key={g.id}
                        style={[
                          s.gastoRow,
                          i < gastos.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: border,
                          },
                        ]}
                      >
                        <View style={s.gastoLeft}>
                          <Text style={[s.gastoObjeto, { color: textPrimary }]} numberOfLines={1}>
                            {g.objeto}
                          </Text>
                          <Text style={[s.gastoMeta, { color: textSecondary }]}>
                            {g.fecha}
                            {g.pagadorNombre ? ` · ${g.pagadorNombre}` : ''}
                          </Text>
                        </View>
                        <Text style={[s.gastoPrecio, { color: textPrimary }]}>
                          ${formatMontoEuropeo(g.precio)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {gastos.length === 0 && (
                <View style={s.empty}>
                  <Text style={{ fontSize: 36 }}>📭</Text>
                  <Text style={[s.emptyText, { color: textSecondary }]}>
                    No hay gastos registrados
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={s.detalleBtn}
                onPress={handleVerDetalle}
                activeOpacity={0.85}
              >
                <Text style={s.detalleBtnText}>Ver detalle completo</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    paddingBottom: 16,
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, flex: 1, marginRight: spacing.sm,
  },
  emoji: { fontSize: 30 },
  titulo: { ...typography.h3, marginBottom: 3 },
  cerradoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
  },
  cerradoDot: { width: 5, height: 5, borderRadius: 2.5 },
  cerradoText: { fontSize: 11, fontWeight: '600' },
  loadingContainer: {
    height: 200, justifyContent: 'center', alignItems: 'center',
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statCard: {
    flex: 1, borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  statLabel: {
    fontSize: 9, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 3,
  },
  statVal: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statSub: { fontSize: 11 },
  section: { marginTop: spacing.md },
  sectionTitle: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.xs,
  },
  sectionCard: { borderRadius: radius.md, overflow: 'hidden' },
  participanteRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  participanteNombre: { ...typography.body, flex: 1 },
  participanteMonto: { ...typography.captionMed },
  gastoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm,
  },
  gastoLeft: { flex: 1, marginRight: spacing.sm },
  gastoObjeto: { ...typography.bodyBold, marginBottom: 2 },
  gastoMeta: { ...typography.caption },
  gastoPrecio: { ...typography.bodyBold },
  empty: {
    alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: { ...typography.body },
  detalleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.full, paddingVertical: 13,
    marginTop: spacing.lg,
  },
  detalleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
