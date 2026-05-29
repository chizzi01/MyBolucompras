// src/components/viajes/ViajeBalanceTab.jsx
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { viajeGastosService } from '../../services/viajeGastosService';
import { colors, spacing, typography } from '../../constants/theme';
import { formatMontoEuropeo } from '../../utils/formatters';
import RegistrarPagoModal from './RegistrarPagoModal';

export default function ViajeBalanceTab({ viaje, gastos, pagos, participantColor, dark, onRefresh, refreshing }) {
  const [pagoModal, setPagoModal] = useState(null);

  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const barBgColor = dark ? '#263347' : '#E2E8F0';
  const amountColor = dark ? '#818CF8' : '#4F46E5';

  const { porPersona, liquidacion } = useMemo(
    () => viajeGastosService.calcularBalance(gastos, viaje.participantes, pagos),
    [gastos, viaje.participantes, pagos]
  );

  const maxTotal = Math.max(...porPersona.map(p => p.total), 1);

  const getNombre = (userId) =>
    viaje.participantes.find(p => p.userId === userId)?.nombre || userId.slice(0, 8);

  const sectionLabel = (title) => (
    <Text style={[styles.sectionLabel, { color: subtextColor }]}>{title}</Text>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {/* ── CUÁNTO PUSO CADA UNO ── */}
      {sectionLabel('CUÁNTO PUSO CADA UNO')}
      {porPersona.map(p => {
        const color = participantColor(p.userId);
        const netoPositive = p.neto > 0;
        return (
          <View key={p.userId} style={[styles.card, { backgroundColor: surfaceBg, borderColor }]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: color }]}>
                <Text style={styles.avatarText}>{p.nombre?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombre, { color: textColor }]}>{p.nombre}</Text>
                <Text style={[styles.sub, { color: subtextColor }]}>Pagó ${formatMontoEuropeo(p.total)} total</Text>
              </View>
              <Text style={[styles.neto, {
                color: netoPositive ? '#10B981' : p.neto < 0 ? colors.error : subtextColor,
              }]}>
                {netoPositive ? '+$' : p.neto < 0 ? '-$' : '$'}{formatMontoEuropeo(Math.abs(p.neto))}
              </Text>
            </View>
            <View style={[styles.barBg, { backgroundColor: barBgColor }]}>
              <View style={[styles.bar, { width: `${(p.total / maxTotal) * 100}%`, backgroundColor: color }]} />
            </View>
            <View style={styles.barLegend}>
              <Text style={[styles.barLeg, { color: subtextColor }]}>$0</Text>
              <Text style={[styles.barLeg, { color: subtextColor }]}>${formatMontoEuropeo(maxTotal)}</Text>
            </View>
          </View>
        );
      })}

      {/* ── TRANSFERENCIAS PENDIENTES ── */}
      {liquidacion.length > 0 && (
        <>
          {sectionLabel('TRANSFERENCIAS PENDIENTES')}
          {liquidacion.map((t) => (
            <View key={`${t.de}-${t.hacia}`} style={[styles.transCard, { backgroundColor: surfaceBg, borderColor }]}>
              {/* Personas */}
              <View style={styles.transRow}>
                <View style={styles.transPerson}>
                  <View style={[styles.avatar, { backgroundColor: participantColor(t.de) }]}>
                    <Text style={styles.avatarText}>{t.deNombre?.[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.transName, { color: textColor }]} numberOfLines={1}>{t.deNombre}</Text>
                </View>

                <View style={styles.transArrowCol}>
                  <Ionicons name="arrow-forward" size={16} color={subtextColor} />
                  <Text style={[styles.transDebeText, { color: subtextColor }]}>debe</Text>
                </View>

                <View style={[styles.transPerson, { alignItems: 'flex-end' }]}>
                  <View style={[styles.avatar, { backgroundColor: participantColor(t.hacia) }]}>
                    <Text style={styles.avatarText}>{t.haciaNombre?.[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.transName, { color: textColor }]} numberOfLines={1}>{t.haciaNombre}</Text>
                </View>
              </View>

              {/* Monto + botón */}
              <View style={[styles.transBottom, { borderTopColor: borderColor }]}>
                <Text style={[styles.transMonto, { color: amountColor }]}>
                  ${formatMontoEuropeo(t.monto)}
                </Text>
                {viaje.estado === 'activo' && (
                  <TouchableOpacity
                    style={[styles.pagarBtn, { backgroundColor: dark ? '#0f2d1e' : '#D1FAE5', borderColor: '#10B981' }]}
                    onPress={() => setPagoModal(t)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                    <Text style={styles.pagarText}>Registrar pago</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </>
      )}

      {/* ── TODO SALDADO ── */}
      {liquidacion.length === 0 && porPersona.length > 0 && (
        <View style={[styles.card, { backgroundColor: surfaceBg, borderColor, alignItems: 'center', padding: spacing.lg }]}>
          <Text style={{ fontSize: 32 }}>✅</Text>
          <Text style={[styles.sub, { color: subtextColor, marginTop: 8 }]}>Todo está saldado</Text>
        </View>
      )}

      {/* ── PAGOS REGISTRADOS ── */}
      {pagos.length > 0 && (
        <>
          {sectionLabel('PAGOS REGISTRADOS')}
          {pagos.map(p => (
            <View key={p.id} style={[styles.pagoRow, { backgroundColor: surfaceBg, borderColor }]}>
              <View style={[styles.avatar, { backgroundColor: participantColor(p.pagadorId), width: 28, height: 28, borderRadius: 14 }]}>
                <Text style={[styles.avatarText, { fontSize: 11 }]}>{getNombre(p.pagadorId)[0]?.toUpperCase()}</Text>
              </View>
              <Text style={[styles.pagoNames, { color: textColor }]}>
                {getNombre(p.pagadorId)} → {getNombre(p.receptorId)}
              </Text>
              <View style={[styles.pagoBadge, { backgroundColor: '#10B98118' }]}>
                <Text style={styles.pagoMonto}>${formatMontoEuropeo(p.monto)}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <RegistrarPagoModal
        visible={!!pagoModal}
        onClose={() => setPagoModal(null)}
        onSuccess={() => { setPagoModal(null); onRefresh?.(); }}
        viaje={viaje}
        transaccion={pagoModal}
        dark={dark}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.captionMed, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md,
  },
  // ── Resumen por persona ──
  card: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nombre: { ...typography.bodyMed },
  sub: { ...typography.caption, marginTop: 2 },
  neto: { ...typography.bodyBold, fontSize: 18 },
  barBg: { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  bar: { height: 6, borderRadius: 4 },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  barLeg: { fontSize: 10 },
  // ── Transferencias pendientes ──
  transCard: {
    borderRadius: 14, borderWidth: 1,
    marginBottom: spacing.sm, overflow: 'hidden',
  },
  transRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  transPerson: { alignItems: 'center', gap: 4, flex: 1 },
  transArrowCol: { alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  transDebeText: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  transName: { fontSize: 12, fontWeight: '700', maxWidth: 80, textAlign: 'center' },
  transBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderTopWidth: 1,
  },
  transMonto: { fontSize: 22, fontWeight: '900' },
  pagarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  pagarText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  // ── Pagos registrados ──
  pagoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4,
  },
  pagoNames: { flex: 1, fontSize: 13, fontWeight: '600' },
  pagoBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pagoMonto: { fontSize: 13, fontWeight: '800', color: '#10B981' },
});
