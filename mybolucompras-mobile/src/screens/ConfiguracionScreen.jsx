import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { formatARS } from '../utils/formatters';
import { BANCOS, MEDIOS_DE_PAGO, MONEDAS } from '../constants/catalogos';

export default function ConfiguracionScreen() {
  const { user, signOut } = useAuth();
  const { mydata, actualizarFondos, actualizarCierre, actualizarConfig } = useData();
  const { dark, mode, setTheme } = useTheme();
  const s = styles(dark);

  const nombre = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Usuario';

  const [fondos, setFondos] = useState(String(mydata.fondos || ''));
  const [cierre, setCierre] = useState(mydata.cierre || '');
  const [vencimiento, setVencimiento] = useState(mydata.vencimiento || '');
  const [cierreAnterior, setCierreAnterior] = useState(mydata.cierreAnterior || '');
  const [vencimientoAnterior, setVencimientoAnterior] = useState(mydata.vencimientoAnterior || '');
  const [loadingFondos, setLoadingFondos] = useState(false);
  const [loadingFechas, setLoadingFechas] = useState(false);

  // Medios habilitados: si está vacío inicializamos con todos
  const [mediosHabilitados, setMediosHabilitados] = useState(
    mydata.mediosHabilitados?.length > 0 ? mydata.mediosHabilitados : [...MEDIOS_DE_PAGO]
  );
  // Bancos habilitados
  const [bancosHabilitados, setBancosHabilitados] = useState(
    mydata.bancosHabilitados?.length > 0 ? mydata.bancosHabilitados : [...BANCOS]
  );
  // Moneda preferida
  const [monedaPreferida, setMonedaPreferida] = useState(mydata.monedaPreferida || 'ARS');
  const [monedaOpen, setMonedaOpen] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Etiquetas
  const [etiquetas, setEtiquetas] = useState(mydata.etiquetas || []);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [savingEtiq, setSavingEtiq] = useState(false);

  useEffect(() => {
    setFondos(String(mydata.fondos || ''));
    setCierre(mydata.cierre || '');
    setVencimiento(mydata.vencimiento || '');
    setCierreAnterior(mydata.cierreAnterior || '');
    setVencimientoAnterior(mydata.vencimientoAnterior || '');
    setEtiquetas(mydata.etiquetas || []);
    setMonedaPreferida(mydata.monedaPreferida || 'ARS');
    if (mydata.mediosHabilitados?.length > 0) setMediosHabilitados(mydata.mediosHabilitados);
    if (mydata.bancosHabilitados?.length > 0) setBancosHabilitados(mydata.bancosHabilitados);
  }, [mydata]);

  const handleGuardarFondos = async () => {
    setLoadingFondos(true);
    try {
      await actualizarFondos(Number(fondos));
      Alert.alert('Guardado', 'Fondos actualizados.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingFondos(false);
    }
  };

  const handleGuardarFechas = async () => {
    setLoadingFechas(true);
    try {
      await actualizarCierre(cierre, vencimiento, cierreAnterior, vencimientoAnterior);
      Alert.alert('Guardado', 'Fechas actualizadas.');
    } catch (err) {
      Alert.alert('Error', err.message);
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
    if (etiquetas.includes(trimmed)) {
      Alert.alert('Ya existe', 'Esa etiqueta ya está en la lista.');
      return;
    }
    setSavingEtiq(true);
    try {
      const next = [...etiquetas, trimmed];
      await actualizarConfig({ etiquetas: next });
      setEtiquetas(next);
      setNuevaEtiqueta('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingEtiq(false);
    }
  };

  const handleEliminarEtiqueta = async (tag) => {
    const next = etiquetas.filter(e => e !== tag);
    await actualizarConfig({ etiquetas: next });
    setEtiquetas(next);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
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
        <SectionLabel text="Apariencia" dark={dark} s={s} />
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

        {/* Moneda preferida */}
        <SectionLabel text="Moneda preferida" dark={dark} s={s} />
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

        {/* Medios habilitados */}
        <SectionLabel text="Medios de pago habilitados" dark={dark} s={s} />
        <View style={s.card}>
          {MEDIOS_DE_PAGO.map(medio => {
            const enabled = mediosHabilitados.includes(medio);
            return (
              <TouchableOpacity key={medio} style={s.toggleItem} onPress={() => toggleMedio(medio)}>
                <Ionicons
                  name={enabled ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={enabled ? colors.primary : (dark ? '#475569' : '#94A3B8')}
                />
                <Text style={[s.toggleItemText, !enabled && s.toggleItemTextOff]}>{medio}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bancos habilitados */}
        <SectionLabel text="Bancos habilitados" dark={dark} s={s} />
        <View style={s.card}>
          {BANCOS.map(banco => {
            const enabled = bancosHabilitados.includes(banco);
            return (
              <TouchableOpacity key={banco} style={s.toggleItem} onPress={() => toggleBanco(banco)}>
                <Ionicons
                  name={enabled ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={enabled ? colors.primary : (dark ? '#475569' : '#94A3B8')}
                />
                <Text style={[s.toggleItemText, !enabled && s.toggleItemTextOff]}>{banco}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Etiquetas */}
        <SectionLabel text="Etiquetas" dark={dark} s={s} />
        <View style={s.card}>
          <View style={s.tagsWrap}>
            {etiquetas.map(tag => (
              <View key={tag} style={s.tagChip}>
                <Text style={s.tagChipText}>{tag}</Text>
                <TouchableOpacity
                  onPress={() => handleEliminarEtiqueta(tag)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close-circle" size={16} color={dark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={nuevaEtiqueta}
              onChangeText={setNuevaEtiqueta}
              placeholder="Nueva etiqueta..."
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
              onSubmitEditing={handleAgregarEtiqueta}
            />
            <TouchableOpacity style={s.saveBtn} onPress={handleAgregarEtiqueta} disabled={savingEtiq}>
              {savingEtiq
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="add" size={20} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Fondos */}
        <SectionLabel text="Fondos disponibles" dark={dark} s={s} />
        <View style={s.card}>
          <Text style={s.cardLabel}>Fondos actuales: <Text style={s.fondosValue}>$ {formatARS(mydata.fondos)}</Text></Text>
          <TextInput
            style={s.input}
            value={fondos}
            onChangeText={setFondos}
            keyboardType="decimal-pad"
            placeholder="Nuevo monto"
            placeholderTextColor={dark ? '#475569' : '#94A3B8'}
          />
          <TouchableOpacity style={s.saveBtn} onPress={handleGuardarFondos} disabled={loadingFondos}>
            {loadingFondos ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Actualizar fondos</Text>}
          </TouchableOpacity>
        </View>

        {/* Fechas tarjeta */}
        <SectionLabel text="Fechas de tarjeta" dark={dark} s={s} />
        <View style={s.card}>
          <Text style={s.hint}>Usadas para calcular cuotas restantes en crédito</Text>

          <Label text="Cierre actual (YYYY-MM-DD)" dark={dark} />
          <TextInput style={s.input} value={cierre} onChangeText={setCierre} placeholder="2025-05-15" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />

          <Label text="Vencimiento actual (YYYY-MM-DD)" dark={dark} />
          <TextInput style={s.input} value={vencimiento} onChangeText={setVencimiento} placeholder="2025-05-22" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />

          <Label text="Cierre anterior (YYYY-MM-DD)" dark={dark} />
          <TextInput style={s.input} value={cierreAnterior} onChangeText={setCierreAnterior} placeholder="2025-04-15" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />

          <Label text="Vencimiento anterior (YYYY-MM-DD)" dark={dark} />
          <TextInput style={s.input} value={vencimientoAnterior} onChangeText={setVencimientoAnterior} placeholder="2025-04-22" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />

          <TouchableOpacity style={s.saveBtn} onPress={handleGuardarFechas} disabled={loadingFechas}>
            {loadingFechas ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Guardar fechas</Text>}
          </TouchableOpacity>
        </View>

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

function SectionLabel({ text, dark, s }) {
  return <Text style={s.section}>{text}</Text>;
}

function Label({ text, dark }) {
  return (
    <Text style={{ ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: 6, marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {text}
    </Text>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  scroll: { padding: spacing.md },
  pageTitle: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light, marginBottom: spacing.md },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: dark ? colors.surface.dark : colors.surface.light, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileNombre: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
  profileEmail: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 },
  section: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: dark ? colors.surface.dark : colors.surface.light, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, marginBottom: spacing.sm },
  cardLabel: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: spacing.sm },
  fondosValue: { color: colors.accent, fontWeight: '700' },
  hint: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: spacing.sm, fontStyle: 'italic' },
  input: { backgroundColor: dark ? '#0F172A' : '#F8FAFC', borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, ...typography.body, color: dark ? colors.text.dark : colors.text.light, marginBottom: spacing.sm },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 11, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  // Tema
  themeRow: { flexDirection: 'row', gap: spacing.sm },
  themeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: radius.md, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  themeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  themeBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  themeBtnTextActive: { color: '#fff', fontWeight: '600' },
  // Toggle items (medios/bancos)
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark ? colors.border.dark : colors.border.light },
  toggleItemText: { ...typography.body, color: dark ? colors.text.dark : colors.text.light, flex: 1 },
  toggleItemTextOff: { color: dark ? '#475569' : '#94A3B8' },
  // Dropdown moneda
  dropdownList: { borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, borderRadius: radius.md, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: dark ? colors.border.dark : colors.border.light },
  dropdownItemActive: { backgroundColor: dark ? '#1a2740' : '#EEF2FF' },
  dropdownItemText: { ...typography.body, color: dark ? colors.text.dark : colors.text.light },
  dropdownItemTextActive: { color: colors.primary, fontWeight: '600' },
  // Etiquetas
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: dark ? '#1a2740' : '#EEF2FF', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  tagChipText: { ...typography.captionMed, color: dark ? colors.primaryLight : colors.primary },
  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.error },
  logoutText: { ...typography.bodyMed, color: colors.error },
});
