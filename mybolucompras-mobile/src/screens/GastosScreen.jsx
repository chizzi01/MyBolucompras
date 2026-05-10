import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { getCuotasRestantes } from '../utils/cuotas';
import { useTheme } from '../context/ThemeContext';
import GastoCard from '../components/GastoCard';
import FilterBar from '../components/FilterBar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EditarGastoModal from './EditarGastoModal';
import { colors, spacing, typography } from '../constants/theme';

export default function GastosScreen() {
  const { gastos, mydata, loading, cargarDatos, eliminarGasto } = useData();
  const { dark } = useTheme();
  const s = styles(dark);

  const [search, setSearch] = useState('');
  const [soloEsteMes, setSoloEsteMes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gastoEditando, setGastoEditando] = useState(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  }, [cargarDatos]);

  const gastosFiltrados = useMemo(() => {
    let lista = gastos;
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(g => g.objeto.toLowerCase().includes(q));
    }
    if (soloEsteMes) {
      lista = lista.filter(g => {
        if (g.isFijo) return true;
        const rest = getCuotasRestantes(g, mydata);
        return rest === 'N/A' || rest > 0;
      });
    }
    return lista;
  }, [gastos, search, soloEsteMes, mydata]);

  const handleDelete = (gasto) => {
    Alert.alert(
      'Eliminar gasto',
      `¿Eliminar "${gasto.objeto}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminarGasto(gasto.id) },
      ]
    );
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

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        soloEsteMes={soloEsteMes}
        onToggleSoloEsteMes={() => setSoloEsteMes(v => !v)}
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
    </SafeAreaView>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.sm },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  count: { ...typography.captionMed, backgroundColor: dark ? '#1e3a5f' : '#EEF2FF', color: dark ? colors.primaryLight : colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, overflow: 'hidden' },
  empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textAlign: 'center' },
  emptyContainer: { flexGrow: 1 },
});
