import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useModal } from '../hooks/useModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { BANCOS, MEDIOS_DE_PAGO, ETIQUETA_COLORS } from '../constants/catalogos';
import { parsePrecio, formatPrecioLive, getCurrencySymbol } from '../utils/formatters';
import { userService } from '../services/userService';
import { contactService } from '../services/contactService';

export default function EditarGastoScreen({ route, navigation }) {
  const { gasto } = route.params;
  const onClose = () => navigation.goBack();

  const { editarGasto, mydata, actualizarConfig } = useData();
  const { dark } = useTheme();
  const s = styles(dark);

  const mediosDisponibles = mydata.mediosHabilitados?.length > 0
    ? mydata.mediosHabilitados
    : MEDIOS_DE_PAGO;
  const bancosDisponibles = mydata.bancosHabilitados?.length > 0
    ? mydata.bancosHabilitados
    : BANCOS;

  const initPrecioDisplay = () => {
    const num = parsePrecio(gasto.precio);
    if (!num) return '';
    const { display } = formatPrecioLive(
      String(num).replace('.', ','),
      gasto.moneda || 'ARS'
    );
    return display;
  };

  const MEDIOS_SOLO_DEBITO = ['Efectivo', 'Transferencia'];

  const [form, setForm] = useState({
    objeto: gasto.objeto,
    fecha: gasto.fecha,
    medio: gasto.medio,
    tipo: MEDIOS_SOLO_DEBITO.includes(gasto.medio) ? 'debito' : (gasto.tipo || 'debito'),
    banco: gasto.banco || '',
    cuotas: String(gasto.cuotas),
    cantidad: String(gasto.cantidad),
    precio: String(parsePrecio(gasto.precio)),
    moneda: gasto.moneda || 'ARS',
    etiqueta: gasto.etiqueta || '',
    isFijo: gasto.isFijo || false,
  });
  const [precioDisplay, setPrecioDisplay] = useState(initPrecioDisplay);
  const [loading, setLoading] = useState(false);
  const { showModal, modal } = useModal();

  const [sharedUser, setSharedUser] = useState(null);
  const [shareMode, setShareMode] = useState('dividir');
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [recentContacts, setRecentContacts] = useState([]);

  const isAlreadyShared = !!gasto.compartidoConNombre;

  useEffect(() => {
    contactService.getRecent().then(setRecentContacts);
    if (isAlreadyShared) {
      setSharedUser({ nombre: gasto.compartidoConNombre, email: '' });
    }
  }, []);

  useEffect(() => {
    if (form.precio) {
      const { display } = formatPrecioLive(
        String(form.precio).replace('.', ','),
        form.moneda
      );
      setPrecioDisplay(display);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.moneda]);

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const found = await userService.buscarPorEmail(searchEmail);
      if (found) {
        setSharedUser(found);
        const next = await contactService.saveContact(found);
        setRecentContacts(next);
      } else {
        showModal({ type: 'warning', title: 'No encontrado', message: 'No existe un usuario con ese email.' });
      }
    } catch (err) {
      showModal({ type: 'error', title: 'Error', message: 'Hubo un problema al buscar el usuario.' });
    } finally {
      setSearching(false);
    }
  };

  const set = (key, val) => setForm(prev => {
    const next = { ...prev, [key]: val };
    if (key === 'tipo' && val === 'debito') next.cuotas = '1';
    if (key === 'medio' && MEDIOS_SOLO_DEBITO.includes(val)) {
      next.tipo = 'debito';
      next.cuotas = '1';
    }
    return next;
  });

  const handlePrecioChange = (val) => {
    const { display, cleanValue } = formatPrecioLive(val, form.moneda);
    setPrecioDisplay(display);
    set('precio', cleanValue);
  };

  const handleGuardar = async () => {
    if (!form.objeto.trim()) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá el objeto del gasto.' });
    }
    setLoading(true);
    try {
      const sharedWith = (!isAlreadyShared && sharedUser) ? { userId: sharedUser.id, mode: shareMode, nombre: sharedUser.nombre || sharedUser.email } : null;
      await editarGasto(gasto.id, {
        ...form,
        cuotas: parseInt(form.cuotas) || 1,
        cantidad: parseInt(form.cantidad) || 1,
        precio: Number(form.precio),
      }, sharedWith);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light }}
    >
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Editar gasto</Text>
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
          <Label text="Objeto" dark={dark} />
          <TextInput style={s.input} value={form.objeto} onChangeText={v => set('objeto', v)} placeholderTextColor={dark ? '#475569' : '#94A3B8'} />

          <Label text="Precio" dark={dark} />
          <TextInput
            style={s.input}
            value={precioDisplay}
            onChangeText={handlePrecioChange}
            placeholder={`${getCurrencySymbol(form.moneda)} 0,00`}
            placeholderTextColor={dark ? '#475569' : '#94A3B8'}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />

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

          {!form.isFijo && !MEDIOS_SOLO_DEBITO.includes(form.medio) && (
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

          <View style={[s.shareCard, isAlreadyShared && s.shareCardDisabled]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={s.shareTitle}>Compartir gasto</Text>
              {isAlreadyShared && (
                <View style={s.sharedBadge}>
                  <Ionicons name="people" size={10} color={colors.primary} />
                  <Text style={[s.sharedBadgeText, { color: colors.primary }]}>YA COMPARTIDO</Text>
                </View>
              )}
            </View>
            {isAlreadyShared && (
              <Text style={{ ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, fontStyle: 'italic', marginBottom: spacing.sm }}>
                Cada usuario maneja su propia copia del gasto.
              </Text>
            )}

            {!sharedUser ? (
              <>
                <View style={s.row}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Email del contacto..."
                    placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                    value={searchEmail}
                    onChangeText={setSearchEmail}
                    autoCapitalize="none"
                    editable={!isAlreadyShared}
                  />
                  <TouchableOpacity
                    style={[s.searchBtn, isAlreadyShared && { opacity: 0.5 }]}
                    onPress={handleSearchUser}
                    disabled={searching || isAlreadyShared}
                  >
                    {searching ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
                  </TouchableOpacity>
                </View>
                {!isAlreadyShared && recentContacts.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {recentContacts.map(c => (
                      <TouchableOpacity key={c.id} style={s.recentPill} onPress={() => setSharedUser(c)}>
                        <Text style={s.recentPillText}>{c.nombre || c.email.split('@')[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={s.sharedInfo}>
                <View style={s.userInfo}>
                  <View style={s.miniAvatar}><Text style={s.miniAvatarText}>{sharedUser.nombre?.[0] || '?'}</Text></View>
                  <Text style={s.userName}>{sharedUser.nombre || sharedUser.email}</Text>
                </View>
                {!isAlreadyShared && (
                  <TouchableOpacity onPress={() => setSharedUser(null)}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {sharedUser && (
              <View style={[s.modeRow, isAlreadyShared && { opacity: 0.7 }]}>
                <TouchableOpacity
                  style={[s.modeBtn, shareMode === 'dividir' && s.modeBtnActive]}
                  onPress={() => !isAlreadyShared && setShareMode('dividir')}
                  disabled={isAlreadyShared}
                >
                  <Text style={[s.modeBtnText, shareMode === 'dividir' && s.modeBtnTextActive]}>Dividir entre 2</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modeBtn, shareMode === 'mismo' && s.modeBtnActive]}
                  onPress={() => !isAlreadyShared && setShareMode('mismo')}
                  disabled={isAlreadyShared}
                >
                  <Text style={[s.modeBtnText, shareMode === 'mismo' && s.modeBtnTextActive]}>Mismo monto</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity style={s.btn} onPress={handleGuardar} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </ScrollView>
        {modal}
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: radius.md, borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  tipoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipoBtnText: { ...typography.bodyMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tipoBtnTextActive: { color: '#fff' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  tagAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed' },
  tagAddText: { ...typography.captionMed, color: colors.primary },
  tagText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tagSaveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  tagSaveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light },
  toggleLabel: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  shareCard: { backgroundColor: dark ? colors.surface.dark : '#fff', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, marginVertical: spacing.md },
  shareTitle: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: spacing.sm, textTransform: 'uppercase' },
  searchBtn: { backgroundColor: colors.primary, borderRadius: radius.md, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sharedInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: dark ? '#0F172A' : '#F8FAFC', padding: 10, borderRadius: radius.md },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  userName: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light },
  modeRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  modeBtnTextActive: { color: '#fff', fontWeight: '600' },
  recentPill: { backgroundColor: dark ? '#1e293b' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light },
  recentPillText: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  shareCardDisabled: { opacity: 0.8, backgroundColor: dark ? '#1e293b' : '#f8fafc' },
  sharedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  sharedBadgeText: { fontSize: 10, fontWeight: '700' },
});
