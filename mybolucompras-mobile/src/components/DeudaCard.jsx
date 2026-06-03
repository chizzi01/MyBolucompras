import React, { useRef, useState, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const MEDIO_ICON_MAP = {
  'Visa':             { lib: 'fa5', name: 'cc-visa' },
  'MasterCard':       { lib: 'fa5', name: 'cc-mastercard' },
  'Mastercard':       { lib: 'fa5', name: 'cc-mastercard' },
  'American Express': { lib: 'fa5', name: 'cc-amex' },
  'Efectivo':         { lib: 'ion', name: 'cash-outline' },
  'Transferencia':    { lib: 'ion', name: 'swap-horizontal-outline' },
  'Mercado Pago':     { lib: 'mci', name: 'credit-card-fast-outline' },
};

function MedioIcon({ medio, dark }) {
  const def = MEDIO_ICON_MAP[medio];
  const color = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  if (!def) return <Text style={{ ...typography.caption, color }}>{medio}</Text>;
  if (def.lib === 'fa5') return <FontAwesome5 name={def.name} size={20} color={color} brand />;
  if (def.lib === 'mci') return <MaterialCommunityIcons name={def.name} size={18} color={color} />;
  return <Ionicons name={def.name} size={18} color={color} />;
}

const ACTION_W = 80;

const fmt = (n) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function CompensacionBanner({ compensacion, dark }) {
  const { esAcreedor, totalCompensado, montoNeto, moneda } = compensacion;
  const sym = moneda === 'ARS' ? '$' : moneda;

  const label = esAcreedor
    ? `Tu deuda de ${sym} ${fmt(totalCompensado)} se descuenta automáticamente`
    : montoNeto >= 0
      ? 'Tu deuda queda saldada con lo que te deben'
      : `Queda un saldo pendiente de ${sym} ${fmt(Math.abs(montoNeto))} a favor tuyo`;

  const iconName = esAcreedor ? 'swap-horizontal-outline' : montoNeto >= 0 ? 'checkmark-circle-outline' : 'information-circle-outline';
  const iconColor = esAcreedor ? '#6366F1' : montoNeto >= 0 ? '#10B981' : '#6366F1';

  return (
    <View style={cbStyles(dark).banner}>
      <Ionicons name={iconName} size={13} color={iconColor} />
      <Text style={cbStyles(dark).text}>{label}</Text>
    </View>
  );
}

const cbStyles = (dark) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: dark ? '#1e293b' : '#E2E8F0',
  },
  text: {
    flex: 1,
    fontSize: 11,
    color: dark ? '#94A3B8' : '#64748B',
    lineHeight: 16,
  },
  monto: {
    fontWeight: '700',
    color: '#6366F1',
  },
});

