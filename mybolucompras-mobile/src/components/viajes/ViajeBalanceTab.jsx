import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { viajeGastosService } from '../../services/viajeGastosService';
import { colors, spacing, typography } from '../../constants/theme';

export default function ViajeBalanceTab({ viaje, gastos, participantColor, dark }) {
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const barBgColor = dark ? '#263347' : '#E2E8F0';
  const amountColor = dark ? '#818CF8' : '#4F46E5';

  const { porPersona, liquidacion } = useMemo(
    () => viajeGastosService.calcularBalance(gastos, viaje.participantes),
    [gastos, viaje.participantes]
  );

  const maxTotal = Math.max(...porPersona.map(p => p.total), 1);

  const sectionLabel = (title) => (
    <Text style={[styles.sectionLabel, { color: subtextColor }]}>{title}</Text>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
    >
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
                <Text style={[styles.sub, { color: subtextColor }]}>Pagó ${p.total.toFixed(0)} total</Text>
              </View>
              <Text style={[styles.neto, { color: netoPositive ? '#10B981' : p.neto < 0 ? colors.error : subtextColor }]}>
                {netoPositive ? '+$' : p.neto < 0 ? '-$' : '$'}{Math.abs(p.neto).toFixed(0)}
              </Text>
            </View>
            <View style={[styles.barBg, { backgroundColor: barBgColor }]}>
              <View style={[styles.bar, { width: `${(p.total / maxTotal) * 100}%`, backgroundColor: color }]} />
            </View>
            <View style={styles.barLegend}>
              <Text style={[styles.barLeg, { color: subtextColor }]}>$0</Text>
              <Text style={[styles.barLeg, { color: subtextColor }]}>${maxTotal.toFixed(0)}</Text>
            </View>
          </View>
        );
      })}

      {liquidacion.length > 0 && (
        <>
          {sectionLabel('CÓMO LIQUIDAR')}
          {liquidacion.map((t) => (
            <View key={`${t.de}-${t.hacia}`} style={[styles.transCard, { backgroundColor: surfaceBg, borderColor }]}>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.de) }]}>
                <Text style={styles.avatarText}>{t.deNombre?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.transInfo}>
                <Text style={[styles.transNames, { color: textColor }]}>{t.deNombre} → {t.haciaNombre}</Text>
                <Text style={[styles.transSub, { color: subtextColor }]}>debe transferir</Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.hacia) }]}>
                <Text style={styles.avatarText}>{t.haciaNombre?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.amountPill}>
                <Text style={[styles.amountText, { color: amountColor }]}>${t.monto.toFixed(0)}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {liquidacion.length === 0 && porPersona.length > 0 && (
        <View style={[styles.card, { backgroundColor: surfaceBg, borderColor, alignItems: 'center', padding: spacing.lg }]}>
          <Text style={{ fontSize: 32 }}>✅</Text>
          <Text style={[styles.sub, { color: subtextColor, marginTop: 8 }]}>Todo está saldado</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.captionMed, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm,
  },
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
  transCard: {
    borderRadius: 12, padding: 10, marginBottom: 5,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  transInfo: { flex: 1 },
  transNames: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  transSub: { fontSize: 10 },
  amountPill: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  amountText: { fontSize: 13, fontWeight: '800' },
});
