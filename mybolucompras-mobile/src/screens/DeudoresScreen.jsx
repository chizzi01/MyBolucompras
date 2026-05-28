import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useModal } from '../hooks/useModal';
import { useDeudas } from '../hooks/queries/useDeudas';
import { useDeudaMutations } from '../hooks/mutations/useDeudaMutations';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DeudaCard from '../components/DeudaCard';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function DeudoresScreen({ navigation }) {
  const { user } = useAuth();
  const { deudas, loading, refetch } = useDeudas();
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

  const totalDeudores = useMemo(() => {
    const por = {};
    deudoresPendientes.forEach(d => {
      const moneda = d.moneda || 'ARS';
      por[moneda] = (por[moneda] || 0) + d.monto;
    });
    return por;
  }, [deudoresPendientes]);

  const totalMisDeudas = useMemo(() => {
    const por = {};
    misDeudas.forEach(d => {
      const moneda = d.moneda || 'ARS';
      por[moneda] = (por[moneda] || 0) + d.monto;
    });
    return por;
  }, [misDeudas]);

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

  const renderItem = ({ item }) => (
    <DeudaCard
      deuda={item}
      onMarkPaid={!item.pagado ? () => handleMarkPaid(item) : undefined}
      onDelete={() => handleDelete(item)}
      onRecordar={item.esAcreedor && item.compartidoConUserId && !item.pagado ? () => handleRecordar(item) : undefined}
      onPress={() => navigation.navigate('EditarDeuda', { deuda: item })}
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
        data={listaFiltrada}
        keyExtractor={item => item.id}
        renderItem={renderItem}
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
        contentContainerStyle={listaFiltrada.length === 0 ? s.emptyContainer : { paddingBottom: spacing.lg }}
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
