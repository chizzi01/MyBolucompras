import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { getCuotasRestantes } from '../utils/cuotas';
import { parsePrecio, getCurrencySymbol, formatARS } from '../utils/formatters';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function DashboardScreen() {
  const { gastos, mydata } = useData();
  const { dark } = useTheme();
  const s = styles(dark);

  const stats = useMemo(() => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const gastosMes = gastos.filter(g => {
      const [d, m, y] = (g.fecha || '').split('/');
      return Number(m) - 1 === mesActual && Number(y) === anioActual;
    });

    const totalesPorMoneda = {};
    gastosMes.forEach(g => {
      const moneda = g.moneda || 'ARS';
      const precio = parsePrecio(g.precio);
      totalesPorMoneda[moneda] = (totalesPorMoneda[moneda] || 0) + precio;
    });

    const cuotasActivas = gastos.filter(g => {
      if (g.isFijo) return true;
      const r = getCuotasRestantes(g, mydata);
      return r === 'N/A' || r > 0;
    }).length;

    const masCaro = gastosMes.reduce((max, g) => {
      const p = parsePrecio(g.precio);
      return p > (max?.precio || 0) ? { ...g, precio: p } : max;
    }, null);

    const porEtiqueta = {};
    gastos.forEach(g => {
      if (g.moneda !== 'ARS') return;
      const etiq = g.etiqueta || 'Sin etiqueta';
      porEtiqueta[etiq] = (porEtiqueta[etiq] || 0) + parsePrecio(g.precio);
    });

    const maxEtiqueta = Math.max(...Object.values(porEtiqueta), 1);

    return { totalesPorMoneda, cuotasActivas, masCaro, porEtiqueta, maxEtiqueta, gastosMes };
  }, [gastos, mydata]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Dashboard</Text>

        <Text style={s.section}>Este mes</Text>
        <View style={s.kpiRow}>
          <KPICard label="Gastos registrados" value={stats.gastosMes.length} dark={dark} accent={colors.primary} />
          <KPICard label="Cuotas activas" value={stats.cuotasActivas} dark={dark} accent={colors.accent} />
        </View>

        <Text style={s.section}>Total por moneda (mes actual)</Text>
        {Object.entries(stats.totalesPorMoneda).length === 0 ? (
          <Text style={s.empty}>Sin gastos este mes</Text>
        ) : (
          Object.entries(stats.totalesPorMoneda).map(([moneda, total]) => (
            <View key={moneda} style={s.totalRow}>
              <Text style={s.monedaLabel}>{moneda}</Text>
              <Text style={s.monedaValue}>{getCurrencySymbol(moneda)} {formatARS(total)}</Text>
            </View>
          ))
        )}

        {stats.masCaro && (
          <>
            <Text style={s.section}>Gasto más caro del mes</Text>
            <View style={s.destacado}>
              <Text style={s.destacadoObj} numberOfLines={1}>{stats.masCaro.objeto}</Text>
              <Text style={s.destacadoVal}>{getCurrencySymbol(stats.masCaro.moneda)} {formatARS(stats.masCaro.precio)}</Text>
            </View>
          </>
        )}

        {Object.keys(stats.porEtiqueta).length > 0 && (
          <>
            <Text style={s.section}>Por etiqueta (ARS)</Text>
            {Object.entries(stats.porEtiqueta)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([etiq, total]) => (
                <View key={etiq} style={s.barRow}>
                  <Text style={s.barLabel} numberOfLines={1}>{etiq}</Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${Math.round((total / stats.maxEtiqueta) * 100)}%` }]} />
                  </View>
                  <Text style={s.barVal}>$ {formatARS(total)}</Text>
                </View>
              ))}
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function KPICard({ label, value, dark, accent }) {
  const s = StyleSheet.create({
    card: { flex: 1, backgroundColor: dark ? colors.surface.dark : colors.surface.light, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, alignItems: 'center' },
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
  scroll: { padding: spacing.md },
  pageTitle: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light, marginBottom: spacing.md },
  section: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.lg, marginBottom: spacing.sm },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  empty: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark ? colors.border.dark : colors.border.light },
  monedaLabel: { ...typography.bodyMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  monedaValue: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
  destacado: { backgroundColor: dark ? colors.surface.dark : colors.surface.light, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light },
  destacadoObj: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light, flex: 1, marginRight: spacing.sm },
  destacadoVal: { ...typography.bodyBold, color: colors.primary },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: spacing.sm },
  barLabel: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, width: 90 },
  barTrack: { flex: 1, height: 8, backgroundColor: dark ? '#334155' : '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  barVal: { ...typography.caption, color: dark ? colors.text.dark : colors.text.light, width: 80, textAlign: 'right' },
});