const TIPO_LABEL = { debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia' };
const TIPO_COLOR = { debito: '#3B82F6', credito: '#8B5CF6', transferencia: '#10B981' };

function getCuotasDeuda(deuda) {
  if (deuda.isFijo) return '∞';
  const cuotas = parseInt(deuda.cuotas) || 1;
  if (cuotas <= 1) return null;
  const [, m, y] = (deuda.fechaDeuda || '').split('/');
  if (!m || !y) return `1/${cuotas}`;
  const startIndex = Number(y) * 12 + (Number(m) - 1);
  const now = new Date();
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  const elapsed = nowIndex - startIndex + 1;
  const current = Math.min(Math.max(elapsed, 1), cuotas);
  return `${current}/${cuotas}`;
}

const DeudaCard = memo(function DeudaCard({ deuda, compensacion, onMarkPaid, onDelete, onRecordar, onPress }) {
  const { dark } = useTheme();

  // Callers already pass undefined when action is not applicable — no need to re-check pagado here
  const actions = [
    onRecordar && { key: 'recordar', color: colors.warning, icon: 'notifications-outline', label: 'Recordar', fn: onRecordar },
    onMarkPaid && { key: 'paid', color: colors.accent, icon: 'checkmark-circle', label: 'Pagada', fn: onMarkPaid },
    { key: 'delete', color: colors.error, icon: 'trash-outline', label: 'Eliminar', fn: onDelete },
  ].filter(Boolean);

  const DELETE_WIDTH = actions.length * ACTION_W;
  const s = styles(dark, deuda.pagado);

  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const base = open ? -DELETE_WIDTH : 0;
        const next = Math.min(0, Math.max(base + g.dx, -DELETE_WIDTH));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (!open && g.dx < -DELETE_WIDTH / 2) {
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(true);
        } else if (open && g.dx > DELETE_WIDTH / 2) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(false);
        } else {
          Animated.spring(translateX, { toValue: open ? -DELETE_WIDTH : 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setOpen(false);
  };

  const tipoColor = TIPO_COLOR[deuda.tipo] || colors.primary;

  const cuotasInfo = useMemo(
    () => deuda.pagado ? null : getCuotasDeuda(deuda),
    [deuda.pagado, deuda.isFijo, deuda.cuotas, deuda.fechaDeuda]
  );
  const cuotasMonto = cuotasInfo && cuotasInfo !== '∞'
    ? deuda.monto / (parseInt(deuda.cuotas) || 1)
    : null;

  const montoFormatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(deuda.monto);

  const simbolo = deuda.moneda === 'ARS' ? '$' : deuda.moneda;

  const ultimoRecordatorio = useMemo(() => {
    if (!deuda.ultimoRecordatorio) return null;
    const diff = Date.now() - new Date(deuda.ultimoRecordatorio).getTime();
    const dias = Math.floor(diff / 86400000);
    if (dias === 0) return 'Recordatorio enviado hoy';
    if (dias === 1) return 'Recordatorio hace 1 día';
    return `Recordatorio hace ${dias} días`;
  }, [deuda.ultimoRecordatorio]);

  return (
    <View style={s.row}>
      <View style={[s.actionsContainer, { width: DELETE_WIDTH }]}>
        {actions.map(a => (
          <TouchableOpacity
            key={a.key}
            style={[s.actionBtn, { backgroundColor: a.color }]}
            onPress={() => { close(); a.fn(); }}
            activeOpacity={0.8}
          >
            <Ionicons name={a.icon} size={22} color="#fff" />
            <Text style={s.actionText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View
        style={{ transform: [{ translateX }], flex: 1 }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={s.card}
          onPress={() => { if (open) { close(); } else { onPress?.(); } }}
          activeOpacity={0.75}
        >
          <View style={s.cardContent}>
            <View style={s.left}>
              <Text style={s.nombre} numberOfLines={1}>
                {deuda.descripcion || `Deuda con ${deuda.nombre}`}
              </Text>
              <View style={s.meta}>
                <View style={s.nombreBadge}>
                  <Ionicons name="person-outline" size={10} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} />
                  <Text style={s.nombreBadgeText}>{deuda.nombre}</Text>
                </View>
                {!!deuda.tipo && (
                  <View style={[s.tipoBadge, { backgroundColor: tipoColor + '20', borderColor: tipoColor }]}>
                    <Text style={[s.tipoBadgeText, { color: tipoColor }]}>
                      {TIPO_LABEL[deuda.tipo] || deuda.tipo}
                    </Text>
                  </View>
                )}
                {deuda.isFijo && (
                  <View style={[s.tipoBadge, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
                    <Text style={[s.tipoBadgeText, { color: colors.warning }]}>Fija</Text>
                  </View>
                )}
                {!!deuda.medio && (
                  <MedioIcon medio={deuda.medio} dark={dark} />
                )}
                {deuda.compartidoConNombre && (
                  <View style={s.compartidoBadge}>
                    <Ionicons name="people-outline" size={10} color={colors.primary} />
                    <Text style={s.compartidoBadgeText}>{deuda.compartidoConNombre}</Text>
                  </View>
                )}
                {deuda.pagado && (
                  <View style={s.pagadaBadge}>
                    <Ionicons name="checkmark-circle" size={10} color={colors.accent} />
                    <Text style={s.pagadaBadgeText}>Pagada</Text>
                  </View>
                )}
              </View>
              {ultimoRecordatorio && !deuda.pagado && (
                <Text style={s.recordatorioText}>{ultimoRecordatorio}</Text>
              )}
            </View>

            <View style={s.right}>
              {!!compensacion && !deuda.pagado ? (
                <>
                  <Text style={s.montoTachado}>{simbolo} {montoFormatted}</Text>
                  <Text style={[s.monto, { color: compensacion.esAcreedor ? '#10B981' : compensacion.montoNeto >= 0 ? '#10B981' : '#EF4444' }]}>
                    {simbolo} {fmt(compensacion.esAcreedor ? Math.max(0, compensacion.montoNeto) : Math.max(0, -compensacion.montoNeto))}
                  </Text>
                </>
              ) : (
                <Text style={s.monto}>{simbolo} {montoFormatted}</Text>
              )}
              {cuotasInfo && (
                <View style={s.cuotasRow}>
                  <Text style={s.cuotasText}>
                    {cuotasInfo === '∞' ? '∞' : `cuota ${cuotasInfo}`}
                  </Text>
                  {cuotasMonto && (
                    <Text style={s.cuotasMonto}>
                      {simbolo} {new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cuotasMonto)}/mes
                    </Text>
                  )}
                </View>
              )}
              <Text style={s.fecha}>{deuda.fechaDeuda}</Text>
              {deuda.pagado && deuda.fechaPago && (
                <Text style={s.fechaPago}>Cobrado {deuda.fechaPago}</Text>
              )}
            </View>
          </View>

          {!!compensacion && !deuda.pagado && (
            <CompensacionBanner compensacion={compensacion} dark={dark} simbolo={simbolo} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

export default DeudaCard;

const styles = (dark, isPaid) => StyleSheet.create({
  row: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'column',
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: dark ? 0.3 : 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: isPaid ? 2 : 1,
    borderColor: isPaid
      ? colors.accent
      : dark ? colors.border.dark : colors.border.light,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: { flex: 1, marginRight: spacing.sm },
  nombre: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 },
  descripcion: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  tipoBadge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  tipoBadgeText: { ...typography.captionMed, fontSize: 10 },
  medio: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  nombreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
  },
  nombreBadgeText: { ...typography.caption, fontSize: 10, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, fontWeight: '600' },
  compartidoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: dark ? '#1e293b' : '#EEF2FF',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary + '40',
  },
  compartidoBadgeText: { ...typography.caption, fontSize: 10, color: colors.primary, fontWeight: '600' },
  pagadaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: dark ? '#0d2e1e' : '#D1FAE5',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.accent,
  },
  pagadaBadgeText: { ...typography.caption, fontSize: 10, color: colors.accent, fontWeight: '600' },
  recordatorioText: { ...typography.caption, fontSize: 10, color: colors.warning, marginTop: 3 },
  right: { alignItems: 'flex-end' },
  monto: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 },
  montoTachado: {
    fontSize: 12, fontWeight: '500',
    color: dark ? '#475569' : '#94A3B8',
    textDecorationLine: 'line-through',
    marginBottom: 1,
  },
  cuotasRow: { alignItems: 'flex-end', gap: 1 },
  cuotasText: { ...typography.captionMed, fontSize: 11, color: colors.warning },
  cuotasMonto: { ...typography.caption, fontSize: 10, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  fecha: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 },
  fechaPago: { ...typography.caption, fontSize: 10, color: colors.accent, marginTop: 2 },
  actionsContainer: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden',
  },
  actionBtn: { width: ACTION_W, justifyContent: 'center', alignItems: 'center', gap: 4 },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
