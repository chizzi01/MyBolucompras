import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../constants/theme';
import { formatPrecioEuropeo } from '../utils/formatters';
import { CardBackdrop } from './GastoCreditCard';

// Tarjeta naranja para meses futuros: mismo lenguaje visual que la tarjeta
// del mes actual, pero sin flip — tocarla abre el desglose (ProyeccionModal)
// en vez de girar, porque acá no hay tendencia real que mostrar todavía.
export default function GastoProyectadoCard({ dark, totales, onPress }) {
  const entries = Object.entries(totales || {});
  const hayTotal = entries.length > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.wrap, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={s.face}>
        <CardBackdrop
          colors={['#C2410C', '#F97316', '#FDBA74']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={s.badge}>
          <Text style={s.badgeText}>Proyectado</Text>
        </View>

        <View style={s.chipCenter}>
          <Ionicons name="wifi-outline" size={13} color="rgba(120,60,10,0.5)" style={{ transform: [{ rotate: '90deg' }] }} />
        </View>

        <View style={s.topRow}>
          <Text style={s.brand}>GASTO PROYECTADO</Text>
        </View>

        <View>
          {hayTotal ? (
            entries.map(([moneda, total]) => (
              <Text key={moneda} style={s.amount}>
                {formatPrecioEuropeo(total, moneda)}
                {entries.length > 1 && <Text style={s.amountMoneda}> {moneda}</Text>}
              </Text>
            ))
          ) : (
            <Text style={s.amount}>$ 0,00</Text>
          )}
        </View>

        <View style={s.bottomRow}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={s.metricLbl}>Basado en</Text>
            <Text style={s.metricVal} numberOfLines={1}>
              {hayTotal ? 'Fijos y cuotas vigentes' : 'Sin gastos proyectados'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.metricLbl}>Detalle</Text>
            <View style={s.hintCta}>
              <Text style={s.metricVal}>Ver desglose</Text>
              <Ionicons name="chevron-forward" size={13} color="#fff" />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { aspectRatio: 1.586, width: '100%' },
  face: {
    flex: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#EA580C',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  badge: {
    position: 'absolute', top: 12, right: 14, zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipCenter: {
    position: 'absolute', top: '50%', right: 22, marginTop: -11, zIndex: 1,
    width: 30, height: 22, borderRadius: 6,
    backgroundColor: '#FED7AA',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(120,60,10,0.3)',
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', paddingRight: 74 },
  brand: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.5, color: 'rgba(255,255,255,0.92)' },
  amount: { fontFamily: fonts.display, fontSize: 30, color: '#fff', letterSpacing: -0.5 },
  amountMoneda: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  metricLbl: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.72)', fontWeight: '700', marginBottom: 2 },
  metricVal: { fontSize: 14, fontWeight: '800', color: '#fff' },
  hintCta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
