import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { ETIQUETA_COLORS, ETIQUETA_ICONS } from '../constants/catalogos';

// Modal único para crear y editar etiquetas, usado tanto desde Configuración
// como desde el selector de etiquetas al cargar/editar un gasto — así el
// nombre, color e ícono se eligen siempre de la misma forma en un solo lugar.
// Pasar `etiqueta` precarga el formulario y lo pone en modo edición.
export default function CrearEtiquetaModal({ visible, onClose, onGuardar, existentes = [], etiqueta = null }) {
  const { dark } = useTheme();
  const s = styles(dark);
  const editando = !!etiqueta;

  const [nombre, setNombre] = useState('');
  const [colorSel, setColorSel] = useState(ETIQUETA_COLORS[0]);
  const [iconoSel, setIconoSel] = useState(ETIQUETA_ICONS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setNombre(etiqueta?.nombre || '');
      setColorSel(etiqueta?.color || ETIQUETA_COLORS[0]);
      setIconoSel(etiqueta?.icono || ETIQUETA_ICONS[0]);
      setError('');
    }
  }, [visible, etiqueta]);

  const handleGuardar = async () => {
    const trimmed = nombre.trim();
    if (!trimmed) return;
    const nombres = existentes
      .map(e => (typeof e === 'string' ? e : e.nombre))
      .filter(n => n !== etiqueta?.nombre);
    if (nombres.includes(trimmed)) {
      setError('Ya existe una etiqueta con ese nombre.');
      return;
    }
    setSaving(true);
    try {
      await onGuardar({ nombre: trimmed, color: colorSel, icono: iconoSel });
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la etiqueta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={[s.preview, { backgroundColor: colorSel }]}>
            <Ionicons name={iconoSel} size={30} color="#fff" />
          </View>

          <Text style={s.title}>{editando ? 'Editar etiqueta' : 'Nueva etiqueta'}</Text>

          <TextInput
            style={s.input}
            value={nombre}
            onChangeText={t => { setNombre(t); setError(''); }}
            placeholder="Nombre de la etiqueta"
            placeholderTextColor={dark ? '#475569' : '#94A3B8'}
            autoFocus
            onSubmitEditing={handleGuardar}
          />
          {!!error && <Text style={s.error}>{error}</Text>}

          <Text style={s.label}>Color</Text>
          <View style={s.grid}>
            {ETIQUETA_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorSwatch, { backgroundColor: c }, colorSel === c && s.swatchSelected]}
                onPress={() => setColorSel(c)}
              />
            ))}
          </View>

          <Text style={s.label}>Ícono</Text>
          <View style={s.grid}>
            {ETIQUETA_ICONS.map(icon => (
              <TouchableOpacity
                key={icon}
                style={[s.iconSwatch, iconoSel === icon && { backgroundColor: colorSel, borderColor: colorSel }]}
                onPress={() => setIconoSel(icon)}
              >
                <Ionicons name={icon} size={18} color={iconoSel === icon ? '#fff' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7} disabled={saving}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colorSel }]} onPress={handleGuardar} activeOpacity={0.85} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>{editando ? 'Guardar' : 'Crear'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = (dark) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: dark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: dark ? 0.5 : 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  preview: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: dark ? colors.text.dark : colors.text.light,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  input: {
    width: '100%',
    backgroundColor: dark ? colors.surfaceSecondary.dark : colors.surfaceSecondary.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: dark ? colors.text.dark : colors.text.light,
    marginBottom: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: dark ? '#fff' : '#1E293B',
  },
  iconSwatch: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
  },
  cancelText: {
    ...typography.bodyMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...typography.bodyMed,
    color: '#fff',
    fontWeight: '700',
  },
});
