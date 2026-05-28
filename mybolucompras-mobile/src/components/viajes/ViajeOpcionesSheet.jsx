// src/components/viajes/ViajeOpcionesSheet.jsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useViajeMutations } from '../../hooks/mutations/useViajeMutations';
import { colors, spacing, radius, typography } from '../../constants/theme';
import CerrarViajeModal from './CerrarViajeModal';

export default function ViajeOpcionesSheet({ visible, onClose, viaje, gastos, onUpdated, onDeleted, dark }) {
  const { user } = useAuth();
  const { eliminar: eliminarMutation } = useViajeMutations();
  const insets = useSafeAreaInsets();
  const [showCerrar, setShowCerrar] = useState(false);

  const bg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const activo = viaje?.estado === 'activo';
  const esCreador = viaje?.createdBy === user?.id;

  const handleEliminar = () => {
    Alert.alert(
      'Eliminar viaje',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            eliminarMutation.mutate(viaje.id, {
              onSuccess: () => onDeleted?.(),
              onError: (err) => Alert.alert('Error', err.message),
            });
          },
        },
      ]
    );
  };

  const Option = ({ icon, label, onPress, color }) => (
    <TouchableOpacity
      style={styles.option}
      onPress={() => { onClose(); setTimeout(onPress, 300); }}
      activeOpacity={0.7}
    >
      <View style={[styles.optionIcon, { backgroundColor: (color || colors.primary) + '20' }]}>
        <Ionicons name={icon} size={20} color={color || colors.primary} />
      </View>
      <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={subtextColor} />
    </TouchableOpacity>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: textColor }]}>{viaje?.emoji} {viaje?.titulo}</Text>

            {activo && (
              <Option
                icon="lock-closed-outline"
                label="Cerrar viaje"
                onPress={() => setShowCerrar(true)}
                color="#F59E0B"
              />
            )}
            {esCreador && (
              <Option
                icon="trash-outline"
                label="Eliminar viaje"
                onPress={handleEliminar}
                color={colors.error}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <CerrarViajeModal
        visible={showCerrar}
        onClose={() => setShowCerrar(false)}
        viaje={viaje}
        gastos={gastos}
        dark={dark}
        onCerrado={() => { setShowCerrar(false); onUpdated?.(); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  optionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { ...typography.bodyMed, flex: 1 },
});
