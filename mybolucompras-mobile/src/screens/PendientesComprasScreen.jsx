import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useNotificacionesPendientes } from '../hooks/queries/useNotificacionesPendientes';
import { useNotificacionesPendientesMutations } from '../hooks/mutations/useNotificacionesPendientesMutations';
import PendienteCompraCard from '../components/PendienteCompraCard';

export default function PendientesComprasScreen() {
  const { dark } = useTheme();
  const s = styles(dark);
  const navigation = useNavigation();
  const { pendientes, loading, refetch } = useNotificacionesPendientes();
  const { descartar } = useNotificacionesPendientesMutations();

  const handleConfirmar = (pendiente) => {
    navigation.navigate('Agregar', { pendiente });
  };

  const handleDescartar = (pendiente) => {
    descartar.mutate(pendiente.id);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={dark ? colors.text.dark : colors.text.light} />
        </TouchableOpacity>
        <Text style={s.title}>Compras detectadas</Text>
      </View>

      {!loading && pendientes.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={48} color={dark ? '#334155' : '#CBD5E1'} />
          <Text style={s.emptyText}>No hay compras pendientes de confirmar.</Text>
        </View>
      ) : (
        <FlatList
          data={pendientes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: spacing.md }}
          onRefresh={refetch}
          refreshing={loading}
          renderItem={({ item }) => (
            <PendienteCompraCard
              pendiente={item}
              onConfirmar={() => handleConfirmar(item)}
              onDescartar={() => handleDescartar(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyText: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textAlign: 'center' },
});
