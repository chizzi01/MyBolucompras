import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGastos } from '../hooks/queries/useGastos';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useDeudas } from '../hooks/queries/useDeudas';
import { useNotificacionesPendientes } from '../hooks/queries/useNotificacionesPendientes';
import { useTheme } from '../context/ThemeContext';
import { getCuotasRestantes, montoMensualDeuda } from '../utils/cuotas';
import { getGastosMes, getCostoMes, calcularTotalesPorMoneda, formatAmountShort, getRangoMeses } from '../utils/proyeccion';
import { parsePrecio, getCurrencySymbol, formatARS, formatPrecioEuropeo } from '../utils/formatters';
import { colors, spacing, radius, typography, fonts, TAB_BAR_CLEARANCE } from '../constants/theme';
import ProfileAvatarButton from '../components/nav/ProfileAvatarButton';
import GastoCreditCard from '../components/GastoCreditCard';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_ABR = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

import { notificationService } from '../services/notificationService';
import NotificationsModal from './NotificationsModal';
import ProyeccionModal from '../components/ProyeccionModal';

export default function DashboardScreen({ navigation }) {
  const { gastos } = useGastos();
  const { mydata } = useConfiguracion();
  const { deudas } = useDeudas();
  const { dark } = useTheme();
  const s = styles(dark);
  const { pendientes } = useNotificacionesPendientes();

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  React.useEffect(() => {
    notificationService.getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
  }, []);

  const notifBadgeCount = unreadCount + pendientes.length;

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

  // Datos de la tarjeta de crédito del hero: total del mes, comparación contra
  // el mes anterior y tendencia de los últimos 6 meses con proyección de cierre.
  const cardData = useMemo(() => {
    if (esMesFuturo) return null;
    const monedaPrincipal = stats.totalesPorMoneda.ARS != null
      ? 'ARS'
      : Object.keys(stats.totalesPorMoneda)[0];
    if (!monedaPrincipal) return null;

    const totalActual = stats.totalesPorMoneda[monedaPrincipal] || 0;

    const mesAnteriorSel = mesSel.mes === 0
      ? { mes: 11, anio: mesSel.anio - 1 }
      : { mes: mesSel.mes - 1, anio: mesSel.anio };
    const gastosMesAnterior = getGastosMes(gastos, mesAnteriorSel, mydata)
      .filter(g => (g.moneda || 'ARS') === monedaPrincipal);

    const dia = hoy.getDate();
    const diasEnMes = new Date(mesSel.anio, mesSel.mes + 1, 0).getDate();

    const totalComparable = isHoy
      ? gastosMesAnterior
        .filter(g => {
          const d = parseInt((g.fecha || '').split('/')[0], 10);
          return isNaN(d) || d <= dia;
        })
        .reduce((sum, g) => sum + getCostoMes(g), 0)
      : gastosMesAnterior.reduce((sum, g) => sum + getCostoMes(g), 0);

    const deltaPct = totalComparable > 0 ? ((totalActual - totalComparable) / totalComparable) * 100 : null;

    const rango6 = getRangoMeses(mesSel, 6);
    const historial = rango6.map((m, idx) => {
      const esActual = idx === rango6.length - 1;
      const total = esActual
        ? totalActual
        : calcularTotalesPorMoneda(getGastosMes(gastos, m, mydata))[monedaPrincipal] || 0;
      return { label: MESES_ABR[m.mes], total, esActual };
    });

    const promedio = historial.reduce((sum, h) => sum + h.total, 0) / historial.length;
    const proyeccion = isHoy && dia > 0 ? (totalActual / dia) * diasEnMes : null;

    // Gastos de este mes en otras monedas — no entran en la comparativa/proyección
    // (que son sobre la moneda principal), pero deben sumar al total mostrado.
    const otrasMonedas = Object.entries(stats.totalesPorMoneda)
      .filter(([m]) => m !== monedaPrincipal);

    return {
      moneda: monedaPrincipal,
      totalActual,
      totalComparable,
      deltaPct,
      dia,
      diasEnMes,
      historial,
      promedio,
      proyeccion,
      otrasMonedas,
      mesAnteriorLabel: MESES[mesAnteriorSel.mes],
    };
  }, [esMesFuturo, stats.totalesPorMoneda, mesSel, gastos, mydata, isHoy, hoy]);

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

  const hayTotal = Object.keys(stats.totalesPorMoneda).length > 0;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.headerRow}>
          <Text style={s.pageTitle}>Dashboard</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={s.notifBtn}
              onPress={() => setShowNotifications(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={notifBadgeCount > 0 ? "notifications" : "notifications-outline"}
                size={20}
                color={notifBadgeCount > 0 ? colors.primary : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
              />
              {notifBadgeCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{notifBadgeCount > 9 ? '9+' : notifBadgeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <ProfileAvatarButton size={30} />
          </View>
        </View>

        {/* Navegación de mes — línea propia, sin competir con el título */}
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

        {/* Total del mes — H1 hero */}
        {esMesFuturo ? (
          <TouchableOpacity
            style={[s.totalHero, s.totalHeroFuturo]}
            onPress={() => setShowProyeccionModal(true)}
            activeOpacity={0.85}
          >
            <View style={s.proyectadoBadge}>
              <Text style={s.proyectadoBadgeText}>Proyectado</Text>
            </View>
            {hayTotal ? (
              <>
                {Object.entries(stats.totalesPorMoneda).map(([moneda, total]) => (
                  <View key={moneda} style={s.totalHeroRow}>
                    <Text style={[s.totalHeroAmount, { color: '#F97316' }]}>
                      {formatPrecioEuropeo(total, moneda)}
                    </Text>
                    {Object.keys(stats.totalesPorMoneda).length > 1 && (
                      <Text style={s.totalHeroMoneda}>{moneda}</Text>
                    )}
                  </View>
                ))}
                <Text style={s.totalHeroLabel}>proyectado · tocá para ver el desglose</Text>
              </>
            ) : (
              <>
                <Text style={s.totalHeroEmpty}>$ 0,00</Text>
                <Text style={s.totalHeroLabel}>sin gastos este mes</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            {cardData ? (
              <GastoCreditCard
                dark={dark}
                moneda={cardData.moneda}
                mesAnteriorLabel={cardData.mesAnteriorLabel}
                totalActual={cardData.totalActual}
                totalComparable={cardData.totalComparable}
                deltaPct={cardData.deltaPct}
                isHoy={isHoy}
                dia={cardData.dia}
                diasEnMes={cardData.diasEnMes}
                historial={cardData.historial}
                promedio={cardData.promedio}
                proyeccion={cardData.proyeccion}
                otrasMonedas={cardData.otrasMonedas}
              />
            ) : (
              <View style={s.totalHero}>
                <Text style={s.totalHeroEmpty}>$ 0,00</Text>
                <Text style={s.totalHeroLabel}>sin gastos este mes</Text>
              </View>
            )}

            {hayDeudaNeta && (
              <View style={s.deudaNetaStrip}>
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
              </View>
            )}
          </>
        )}

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
            <KPICard
              label="Gastos del mes"
              value={stats.gastosMes.length}
              dark={dark}
              accent={colors.primary}
            />
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
              <View style={s.destacadoLeft}>
                <View style={s.destacadoBadge}>
                  <Ionicons name="trophy" size={16} color="#fff" />
                </View>
                <Text style={s.destacadoObj} numberOfLines={1}>{stats.masCaro.objeto}</Text>
              </View>
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
                    <View style={[s.deudaBadge, { backgroundColor: accent }]}>
                      <Ionicons
                        name={saldado ? 'checkmark-circle' : positivo ? 'people' : 'wallet'}
                        size={16}
                        color="#fff"
                      />
                    </View>
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
        navigation={navigation}
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
      backgroundColor: dark ? colors.surfaceSecondary.dark : colors.surfaceSecondary.light,
      borderRadius: radius.lg,
      padding: spacing.md,
      alignItems: 'center',
    },
    val: { fontSize: 26, fontFamily: fonts.display, color: accent, marginBottom: 4 },
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
      backgroundColor: dark ? 'rgba(249,115,22,0.14)' : '#FFF1E6',
      borderRadius: radius.lg,
      padding: spacing.md,
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
  scroll: { padding: spacing.md, paddingBottom: spacing.md + TAB_BAR_CLEARANCE },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pageTitle: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginBottom: spacing.sm,
  },
  monthNavBtn: { padding: 4 },
  monthLabel: {
    ...typography.bodyMed,
    color: dark ? colors.text.dark : colors.text.light,
    minWidth: 130,
    textAlign: 'center',
  },
  totalHero: {
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
  },
  totalHeroRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  totalHeroAmount: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.primary,
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
    fontSize: 36,
    fontFamily: fonts.display,
    color: dark ? '#332F47' : '#DCD3BF',
  },
  deudaNetaStrip: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
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
    backgroundColor: dark ? colors.surfaceSecondary.dark : colors.surfaceSecondary.light,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  destacadoLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  destacadoBadge: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.warning,
  },
  destacadoObj: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light, flex: 1, marginRight: spacing.sm },
  destacadoVal: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
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
    backgroundColor: dark ? colors.surfaceSecondary.dark : colors.surfaceSecondary.light,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  miDeudaCard: {
    backgroundColor: dark ? colors.surfaceSecondary.dark : colors.surfaceSecondary.light,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  deudaCardSaldada: {
    backgroundColor: dark ? colors.surfaceSecondary.dark : colors.surfaceSecondary.light,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  deudaBadge: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
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
