// src/components/viajes/CrearViajeModal.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImagenGaleriaModal from './ImagenGaleriaModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useViajeMutations } from '../../hooks/mutations/useViajeMutations';
import { userService } from '../../services/userService';
import { contactService } from '../../services/contactService';
import { colors, spacing, radius, typography } from '../../constants/theme';
import DateTimeField from '../common/DateTimeField';
import { toISODate } from '../../utils/formatters';

const EMOJIS = ['✈️', '🏔️', '🌊', '🌴', '🎿', '🏖️', '🎒', '🗺️'];

export default function CrearViajeModal({ visible, onClose }) {
  const { dark } = useTheme();
  const { crear: crearMutation } = useViajeMutations();
  const insets = useSafeAreaInsets();

  const [titulo, setTitulo] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [participantes, setParticipantes] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [recentContacts, setRecentContacts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imagenUrl, setImagenUrl] = useState(null);
  const [showGaleria, setShowGaleria] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);

  useEffect(() => {
    if (visible) contactService.getRecent().then(setRecentContacts);
  }, [visible]);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setError('');
    try {
      const found = await userService.buscarPorEmail(searchEmail.trim());
      if (!found) { setError('No se encontró ningún usuario con ese email.'); return; }
      if (participantes.find(p => p.id === found.id)) { setError('Ya está en la lista.'); return; }
      setParticipantes(prev => [...prev, found]);
      setSearchEmail('');
      const next = await contactService.saveContact(found);
      setRecentContacts(next);
    } catch (err) {
      setError('Error al buscar usuario.');
    } finally {
      setSearching(false);
    }
  };

  const handleCrear = async () => {
    if (!titulo.trim()) { setError('El título es requerido.'); return; }
    if (fechaDesde && fechaHasta && fechaHasta < fechaDesde) {
      setError('La fecha "hasta" no puede ser anterior a la fecha "desde".');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await crearMutation.mutateAsync({
        titulo: titulo.trim(),
        emoji,
        participanteIds: participantes.map(p => p.id),
        imagenUrl,
        fechaDesde: fechaDesde ? toISODate(fechaDesde) : null,
        fechaHasta: fechaHasta ? toISODate(fechaHasta) : null,
      });
      setTitulo('');
      setEmoji('✈️');
      setParticipantes([]);
      setImagenUrl(null);
      setFechaDesde(null);
      setFechaHasta(null);
      onClose();
    } catch (err) {
      setError('Error al crear el viaje: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const inputBg = dark ? '#0F172A' : '#F8FAFC';
  const border = dark ? colors.border.dark : colors.border.light;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: textColor }]}>Nuevo Viaje</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
              FOTO DE PORTADA <Text style={{ textTransform: 'none', fontWeight: '400' }}>(opcional)</Text>
            </Text>
            {imagenUrl ? (
              <TouchableOpacity onPress={() => setShowGaleria(true)} activeOpacity={0.8}>
                <ImageBackground source={{ uri: imagenUrl }} style={styles.portadaPreview} resizeMode="cover">
                  <View style={styles.portadaOverlay} />
                  <View style={styles.portadaChangeBtn}>
                    <Ionicons name="image-outline" size={16} color="#fff" />
                    <Text style={styles.portadaChangeText}>Cambiar foto</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.portadaEmpty, { borderColor: dark ? '#334155' : '#CBD5E1' }]}
                onPress={() => setShowGaleria(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="image-outline" size={20} color={dark ? '#475569' : '#94A3B8'} />
                <Text style={[styles.portadaEmptyText, { color: dark ? '#475569' : '#94A3B8' }]}>
                  Elegir foto de portada
                </Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]}
              placeholder="Nombre del viaje"
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={[styles.label, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
              FECHAS DEL VIAJE <Text style={{ textTransform: 'none', fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <View style={styles.fechasRow}>
              <DateTimeField
                value={fechaDesde}
                onChange={setFechaDesde}
                dark={dark}
                placeholder="Desde"
                style={{ flex: 1 }}
              />
              <DateTimeField
                value={fechaHasta}
                onChange={setFechaHasta}
                dark={dark}
                placeholder="Hasta"
                style={{ flex: 1 }}
              />
            </View>

            <Text style={[styles.label, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>PARTICIPANTES</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: inputBg, borderColor: border, color: textColor }]}
                placeholder="Buscar por email..."
                placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                value={searchEmail}
                onChangeText={v => { setSearchEmail(v); setError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>

            {recentContacts.length > 0 && (
              <View style={styles.recents}>
                {recentContacts.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.recentPill}
                    onPress={() => {
                      if (!participantes.find(p => p.id === c.id)) setParticipantes(prev => [...prev, c]);
                    }}
                  >
                    <Text style={{ fontSize: 12, color: dark ? colors.textSecondary.dark : colors.textSecondary.light }}>
                      {c.nombre || c.email?.split('@')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.chips}>
              {participantes.map(p => (
                <View key={p.id} style={[styles.chip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={{ fontSize: 13, color: colors.primary }}>{p.nombre || p.email}</Text>
                  <TouchableOpacity onPress={() => setParticipantes(prev => prev.filter(x => x.id !== p.id))}>
                    <Ionicons name="close-circle" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handleCrear} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crear Viaje</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: dark ? colors.textSecondary.dark : colors.textSecondary.light }}>Cancelar</Text>
            </TouchableOpacity>

            <ImagenGaleriaModal
              visible={showGaleria}
              onClose={() => setShowGaleria(false)}
              onSelect={setImagenUrl}
              currentUrl={imagenUrl ? imagenUrl.split('?')[0] : null}
              previewEmoji={emoji}
              previewTitulo={titulo || 'Tu viaje'}
            />
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
  emojiBtn: { padding: 8, marginRight: 6, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, ...typography.body, marginBottom: spacing.md },
  label: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fechasRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  searchBtn: { backgroundColor: colors.primary, borderRadius: radius.md, width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  recents: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  recentPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  portadaEmpty: {
    height: 52,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  portadaEmptyText: { fontSize: 13 },
  portadaPreview: {
    width: '100%',
    height: 100,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portadaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  portadaChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  portadaChangeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
