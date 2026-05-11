import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { BANCOS, MEDIOS_DE_PAGO, MONEDAS, ETIQUETA_COLORS } from '../constants/catalogos';
import { formatFecha } from '../utils/formatters';
import { useModal } from '../hooks/useModal';

const INITIAL = {
  objeto: '', fecha: formatFecha(new Date()),
  medio: '', tipo: 'credito', banco: '',
  cuotas: '1', cantidad: '1', precio: '',
  moneda: 'ARS', etiqueta: '', isFijo: false,
};

export default function AgregarScreen() {
  const { agregarGasto, mydata, actualizarConfig } = useData();
  const { dark } = useTheme();
  const s = styles(dark);
  const navigation = useNavigation();
  const { showModal, modal } = useModal();

  // Medios y bancos disponibles según configuración
  const mediosDisponibles = mydata.mediosHabilitados?.length > 0
    ? mydata.mediosHabilitados
    : MEDIOS_DE_PAGO;
  const bancosDisponibles = mydata.bancosHabilitados?.length > 0
    ? mydata.bancosHabilitados
    : BANCOS;

  const [form, setForm] = useState({
    ...INITIAL,
    medio: mediosDisponibles[0] || '',
    moneda: mydata.monedaPreferida || 'ARS',
  });
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(prev => {
    const next = { ...prev, [key]: val };
    if (key === 'tipo' && val === 'debito') next.cuotas = '1';
    if (key === 'isFijo' && val) { next.cuotas = '1'; next.cantidad = '1'; }
    return next;
  });

  const handleGuardar = async () => {
    if (!form.objeto.trim()) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá el objeto del gasto.' });
    }
    if (!form.precio || isNaN(Number(form.precio))) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá un precio válido.' });
    }

    setLoading(true);
    try {
      await agregarGasto({
        ...form,
        cuotas: parseInt(form.cuotas) || 1,
        cantidad: parseInt(form.cantidad) || 1,
        precio: Number(form.precio),
      });
      setForm({
        ...INITIAL,
        medio: mediosDisponibles[0] || '',
        moneda: mydata.monedaPreferida || 'ARS',
      });
      showModal({
        type: 'success',
        title: '¡Guardado!',
        message: 'El gasto fue agregado correctamente.',
        onClose: () => navigation.navigate('Gastos'),
      });
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
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Nuevo gasto</Text>

        <Field label="Tipo de gasto" dark={dark}>
          <FijoSelector value={form.isFijo} onChange={v => set('isFijo', v)} dark={dark} s={s} />
        </Field>

        <Row>
          <Field label="Objeto" dark={dark} flex>
            <TextInput style={s.input} value={form.objeto} onChangeText={v => set('objeto', v)} placeholder="Ej: Zapatillas" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />
          </Field>
          <Field label="Fecha (DD/MM/AAAA)" dark={dark} flex>
            <TextInput style={s.input} value={form.fecha} onChangeText={v => set('fecha', v)} placeholder="DD/MM/AAAA" placeholderTextColor={dark ? '#475569' : '#94A3B8'} keyboardType="numeric" />
          </Field>
        </Row>

        <Row>
          <Field label="Medio de pago" dark={dark} flex>
            <SelectRow options={mediosDisponibles} value={form.medio} onChange={v => set('medio', v)} dark={dark} style={s.input} />
          </Field>
          <Field label="Banco" dark={dark} flex>
            <SelectRow options={['', ...bancosDisponibles]} value={form.banco} onChange={v => set('banco', v)} dark={dark} style={s.input} placeholder="Sin banco" />
          </Field>
        </Row>

        <Row>
          <Field label="Moneda" dark={dark} flex>
            <SelectRow options={MONEDAS.map(m => m.codigo)} value={form.moneda} onChange={v => set('moneda', v)} dark={dark} style={s.input} />
          </Field>
          <Field label="Precio" dark={dark} flex>
            <TextInput style={s.input} value={form.precio} onChangeText={v => set('precio', v)} placeholder="0.00" placeholderTextColor={dark ? '#475569' : '#94A3B8'} keyboardType="decimal-pad" />
          </Field>
        </Row>

        {form.isFijo && (
          <Row>
            <Field label="Rep en el mes" dark={dark} flex>
              <TextInput style={s.input} value={form.cantidad} onChangeText={v => set('cantidad', v)} keyboardType="number-pad" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />
            </Field>
            <Field label="Periodo en meses" dark={dark} flex>
              <TextInput style={s.input} value={form.cuotas} onChangeText={v => set('cuotas', v)} keyboardType="number-pad" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />
            </Field>
          </Row>
        )}

        {!form.isFijo && (
          <Field label="Tipo de pago" dark={dark}>
            <TipoSelector value={form.tipo} onChange={v => set('tipo', v)} dark={dark} s={s} />
          </Field>
        )}

        {esCuotasHabilitado && (
          <Field label="Cuotas" dark={dark}>
            <TextInput
              style={s.input}
              value={form.cuotas}
              onChangeText={v => set('cuotas', v)}
              keyboardType="number-pad"
            />
          </Field>
        )}

        <Field label="Etiqueta" dark={dark}>
          <EtiquetaSelector
            value={form.etiqueta}
            onChange={v => set('etiqueta', v)}
            etiquetas={mydata.etiquetas || []}
            onCrearEtiqueta={handleCrearEtiqueta}
            dark={dark}
            s={s}
          />
        </Field>

        <TouchableOpacity style={s.btn} onPress={handleGuardar} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={s.btnText}>Guardar gasto</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      {modal}
    </SafeAreaView>
  );
}

