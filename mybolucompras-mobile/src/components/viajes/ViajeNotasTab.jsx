// src/components/viajes/ViajeNotasTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { viajeNotasService } from '../../services/viajeNotasService';
import { colors, spacing, radius, typography } from '../../constants/theme';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ViajeNotasTab({ viaje, dark }) {
  const { user } = useAuth();
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const border = dark ? colors.border.dark : colors.border.light;

  const [checklist, setChecklist] = useState([]);
  const [notas, setNotas] = useState([]);
  const [nuevoItem, setNuevoItem] = useState('');
  const [nuevaNota, setNuevaNota] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [addingNota, setAddingNota] = useState(false);
  const [showItemInput, setShowItemInput] = useState(false);
  const [showNotaInput, setShowNotaInput] = useState(false);

  const activo = viaje.estado === 'activo';

  const cargar = useCallback(async () => {
    const [c, n] = await Promise.all([
      viajeNotasService.getChecklist(viaje.id),
      viajeNotasService.getNotas(viaje.id),
    ]);
    setChecklist(c);
    setNotas(n);
  }, [viaje.id]);

  useEffect(() => {
    cargar();
    const channel = viajeNotasService.subscribeChecklist(viaje.id, cargar);
    return () => { channel.unsubscribe(); };
  }, [cargar]);

  const handleToggle = async (item) => {
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, completado: !i.completado } : i));
    try {
      await viajeNotasService.toggleItem(item.id, !item.completado);
    } catch {
      cargar();
    }
  };

  const handleAgregarItem = async () => {
    if (!nuevoItem.trim()) return;
    setAddingItem(true);
    try {
      const nuevo = await viajeNotasService.agregarItem(viaje.id, nuevoItem.trim());
      setChecklist(prev => [...prev, nuevo]);
      setNuevoItem('');
      setShowItemInput(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAddingItem(false);
    }
  };

  const handleEliminarItem = async (id) => {
    setChecklist(prev => prev.filter(i => i.id !== id));
    await viajeNotasService.eliminarItem(id);
  };

  const handleAgregarNota = async () => {
    if (!nuevaNota.trim()) return;
    setAddingNota(true);
    try {
      const nueva = await viajeNotasService.agregarNota(viaje.id, nuevaNota.trim());
      setNotas(prev => [nueva, ...prev]);
      setNuevaNota('');
      setShowNotaInput(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAddingNota(false);
    }
  };

  const handleEliminarNota = async (id) => {
    setNotas(prev => prev.filter(n => n.id !== id));
    await viajeNotasService.eliminarNota(id);
  };

  const participantColor = (userId) => {
    const idx = viaje.participantes.findIndex(p => p.userId === userId);
    return PARTICIPANT_COLORS[Math.max(0, idx) % PARTICIPANT_COLORS.length];
  };

  const sectionHeader = (title, onAdd) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionLabel, { color: subtextColor }]}>{title}</Text>
      {activo && (
        <TouchableOpacity onPress={onAdd}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      {sectionHeader('QUÉ LLEVAR', () => setShowItemInput(v => !v))}

      {showItemInput && activo && (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC', borderColor: border, color: textColor }]}
            placeholder="Ej: Protector solar..."
            placeholderTextColor={subtextColor}
            value={nuevoItem}
            onChangeText={setNuevoItem}
            onSubmitEditing={handleAgregarItem}
            autoFocus
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAgregarItem} disabled={addingItem}>
            {addingItem ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {checklist.map(item => (
        <TouchableOpacity
          key={item.id}
          style={[styles.checkItem, { backgroundColor: surfaceBg }]}
          onPress={() => handleToggle(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.completado ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={item.completado ? '#10B981' : subtextColor}
          />
          <Text style={[styles.checkText, { color: item.completado ? subtextColor : textColor, textDecorationLine: item.completado ? 'line-through' : 'none' }]}>
            {item.texto}
          </Text>
          <Text style={[styles.autor, { color: subtextColor }]}>{item.autorNombre.split(' ')[0]}</Text>
          {item.createdBy === user?.id && activo && (
            <TouchableOpacity onPress={() => handleEliminarItem(item.id)}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}

      <View style={{ height: spacing.lg }} />

      {sectionHeader('NOTAS DEL GRUPO', () => setShowNotaInput(v => !v))}

      {showNotaInput && activo && (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC', borderColor: border, color: textColor }]}
            placeholder="Escribe una nota..."
            placeholderTextColor={subtextColor}
            value={nuevaNota}
            onChangeText={setNuevaNota}
            multiline
            autoFocus
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAgregarNota} disabled={addingNota}>
            {addingNota ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {notas.map(nota => (
        <View key={nota.id} style={[styles.notaCard, { backgroundColor: surfaceBg }]}>
          <View style={styles.notaHeader}>
            <Text style={[styles.notaAutor, { color: participantColor(nota.createdBy) }]}>{nota.autorNombre}</Text>
            <Text style={[styles.notaTs, { color: subtextColor }]}>
              {new Date(nota.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
            </Text>
            {nota.createdBy === user?.id && activo && (
              <TouchableOpacity onPress={() => handleEliminarNota(nota.id)}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.notaTexto, { color: textColor }]}>{nota.texto}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionLabel: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, ...typography.body },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.md, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, marginBottom: 6 },
  checkText: { ...typography.body, flex: 1 },
  autor: { fontSize: 11 },
  notaCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  notaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  notaAutor: { ...typography.captionMed, fontWeight: '700', flex: 1 },
  notaTs: { fontSize: 11 },
  notaTexto: { ...typography.body, lineHeight: 22 },
});
