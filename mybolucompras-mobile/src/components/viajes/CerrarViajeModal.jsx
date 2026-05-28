// src/components/viajes/CerrarViajeModal.jsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViajes } from '../../context/ViajesContext';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function CerrarViajeModal({ visible, onClose, viaje, gastos, onCerrado, dark }) {
  const { cerrarViaje } = useViajes();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const totalGastado = (gastos || []).reduce((sum, g) => sum + g.precio, 0);

  const handleCerrar = async () => {
    setLoading(true);
    try {
      await cerrarViaje(viaje.id);
      onClose();
      onCerrado?.();
    } catch (err) {
      console.warn('[CerrarViajeModal]', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={32} color="#F59E0B" />
          </View>

          <Text style={[styles.title, { color: textColor }]}>¿Cerrar el viaje?</Text>
          <Text style={[styles.sub, { color: subtextColor }]}>
            El viaje quedará archivado. Podrás consultarlo pero no agregar gastos.
          </Text>

          <View style={[styles.summary, { backgroundColor: dark ? '#1E293B' : '#F8FAFC' }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: subtextColor }]}>Total gastado</Text>
              <Text style={[styles.summaryValue, { color: textColor }]}>${totalGastado.toFixed(0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: subtextColor }]}>Gastos</Text>
              <Text style={[styles.summaryValue, { color: textColor }]}>{(gastos || []).length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: subtextColor }]}>Participantes</Text>
              <Text style={[styles.summaryValue, { color: textColor }]}>{viaje?.participantes?.length || 0}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#F59E0B' }]}
            onPress={handleCerrar}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sí, cerrar viaje</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={{ color: subtextColor, fontSize: 15 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  iconWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.sm },
  sub: { ...typography.body, textAlign: 'center', lineHeight: 22, marginBottom: spacing.md },
  summary: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...typography.body },
  summaryValue: { ...typography.bodyBold },
  btn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
