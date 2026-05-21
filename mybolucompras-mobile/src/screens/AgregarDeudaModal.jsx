import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useModal } from '../hooks/useModal';
import { useDeudores } from '../context/DeudoresContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { MEDIOS_DE_PAGO, MONEDAS } from '../constants/catalogos';
import { formatPrecioLive, getCurrencySymbol, parsePrecio } from '../utils/formatters';

const TIPOS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
];

const todayISO = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function AgregarDeudaModal({ route, navigation }) {
  const { deuda: deudaEdit } = route.params || {};
  const isEditing = !!deudaEdit;
  const onClose = () => navigation.goBack();

  const { agregarDeuda, editarDeuda } = useDeudores();
  const { dark } = useTheme();
  const s = styles(dark);
  const { showModal, modal } = useModal();

  const initPrecioDisplay = () => {
    if (!deudaEdit?.monto) return '';
    const { display } = formatPrecioLive(
      String(deudaEdit.monto).replace('.', ','),
      deudaEdit.moneda || 'ARS'
    );
    return display;
  };

  const [form, setForm] = useState({
    nombre: deudaEdit?.nombre || '',
    descripcion: deudaEdit?.descripcion || '',
    monto: deudaEdit ? String(deudaEdit.monto) : '',
    moneda: deudaEdit?.moneda || 'ARS',
    medio: deudaEdit?.medio || '',
    tipo: deudaEdit?.tipo || 'transferencia',
    fechaDeuda: deudaEdit?.fechaDeuda || todayISO(),
  });
  const [precioDisplay, setPrecioDisplay] = useState(initPrecioDisplay);
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePrecioChange = (val) => {
    const { display, cleanValue } = formatPrecioLive(val, form.moneda);
    setPrecioDisplay(display);
    set('monto', cleanValue);
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá el nombre de la persona.' });
    }
    const montoNum = parsePrecio(form.monto);
    if (!montoNum || montoNum <= 0) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá un monto válido.' });
    }

    setLoading(true);
    try {
      const payload = { ...form, monto: montoNum };
      if (isEditing) {
        await editarDeuda(deudaEdit.id, payload);
      } else {
        await agregarDeuda(payload);
      }
      onClose();
    } catch (err) {
      showModal({ type: 'error', title: 'Error al guardar', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light }}
    >
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>{isEditing ? 'Editar deuda' : 'Nueva deuda'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={dark ? colors.text.dark : colors.text.light} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          <Text style={s.label}>Nombre de la persona *</Text>
          <TextInput
            style={s.input}
            value={form.nombre}
            onChangeText={v => set('nombre', v)}
            placeholder="Ej: Juan"
            placeholderTextColor={dark ? '#475569' : '#94A3B8'}
            autoCapitalize="words"
          />

          <Text style={s.label}>Descripción (opcional)</Text>
          <TextInput
            style={[s.input, s.inputMultiline]}
            value={form.descripcion}
            onChangeText={v => set('descripcion', v)}
            placeholder="Ej: Préstamo para el asado"
            placeholderTextColor={dark ? '#475569' : '#94A3B8'}
            multiline
            numberOfLines={2}
          />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 2 }}>
              <Text style={s.label}>Monto *</Text>
              <TextInput
                style={s.input}
                value={precioDisplay}
                onChangeText={handlePrecioChange}
                placeholder={`${getCurrencySymbol(form.moneda)} 0,00`}
                placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Moneda</Text>
              <MiniSelect
                options={MONEDAS.map(m => m.codigo)}
                value={form.moneda}
                onChange={v => set('moneda', v)}
                dark={dark}
                inputStyle={s.input}
              />
            </View>
          </View>

          <Text style={s.label}>Medio de pago</Text>
          <MiniSelect
            options={['', ...MEDIOS_DE_PAGO]}
            value={form.medio}
            onChange={v => set('medio', v)}
            dark={dark}
            inputStyle={s.input}
            placeholder="Sin especificar"
          />

          <Text style={s.label}>Tipo</Text>
          <View style={s.tipoRow}>
            {TIPOS.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[s.tipoBtn, form.tipo === t.value && s.tipoBtnActive]}
                onPress={() => set('tipo', t.value)}
                activeOpacity={0.7}
              >
                <Text style={[s.tipoBtnText, form.tipo === t.value && s.tipoBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Fecha (DD/MM/AAAA)</Text>
          <TextInput
            style={s.input}
            value={form.fechaDeuda}
            onChangeText={v => set('fechaDeuda', v)}
            keyboardType="numeric"
            placeholderTextColor={dark ? '#475569' : '#94A3B8'}
          />

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleGuardar}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>{isEditing ? 'Guardar cambios' : 'Agregar deuda'}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {modal}
    </KeyboardAvoidingView>
  );
}

function MiniSelect({ options, value, onChange, dark, inputStyle, placeholder }) {
  const [open, setOpen] = useState(false);
  const s = miniStyles(dark);
  const label = value || placeholder || value;
  return (
    <View style={{ marginBottom: 0 }}>
      <TouchableOpacity style={[inputStyle, s.selectBtn]} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text style={s.selectText}>{label || placeholder || 'Seleccionar'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={dark ? '#475569' : '#94A3B8'} />
      </TouchableOpacity>
      {open && (
        <View style={s.dropdown}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[s.option, opt === value && s.optionSelected]}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text style={[s.optionText, opt === value && s.optionTextSelected]}>
                {opt || placeholder || '—'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const miniStyles = (dark) => StyleSheet.create({
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { ...typography.body, color: dark ? colors.text.dark : colors.text.light },
  dropdown: {
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md, overflow: 'hidden', marginTop: 4,
    zIndex: 999, elevation: 4,
  },
  option: { paddingVertical: 10, paddingHorizontal: spacing.md },
  optionSelected: { backgroundColor: colors.primary + '20' },
  optionText: { ...typography.body, color: dark ? colors.text.dark : colors.text.light },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
});

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1,
    borderBottomColor: dark ? colors.border.dark : colors.border.light,
  },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  label: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: 6, marginTop: spacing.sm, textTransform: 'uppercase', fontSize: 11 },
  input: {
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12,
    ...typography.body, color: dark ? colors.text.dark : colors.text.light,
    marginBottom: spacing.xs,
  },
  inputMultiline: { height: 72, textAlignVertical: 'top' },
  tipoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  tipoBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light,
    alignItems: 'center', backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  tipoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipoBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tipoBtnTextActive: { color: '#fff', fontWeight: '600' },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14,
    alignItems: 'center', marginTop: spacing.lg,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
