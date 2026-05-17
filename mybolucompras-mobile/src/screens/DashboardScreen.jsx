import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { getCuotasRestantes, gastoEntraEsteMes } from '../utils/cuotas';
import { parsePrecio, getCurrencySymbol, formatARS, formatPrecioEuropeo } from '../utils/formatters';
import { colors, spacing, radius, typography } from '../constants/theme';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

import { notificationService } from '../services/notificationService';
import NotificationsModal from './NotificationsModal';

export default function DashboardScreen() {
  const { gastos, mydata } = useData();
  const { dark } = useTheme();
  const s = styles(dark);

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  React.useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (e) {}
    };
    fetchCount();
  }, [gastos]); // Refresh when gastos change (sharing might happen)

  const hoy = new Date();
  const [mesSel, setMesSel] = useState({ mes: hoy.getMonth(), anio: hoy.getFullYear() });

  const isHoy = mesSel.mes === hoy.getMonth() && mesSel.anio === hoy.getFullYear();

  const prevMes = () => setMesSel(p =>
    p.mes === 0 ? { mes: 11, anio: p.anio - 1 } : { mes: p.mes - 1, anio: p.anio }
  );
  const nextMes = () => {
    if (!isHoy) setMesSel(p =>
      p.mes === 11 ? { mes: 0, anio: p.anio + 1 } : { mes: p.mes + 1, anio: p.anio }
    );
  };

  const stats = useMemo(() => {
    const targetIndex = mesSel.anio * 12 + mesSel.mes;
    const hoyIndex = hoy.getFullYear() * 12 + hoy.getMonth();

    // Returns the cost this expense contributes to the selected month
    const getCostoMes = (g) => {
      if (g.isFijo) return parsePrecio(g.precio) * (parseInt(g.cantidad) || 1);
      if (g.tipo === 'credito' && Number(g.cuotas) > 1) return parsePrecio(g.precio) / Number(g.cuotas);
      return parsePrecio(g.precio);
    };

    const gastosNormalesMes = gastos.filter(g => {
      if (g.isFijo) return false;
      const [, m, y] = (g.fecha || '').split('/');
      const compraIndex = Number(y) * 12 + (Number(m) - 1);
      const cuotas = parseInt(g.cuotas) || 1;

      if (g.tipo === 'credito' && cuotas > 1) {
        // Multi-installment credit: active across several months
        if (targetIndex < compraIndex || targetIndex >= compraIndex + cuotas) return false;
        // For current month, skip purchases pending for next billing cycle
        if (targetIndex === hoyIndex) return gastoEntraEsteMes(g, mydata);
        return true;
      }
      // Single-charge (cuotas=1) and non-credit: only counts in the purchase month
      return compraIndex === targetIndex;
    });

    const gastosFijosMes = gastos.filter(g => {
      if (!g.isFijo) return false;
      const [, m, y] = (g.fecha || '').split('/');
      const startIndex = Number(y) * 12 + (Number(m) - 1);
      if (targetIndex < startIndex) return false;
      const period = parseInt(g.cuotas) || 0;
      return period === 0 || targetIndex < startIndex + period;
    });

    const gastosMes = [...gastosNormalesMes, ...gastosFijosMes];

    const totalesPorMoneda = {};
    gastosMes.forEach(g => {
      const moneda = g.moneda || 'ARS';
      totalesPorMoneda[moneda] = (totalesPorMoneda[moneda] || 0) + getCostoMes(g);
    });

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

    return { totalesPorMoneda, cuotasActivas, masCaro, porEtiqueta, maxEtiqueta, gastosMes };
  }, [gastos, mydata, mesSel]);

  const hayTotal = Object.keys(stats.totalesPorMoneda).length > 0;

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
            <Text style={s.monthLabel}>{MESES[mesSel.mes]} {mesSel.anio}</Text>
            <TouchableOpacity
              onPress={nextMes}
              style={s.monthNavBtn}
              disabled={isHoy}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isHoy ? 'transparent' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Total del mes — H1 hero */}
        <View style={s.totalHero}>
          {hayTotal ? (
            <>
              {Object.entries(stats.totalesPorMoneda).map(([moneda, total]) => (
                <View key={moneda} style={s.totalHeroRow}>
                  <Text style={s.totalHeroAmount}>
                    {formatPrecioEuropeo(total, moneda)}
                  </Text>
                  {Object.keys(stats.totalesPorMoneda).length > 1 && (
                    <Text style={s.totalHeroMoneda}>{moneda}</Text>
                  )}
                </View>
              ))}
              <Text style={s.totalHeroLabel}>gastado en {MESES[mesSel.mes].toLowerCase()}</Text>
            </>
          ) : (
            <>
              <Text style={s.totalHeroEmpty}>$ 0,00</Text>
              <Text style={s.totalHeroLabel}>sin gastos este mes</Text>
            </>
          )}
        </View>

        {/* KPI cards */}
        <View style={s.kpiRow}>
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

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <NotificationsModal 
        visible={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        onRefresh={() => {
          notificationService.getUnreadCount().then(setUnreadCount);
        }}
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
});
