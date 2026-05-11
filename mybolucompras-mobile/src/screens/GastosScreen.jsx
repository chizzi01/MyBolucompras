import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useModal } from '../hooks/useModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { getCuotasRestantes } from '../utils/cuotas';
import { useTheme } from '../context/ThemeContext';
import GastoCard from '../components/GastoCard';
import FilterBar from '../components/FilterBar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EditarGastoModal from './EditarGastoModal';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function GastosScreen() {
  const { gastos, mydata, loading, cargarDatos, eliminarGasto } = useData();
  const { dark } = useTheme();
  const s = styles(dark);

  const [search, setSearch] = useState('');
  const [soloEsteMes, setSoloEsteMes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gastoEditando, setGastoEditando] = useState(null);
  const [tabActivo, setTabActivo] = useState('normales');
  const { showModal, modal } = useModal();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  }, [cargarDatos]);

  const gastosFiltrados = useMemo(() => {
    let lista = gastos.filter(g => tabActivo === 'fijos' ? g.isFijo : !g.isFijo);
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(g => g.objeto.toLowerCase().includes(q));
    }
    if (soloEsteMes && tabActivo === 'normales') {
      lista = lista.filter(g => {
        const rest = getCuotasRestantes(g, mydata);
        return rest === 'N/A' || rest > 0;
      });
    }
    return lista;
  }, [gastos, search, soloEsteMes, mydata, tabActivo]);

  const handleDelete = (gasto) => {
    showModal({
      type: 'danger',
      title: 'Eliminar gasto',
      message: `¿Eliminar "${gasto.objeto}"?`,
      onConfirm: () => eliminarGasto(gasto.id),
    });
  };

  const handleTabChange = (tab) => {
    setTabActivo(tab);
    setSearch('');
  };

  const renderItem = ({ item }) => (
    <GastoCard
      gasto={item}
      mydata={mydata}
      onPress={() => setGastoEditando(item)}
      onDelete={() => handleDelete(item)}
    />
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.titleRow}>
        <Text style={s.title}>Mis gastos</Text>
        <Text style={s.count}>{gastosFiltrados.length}</Text>
      </View>

      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tabBtn, tabActivo === 'normales' && s.tabBtnActiveNormales]}
          onPress={() => handleTabChange('normales')}
          activeOpacity={0.7}
        >
          <Text style={[s.tabBtnText, tabActivo === 'normales' && s.tabBtnTextActive]}>Normales</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tabActivo === 'fijos' && s.tabBtnActiveFijos]}
          onPress={() => handleTabChange('fijos')}
          activeOpacity={0.7}
        >
          <Text style={[s.tabBtnText, tabActivo === 'fijos' && s.tabBtnTextActive]}>Fijos</Text>
        </TouchableOpacity>
      </View>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        soloEsteMes={soloEsteMes}
        onToggleSoloEsteMes={() => setSoloEsteMes(v => !v)}
        mostrarFiltroMes={tabActivo === 'normales'}
      />

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <FlatList
          data={gastosFiltrados}
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
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyText}>
                {search ? 'Sin resultados para la búsqueda' : 'No hay gastos registrados'}
              </Text>
            </View>
          }
          contentContainerStyle={gastosFiltrados.length === 0 ? s.emptyContainer : { paddingBottom: spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {gastoEditando && (
        <EditarGastoModal
          visible={!!gastoEditando}
          gasto={gastoEditando}
          onClose={() => setGastoEditando(null)}
        />
      )}
      {modal}
    </SafeAreaView>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.sm },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  count: { ...typography.captionMed, backgroundColor: dark ? '#1e3a5f' : '#EEF2FF', color: dark ? colors.primaryLight : colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, overflow: 'hidden' },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
    borderRadius: radius.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md - 1,
  },
  tabBtnActiveNormales: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtnActiveFijos: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tabBtnTextActive: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textAlign: 'center' },
  emptyContainer: { flexGrow: 1 },
});
