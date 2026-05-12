import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useModal } from '../hooks/useModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { formatARS } from '../utils/formatters';
import { BANCOS, MEDIOS_DE_PAGO, MONEDAS, ETIQUETA_COLORS } from '../constants/catalogos';

function AccordionSection({ title, children, dark, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const s = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      marginBottom: open ? spacing.sm : 0,
      paddingVertical: 2,
    },
    label: {
      ...typography.captionMed,
      color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
  });
  return (
    <>
      <TouchableOpacity style={s.header} onPress={() => setOpen(v => !v)} activeOpacity={0.7}>
        <Text style={s.label}>{title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={dark ? colors.textSecondary.dark : colors.textSecondary.light}
        />
      </TouchableOpacity>
      {open && children}
    </>
  );
}

export default function ConfiguracionScreen() {
  const { user, signOut, biometricEnabled, biometricAvailable, enableBiometric } = useAuth();
  const { mydata, actualizarFondos, actualizarCierre, actualizarConfig } = useData();
  const { dark, mode, setTheme } = useTheme();
  const s = styles(dark);
  const { showModal, modal } = useModal();

  const nombre = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Usuario';

  const [fondos, setFondos] = useState(String(mydata.fondos || ''));
  
  const [cierreDate, setCierreDate] = useState(new Date());
  const [vencimientoDate, setVencimientoDate] = useState(new Date());
  const [cierreAnteriorDate, setCierreAnteriorDate] = useState(new Date());
  const [vencimientoAnteriorDate, setVencimientoAnteriorDate] = useState(new Date());
  
  const [showPicker, setShowPicker] = useState(null); // 'cierre', 'vencimiento', etc.
  
  const [loadingFondos, setLoadingFondos] = useState(false);
  const [loadingFechas, setLoadingFechas] = useState(false);

  const [mediosHabilitados, setMediosHabilitados] = useState(
    mydata.mediosHabilitados?.length > 0 ? mydata.mediosHabilitados : [...MEDIOS_DE_PAGO]
  );
  const [bancosHabilitados, setBancosHabilitados] = useState(
    mydata.bancosHabilitados?.length > 0 ? mydata.bancosHabilitados : [...BANCOS]
  );
  const [monedaPreferida, setMonedaPreferida] = useState(mydata.monedaPreferida || 'ARS');
  const [monedaOpen, setMonedaOpen] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [etiquetas, setEtiquetas] = useState(mydata.etiquetas || []);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [colorEtiqueta, setColorEtiqueta] = useState(ETIQUETA_COLORS[0]);
  const [savingEtiq, setSavingEtiq] = useState(false);

  // Helper to parse YYYY-MM-DD to Date
  const parseDBDate = (str) => {
    if (!str) return new Date();
    const [y, m, d] = str.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  };

  const formatDateToDB = (date) => date.toISOString().split('T')[0];
  const formatDateToDisplay = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  useEffect(() => {
    setFondos(String(mydata.fondos || ''));
    setCierreDate(parseDBDate(mydata.cierre));
    setVencimientoDate(parseDBDate(mydata.vencimiento));
    setCierreAnteriorDate(parseDBDate(mydata.cierreAnterior));
    setVencimientoAnteriorDate(parseDBDate(mydata.vencimientoAnterior));
    setEtiquetas(mydata.etiquetas || []);
    setMonedaPreferida(mydata.monedaPreferida || 'ARS');
    if (mydata.mediosHabilitados?.length > 0) setMediosHabilitados(mydata.mediosHabilitados);
    if (mydata.bancosHabilitados?.length > 0) setBancosHabilitados(mydata.bancosHabilitados);
  }, [mydata]);

  const handleGuardarFondos = async () => {
    setLoadingFondos(true);
    try {
      await actualizarFondos(Number(fondos));
      showModal({ type: 'success', title: 'Fondos actualizados', message: 'Los fondos disponibles fueron guardados.' });
    } catch (err) {
      showModal({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoadingFondos(false);
    }
  };

  const handleGuardarFechas = async () => {
    setLoadingFechas(true);
    try {
      await actualizarCierre(
        formatDateToDB(cierreDate),
        formatDateToDB(vencimientoDate),
        formatDateToDB(cierreAnteriorDate),
        formatDateToDB(vencimientoAnteriorDate)
      );
      showModal({ type: 'success', title: 'Fechas actualizadas', message: 'Las fechas de tarjeta fueron guardadas.' });
    } catch (err) {
      showModal({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoadingFechas(false);
    }
  };

  const toggleMedio = async (medio) => {
    const next = mediosHabilitados.includes(medio)
      ? mediosHabilitados.filter(m => m !== medio)
      : [...mediosHabilitados, medio];
    setMediosHabilitados(next);
    await actualizarConfig({ mediosHabilitados: next });
  };

  const toggleBanco = async (banco) => {
    const next = bancosHabilitados.includes(banco)
      ? bancosHabilitados.filter(b => b !== banco)
      : [...bancosHabilitados, banco];
    setBancosHabilitados(next);
    await actualizarConfig({ bancosHabilitados: next });
  };

  const handleMoneda = async (moneda) => {
    setMonedaPreferida(moneda);
    setMonedaOpen(false);
    await actualizarConfig({ monedaPreferida: moneda });
  };

  const handleAgregarEtiqueta = async () => {
    const trimmed = nuevaEtiqueta.trim();
    if (!trimmed) return;
    const nombres = etiquetas.map(e => typeof e === 'string' ? e : e.nombre);
    if (nombres.includes(trimmed)) {
      showModal({ type: 'warning', title: 'Ya existe', message: 'Esa etiqueta ya está en la lista.' });
      return;
    }
    setSavingEtiq(true);
    try {
      const next = [...etiquetas, { nombre: trimmed, color: colorEtiqueta }];
      await actualizarConfig({ etiquetas: next });
      setEtiquetas(next);
      setNuevaEtiqueta('');
    } catch (err) {
      showModal({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setSavingEtiq(false);
    }
  };

  const handleEliminarEtiqueta = async (nombre) => {
    const next = etiquetas.filter(e => (typeof e === 'string' ? e : e.nombre) !== nombre);
    await actualizarConfig({ etiquetas: next });
    setEtiquetas(next);
  };

  const handleLogout = () => {
    showModal({
      type: 'confirm',
      title: 'Cerrar sesión',
      message: '¿Seguro que querés cerrar sesión?',
      confirmText: 'Salir',
      onConfirm: signOut,
    });
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {modal}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Configuración</Text>

        {/* Perfil */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{nombre[0]?.toUpperCase()}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileNombre}>{nombre}</Text>
            <Text style={s.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Apariencia */}
        <AccordionSection title="Apariencia" dark={dark} defaultOpen>
          <View style={s.card}>
            <View style={s.themeRow}>
              {[
                { key: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
                { key: 'light', label: 'Claro', icon: 'sunny-outline' },
                { key: 'dark', label: 'Oscuro', icon: 'moon-outline' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.themeBtn, mode === opt.key && s.themeBtnActive]}
                  onPress={() => setTheme(opt.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={mode === opt.key ? '#fff' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
                  />
                  <Text style={[s.themeBtnText, mode === opt.key && s.themeBtnTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </AccordionSection>

        {/* Moneda preferida */}
        <AccordionSection title="Moneda preferida" dark={dark}>
          <View style={s.card}>
            <TouchableOpacity
              style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => setMonedaOpen(v => !v)}
            >
              <Text style={{ ...typography.body, color: dark ? colors.text.dark : colors.text.light }}>
                {MONEDAS.find(m => m.codigo === monedaPreferida)?.nombre || monedaPreferida}
              </Text>
              <Ionicons name={monedaOpen ? 'chevron-up' : 'chevron-down'} size={16} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} />
            </TouchableOpacity>
            {monedaOpen && (
              <View style={s.dropdownList}>
                {MONEDAS.map(m => (
                  <TouchableOpacity
                    key={m.codigo}
                    style={[s.dropdownItem, monedaPreferida === m.codigo && s.dropdownItemActive]}
                    onPress={() => handleMoneda(m.codigo)}
                  >
                    <Text style={[s.dropdownItemText, monedaPreferida === m.codigo && s.dropdownItemTextActive]}>
                      {m.simbolo}  {m.nombre} ({m.codigo})
                    </Text>
                    {monedaPreferida === m.codigo && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </AccordionSection>

        {/* Medios habilitados — pills */}
        <AccordionSection title="Medios de pago" dark={dark}>
          <View style={s.card}>
            <View style={s.pillsWrap}>
              {MEDIOS_DE_PAGO.map(medio => {
                const enabled = mediosHabilitados.includes(medio);
                return (
                  <TouchableOpacity
                    key={medio}
                    style={[s.togglePill, enabled && s.togglePillActive]}
                    onPress={() => toggleMedio(medio)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.togglePillText, enabled && s.togglePillTextActive]}>{medio}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </AccordionSection>

        {/* Bancos habilitados — pills */}
        <AccordionSection title="Bancos" dark={dark}>
          <View style={s.card}>
            <View style={s.pillsWrap}>
              {BANCOS.map(banco => {
                const enabled = bancosHabilitados.includes(banco);
                return (
                  <TouchableOpacity
                    key={banco}
                    style={[s.togglePill, enabled && s.togglePillActive]}
                    onPress={() => toggleBanco(banco)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.togglePillText, enabled && s.togglePillTextActive]}>{banco}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </AccordionSection>

        {/* Etiquetas */}
        <AccordionSection title="Etiquetas" dark={dark} defaultOpen>
          <View style={s.card}>
            <View style={s.tagsWrap}>
              {etiquetas.map(tag => {
                const nombre = typeof tag === 'string' ? tag : tag.nombre;
                const color = typeof tag === 'string' ? colors.primary : tag.color;
                return (
                  <View key={nombre} style={[s.tagChip, { backgroundColor: color + '25', borderColor: color }]}>
                    <Text style={[s.tagChipText, { color }]}>{nombre}</Text>
                    <TouchableOpacity
                      onPress={() => handleEliminarEtiqueta(nombre)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={16} color={color} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={nuevaEtiqueta}
                onChangeText={setNuevaEtiqueta}
                placeholder="Nueva etiqueta..."
                placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                onSubmitEditing={handleAgregarEtiqueta}
              />
              <TouchableOpacity
                style={[s.saveBtn, { paddingHorizontal: spacing.md, backgroundColor: colorEtiqueta, marginTop: 0 }]}
                onPress={handleAgregarEtiqueta}
                disabled={savingEtiq}
              >
                {savingEtiq
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="add" size={20} color="#fff" />
                }
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm }}>
              {ETIQUETA_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={{
                    width: 26, height: 26, borderRadius: 13, backgroundColor: c,
                    borderWidth: colorEtiqueta === c ? 3 : 1,
                    borderColor: colorEtiqueta === c ? (dark ? '#fff' : '#1E293B') : c,
                  }}
                  onPress={() => setColorEtiqueta(c)}
                />
              ))}
            </View>
          </View>
        </AccordionSection>

        {/* Fondos */}
        <AccordionSection title="Fondos disponibles" dark={dark} defaultOpen>
          <View style={s.card}>
            <Text style={s.cardLabel}>
              Fondos actuales: <Text style={s.fondosValue}>$ {formatARS(mydata.fondos)}</Text>
            </Text>
            <TextInput
              style={s.input}
              value={fondos}
              onChangeText={setFondos}
              keyboardType="decimal-pad"
              placeholder="Nuevo monto"
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
            />
            <TouchableOpacity style={s.saveBtn} onPress={handleGuardarFondos} disabled={loadingFondos}>
              {loadingFondos
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>Actualizar fondos</Text>
              }
            </TouchableOpacity>
          </View>
        </AccordionSection>

        {/* Fechas tarjeta */}
        <AccordionSection title="Fechas de tarjeta" dark={dark}>
          <View style={s.card}>
            <Text style={s.hint}>Usadas para calcular cuotas restantes en crédito</Text>
            
            <FieldLabel text="Cierre actual" dark={dark} />
            <TouchableOpacity style={s.input} onPress={() => setShowPicker('cierre')}>
              <Text style={{ color: dark ? colors.text.dark : colors.text.light }}>{formatDateToDisplay(cierreDate)}</Text>
            </TouchableOpacity>
            {showPicker === 'cierre' && (
              <DateTimePicker
                value={cierreDate}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowPicker(null);
                  if (date) setCierreDate(date);
                }}
              />
            )}

            <FieldLabel text="Vencimiento actual" dark={dark} />
            <TouchableOpacity style={s.input} onPress={() => setShowPicker('vencimiento')}>
              <Text style={{ color: dark ? colors.text.dark : colors.text.light }}>{formatDateToDisplay(vencimientoDate)}</Text>
            </TouchableOpacity>
            {showPicker === 'vencimiento' && (
              <DateTimePicker
                value={vencimientoDate}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowPicker(null);
                  if (date) setVencimientoDate(date);
                }}
              />
            )}

            <FieldLabel text="Cierre anterior" dark={dark} />
            <TouchableOpacity style={s.input} onPress={() => setShowPicker('cierreAnterior')}>
              <Text style={{ color: dark ? colors.text.dark : colors.text.light }}>{formatDateToDisplay(cierreAnteriorDate)}</Text>
            </TouchableOpacity>
            {showPicker === 'cierreAnterior' && (
              <DateTimePicker
                value={cierreAnteriorDate}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowPicker(null);
                  if (date) setCierreAnteriorDate(date);
                }}
              />
            )}

            <FieldLabel text="Vencimiento anterior" dark={dark} />
            <TouchableOpacity style={s.input} onPress={() => setShowPicker('vencimientoAnterior')}>
              <Text style={{ color: dark ? colors.text.dark : colors.text.light }}>{formatDateToDisplay(vencimientoAnteriorDate)}</Text>
            </TouchableOpacity>
            {showPicker === 'vencimientoAnterior' && (
              <DateTimePicker
                value={vencimientoAnteriorDate}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowPicker(null);
                  if (date) setVencimientoAnteriorDate(date);
                }}
              />
            )}

            <TouchableOpacity style={s.saveBtn} onPress={handleGuardarFechas} disabled={loadingFechas}>
              {loadingFechas
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>Guardar fechas</Text>
              }
            </TouchableOpacity>
          </View>
        </AccordionSection>

        {/* Seguridad */}
        <AccordionSection title="Seguridad" dark={dark}>
          <View style={s.card}>
            <View style={s.bioRow}>
              <View style={s.bioInfo}>
                <Ionicons name="finger-print" size={22} color={biometricEnabled ? colors.primary : (dark ? '#475569' : '#94A3B8')} />
                <View style={{ flex: 1 }}>
                  <Text style={s.bioTitle}>Huella / Face ID</Text>
                  <Text style={s.bioSub}>
                    {biometricAvailable
                      ? 'Desbloquear la app con biometría'
                      : 'No disponible en este dispositivo'}
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={biometricAvailable ? enableBiometric : undefined}
                disabled={!biometricAvailable}
                trackColor={{ false: dark ? '#334155' : '#CBD5E1', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </AccordionSection>

        {/* Cerrar sesión */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldLabel({ text, dark }) {
  return (
    <Text style={{
      ...typography.captionMed,
      color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
      marginBottom: 6,
      marginTop: spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>
      {text}
    </Text>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  scroll: { padding: spacing.md },
  pageTitle: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light, marginBottom: spacing.md },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    gap: spacing.md,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileNombre: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
  profileEmail: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 },
  card: {
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    marginBottom: spacing.sm,
  },
  cardLabel: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: spacing.sm },
  fondosValue: { color: colors.accent, fontWeight: '700' },
  hint: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: spacing.sm, fontStyle: 'italic' },
  input: {
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.body,
    color: dark ? colors.text.dark : colors.text.light,
    marginBottom: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  themeRow: { flexDirection: 'row', gap: spacing.sm },
  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: radius.md, borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  themeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  themeBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  themeBtnTextActive: { color: '#fff', fontWeight: '600' },
  // Pills para medios/bancos
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  togglePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  togglePillText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  togglePillTextActive: { color: '#fff', fontWeight: '600' },
  // Dropdown moneda
  dropdownList: { borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, borderRadius: radius.md, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: dark ? colors.border.dark : colors.border.light },
  dropdownItemActive: { backgroundColor: dark ? '#1a2740' : '#EEF2FF' },
  dropdownItemText: { ...typography.body, color: dark ? colors.text.dark : colors.text.light },
  dropdownItemTextActive: { color: colors.primary, fontWeight: '600' },
  // Etiquetas
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  tagChipText: { ...typography.captionMed },
  // Biometric
  bioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bioInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  bioTitle: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light },
  bioSub: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 },
  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.lg, paddingVertical: 14,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.error,
  },
  logoutText: { ...typography.bodyMed, color: colors.error },
});
