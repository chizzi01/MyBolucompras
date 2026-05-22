import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useModal } from '../hooks/useModal';
import { useDeudores } from '../context/DeudoresContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { MEDIOS_DE_PAGO, MONEDAS } from '../constants/catalogos';
import { formatPrecioLive, getCurrencySymbol, parsePrecio, formatFecha, parseFecha } from '../utils/formatters';
import { userService } from '../services/userService';
import { contactService } from '../services/contactService';

const TIPOS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
];

const CUOTAS_PRESETS = [1, 3, 6, 12, 18, 24];

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

  const [form, setForm] = useState({
    nombre: deudaEdit?.nombre || '',
    descripcion: deudaEdit?.descripcion || '',
    monto: deudaEdit ? String(deudaEdit.monto) : '',
    moneda: deudaEdit?.moneda || 'ARS',
    medio: deudaEdit?.medio || '',
    tipo: deudaEdit?.tipo || 'transferencia',
    isFijo: deudaEdit?.isFijo || false,
    cuotas: deudaEdit?.cuotas ? String(deudaEdit.cuotas) : '1',
    cantidad: deudaEdit?.cantidad ? String(deudaEdit.cantidad) : '1',
    fechaDeuda: deudaEdit?.fechaDeuda || todayISO(),
  });

  const [precioDisplay, setPrecioDisplay] = useState(() => {
    if (!deudaEdit?.monto) return '';
    const { display } = formatPrecioLive(
      String(deudaEdit.monto).replace('.', ','),
      deudaEdit.moneda || 'ARS'
    );
    return display;
  });

  const [loading, setLoading] = useState(false);
  const [showCuotasCustom, setShowCuotasCustom] = useState(false);

  // Compartir
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [sharedUser, setSharedUser] = useState(null);
  const [recentContacts, setRecentContacts] = useState([]);

  const isCompartida = !!deudaEdit?.compartidoConNombre;

  useEffect(() => {
    if (isEditing) return;
    let cancelled = false;
    contactService.getRecent()
      .then(contacts => { if (!cancelled) setRecentContacts(contacts); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePrecioChange = (val) => {
    const { display, cleanValue } = formatPrecioLive(val, form.moneda);
    setPrecioDisplay(display);
    set('monto', cleanValue);
  };

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const found = await userService.buscarPorEmail(searchEmail.trim());
      if (found) {
        setSharedUser(found);
        setSearchEmail('');
      } else {
        showModal({
          type: 'warning',
          title: 'Usuario no encontrado',
          message: 'No hay ningún usuario con ese email en MyBolucompras.',
        });
      }
    } catch (err) {
      showModal({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setSearching(false);
    }
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá el nombre de la persona.' });
    }
    const montoNum = parsePrecio(form.monto);
    if (!montoNum || montoNum <= 0) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá un monto válido.' });
    }
    if (!form.medio) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Seleccioná un medio de pago.' });
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        monto: montoNum,
        cuotas: parseInt(form.cuotas) || 1,
        cantidad: parseInt(form.cantidad) || 1,
      };
      const sharedWith = sharedUser
        ? { userId: sharedUser.id, nombre: sharedUser.nombre || sharedUser.email }
        : null;

      if (isEditing) {
        await editarDeuda(deudaEdit.id, payload);
      } else {
        await agregarDeuda(payload, sharedWith);
        if (sharedUser) {
          await contactService.saveContact(sharedUser);
        }
      }
      onClose();
    } catch (err) {
      showModal({ type: 'error', title: 'Error al guardar', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const esCuotasHabilitado = form.tipo === 'credito' && !form.isFijo;

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
          {/* Tipo Variable / Fija */}
          <Text style={s.label}>Tipo de deuda</Text>
          <View style={s.tipoRow}>
            {[
              { key: false, label: 'Variable', icon: 'flash-outline' },
              { key: true, label: 'Fija', icon: 'repeat-outline' },
            ].map(op => {
              const activo = form.isFijo === op.key;
              return (
                <TouchableOpacity
                  key={String(op.key)}
                  style={[s.tipoBtn, activo && s.tipoBtnActive]}
                  onPress={() => {
                    set('isFijo', op.key);
                    if (op.key) { set('cuotas', '0'); set('cantidad', '1'); }
                    else { set('cuotas', '1'); }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={op.icon}
                    size={15}
                    color={activo ? '#fff' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
                  />
                  <Text style={[s.tipoBtnText, activo && s.tipoBtnTextActive]}>{op.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
                onPress={() => {
                  set('tipo', t.value);
                  if (t.value !== 'credito') { set('cuotas', '1'); setShowCuotasCustom(false); }
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.tipoBtnText, form.tipo === t.value && s.tipoBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cuotas — solo crédito variable */}
          {esCuotasHabilitado && (
            <>
              <Text style={s.label}>Cuotas</Text>
              <View style={s.cuotasRow}>
                {CUOTAS_PRESETS.map(c => {
                  const activo = !showCuotasCustom && parseInt(form.cuotas) === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[s.cuotasPill, activo && s.cuotasPillActive]}
                      onPress={() => { setShowCuotasCustom(false); set('cuotas', String(c)); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.cuotasPillText, activo && s.cuotasPillTextActive]}>{c}x</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[s.cuotasPill, showCuotasCustom && s.cuotasPillActive]}
                  onPress={() => { setShowCuotasCustom(true); set('cuotas', ''); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.cuotasPillText, showCuotasCustom && s.cuotasPillTextActive]}>Otro</Text>
                </TouchableOpacity>
              </View>
              {showCuotasCustom && (
                <TextInput
                  style={[s.input, { marginBottom: spacing.xs }]}
                  value={form.cuotas}
                  onChangeText={v => set('cuotas', v)}
                  keyboardType="number-pad"
                  placeholder="Ej: 9"
                  placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                  autoFocus
                />
              )}
            </>
          )}

          {/* Fija: cantidad y período */}
          {form.isFijo && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Vez por mes</Text>
                <TextInput
                  style={s.input}
                  value={form.cantidad}
                  onChangeText={v => set('cantidad', v)}
                  keyboardType="number-pad"
                  placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Período (meses)</Text>
                <TextInput
                  style={s.input}
                  value={form.cuotas === '0' ? '' : form.cuotas}
                  onChangeText={v => set('cuotas', v || '0')}
                  keyboardType="number-pad"
                  placeholder="0 = indefinida"
                  placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                />
              </View>
            </View>
          )}

          <Text style={s.label}>Fecha</Text>
          <DatePickerField
            value={form.fechaDeuda}
            onChange={v => set('fechaDeuda', v)}
            dark={dark}
            s={s}
          />

          {/* Compartir / Notificar al deudor */}
          {!isEditing && (
            <View style={s.shareCard}>
              <View style={s.shareTitleRow}>
                <Ionicons name="share-social-outline" size={16} color={colors.primary} />
                <Text style={s.shareTitle}>Notificar al deudor</Text>
              </View>
              {!sharedUser ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Email del contacto..."
                    placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                    value={searchEmail}
                    onChangeText={setSearchEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="search"
                    onSubmitEditing={handleSearchUser}
                  />
                  <TouchableOpacity style={s.searchBtn} onPress={handleSearchUser} disabled={searching}>
                    {searching
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Ionicons name="search" size={20} color="#fff" />
                    }
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.sharedInfo}>
                  <View style={s.userInfo}>
                    <View style={s.miniAvatar}>
                      <Text style={s.miniAvatarText}>{(sharedUser.nombre || sharedUser.email)?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                    <Text style={s.userName}>{sharedUser.nombre || sharedUser.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSharedUser(null)}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
              {!sharedUser && recentContacts.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {recentContacts.map(c => (
                    <TouchableOpacity key={c.id} style={s.recentPill} onPress={() => setSharedUser(c)}>
                      <Text style={s.recentPillText}>{c.nombre || c.email?.split('@')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {isEditing && isCompartida && (
            <View style={[s.shareCard, { borderColor: colors.accent + '80' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={[s.shareTitle, { color: colors.accent }]}>
                  Compartida con {deudaEdit.compartidoConNombre}
                </Text>
              </View>
            </View>
          )}

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

function DatePickerField({ value, onChange, dark, s }) {
  const [show, setShow] = useState(false);
  const dateObj = (() => {
    const d = parseFecha(value);
    return isNaN(d) ? new Date() : d;
  })();

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) onChange(formatFecha(selectedDate));
  };

  return (
    <View style={{ marginBottom: spacing.xs }}>
      <TouchableOpacity style={[s.input, s.dateBtn, { marginBottom: 0 }]} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={16} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} />
        <Text style={s.dateBtnText}>{value || 'Seleccionar fecha'}</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={s.dateModalBg}>
            <View style={s.dateModalCard}>
              <View style={s.dateModalHeader}>
                <Text style={s.dateModalTitle}>Seleccionar fecha</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={s.dateModalDone}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="spinner"
                onChange={handleChange}
                textColor={dark ? colors.text.dark : colors.text.light}
                locale="es-AR"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
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
  label: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    marginBottom: 6, marginTop: spacing.sm,
    textTransform: 'uppercase', fontSize: 11,
  },
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
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  tipoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipoBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tipoBtnTextActive: { color: '#fff', fontWeight: '600' },
  cuotasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.xs },
  cuotasPill: {
    paddingHorizontal: spacing.sm, paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  cuotasPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cuotasPillText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  cuotasPillTextActive: { color: '#fff', fontWeight: '600' },
  shareCard: {
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderRadius: radius.md, borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  shareTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  shareTitle: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
  searchBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  sharedInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  miniAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  miniAvatarText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  userName: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
  recentPill: {
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '10',
  },
  recentPillText: { ...typography.captionMed, color: colors.primary },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateBtnText: { ...typography.body, color: dark ? colors.text.dark : colors.text.light, flex: 1 },
  dateModalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  dateModalCard: {
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingBottom: 34,
  },
  dateModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1,
    borderBottomColor: dark ? colors.border.dark : colors.border.light,
  },
  dateModalTitle: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light },
  dateModalDone: { ...typography.bodyMed, color: colors.primary },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14,
    alignItems: 'center', marginTop: spacing.lg,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
