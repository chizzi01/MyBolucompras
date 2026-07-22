// src/components/viajes/AgregarActividadModal.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../../constants/theme';
import DateTimeField from '../common/DateTimeField';

function horaToDate(hora) {
  if (!hora) return null;
  const [h, m] = hora.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToHora(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function AgregarActividadModal({ visible, onClose, dark, actividad, onSave, onDelete }) {
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState('');
  const [hora, setHora] = useState(null);
  const [ubicacion, setUbicacion] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = !!actividad;

  useEffect(() => {
    if (visible) {
      setTitulo(actividad?.titulo ?? '');
      setHora(horaToDate(actividad?.hora ?? null));
      setUbicacion(actividad?.ubicacion ?? '');
      setNota(actividad?.nota ?? '');
      setError('');
    }
  }, [visible, actividad]);

  const handleGuardar = async () => {
    if (!titulo.trim()) { setError('El título es requerido.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        titulo: titulo.trim(),
        hora: hora ? dateToHora(hora) : null,
        ubicacion: ubicacion.trim() || null,
        nota: nota.trim() || null,
      });
      onClose();
    } catch (err) {
      setError('Error al guardar la actividad: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = () => {
    Alert.alert('Eliminar actividad', '¿Eliminar esta actividad del itinerario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { onDelete(actividad.id); onClose(); } },
    ]);
  };

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const inputBg = dark ? '#0F172A' : '#F8FAFC';
  const border = dark ? colors.border.dark : colors.border.light;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: textColor }]}>
              {isEditing ? 'Editar Actividad' : 'Nueva Actividad'}
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]}
              placeholder="Título (ej: Visita al museo)"
              placeholderTextColor={subtextColor}
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={[styles.label, { color: subtextColor }]}>
              HORA <Text style={{ textTransform: 'none', fontWeight: '400' }}>(opcional — sin hora queda como "todo el día")</Text>
            </Text>
            <View style={styles.horaRow}>
              <DateTimeField value={hora} onChange={setHora} dark={dark} mode="time" placeholder="Todo el día" style={{ flex: 1 }} />
              {hora && (
                <TouchableOpacity onPress={() => setHora(null)} style={styles.clearHoraBtn}>
                  <Text style={{ color: colors.error, fontSize: 13 }}>Quitar hora</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]}
              placeholder="Ubicación (opcional)"
              placeholderTextColor={subtextColor}
              value={ubicacion}
              onChangeText={setUbicacion}
            />

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor, minHeight: 70 }]}
              placeholder="Nota (opcional)"
              placeholderTextColor={subtextColor}
              value={nota}
              onChangeText={setNota}
              multiline
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handleGuardar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isEditing ? 'Guardar cambios' : 'Agregar actividad'}</Text>}
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleEliminar}>
                <Text style={{ color: colors.error, fontWeight: '600' }}>Eliminar actividad</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: subtextColor }}>Cancelar</Text>
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
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, ...typography.body, marginBottom: spacing.md },
  label: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  horaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  clearHoraBtn: { paddingHorizontal: spacing.sm, paddingVertical: 8 },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
