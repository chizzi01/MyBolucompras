// src/components/viajes/RegistrarPagoModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viajePagosService } from '../../services/viajePagosService';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { formatMontoEuropeo } from '../../utils/formatters';

export default function RegistrarPagoModal({ visible, onClose, viaje, transaccion, dark }) {
  const [monto, setMonto] = useState('');
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (transaccion) setMonto(String(transaccion.monto));
  }, [transaccion]);

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const inputBg = dark ? '#1E293B' : '#F8FAFC';
  const borderColor = dark ? colors.border.dark : colors.border.light;

  const registrar = useMutation({
    mutationFn: () =>
      viajePagosService.registrar(viaje.id, transaccion.de, transaccion.hacia, Number(monto)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viaje_pagos', viaje.id] });
      onClose();
    },
  });

  const handleConfirm = () => {
    const n = Number(monto);
    if (!n || n <= 0) return;
    registrar.mutate();
  };

  if (!transaccion) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          <Text style={[styles.title, { color: textColor }]}>Registrar pago</Text>
          <Text style={[styles.sub, { color: subtextColor }]}>
            {transaccion.deNombre} → {transaccion.haciaNombre}
          </Text>
          <Text style={[styles.deuda, { color: dark ? '#818CF8' : '#4F46E5' }]}>
            Deuda total: ${formatMontoEuropeo(transaccion.monto)}
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            value={monto}
            onChangeText={setMonto}
            keyboardType="numeric"
            placeholder="Monto"
            placeholderTextColor={subtextColor}
            selectTextOnFocus
          />

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={handleConfirm}
            disabled={registrar.isPending}
          >
            {registrar.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Confirmar pago</Text>
            }
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
  handle: {
    width: 40, height: 4, backgroundColor: '#CBD5E1',
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg,
  },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.sm },
  sub: { ...typography.body, textAlign: 'center', marginBottom: 4 },
  deuda: { textAlign: 'center', fontWeight: '700', fontSize: 16, marginBottom: spacing.md },
  input: {
    borderWidth: 1, borderRadius: radius.md,
    padding: spacing.sm, fontSize: 18, textAlign: 'center',
    marginBottom: spacing.md,
  },
  btn: {
    borderRadius: radius.md, paddingVertical: 14,
    alignItems: 'center', marginBottom: spacing.sm,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
