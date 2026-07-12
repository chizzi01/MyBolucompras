import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useModal } from '../hooks/useModal';
import { useDeudas } from '../hooks/queries/useDeudas';
import { useDeudaMutations } from '../hooks/mutations/useDeudaMutations';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DeudaCard from '../components/DeudaCard';
import { colors, spacing, radius, typography } from '../constants/theme';
import { getCuotasRestantes, gastoEntraEsteMes } from '../utils/cuotas';

// Monto efectivo mensual de una deuda: cuota actual si es en cuotas, monto total si es pago único o fija.
// Si la compra en cuotas se hizo después del cierre, la primera cuota todavía no se factura
// este mes (entrará el mes siguiente), así que no debe contarse en el total de este mes.
function montoMensualDeuda(d, mydata) {
  if (d.isFijo) return d.monto;
  const cuotas = parseInt(d.cuotas) || 1;
  if (cuotas <= 1) return d.monto;
  if (!gastoEntraEsteMes({ ...d, fecha: d.fechaDeuda }, mydata)) return 0;
  const restantes = getCuotasRestantes({ ...d, fecha: d.fechaDeuda }, mydata);
  const restantesNum = Number(restantes);
  if (!isNaN(restantesNum) && restantesNum <= 0) return 0;
  return d.monto / cuotas;
}

const fmtMonto = (n) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const GROUP_SWIPE_W = 90;

