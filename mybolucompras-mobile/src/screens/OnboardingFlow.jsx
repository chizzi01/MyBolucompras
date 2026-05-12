import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Switch, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { MONEDAS, ETIQUETA_COLORS } from '../constants/catalogos';

const { width } = Dimensions.get('window');

export default function OnboardingFlow() {
  const { completeOnboarding, biometricEnabled, biometricAvailable, enableBiometric } = useAuth();
  const { mydata, actualizarFondos, actualizarCierre, actualizarConfig } = useData();
  const { dark, mode, setTheme } = useTheme();
  const s = styles(dark);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // States for the fields
  const [fondos, setFondos] = useState('');
  const [cierreDate, setCierreDate] = useState(new Date());
  const [vencimientoDate, setVencimientoDate] = useState(new Date());
  const [showCierre, setShowCierre] = useState(false);
  const [showVencimiento, setShowVencimiento] = useState(false);
  const [moneda, setMoneda] = useState(mydata.monedaPreferida || 'ARS');
  const [etiquetas, setEtiquetas] = useState([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');

  const next = () => setStep(s => s + 1);
  const skip = () => {
    if (step === 5) handleFinish();
    else next();
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await completeOnboarding();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveFondos = async () => {
    if (fondos) {
      setLoading(true);
      await actualizarFondos(Number(fondos));
      setLoading(false);
    }
    next();
  };

  const formatDateToDB = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateToDisplay = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const saveFechas = async () => {
    setLoading(true);
    await actualizarCierre(formatDateToDB(cierreDate), formatDateToDB(vencimientoDate), '', '');
    setLoading(false);
    next();
  };

  const saveMoneda = async () => {
    setLoading(true);
    await actualizarConfig({ monedaPreferida: moneda });
    setLoading(false);
    next();
  };

  const addTag = () => {
    if (nuevaEtiqueta.trim()) {
      setEtiquetas([...etiquetas, { nombre: nuevaEtiqueta.trim(), color: ETIQUETA_COLORS[0] }]);
      setNuevaEtiqueta('');
    }
  };

  const saveTags = async () => {
    if (etiquetas.length > 0) {
      setLoading(true);
      await actualizarConfig({ etiquetas });
      setLoading(false);
    }
    next();
  };

  const STEPS = [
    {
      title: 'Fondos disponibles',
      desc: '¿Con cuánto dinero contás hoy para tus gastos?',
      content: (
        <View style={s.stepContent}>
          <TextInput
            style={s.input}
            placeholder="0.00"
            placeholderTextColor={dark ? '#475569' : '#94A3B8'}
            keyboardType="decimal-pad"
            value={fondos}
            onChangeText={setFondos}
          />
          <TouchableOpacity style={s.primaryBtn} onPress={saveFondos} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Siguiente</Text>}
          </TouchableOpacity>
        </View>
      )
    },
    {
      title: 'Fechas de Tarjeta',
      desc: 'Configurá el cierre y vencimiento de tu tarjeta principal.',
      content: (
        <View style={s.stepContent}>
          <Text style={s.label}>Cierre</Text>
          <TouchableOpacity style={s.dateField} onPress={() => setShowCierre(true)}>
            <Text style={s.dateText}>{formatDateToDisplay(cierreDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          {showCierre && (
            <DateTimePicker
              value={cierreDate}
              mode="date"
              display="default"
              onChange={(e, date) => {
                setShowCierre(false);
                if (date) setCierreDate(date);
              }}
            />
          )}

          <Text style={s.label}>Vencimiento</Text>
          <TouchableOpacity style={s.dateField} onPress={() => setShowVencimiento(true)}>
            <Text style={s.dateText}>{formatDateToDisplay(vencimientoDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          {showVencimiento && (
            <DateTimePicker
              value={vencimientoDate}
              mode="date"
              display="default"
              onChange={(e, date) => {
                setShowVencimiento(false);
                if (date) setVencimientoDate(date);
              }}
            />
          )}

          <TouchableOpacity style={s.primaryBtn} onPress={saveFechas} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Siguiente</Text>}
          </TouchableOpacity>
        </View>
      )
    },
    {
      title: 'Moneda Preferida',
      desc: '¿En qué moneda querés ver tus gastos por defecto?',
      content: (
        <View style={s.stepContent}>
          <View style={s.monedaGrid}>
            {MONEDAS.map(m => (
              <TouchableOpacity
                key={m.codigo}
                style={[s.monedaItem, moneda === m.codigo && s.monedaItemActive]}
                onPress={() => setMoneda(m.codigo)}
              >
                <Text style={[s.monedaSimbolo, moneda === m.codigo && s.monedaTextActive]}>{m.simbolo}</Text>
                <Text style={[s.monedaNombre, moneda === m.codigo && s.monedaTextActive]}>{m.codigo}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={saveMoneda} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Siguiente</Text>}
          </TouchableOpacity>
        </View>
      )
    },
    {
      title: 'Tus Etiquetas',
      desc: 'Agregá categorías para organizar tus gastos.',
      content: (
        <View style={s.stepContent}>
          <View style={s.tagsWrap}>
            {etiquetas.map((t, idx) => (
              <View key={idx} style={[s.tag, { backgroundColor: t.color + '20', borderColor: t.color }]}>
                <Text style={{ color: t.color }}>{t.nombre}</Text>
              </View>
            ))}
          </View>
          <View style={s.row}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Ej: Supermercado"
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
              value={nuevaEtiqueta}
              onChangeText={setNuevaEtiqueta}
              onSubmitEditing={addTag}
            />
            <TouchableOpacity style={s.addBtn} onPress={addTag}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={saveTags} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Siguiente</Text>}
          </TouchableOpacity>
        </View>
      )
    },
    {
      title: 'Apariencia',
      desc: 'Elegí el estilo visual que más te guste.',
      content: (
        <View style={s.stepContent}>
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
                  size={24}
                  color={mode === opt.key ? '#fff' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
                />
                <Text style={[s.themeBtnText, mode === opt.key && s.themeBtnTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={next}>
            <Text style={s.primaryBtnText}>Siguiente</Text>
          </TouchableOpacity>
        </View>
      )
    },
    {
      title: 'Seguridad Biométrica',
      desc: '¿Querés proteger tu app con Huella o Face ID?',
      content: (
        <View style={s.stepContent}>
          <View style={s.bioCard}>
            <Ionicons name="finger-print" size={48} color={colors.primary} />
            <Text style={s.bioText}>
              {biometricAvailable 
                ? 'Tu dispositivo soporta biometría.' 
                : 'Biometría no disponible en este dispositivo.'}
            </Text>
            {biometricAvailable && (
              <Switch
                value={biometricEnabled}
                onValueChange={enableBiometric}
                trackColor={{ false: '#334155', true: colors.primary }}
              />
            )}
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={handleFinish} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Finalizar</Text>}
          </TouchableOpacity>
        </View>
      )
    }
  ];

  const cur = STEPS[step];

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
        <TouchableOpacity onPress={skip} style={s.skipBtn}>
          <Text style={s.skipText}>Omitir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.iconContainer}>
          <Ionicons 
            name={
              step === 0 ? 'cash-outline' : 
              step === 1 ? 'calendar-outline' : 
              step === 2 ? 'logo-usd' : 
              step === 3 ? 'pricetag-outline' : 
              step === 4 ? 'color-palette-outline' : 
              'lock-closed-outline'
            } 
            size={60} color={colors.primary} 
          />
        </View>
        
        <Text style={s.title}>{cur.title}</Text>
        <Text style={s.desc}>{cur.desc}</Text>

        {cur.content}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  header: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressBar: { flex: 1, height: 6, backgroundColor: dark ? '#1E293B' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  skipText: { color: dark ? '#94A3B8' : '#64748B', fontWeight: '600' },
  scroll: { padding: spacing.xl, alignItems: 'center' },
  iconContainer: { marginBottom: spacing.xl, width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light, textAlign: 'center', marginBottom: spacing.sm },
  desc: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textAlign: 'center', marginBottom: spacing.xl },
  stepContent: { width: '100%' },
  input: {
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...typography.body,
    color: dark ? colors.text.dark : colors.text.light,
    marginBottom: spacing.lg,
  },
  dateField: {
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dateText: { ...typography.body, color: dark ? colors.text.dark : colors.text.light },
  label: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: 8, textTransform: 'uppercase' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  monedaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  monedaItem: { flex: 1, minWidth: '45%', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, alignItems: 'center', backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  monedaItemActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  monedaSimbolo: { fontSize: 24, fontWeight: '700', color: dark ? colors.text.dark : colors.text.light },
  monedaNombre: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 4 },
  monedaTextActive: { color: colors.primary },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  addBtn: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  themeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  themeBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: radius.md, borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  themeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  themeBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  themeBtnTextActive: { color: '#fff', fontWeight: '600' },
  bioCard: { padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl, backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  bioText: { ...typography.body, textAlign: 'center', color: dark ? colors.text.dark : colors.text.light },
});
