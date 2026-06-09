import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatPrecioEuropeo } from '../utils/formatters';
import { getCostoMes } from '../utils/proyeccion';
import { colors, spacing, radius, typography } from '../constants/theme';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function ProyeccionModal({ visible, onClose, gastos, mes }) {
  const { dark } = useTheme();
  const s = styles(dark);

  const monedas = [...new Set(gastos.map(g => g.moneda || 'ARS'))].sort();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>
            Desglose · {MESES[mes.mes]} {mes.anio}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {gastos.length === 0 ? (
              <Text style={s.empty}>Sin gastos proyectados para este mes.</Text>
            ) : (
              monedas.map(moneda => {
                const gastosMon = gastos.filter(g => (g.moneda || 'ARS') === moneda);
                const cuotas = gastosMon.filter(
                  g => !g.isFijo && g.tipo === 'credito' && Number(g.cuotas) > 1
                );
                const fijos = gastosMon.filter(g => g.isFijo);
                const otros = gastosMon.filter(
                  g => !g.isFijo && !(g.tipo === 'credito' && Number(g.cuotas) > 1)
                );
                const total = gastosMon.reduce((sum, g) => sum + getCostoMes(g), 0);

                return (
                  <View key={moneda} style={s.currencyBlock}>
                    <View style={s.currencyHeader}>
                      <Text style={s.currencyName}>{moneda}</Text>
                      <Text style={s.currencyTotal}>{formatPrecioEuropeo(total, moneda)}</Text>
                    </View>

                    {cuotas.length > 0 && (
                      <>
                        <Text style={s.groupLabel}>Cuotas</Text>
                        {cuotas.map(g => (
                          <ExpenseRow key={g.id} gasto={g} mes={mes} dark={dark} />
                        ))}
                      </>
                    )}

                    {fijos.length > 0 && (
                      <>
                        <Text style={s.groupLabel}>Fijos</Text>
                        {fijos.map(g => (
                          <ExpenseRow key={g.id} gasto={g} mes={mes} dark={dark} />
                        ))}
                      </>
                    )}

                    {otros.length > 0 && (
                      <>
                        <Text style={s.groupLabel}>Otros</Text>
                        {otros.map(g => (
                          <ExpenseRow key={g.id} gasto={g} mes={mes} dark={dark} />
                        ))}
                      </>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function ExpenseRow({ gasto, mes, dark }) {
  const cost = getCostoMes(gasto);

  let badge = '';
  let metaText = gasto.medio || '';

  if (!gasto.isFijo && gasto.tipo === 'credito' && Number(gasto.cuotas) > 1) {
    const [, m, y] = (gasto.fecha || '').split('/');
    const compraIndex = Number(y) * 12 + (Number(m) - 1);
    const targetIndex = mes.anio * 12 + mes.mes;
    const cuotaNum = targetIndex - compraIndex + 1;
    badge = `${cuotaNum}/${gasto.cuotas}`;
    metaText = `${gasto.medio || ''} · cuota ${cuotaNum} de ${gasto.cuotas}`.replace(/^·\s*/, '');
  } else if (gasto.isFijo) {
    badge = 'fijo';
    metaText = `${gasto.medio || ''} · mensual`.replace(/^·\s*/, '');
  }

  const s = StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#1e293b' : '#F1F5F9',
    },
    left: { flex: 1, marginRight: spacing.sm },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
    name: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light },
    badge: {
      backgroundColor: '#F9731620',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#F97316' },
    meta: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 },
    amount: { ...typography.bodyBold, color: '#F97316' },
  });

  return (
    <View style={s.row}>
      <View style={s.left}>
        <View style={s.nameRow}>
          <Text style={s.name}>{gasto.objeto}</Text>
          {!!badge && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {!!metaText && <Text style={s.meta}>{metaText}</Text>}
      </View>
      <Text style={s.amount}>{formatPrecioEuropeo(cost, gasto.moneda || 'ARS')}</Text>
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: dark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: dark ? colors.border.dark : colors.border.light,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: dark ? '#475569' : '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: '#F97316',
    textAlign: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: dark ? colors.border.dark : colors.border.light,
    marginHorizontal: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  empty: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  currencyBlock: {
    marginTop: spacing.md,
  },
  currencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F9731630',
    marginBottom: spacing.xs,
  },
  currencyName: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  currencyTotal: {
    ...typography.bodyBold,
    color: '#F97316',
    fontSize: 16,
  },
  groupLabel: {
    ...typography.caption,
    color: dark ? '#475569' : '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
});
