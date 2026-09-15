import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts, typography } from '../constants/theme';
import { formatPrecioEuropeo } from '../utils/formatters';
import { formatAmountShort } from '../utils/proyeccion';

const CHART_HEIGHT = 54;
const FLIP_DURATION = 480;
const TEXTURE_STRIPES = Array.from({ length: 9 });

// Fondo de la tarjeta: degradé base + textura de líneas diagonales finas +
// brillo de esquina + viñeta + el ícono de la app en grande como marca de
// agua — para que no sea un degradé plano.
export function CardBackdrop({ colors: gradientColors, start, end }) {
  return (
    <>
      <LinearGradient colors={gradientColors} start={start} end={end} style={StyleSheet.absoluteFill} />
      <View style={cardBgStyles.stripesLayer} pointerEvents="none">
        {TEXTURE_STRIPES.map((_, i) => (
          <View key={i} style={[cardBgStyles.stripe, { left: `${i * 13 - 15}%` }]} />
        ))}
      </View>
      <LinearGradient
        colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={cardBgStyles.sheen}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.22)']}
        start={{ x: 0.4, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Ionicons
        name="wallet"
        size={172}
        color="rgba(255,255,255,0.1)"
        style={cardBgStyles.watermark}
      />
    </>
  );
}

const cardBgStyles = StyleSheet.create({
  stripesLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  stripe: {
    position: 'absolute',
    top: '-60%',
    width: 2,
    height: '220%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ rotate: '-18deg' }],
  },
  sheen: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '65%',
  },
  watermark: {
    position: 'absolute', right: -34, bottom: -30,
    transform: [{ rotate: '-14deg' }],
  },
});

