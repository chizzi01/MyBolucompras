// src/components/viajes/ViajeBalanceTab.jsx
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { viajeGastosService } from '../../services/viajeGastosService';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function ViajeBalanceTab({ viaje, gastos, participantColor, dark }) {
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const { porPersona, liquidacion } = useMemo(
    () => viajeGastosService.calcularBalance(gastos, viaje.participantes),
    [gastos, viaje.participantes]
  );

  const maxTotal = Math.max(...porPersona.map(p => p.total), 1);

  const sectionLabel = (title) => (
    <Text style={[styles.sectionLabel, { color: subtextColor }]}>{title}</Text>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      {sectionLabel('CUÁNTO PUSO CADA UNO')}
      {porPersona.map(p => {
        const color = participantColor(p.userId);
        const netoPositive = p.neto > 0;
        return (
          <View key={p.userId} style={[styles.card, { backgroundColor: surfaceBg }]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: color }]}>
                <Text style={styles.avatarText}>{p.nombre[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombre, { color: textColor }]}>{p.nombre}</Text>
                <Text style={[styles.sub, { color: subtextColor }]}>Pagó por otros: ${p.total.toFixed(0)}</Text>
              </View>
              <Text style={[styles.neto, { color: netoPositive ? '#10B981' : p.neto < 0 ? colors.error : subtextColor }]}>
                {netoPositive ? '+' : ''}{p.neto.toFixed(0)}
              </Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.bar, { width: `${(p.total / maxTotal) * 100}%`, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}

      {liquidacion.length > 0 && (
        <>
          {sectionLabel('CÓMO LIQUIDAR')}
          {liquidacion.map((t, i) => (
            <View key={i} style={[styles.card, styles.transRow, { backgroundColor: surfaceBg }]}>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.de) }]}>
                <Text style={styles.avatarText}>{t.deNombre[0]?.toUpperCase()}</Text>
              </View>
              <Text style={[styles.transName, { color: textColor }]}>{t.deNombre}</Text>
              <Text style={{ color: subtextColor }}>→</Text>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.hacia) }]}>
                <Text style={styles.avatarText}>{t.haciaNombre[0]?.toUpperCase()}</Text>
              </View>
              <Text style={[styles.transName, { color: textColor }]}>{t.haciaNombre}</Text>
              <Text style={[styles.transMonto, { color: colors.primary }]}>${t.monto.toFixed(0)}</Text>
            </View>
          ))}
        </>
      )}

      {liquidacion.length === 0 && porPersona.length > 0 && (
        <View style={[styles.card, { backgroundColor: surfaceBg, alignItems: 'center', padding: spacing.lg }]}>
          <Text style={{ fontSize: 32 }}>✅</Text>
          <Text style={[styles.sub, { color: subtextColor, marginTop: 8 }]}>Todo está saldado</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm },
  card: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nombre: { ...typography.bodyMed },
  sub: { ...typography.caption, marginTop: 2 },
  neto: { ...typography.bodyBold, fontSize: 18 },
  barBg: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  transRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  transName: { ...typography.bodyMed, flex: 1 },
  transMonto: { ...typography.bodyBold },
});
