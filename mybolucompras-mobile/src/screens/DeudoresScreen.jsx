import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useModal } from '../hooks/useModal';
import { useDeudores } from '../context/DeudoresContext';
import { useTheme } from '../context/ThemeContext';
import DeudaCard from '../components/DeudaCard';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function DeudoresScreen({ navigation }) {
  const { deudas, loading, cargarDeudas, marcarPagada, eliminarDeuda } = useDeudores();
  const { dark } = useTheme();
  const s = styles(dark);
  const { showModal, modal } = useModal();

  const [tabActivo, setTabActivo] = useState('pendientes');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarDeudas();
    setRefreshing(false);
  }, [cargarDeudas]);

  const deudosFiltradas = useMemo(() => {
    return deudas.filter(d => tabActivo === 'pagadas' ? d.pagado : !d.pagado);
  }, [deudas, tabActivo]);

  const pendientesCount = useMemo(() => deudas.filter(d => !d.pagado).length, [deudas]);

  const handleMarkPaid = (deuda) => {
    showModal({
      type: 'check',
      title: 'Marcar como pagada',
      message: `¿Confirmas que ${deuda.nombre} te pagó "${deuda.descripcion || 'esta deuda'}"?`,
      confirmText: 'Confirmar',
      onConfirm: () => marcarPagada(deuda.id),
    });
  };

  const handleDelete = (deuda) => {
    showModal({
      type: 'danger',
      title: 'Eliminar deuda',
      message: `¿Eliminar la deuda de "${deuda.nombre}"?`,
      onConfirm: () => eliminarDeuda(deuda.id),
    });
  };

  const renderItem = ({ item }) => (
    <DeudaCard
      deuda={item}
      onMarkPaid={!item.pagado ? () => handleMarkPaid(item) : undefined}
      onDelete={() => handleDelete(item)}
      onPress={() => navigation.navigate('EditarDeuda', { deuda: item })}
    />
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.titleRow}>
        <View style={s.titleLeft}>
          <Text style={s.title}>Deudores</Text>
          {pendientesCount > 0 && (
            <View style={s.pendienteBadge}>
              <Text style={s.pendienteBadgeText}>{pendientesCount}</Text>
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

      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tabBtn, tabActivo === 'pendientes' && s.tabBtnActivePendientes]}
          onPress={() => setTabActivo('pendientes')}
          activeOpacity={0.7}
        >
          <Text style={[s.tabBtnText, tabActivo === 'pendientes' && s.tabBtnTextActive]}>Pendientes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tabActivo === 'pagadas' && s.tabBtnActivePagadas]}
          onPress={() => setTabActivo('pagadas')}
          activeOpacity={0.7}
        >
          <Text style={[s.tabBtnText, tabActivo === 'pagadas' && s.tabBtnTextActive]}>Pagadas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={deudosFiltradas}
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
            <Text style={s.emptyIcon}>{tabActivo === 'pagadas' ? '✅' : '🤝'}</Text>
            <Text style={s.emptyText}>
              {loading
                ? 'Cargando...'
                : tabActivo === 'pagadas'
                  ? 'No hay deudas cobradas aún'
                  : 'No hay deudas pendientes'}
            </Text>
            {tabActivo === 'pendientes' && !loading && (
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => navigation.navigate('AgregarDeuda', {})}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={s.emptyBtnText}>Agregar deuda</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={deudosFiltradas.length === 0 ? s.emptyContainer : { paddingBottom: spacing.lg }}
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
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden',
  },
  pendienteBadgeText: { ...typography.captionMed, color: '#F59E0B' },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.xs,
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
    borderRadius: radius.md, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.md - 1 },
  tabBtnActivePendientes: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  tabBtnActivePagadas: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  tabBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tabBtnTextActive: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textAlign: 'center', marginBottom: spacing.lg },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary },
  emptyBtnText: { ...typography.captionMed, color: colors.primary },
  emptyContainer: { flexGrow: 1 },
});