// Tarjeta de crédito animada que resume el mes: de un lado el total gastado
// y la comparación contra el mes anterior, del otro la tendencia de los
// últimos 6 meses con la proyección de cierre — reemplaza al KPI estático
// de "cuotas activas", que no orientaba ninguna decisión.
export default function GastoCreditCard({
  dark,
  moneda,
  mesAnteriorLabel,
  totalActual,
  totalComparable,
  deltaPct,
  isHoy,
  dia,
  diasEnMes,
  historial,
  promedio,
  proyeccion,
  otrasMonedas,
}) {
  const s = styles(dark);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const toggleFlip = () => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 1,
      duration: FLIP_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const bajo = deltaPct != null && deltaPct <= 0;
  const deltaColor = deltaPct == null ? 'rgba(255,255,255,0.85)' : bajo ? '#BBF7D0' : '#FEE2E2';

  const maxValue = Math.max(1, ...(historial || []).map(h => h.total), proyeccion || 0);
  const barWidth = historial && historial.length ? `${Math.floor(100 / historial.length) - 4}%` : '10%';

  return (
    <View>
      <Pressable
        onPress={toggleFlip}
        style={({ pressed }) => [s.wrap, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <Animated.View
          style={[s.face, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}
        >
          <CardBackdrop colors={['#4F46E5', '#6366F1', '#818CF8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={s.flipTag}>
            <Ionicons name="sync-outline" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={s.flipTagText}>Tendencia</Text>
          </View>

          <View style={s.chipCenter}>
            <Ionicons name="wifi-outline" size={13} color="rgba(120,80,10,0.55)" style={{ transform: [{ rotate: '90deg' }] }} />
          </View>

          <View style={s.topRow}>
            <Text style={s.brand}>GASTO DEL MES</Text>
          </View>

          <View>
            <Text style={s.lbl}>
              Total gastado{isHoy ? ` · día ${dia} de ${diasEnMes}` : ''}
            </Text>
            <Text style={s.amount}>{formatPrecioEuropeo(totalActual, moneda)}</Text>
            {otrasMonedas && otrasMonedas.length > 0 && (
              <Text style={s.otrasMonedas}>
                {otrasMonedas.map(([m, total]) => `+ ${formatPrecioEuropeo(total, m)}`).join('   ')}
              </Text>
            )}
          </View>

          <View style={s.bottomRow}>
            <View>
              <Text style={s.metricLbl}>vs. {mesAnteriorLabel}</Text>
              <Text style={[s.metricVal, { color: deltaColor }]}>
                {deltaPct == null ? '—' : (
                  <>
                    <Ionicons name={bajo ? 'arrow-down' : 'arrow-up'} size={11} color={deltaColor} />
                    {' '}{Math.abs(Math.round(deltaPct))}% {bajo ? 'menos' : 'más'}
                  </>
                )}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.metricLbl}>{isHoy ? `Mismo día, ${mesAnteriorLabel}` : `Total ${mesAnteriorLabel}`}</Text>
              <Text style={s.metricVal}>{formatAmountShort(totalComparable, moneda)}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[s.face, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}
        >
          <CardBackdrop colors={['#312E81', '#4338CA', '#6366F1']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} />
          <View style={s.flipTag}>
            <Ionicons name="sync-outline" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={s.flipTagText}>Volver</Text>
          </View>

          <View style={s.topRow}>
            <View>
              <Text style={s.brand}>ÚLTIMOS 6 MESES{proyeccion != null ? ' + PROYECCIÓN' : ''}</Text>
              <View style={s.avgRow}>
                <Text style={s.metricLbl}>Promedio real</Text>
                <Text style={s.metricVal}>{formatAmountShort(promedio, moneda)}</Text>
              </View>
            </View>
          </View>

          <View style={s.chartRow}>
            {(historial || []).map((h, idx) => {
              const actualH = Math.max(4, Math.round((h.total / maxValue) * CHART_HEIGHT));
              const projTotalH = h.esActual && proyeccion != null
                ? Math.max(actualH, Math.round((proyeccion / maxValue) * CHART_HEIGHT))
                : actualH;
              const projH = projTotalH - actualH;
              return (
                <View key={idx} style={[s.barCol, { width: barWidth }]}>
                  <View style={s.barStack}>
                    {projH > 0 && (
                      <View style={[s.barProjected, { height: projH }]} />
                    )}
                    <View style={[s.bar, h.esActual ? s.barCurrent : null, { height: actualH }]} />
                  </View>
                  <Text style={[s.mLabel, h.esActual && s.mLabelCurrent]}>{h.label}</Text>
                </View>
              );
            })}
          </View>

          {isHoy && proyeccion != null && (
            <View style={s.footRow}>
              <View style={s.legendRow}>
                <View style={s.legendItem}>
                  <View style={s.swatchSolid} />
                  <Text style={s.legendText}>Real</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={s.swatchDashed} />
                  <Text style={s.legendText}>Proyectado</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.metricLbl}>Ritmo actual → fin de mes</Text>
                <Text style={[s.metricVal, { color: '#FDE68A' }]}>{formatAmountShort(proyeccion, moneda)}</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </Pressable>

      <View style={s.hintRow}>
        <Ionicons name="finger-print-outline" size={12} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} />
        <Text style={s.hintText}>Tocá la tarjeta para ver la tendencia y la proyección</Text>
      </View>
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  wrap: {
    aspectRatio: 1.586,
    width: '100%',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    padding: spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    shadowColor: '#4F46E5',
    shadowOpacity: dark ? 0.35 : 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  flipTag: {
    position: 'absolute', top: 12, right: 14, zIndex: 2,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  flipTagText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.4 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingRight: 74 },
  brand: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.5, color: 'rgba(255,255,255,0.92)' },
  avgRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  chipCenter: {
    position: 'absolute', top: '50%', right: 22, marginTop: -11, zIndex: 1,
    width: 30, height: 22, borderRadius: 6,
    backgroundColor: '#FDE68A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(120,80,10,0.3)',
  },
  lbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(255,255,255,0.78)', fontWeight: '700', marginBottom: 4 },
  amount: { fontFamily: fonts.display, fontSize: 30, color: '#fff', letterSpacing: -0.5 },
  otrasMonedas: { fontFamily: fonts.display, fontSize: 18, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  metricLbl: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.72)', fontWeight: '700', marginBottom: 2 },
  metricVal: { fontSize: 14, fontWeight: '800', color: '#fff' },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barCol: { alignItems: 'center' },
  barStack: { height: CHART_HEIGHT, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 14, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.32)' },
  barCurrent: { backgroundColor: '#fff' },
  barProjected: {
    width: 14, borderTopLeftRadius: 3, borderTopRightRadius: 3,
    borderWidth: 1.3, borderColor: 'rgba(255,255,255,0.85)', borderStyle: 'dashed', borderBottomWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  mLabel: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 4, textTransform: 'uppercase' },
  mLabelCurrent: { color: '#fff' },

  footRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.sm },
  legendRow: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatchSolid: { width: 8, height: 8, borderRadius: 2, backgroundColor: '#fff' },
  swatchDashed: { width: 8, height: 8, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', borderStyle: 'dashed' },
  legendText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase' },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, marginBottom: spacing.xs },
  hintText: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
});
