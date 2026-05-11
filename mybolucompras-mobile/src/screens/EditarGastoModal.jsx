import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Switch, Modal,
} from 'react-native';
import { useModal } from '../hooks/useModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { BANCOS, MEDIOS_DE_PAGO, ETIQUETA_COLORS } from '../constants/catalogos';
import { parsePrecio } from '../utils/formatters';

export default function EditarGastoModal({ visible, gasto, onClose }) {
  const { editarGasto, mydata, actualizarConfig } = useData();
  const { dark } = useTheme();
  const s = styles(dark);

  const mediosDisponibles = mydata.mediosHabilitados?.length > 0
    ? mydata.mediosHabilitados
    : MEDIOS_DE_PAGO;
  const bancosDisponibles = mydata.bancosHabilitados?.length > 0
    ? mydata.bancosHabilitados
    : BANCOS;

  const [form, setForm] = useState({
    objeto: gasto.objeto,
    fecha: gasto.fecha,
    medio: gasto.medio,
    tipo: gasto.tipo || 'credito',
    banco: gasto.banco || '',
    cuotas: String(gasto.cuotas),
    cantidad: String(gasto.cantidad),
    precio: String(parsePrecio(gasto.precio)),
    moneda: gasto.moneda || 'ARS',
    etiqueta: gasto.etiqueta || '',
    isFijo: gasto.isFijo || false,
  });
  const [loading, setLoading] = useState(false);
  const { showModal, modal } = useModal();

  const set = (key, val) => setForm(prev => {
    const next = { ...prev, [key]: val };
    if (key === 'tipo' && val === 'debito') next.cuotas = '1';
    return next;
  });

  const handleGuardar = async () => {
    if (!form.objeto.trim()) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá el objeto del gasto.' });
    }
    setLoading(true);
    try {
      await editarGasto(gasto.id, {
        ...form,
        cuotas: parseInt(form.cuotas) || 1,
        cantidad: parseInt(form.cantidad) || 1,
        precio: Number(form.precio),
      });
      onClose();
    } catch (err) {
      showModal({ type: 'error', title: 'Error al guardar', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCrearEtiqueta = async (nuevaEtiqueta) => {
    const etiquetas = [...(mydata.etiquetas || []), nuevaEtiqueta];
    await actualizarConfig({ etiquetas });
  };

  const esCuotasHabilitado = form.tipo === 'credito' && !form.isFijo;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Editar gasto</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={dark ? colors.text.dark : colors.text.light} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Label text="Objeto" dark={dark} />
          <TextInput style={s.input} value={form.objeto} onChangeText={v => set('objeto', v)} placeholderTextColor={dark ? '#475569' : '#94A3B8'} />

          <Label text="Precio" dark={dark} />
          <TextInput style={s.input} value={form.precio} onChangeText={v => set('precio', v)} keyboardType="decimal-pad" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />

          <Label text="Fecha (DD/MM/AAAA)" dark={dark} />
          <TextInput style={s.input} value={form.fecha} onChangeText={v => set('fecha', v)} keyboardType="numeric" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />

          <Label text="Medio de pago" dark={dark} />
          <MiniSelect options={mediosDisponibles} value={form.medio} onChange={v => set('medio', v)} dark={dark} inputStyle={s.input} />

          <Label text="Banco" dark={dark} />
          <MiniSelect options={['', ...bancosDisponibles]} value={form.banco} onChange={v => set('banco', v)} dark={dark} inputStyle={s.input} placeholder="Sin banco" />

          {form.isFijo && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Label text="Rep en el mes" dark={dark} />
                <TextInput style={s.input} value={form.cantidad} onChangeText={v => set('cantidad', v)} keyboardType="number-pad" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />
              </View>
              <View style={{ flex: 1 }}>
                <Label text="Periodo en meses" dark={dark} />
                <TextInput style={s.input} value={form.cuotas} onChangeText={v => set('cuotas', v)} keyboardType="number-pad" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />
              </View>
            </View>
          )}

          {!form.isFijo && (
            <>
              <Label text="Tipo de pago" dark={dark} />
              <TipoSelector value={form.tipo} onChange={v => set('tipo', v)} dark={dark} s={s} />
            </>
          )}

          {esCuotasHabilitado && (
            <>
              <Label text="Cuotas" dark={dark} />
              <TextInput style={s.input} value={form.cuotas} onChangeText={v => set('cuotas', v)} keyboardType="number-pad" />
            </>
          )}

          <Label text="Etiqueta" dark={dark} />
          <EtiquetaSelector
            value={form.etiqueta}
            onChange={v => set('etiqueta', v)}
            etiquetas={mydata.etiquetas || []}
            onCrearEtiqueta={handleCrearEtiqueta}
            dark={dark}
            s={s}
          />

          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Gasto fijo / recurrente</Text>
            <Switch
              value={form.isFijo}
              onValueChange={v => set('isFijo', v)}
              trackColor={{ false: dark ? '#334155' : '#CBD5E1', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={s.btn} onPress={handleGuardar} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </ScrollView>
        {modal}
      </SafeAreaView>
    </Modal>
  );
}

function TipoSelector({ value, onChange, dark, s }) {
  const opciones = [
    { key: 'debito', label: 'Débito', icon: 'card-outline' },
    { key: 'credito', label: 'Crédito', icon: 'wallet-outline' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
      {opciones.map(op => {
        const activo = value === op.key;
        return (
          <TouchableOpacity
            key={op.key}
            style={[s.tipoBtn, activo && s.tipoBtnActive]}
            onPress={() => onChange(op.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={op.icon}
              size={18}
              color={activo ? '#fff' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
            />
            <Text style={[s.tipoBtnText, activo && s.tipoBtnTextActive]}>{op.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function EtiquetaSelector({ value, onChange, etiquetas, onCrearEtiqueta, dark, s }) {
  const [creando, setCreando] = useState(false);
  const [nueva, setNueva] = useState('');
  const [colorSel, setColorSel] = useState(ETIQUETA_COLORS[0]);
  const [savingTag, setSavingTag] = useState(false);

  const handleCrear = async () => {
    const trimmed = nueva.trim();
    if (!trimmed) return;
    setSavingTag(true);
    try {
      await onCrearEtiqueta({ nombre: trimmed, color: colorSel });
      onChange(trimmed);
      setNueva('');
      setCreando(false);
    } catch {
    } finally {
      setSavingTag(false);
    }
  };

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={s.tagsWrap}>
        {etiquetas.map(tag => {
          const nombre = typeof tag === 'string' ? tag : tag.nombre;
          const color = typeof tag === 'string' ? colors.primary : tag.color;
          const activo = value === nombre;
          return (
            <TouchableOpacity
              key={nombre}
              style={[s.tag, { borderColor: color, backgroundColor: activo ? color : color + '20' }]}
              onPress={() => onChange(activo ? '' : nombre)}
            >
              <Text style={[s.tagText, { color: activo ? '#fff' : color }]}>{nombre}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={s.tagAdd} onPress={() => setCreando(v => !v)}>
          <Ionicons name={creando ? 'close' : 'add'} size={14} color={colors.primary} />
          <Text style={s.tagAddText}>Nueva</Text>
        </TouchableOpacity>
      </View>
      {creando && (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={nueva}
              onChangeText={setNueva}
              placeholder="Nombre de etiqueta"
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
              autoFocus
              onSubmitEditing={handleCrear}
            />
            <TouchableOpacity style={[s.tagSaveBtn, { backgroundColor: colorSel }]} onPress={handleCrear} disabled={savingTag}>
              {savingTag ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.tagSaveBtnText}>Agregar</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm }}>
            {ETIQUETA_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: colorSel === c ? 3 : 1, borderColor: colorSel === c ? (dark ? '#fff' : '#1E293B') : c }}
                onPress={() => setColorSel(c)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function Label({ text, dark }) {
  return (
    <Text style={{ ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: 6, marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {text}
    </Text>
  );
}

function MiniSelect({ options, value, onChange, dark, inputStyle, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={[inputStyle, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setOpen(o => !o)}>
        <Text style={{ ...typography.body, color: value ? (dark ? colors.text.dark : colors.text.light) : (dark ? '#475569' : '#94A3B8') }}>{value || placeholder || 'Seleccionar'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} />
      </TouchableOpacity>
      {open && (
        <ScrollView style={{ backgroundColor: dark ? colors.surface.dark : '#fff', borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, borderRadius: radius.md, maxHeight: 160, zIndex: 20 }} nestedScrollEnabled>
          {options.map(opt => (
            <TouchableOpacity key={opt} style={{ paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark ? colors.border.dark : colors.border.light }} onPress={() => { onChange(opt); setOpen(false); }}>
              <Text style={{ ...typography.body, color: opt === value ? colors.primary : (dark ? colors.text.dark : colors.text.light), fontWeight: opt === value ? '600' : '400' }}>{opt || placeholder || '—'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: dark ? colors.border.dark : colors.border.light },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  input: { backgroundColor: dark ? '#0F172A' : '#F8FAFC', borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, ...typography.body, color: dark ? colors.text.dark : colors.text.light },
  tipoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  tipoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipoBtnText: { ...typography.bodyMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tipoBtnTextActive: { color: '#fff' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  tagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tagTextActive: { color: '#fff' },
  tagAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed' },
  tagAddText: { ...typography.captionMed, color: colors.primary },
  tagSaveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  tagSaveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light },
  toggleLabel: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