function TipoSelector({ value, onChange, dark, s }) {
  const opciones = [
    { key: 'debito', label: 'Débito', icon: 'card-outline' },
    { key: 'credito', label: 'Crédito', icon: 'wallet-outline' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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

function FijoSelector({ value, onChange, dark, s }) {
  const opciones = [
    { key: false, label: 'Normal', icon: 'flash-outline' },
    { key: true, label: 'Fijo', icon: 'repeat-outline' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {opciones.map(op => {
        const activo = value === op.key;
        return (
          <TouchableOpacity
            key={String(op.key)}
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
    <View>
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

function Field({ label, children, dark, flex }) {
  return (
    <View style={[{ marginBottom: spacing.md }, flex && { flex: 1 }]}>
      <Text style={{ ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Row({ children }) {
  return <View style={{ flexDirection: 'row', gap: spacing.sm }}>{children}</View>;
}

function SelectRow({ options, value, onChange, dark, style, placeholder }) {
  const [open, setOpen] = useState(false);
  const s = StyleSheet.create({
    btn: { ...style, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    val: { ...typography.body, color: value ? (dark ? colors.text.dark : colors.text.light) : (dark ? '#475569' : '#94A3B8') },
    dropdown: { backgroundColor: dark ? colors.surface.dark : '#fff', borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, borderRadius: radius.md, marginTop: 4, maxHeight: 200, zIndex: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
    opt: { paddingHorizontal: spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: dark ? colors.border.dark : colors.border.light },
    optTxt: { ...typography.body, color: dark ? colors.text.dark : colors.text.light },
    selTxt: { color: colors.primary, fontWeight: '600' },
  });

  return (
    <View>
      <TouchableOpacity style={s.btn} onPress={() => setOpen(o => !o)}>
        <Text style={s.val}>{value || placeholder || 'Seleccionar'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} />
      </TouchableOpacity>
      {open && (
        <ScrollView style={s.dropdown} nestedScrollEnabled>
          {options.map(opt => (
            <TouchableOpacity key={opt} style={s.opt} onPress={() => { onChange(opt); setOpen(false); }}>
              <Text style={[s.optTxt, opt === value && s.selTxt]}>{opt || placeholder || '—'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light, marginBottom: spacing.lg },
  input: {
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: dark ? colors.text.dark : colors.text.light,
  },
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
  tipoBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tipoBtnText: {
    ...typography.bodyMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  tipoBtnTextActive: {
    color: '#fff',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  tagActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  tagTextActive: {
    color: '#fff',
  },
  tagAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  tagAddText: {
    ...typography.captionMed,
    color: colors.primary,
  },
  tagSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  tagSaveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
