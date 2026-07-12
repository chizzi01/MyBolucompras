import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGastos } from '../hooks/queries/useGastos';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useDeudas } from '../hooks/queries/useDeudas';
import { useTheme } from '../context/ThemeContext';
import { getCuotasRestantes, montoMensualDeuda } from '../utils/cuotas';
import { getGastosMes, getCostoMes, calcularTotalesPorMoneda, formatAmountShort } from '../utils/proyeccion';
import { parsePrecio, getCurrencySymbol, formatARS, formatPrecioEuropeo } from '../utils/formatters';
import { colors, spacing, radius, typography } from '../constants/theme';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

import { notificationService } from '../services/notificationService';
import NotificationsModal from './NotificationsModal';
import ProyeccionModal from '../components/ProyeccionModal';

export default function DashboardScreen() {
  const { gastos } = useGastos();
  const { mydata } = useConfiguracion();
  const { deudas } = useDeudas();
  const { dark } = useTheme();
  const s = styles(dark);

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  React.useEffect(() => {
    notificationService.getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
  }, []);

  const hoy = new Date();
  const [mesSel, setMesSel] = useState({ mes: hoy.getMonth(), anio: hoy.getFullYear() });

  const isHoy = mesSel.mes === hoy.getMonth() && mesSel.anio === hoy.getFullYear();

  const mesSelIndex = mesSel.anio * 12 + mesSel.mes;
  const hoyIndex = hoy.getFullYear() * 12 + hoy.getMonth();
  const esMesFuturo = mesSelIndex > hoyIndex;
  const esMesLimite = mesSelIndex >= hoyIndex + 6;
  const [showProyeccionModal, setShowProyeccionModal] = useState(false);

  const prevMes = () => setMesSel(p =>
    p.mes === 0 ? { mes: 11, anio: p.anio - 1 } : { mes: p.mes - 1, anio: p.anio }
  );
  const nextMes = () => {
    if (!esMesLimite) setMesSel(p =>
      p.mes === 11 ? { mes: 0, anio: p.anio + 1 } : { mes: p.mes + 1, anio: p.anio }
    );
  };

  const stats = useMemo(() => {
    const gastosMes = getGastosMes(gastos, mesSel, mydata);
    const totalesPorMoneda = calcularTotalesPorMoneda(gastosMes);

    const cuotasActivas = gastos.filter(g => {
      if (g.isFijo) return true;
      const r = getCuotasRestantes(g, mydata);
      return r === 'N/A' || r > 0;
    }).length;

    const masCaro = gastosMes.reduce((max, g) => {
      const p = getCostoMes(g);
      return p > (max?.precio || 0) ? { ...g, precio: p } : max;
    }, null);

    const porEtiqueta = {};
    gastosMes.forEach(g => {
      if (g.moneda !== 'ARS') return;
      const etiq = g.etiqueta || 'Sin etiqueta';
      porEtiqueta[etiq] = (porEtiqueta[etiq] || 0) + getCostoMes(g);
    });
    const maxEtiqueta = Math.max(...Object.values(porEtiqueta), 1);

    const cuotasPendientes = gastosMes.filter(
      g => !g.isFijo && g.tipo === 'credito' && Number(g.cuotas) > 1
    ).length;
    const fijosMes = gastosMes.filter(g => g.isFijo).length;

    return { totalesPorMoneda, cuotasActivas, masCaro, porEtiqueta, maxEtiqueta, gastosMes, cuotasPendientes, fijosMes };
  }, [gastos, mydata, mesSel]);

  const statsProxMes = useMemo(() => {
    const proxMesSel = mesSel.mes === 11
      ? { mes: 0, anio: mesSel.anio + 1 }
      : { mes: mesSel.mes + 1, anio: mesSel.anio };
    const gastosProx = getGastosMes(gastos, proxMesSel, mydata);
    return {
      totalesPorMoneda: calcularTotalesPorMoneda(gastosProx),
      mesNombre: MESES[proxMesSel.mes],
    };
  }, [gastos, mydata, mesSel]);

  // Balance neto por moneda: lo que me deben menos lo que debo, en vez de mostrar
  // ambos totales por separado (misma simplificación que la pantalla de Deudores).
  const deudaNeta = useMemo(() => {
    const pendientes = deudas.filter(d => !d.pagado);
    const porMoneda = {};
    pendientes.forEach(d => {
      const moneda = d.moneda || 'ARS';
      if (!porMoneda[moneda]) porMoneda[moneda] = { neto: 0, count: 0 };
      const monto = montoMensualDeuda(d, mydata);
      porMoneda[moneda].neto += d.esAcreedor ? monto : -monto;
      porMoneda[moneda].count += 1;
    });
    return porMoneda;
  }, [deudas, mydata]);

  const deudaNetaEntries = Object.entries(deudaNeta).filter(([, v]) => v.count > 0);
  const hayDeudaNeta = deudaNetaEntries.length > 0;

  const heroTotales = useMemo(() => {
    if (esMesFuturo) return stats.totalesPorMoneda;
    const combined = { ...stats.totalesPorMoneda };
    Object.entries(deudaNeta).forEach(([moneda, { neto }]) => {
      if (neto > 0) combined[moneda] = (combined[moneda] || 0) + neto;
    });
    return combined;
  }, [esMesFuturo, stats.totalesPorMoneda, deudaNeta]);

  const hayTotal = Object.keys(heroTotales).length > 0;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header con navegación de mes */}
        <View style={s.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={s.pageTitle}>Dashboard</Text>
            <TouchableOpacity 
              style={s.notifBtn} 
              onPress={() => setShowNotifications(true)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
                size={22} 
                color={unreadCount > 0 ? colors.primary : (dark ? colors.textSecondary.dark : colors.textSecondary.light)} 
              />
              {unreadCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={s.monthNav}>
            <TouchableOpacity
              onPress={prevMes}
              style={s.monthNavBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={dark ? colors.textSecondary.dark : colors.textSecondary.light}
              />
            </TouchableOpacity>
            <Text style={[s.monthLabel, esMesFuturo && { color: '#F97316' }]}>
              {MESES[mesSel.mes]} {mesSel.anio}
            </Text>
            <TouchableOpacity
              onPress={nextMes}
              style={s.monthNavBtn}
              disabled={esMesLimite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={esMesLimite ? 'transparent' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Total del mes — H1 hero */}
        <TouchableOpacity
          style={[s.totalHero, esMesFuturo && s.totalHeroFuturo]}
          onPress={esMesFuturo ? () => setShowProyeccionModal(true) : undefined}
          activeOpacity={esMesFuturo ? 0.85 : 1}
        >
          {esMesFuturo && (
            <View style={s.proyectadoBadge}>
              <Text style={s.proyectadoBadgeText}>Proyectado</Text>
            </View>
          )}
          {hayTotal ? (
            <>
              {Object.entries(heroTotales).map(([moneda, total]) => (
                <View key={moneda} style={s.totalHeroRow}>
                  <Text style={[s.totalHeroAmount, esMesFuturo && { color: '#F97316' }]}>
                    {formatPrecioEuropeo(total, moneda)}
                  </Text>
                  {Object.keys(heroTotales).length > 1 && (
                    <Text style={s.totalHeroMoneda}>{moneda}</Text>
                  )}
                </View>
              ))}
              <Text style={s.totalHeroLabel}>
                {esMesFuturo
                  ? 'proyectado · tocá para ver el desglose'
                  : deudaNetaEntries.some(([, v]) => v.neto > 0)
                    ? `gastado + pendiente de cobro · ${MESES[mesSel.mes].toLowerCase()}`
                    : `gastado en ${MESES[mesSel.mes].toLowerCase()}`}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.totalHeroEmpty}>$ 0,00</Text>
              <Text style={s.totalHeroLabel}>sin gastos este mes</Text>
            </>
          )}

          {!esMesFuturo && hayDeudaNeta && (
            <>
              <View style={s.totalHeroDivider} />
              <View style={s.totalHeroBreakdownRow}>
                <Text style={s.totalHeroBreakdownItem}>
                  <Text style={s.totalHeroBreakdownLabel}>gastado  </Text>
                  {Object.entries(stats.totalesPorMoneda).map(([moneda, total]) => formatPrecioEuropeo(total, moneda)).join('  ')}
                </Text>
              </View>
              {deudaNetaEntries.map(([moneda, { neto, count }]) => {
                const color = neto > 0 ? colors.warning : neto < 0 ? colors.error : colors.accent;
                const label = neto > 0 ? 'te deben' : neto < 0 ? 'debés' : 'saldado';
                return (
                  <View key={moneda}>
                    <Text style={[s.totalHeroMiDeuda, { color }]}>
                      {formatPrecioEuropeo(Math.abs(neto), moneda)}
                    </Text>
                    <Text style={[s.totalHeroMiDeudaLabel, { color }]}>
                      {label} · {count} deuda{count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </TouchableOpacity>

        {/* KPI cards */}
        <View style={s.kpiRow}>
          {esMesFuturo ? (
            <>
              <KPICard
                label="Cuotas pendientes"
                value={stats.cuotasPendientes}
                dark={dark}
                accent="#F97316"
              />
              <KPICard
                label="Fijos activos"
                value={stats.fijosMes}
                dark={dark}
                accent="#F97316"
              />
            </>
          ) : (
            <>
              <KPICard
                label="Gastos del mes"
                value={stats.gastosMes.length}
                dark={dark}
                accent={colors.primary}
              />
              <KPICard
                label="Cuotas activas"
                value={stats.cuotasActivas}
                dark={dark}
                accent={colors.accent}
              />
            </>
          )}
          {!esMesLimite && (
            <ProxMesKPI
              totales={statsProxMes.totalesPorMoneda}
              mesNombre={statsProxMes.mesNombre}
              onPress={nextMes}
              dark={dark}
            />
          )}
        </View>

        {/* Gasto más caro */}
        {stats.masCaro && (
          <>
            <Text style={s.section}>Gasto más caro</Text>
            <View style={s.destacado}>
              <Text style={s.destacadoObj} numberOfLines={1}>{stats.masCaro.objeto}</Text>
              <Text style={s.destacadoVal}>
                {formatPrecioEuropeo(stats.masCaro.precio, stats.masCaro.moneda)}
              </Text>
            </View>
          </>
        )}

        {/* Distribución por etiqueta */}
        {Object.keys(stats.porEtiqueta).length > 0 && (
          <>
            <Text style={s.section}>Por etiqueta — ARS</Text>
            {Object.entries(stats.porEtiqueta)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([etiq, total]) => (
                <View key={etiq} style={s.barRow}>
                  <Text style={s.barLabel} numberOfLines={1}>{etiq}</Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${Math.round((total / stats.maxEtiqueta) * 100)}%` }]} />
                  </View>
                  <Text style={s.barVal}>{formatPrecioEuropeo(total, 'ARS')}</Text>
                </View>
              ))}
          </>
        )}

        {/* Balance neto con deudas: un solo total simplificado por moneda en vez de
            mostrar "por cobrar" y "que debo" como dos cifras separadas. */}
        {!esMesFuturo && hayDeudaNeta && (
          <>
            <Text style={s.section}>Deudas con amigos</Text>
            {deudaNetaEntries.map(([moneda, { neto, count }]) => {
              const positivo = neto > 0;
              const saldado = neto === 0;
              const accent = saldado ? colors.accent : positivo ? colors.warning : colors.error;
              const cardStyle = saldado ? s.deudaCardSaldada : positivo ? s.deudaCard : s.miDeudaCard;
              return (
                <View key={moneda} style={cardStyle}>
                  <View style={s.deudaLeft}>
                    <Ionicons
                      name={saldado ? 'checkmark-circle-outline' : positivo ? 'people-outline' : 'wallet-outline'}
                      size={22}
                      color={accent}
                    />
                    <Text style={[s.deudaCount, { color: accent }]}>
                      {count} deuda{count !== 1 ? 's' : ''} · {saldado ? 'saldadas' : positivo ? 'te deben' : 'debés'}
                    </Text>
                  </View>
                  {!saldado && (
                    <View style={s.deudaAmounts}>
                      <Text style={[s.deudaAmount, { color: accent }]}>
                        {moneda === 'ARS' ? '$' : moneda} {new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(neto))}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onRefresh={() => {
          notificationService.getUnreadCount().then(setUnreadCount);
        }}
      />

      <ProyeccionModal
        visible={showProyeccionModal}
        onClose={() => setShowProyeccionModal(false)}
        gastos={stats.gastosMes}
        mes={mesSel}
        mydata={mydata}
      />
    </SafeAreaView>
  );
}

function KPICard({ label, value, dark, accent }) {
  const s = StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: dark ? colors.surface.dark : colors.surface.light,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: dark ? colors.border.dark : colors.border.light,
      alignItems: 'center',
    },
    val: { fontSize: 32, fontWeight: '800', color: accent, marginBottom: 4 },
    lbl: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textAlign: 'center' },
  });
  return (
    <View style={s.card}>
      <Text style={s.val}>{value}</Text>
      <Text style={s.lbl}>{label}</Text>
    </View>
  );
}

function ProxMesKPI({ totales, mesNombre, onPress, dark }) {
  const arsTotal = totales['ARS'];
  const firstEntry = Object.entries(totales)[0];
  const displayText = arsTotal != null
    ? formatAmountShort(arsTotal, 'ARS')
    : firstEntry
      ? formatAmountShort(firstEntry[1], firstEntry[0])
      : '$ 0';

  const s = StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: dark ? colors.surface.dark : colors.surface.light,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#F9731640',
      alignItems: 'center',
      justifyContent: 'center',
    },
    val: { fontSize: 13, fontWeight: '700', color: '#F97316', marginBottom: 2, textAlign: 'center' },
    lbl: { fontSize: 10, fontWeight: '500', color: '#F97316', textAlign: 'center', opacity: 0.8 },
  });

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.val}>{displayText}</Text>
      <Text style={s.lbl}>{mesNombre} →</Text>
    </TouchableOpacity>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  notifBtn: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: dark ? colors.background.dark : colors.background.light,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  scroll: { padding: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pageTitle: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  monthNavBtn: { padding: 4 },
  monthLabel: {
    ...typography.bodyMed,
    color: dark ? colors.text.dark : colors.text.light,
    minWidth: 130,
    textAlign: 'center',
  },
  totalHero: {
    alignItems: 'center',
    paddingVertical: spacing.lg + 4,
    marginBottom: spacing.md,
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  totalHeroRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  totalHeroAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
  },
  totalHeroMoneda: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  totalHeroLabel: {
    ...typography.caption,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    marginTop: 6,
  },
  totalHeroEmpty: {
    fontSize: 42,
    fontWeight: '800',
    color: dark ? '#334155' : '#CBD5E1',
    letterSpacing: -1,
  },
  totalHeroDivider: {
    height: 1,
    backgroundColor: dark ? '#334155' : '#E2E8F0',
    width: '80%',
    marginVertical: spacing.sm,
  },
  totalHeroBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  totalHeroBreakdownItem: {
    ...typography.caption,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  totalHeroBreakdownLabel: {
    ...typography.caption,
    color: dark ? '#475569' : '#94A3B8',
  },
  totalHeroBreakdownSep: {
    ...typography.caption,
    color: dark ? '#334155' : '#CBD5E1',
  },
  totalHeroDeuda: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: -0.5,
  },
  totalHeroDeudaLabel: {
    ...typography.caption,
    color: colors.warning,
    marginTop: 2,
    opacity: 0.8,
  },
  totalHeroMiDeuda: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.error,
    letterSpacing: -0.5,
  },
  totalHeroMiDeudaLabel: {
    ...typography.caption,
    color: colors.error,
    marginTop: 2,
    opacity: 0.8,
  },
  section: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  destacado: {
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
  },
  destacadoObj: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light, flex: 1, marginRight: spacing.sm },
  destacadoVal: { ...typography.bodyBold, color: colors.primary },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: spacing.sm },
  barLabel: {
    ...typography.caption,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: dark ? '#334155' : '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  barVal: {
    ...typography.caption,
    color: dark ? colors.text.dark : colors.text.light,
    width: 80,
    textAlign: 'right',
  },
  deudaCard: {
    backgroundColor: dark ? '#1c1408' : '#FFFBEB',
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.warning + '60',
    padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  miDeudaCard: {
    backgroundColor: dark ? '#1c0a0a' : '#FEF2F2',
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.error + '60',
    padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  deudaCardSaldada: {
    backgroundColor: dark ? '#0d2e1e' : '#ECFDF5',
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.accent + '60',
    padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  deudaLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  deudaCount: { ...typography.bodyBold, color: colors.warning },
  miDeudaCount: { ...typography.bodyBold, color: colors.error },
  deudaAmounts: { alignItems: 'flex-end', justifyContent: 'center' },
  deudaAmount: { fontSize: 18, fontWeight: '800', color: colors.warning, letterSpacing: -0.5 },
  miDeudaAmount: { fontSize: 18, fontWeight: '800', color: colors.error, letterSpacing: -0.5 },
  proyectadoBadge: {
    backgroundColor: '#F9731620',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#F9731650',
  },
  proyectadoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F97316',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalHeroFuturo: {
    borderColor: '#F9731650',
    shadowColor: '#F97316',
  },
});