function PersonaGroupCard({ grupo, compensacion, mydata, onMarkPaid, onMarkAllPaid, onDelete, onRecordar, onPress }) {
  const [expanded, setExpanded] = useState(true);
  const { dark } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);

  const deuda0 = grupo.deudas[0];
  if (!deuda0) return null;

  const moneda = deuda0.moneda || 'ARS';
  const sim = moneda === 'ARS' ? '$' : moneda;
  const isAcreedor = deuda0.esAcreedor;
  const isPagadas = deuda0.pagado;
  const pendientes = grupo.deudas.filter(d => !d.pagado);
  const accentColor = isPagadas ? colors.accent : isAcreedor ? colors.warning : colors.error;
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const closeSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    openRef.current = false;
  };

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => {
      const base = openRef.current ? -GROUP_SWIPE_W : 0;
      translateX.setValue(Math.min(0, Math.max(base + g.dx, -GROUP_SWIPE_W)));
    },
    onPanResponderRelease: (_, g) => {
      if (!openRef.current && g.dx < -GROUP_SWIPE_W / 2) {
        Animated.spring(translateX, { toValue: -GROUP_SWIPE_W, useNativeDriver: true, bounciness: 4 }).start();
        openRef.current = true;
      } else if (openRef.current && g.dx > GROUP_SWIPE_W / 2) {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        openRef.current = false;
      } else {
        Animated.spring(translateX, { toValue: openRef.current ? -GROUP_SWIPE_W : 0, useNativeDriver: true, bounciness: 4 }).start();
      }
    },
  })).current;

  const totalGrupo = grupo.deudas.reduce(
    (sum, d) => sum + (isPagadas ? d.monto : montoMensualDeuda(d, mydata)),
    0
  );

  let montoDisplay = totalGrupo;
  if (compensacion && !isPagadas) {
    montoDisplay = isAcreedor
      ? Math.max(0, compensacion.montoNeto)
      : Math.max(0, -compensacion.montoNeto);
  }

  let bannerText = null;
  let bannerIcon = 'swap-horizontal-outline';
  let bannerColor = '#6366F1';
  if (compensacion && !isPagadas) {
    const netoAbs = fmtMonto(Math.abs(compensacion.montoNeto));
    const aCobrar = fmtMonto(compensacion.esAcreedor ? compensacion.totalACobrar : compensacion.totalCompensado);
    const aDeberles = fmtMonto(compensacion.esAcreedor ? compensacion.totalCompensado : compensacion.totalADeberles);
    if (compensacion.montoNeto > 0) {
      bannerText = `Neto a cobrar: ${sim} ${netoAbs}  (te deben ${sim} ${aCobrar} − debés ${sim} ${aDeberles})`;
      bannerIcon = 'trending-up-outline';
      bannerColor = '#10B981';
    } else if (compensacion.montoNeto < 0) {
      bannerText = `Neto a pagar: ${sim} ${netoAbs}  (te deben ${sim} ${aCobrar} − debés ${sim} ${aDeberles})`;
      bannerIcon = 'trending-down-outline';
      bannerColor = colors.error;
    } else {
      bannerText = 'Las deudas con esta persona se compensan exactamente';
      bannerIcon = 'checkmark-circle-outline';
      bannerColor = colors.accent;
    }
  }

  const gs = groupStyles(dark);

  return (
    <View style={gs.wrapper}>
      {/* Swipe wrapper: action button fixed to the right, header slides */}
      <View style={gs.swipeRow}>
        {pendientes.length > 0 && (
          <TouchableOpacity
            style={[gs.swipeAction, { width: GROUP_SWIPE_W }]}
            onPress={() => { closeSwipe(); onMarkAllPaid(grupo); }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={gs.swipeActionText}>Pagar{'\n'}todo</Text>
          </TouchableOpacity>
        )}

        <Animated.View
          style={[gs.headerAnimated, { transform: [{ translateX }] }]}
          {...(pendientes.length > 0 ? panResponder.panHandlers : {})}
        >
          <TouchableOpacity
            style={gs.header}
            onPress={() => { if (openRef.current) closeSwipe(); else setExpanded(e => !e); }}
            activeOpacity={0.75}
          >
            <View style={gs.headerRow}>
              <View style={[gs.avatar, { backgroundColor: accentColor + '25' }]}>
                <Text style={[gs.avatarLetter, { color: accentColor }]}>
                  {deuda0.nombre[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={gs.headerMid}>
                <Text style={[gs.nombre, { color: textColor }]} numberOfLines={1}>{deuda0.nombre}</Text>
                {grupo.deudas.length > 1 && (
                  <Text style={[gs.cant, { color: subColor }]}>{grupo.deudas.length} deudas</Text>
                )}
              </View>
              <Text style={[gs.monto, { color: accentColor }]}>{sim} {fmtMonto(montoDisplay)}</Text>
              <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={subColor} />
            </View>
            {bannerText && (
              <View style={gs.banner}>
                <Ionicons name={bannerIcon} size={12} color={bannerColor} />
                <Text style={[gs.bannerText, { color: subColor }]}>{bannerText}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {expanded && grupo.deudas.map(deuda => (
        <DeudaCard
          key={deuda.id}
          deuda={deuda}
          mydata={mydata}
          onMarkPaid={!deuda.pagado ? () => onMarkPaid(deuda) : undefined}
          onDelete={() => onDelete(deuda)}
          onRecordar={deuda.esAcreedor && deuda.compartidoConUserId && !deuda.pagado ? () => onRecordar(deuda) : undefined}
          onPress={() => onPress(deuda)}
        />
      ))}
    </View>
  );
}

const groupStyles = (dark) => ({
  wrapper: { marginVertical: spacing.xs / 2 },
  swipeRow: {
    marginHorizontal: spacing.md,
    marginBottom: 2,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  swipeAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', gap: 3,
    borderRadius: radius.md,
  },
  swipeActionText: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  headerAnimated: { flex: 1 },
  header: {
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: dark ? 0.3 : 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 15, fontWeight: '700' },
  headerMid: { flex: 1 },
  nombre: { ...typography.bodyBold },
  cant: { fontSize: 11, marginTop: 1 },
  monto: { fontSize: 17, fontWeight: '800', letterSpacing: -0.5, marginRight: 4 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: dark ? '#1e293b' : '#E2E8F0',
  },
  bannerText: { flex: 1, fontSize: 11, lineHeight: 16 },
});

export default function DeudoresScreen({ navigation }) {
  const { user } = useAuth();
  const { deudas, loading, refetch } = useDeudas();
  const { mydata } = useConfiguracion();
  const {
    marcarPagada: marcarPagadaMutation,
    eliminar: eliminarMutation,
    enviarRecordatorio: recordatorioMutation,
  } = useDeudaMutations();
  const { dark } = useTheme();
  const s = styles(dark);
  const { showModal, modal } = useModal();

  const [tabActivo, setTabActivo] = useState('deudores');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const deudoresPendientes = useMemo(() => deudas.filter(d => d.esAcreedor && !d.pagado), [deudas]);
  const misDeudas = useMemo(() => deudas.filter(d => !d.esAcreedor && !d.pagado), [deudas]);

  const listaFiltrada = useMemo(() => {
    let base;
    if (tabActivo === 'pagadas') base = deudas.filter(d => d.pagado);
    else if (tabActivo === 'misdeudas') base = misDeudas;
    else base = deudoresPendientes;

    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(d =>
      d.nombre.toLowerCase().includes(q) ||
      d.descripcion?.toLowerCase().includes(q)
    );
  }, [deudoresPendientes, misDeudas, deudas, tabActivo, search]);

  // Totales netos: agrupa por persona+moneda usando el monto mensual efectivo
  // (cuota del mes para deudas en cuotas) y descuenta la compensación cruzada.
  const { totalDeudores, totalMisDeudas } = useMemo(() => {
    const pendientes = deudas.filter(d => !d.pagado);
    const grupos = {};
    pendientes.forEach(d => {
      const key = (d.compartidoConUserId || d.nombre.toLowerCase().trim()) + '_' + (d.moneda || 'ARS');
      if (!grupos[key]) grupos[key] = { acreedor: 0, deudor: 0, moneda: d.moneda || 'ARS' };
      const monto = montoMensualDeuda(d, mydata);
      if (d.esAcreedor) grupos[key].acreedor += monto;
      else grupos[key].deudor += monto;
    });
    const deudores = {};
    const misDeudas = {};
    Object.values(grupos).forEach(({ acreedor, deudor, moneda }) => {
      const neto = acreedor - deudor;
      if (neto > 0) deudores[moneda] = (deudores[moneda] || 0) + neto;
      else if (neto < 0) misDeudas[moneda] = (misDeudas[moneda] || 0) + Math.abs(neto);
    });
    return { totalDeudores: deudores, totalMisDeudas: misDeudas };
  }, [deudas, mydata]);

  // Para cada persona que aparece en ambos lados (acreedor y deudor) con la misma moneda,
  // calcular el monto neto y pasarlo a la card para mostrarlo como compensación visual.
  // Para deudas en cuotas se usa el monto mensual (monto/cuotas), igual que en gastos.
  const compensaciones = useMemo(() => {
    const result = {};
    const pendientes = deudas.filter(d => !d.pagado);

    // Agrupar por persona+moneda: clave = userId si está linkeado, sino nombre normalizado
    const grupos = {};
    pendientes.forEach(d => {
      const personaKey = (d.compartidoConUserId || d.nombre.toLowerCase().trim()) + '_' + (d.moneda || 'ARS');
      if (!grupos[personaKey]) grupos[personaKey] = { acreedor: [], deudor: [] };
      if (d.esAcreedor) grupos[personaKey].acreedor.push(d);
      else grupos[personaKey].deudor.push(d);
    });

    Object.values(grupos).forEach(({ acreedor, deudor }) => {
      if (acreedor.length === 0 || deudor.length === 0) return;

      const totalACobrar = acreedor.reduce((s, d) => s + montoMensualDeuda(d, mydata), 0);
      const totalADeberles = deudor.reduce((s, d) => s + montoMensualDeuda(d, mydata), 0);
      const neto = totalACobrar - totalADeberles;
      // Si hay más de 1 registro en cualquiera de los lados no tiene sentido mostrar
      // el neto del grupo en el monto individual de cada card.
      const esUnoAUno = acreedor.length === 1 && deudor.length === 1;

      acreedor.forEach(d => {
        result[d.id] = {
          esAcreedor: true,
          totalCompensado: totalADeberles,
          totalACobrar,
          montoNeto: neto,
          esUnoAUno,
          moneda: d.moneda || 'ARS',
        };
      });
      deudor.forEach(d => {
        result[d.id] = {
          esAcreedor: false,
          totalCompensado: totalACobrar,
          totalADeberles,
          montoNeto: neto,
          esUnoAUno,
          moneda: d.moneda || 'ARS',
        };
      });
    });

    return result;
  }, [deudas, mydata]);

  const formatTotal = (total) =>
    new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total);

  const handleMarkPaid = (deuda) => {
    showModal({
      type: 'check',
      title: 'Marcar como pagada',
      message: deuda.esAcreedor
        ? `¿Confirmas que ${deuda.nombre} te pagó "${deuda.descripcion || 'esta deuda'}"?`
        : `¿Confirmas que pagaste "${deuda.descripcion || 'esta deuda'}" a ${deuda.nombre}?`,
      confirmText: 'Confirmar',
      onConfirm: () => marcarPagadaMutation.mutate({
        id: deuda.id,
        deuda,
        nombre: user?.user_metadata?.nombre || user?.email || 'Alguien',
      }),
    });
  };

  const handleDelete = (deuda) => {
    showModal({
      type: 'danger',
      title: 'Eliminar deuda',
      message: `¿Eliminar la deuda de "${deuda.nombre}"?`,
      onConfirm: () => eliminarMutation.mutate(deuda.id),
    });
  };

  const handleRecordar = (deuda) => {
    showModal({
      type: 'check',
      title: 'Enviar recordatorio',
      message: `Se le enviará una notificación a ${deuda.compartidoConNombre} recordándole la deuda pendiente.`,
      confirmText: 'Enviar',
      onConfirm: () => recordatorioMutation.mutate({
        deuda,
        nombre: user?.user_metadata?.nombre || user?.email || 'Alguien',
      }),
    });
  };

  const handleMarkAllPaid = (grupo) => {
    const pendientes = grupo.deudas.filter(d => !d.pagado);
    if (pendientes.length === 0) return;
    const nombre = pendientes[0].nombre;
    const nombreUsuario = user?.user_metadata?.nombre || user?.email || 'Alguien';
    showModal({
      type: 'check',
      title: 'Marcar todas como pagadas',
      message: pendientes.length === 1
        ? `¿Confirmas que se pagó la deuda de "${nombre}"?`
        : `¿Confirmas que se pagaron las ${pendientes.length} deudas de "${nombre}"?`,
      confirmText: 'Confirmar',
      onConfirm: () => pendientes.forEach(deuda =>
        marcarPagadaMutation.mutate({ id: deuda.id, deuda, nombre: nombreUsuario })
      ),
    });
  };

  const gruposPorPersona = useMemo(() => {
    const map = {};
    listaFiltrada.forEach(d => {
      const key = d.compartidoConUserId || d.nombre.toLowerCase().trim();
      if (!map[key]) map[key] = { key, nombre: d.nombre, deudas: [] };
      map[key].deudas.push(d);
    });
    return Object.values(map);
  }, [listaFiltrada]);

  const renderGrupo = ({ item: grupo }) => (
    <PersonaGroupCard
      grupo={grupo}
      compensacion={compensaciones[grupo.deudas[0]?.id]}
      mydata={mydata}
      onMarkPaid={handleMarkPaid}
      onMarkAllPaid={handleMarkAllPaid}
      onDelete={handleDelete}
      onRecordar={handleRecordar}
      onPress={(deuda) => navigation.navigate('EditarDeuda', { deuda })}
    />
  );

  const emptyIcon = tabActivo === 'pagadas' ? '✅' : tabActivo === 'misdeudas' ? '💸' : '🤝';
  const emptyText = loading
    ? 'Cargando...'
    : tabActivo === 'pagadas'
      ? 'No hay deudas pagadas aún'
      : tabActivo === 'misdeudas'
        ? 'No tenés deudas pendientes'
        : 'No hay deudores pendientes';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.titleRow}>
        <View style={s.titleLeft}>
          <Text style={s.title}>Deudas</Text>
          {deudoresPendientes.length > 0 && (
            <View style={s.pendienteBadge}>
              <Text style={s.pendienteBadgeText}>{deudoresPendientes.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('AgregarDeuda', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {tabActivo === 'deudores' && Object.keys(totalDeudores).length > 0 && (
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Total a cobrar</Text>
          {Object.entries(totalDeudores).map(([moneda, total]) => (
            <Text key={moneda} style={s.totalAmount}>
              {moneda === 'ARS' ? '$' : moneda} {formatTotal(total)}
            </Text>
          ))}
        </View>
      )}

      {tabActivo === 'misdeudas' && Object.keys(totalMisDeudas).length > 0 && (
        <View style={[s.totalCard, s.totalCardDeudor]}>
          <Text style={[s.totalLabel, { color: colors.error }]}>Total que debo</Text>
          {Object.entries(totalMisDeudas).map(([moneda, total]) => (
            <Text key={moneda} style={[s.totalAmount, { color: colors.error }]}>
              {moneda === 'ARS' ? '$' : moneda} {formatTotal(total)}
            </Text>
          ))}
        </View>
      )}

      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tabBtn, tabActivo === 'deudores' && s.tabBtnActiveDeudores]}
          onPress={() => { setTabActivo('deudores'); setSearch(''); }}
          activeOpacity={0.7}
        >
          <Text style={[s.tabBtnText, tabActivo === 'deudores' && s.tabBtnTextActive]}>Deudores</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tabActivo === 'misdeudas' && s.tabBtnActiveMisDeudas]}
          onPress={() => { setTabActivo('misdeudas'); setSearch(''); }}
          activeOpacity={0.7}
        >
          <Text style={[s.tabBtnText, tabActivo === 'misdeudas' && s.tabBtnTextActive]}>Mis deudas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tabActivo === 'pagadas' && s.tabBtnActivePagadas]}
          onPress={() => { setTabActivo('pagadas'); setSearch(''); }}
          activeOpacity={0.7}
        >
          <Text style={[s.tabBtnText, tabActivo === 'pagadas' && s.tabBtnTextActive]}>Pagadas</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} style={{ marginLeft: spacing.sm }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre..."
          placeholderTextColor={dark ? '#475569' : '#94A3B8'}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={gruposPorPersona}
        keyExtractor={item => item.key}
        renderItem={renderGrupo}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>{emptyIcon}</Text>
            <Text style={s.emptyText}>{emptyText}</Text>
            {tabActivo === 'deudores' && !loading && (
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => navigation.navigate('AgregarDeuda', {})}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={s.emptyBtnText}>Agregar deudor</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={gruposPorPersona.length === 0 ? s.emptyContainer : { paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}
      />

      {modal}
    </SafeAreaView>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs,
  },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  pendienteBadge: {
    backgroundColor: dark ? '#2d1a0e' : '#FEF3C7',
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
  },
  pendienteBadgeText: { ...typography.captionMed, color: colors.warning },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  totalCard: {
    marginHorizontal: spacing.md, marginBottom: spacing.xs,
    backgroundColor: dark ? '#1c1408' : '#FFFBEB',
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.warning + '50',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  totalCardDeudor: {
    backgroundColor: dark ? '#1c0a0a' : '#FEF2F2',
    borderColor: colors.error + '50',
  },
  totalLabel: { ...typography.caption, color: colors.warning, textTransform: 'uppercase', fontSize: 10, marginBottom: 2 },
  totalAmount: { fontSize: 22, fontWeight: '800', color: colors.warning, letterSpacing: -0.5 },
  tabsRow: {
    flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.xs,
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
    borderRadius: radius.md, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.md - 1 },
  tabBtnActiveDeudores: {
    backgroundColor: colors.warning,
    shadowColor: colors.warning, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  tabBtnActiveMisDeudas: {
    backgroundColor: colors.error,
    shadowColor: colors.error, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  tabBtnActivePagadas: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  tabBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tabBtnTextActive: { color: '#fff', fontWeight: '600' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.md, marginBottom: spacing.xs,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderRadius: radius.md, borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    height: 40,
  },
  searchInput: {
    flex: 1, paddingHorizontal: spacing.xs,
    ...typography.body, color: dark ? colors.text.dark : colors.text.light,
    height: 40,
  },
  empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textAlign: 'center', marginBottom: spacing.lg },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary },
  emptyBtnText: { ...typography.captionMed, color: colors.primary },
  emptyContainer: { flexGrow: 1 },
});
