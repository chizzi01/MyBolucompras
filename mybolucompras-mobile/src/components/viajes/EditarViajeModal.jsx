// src/components/viajes/EditarViajeModal.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useViajeMutations } from '../../hooks/mutations/useViajeMutations';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { toISODate, parseISODate } from '../../utils/formatters';
import DateTimeField from '../common/DateTimeField';

const EMOJIS = ['✈️', '🏔️', '🌊', '🌴', '🎿', '🏖️', '🎒', '🗺️'];

export default function EditarViajeModal({ visible, onClose, viaje, dark: darkProp }) {
  const { dark: darkTheme } = useTheme();
  const dark = darkProp ?? darkTheme;
  const { editar: editarMutation } = useViajeMutations();
  const insets = useSafeAreaInsets();

  const [titulo, setTitulo] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && viaje) {
      setTitulo(viaje.titulo);
      setEmoji(viaje.emoji);
      setFechaDesde(parseISODate(viaje.fechaDesde));
      setFechaHasta(parseISODate(viaje.fechaHasta));
      setError('');
    }
  }, [visible, viaje]);

  const handleGuardar = async () => {
    if (!titulo.trim()) { setError('El título es requerido.'); return; }
    if (fechaDesde && fechaHasta && fechaHasta < fechaDesde) {
      setError('La fecha "hasta" no puede ser anterior a la fecha "desde".');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await editarMutation.mutateAsync({
        id: viaje.id,
        campos: {
          titulo: titulo.trim(),
          emoji,
          fechaDesde: fechaDesde ? toISODate(fechaDesde) : null,
          fechaHasta: fechaHasta ? toISODate(fechaHasta) : null,
        },
      });
      onClose();
    } catch (err) {
      setError('Error al guardar los cambios: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const inputBg = dark ? '#0F172A' : '#F8FAFC';
  const border = dark ? colors.border.dark : colors.border.light;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: textColor }]}>Editar Viaje</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]}
              placeholder="Nombre del viaje"
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={[styles.label, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
              FECHAS DEL VIAJE <Text style={{ textTransform: 'none', fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <View style={styles.fechasRow}>
              <DateTimeField value={fechaDesde} onChange={setFechaDesde} dark={dark} placeholder="Desde" style={{ flex: 1 }} />
              <DateTimeField value={fechaHasta} onChange={setFechaHasta} dark={dark} placeholder="Hasta" style={{ flex: 1 }} />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handleGuardar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Guardar cambios</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: dark ? colors.textSecondary.dark : colors.textSecondary.light }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h2, marginBottom: spacing.md },
  emojiBtn: { padding: 8, marginRight: 6, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, ...typography.body, marginBottom: spacing.md },
  label: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fechasRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
