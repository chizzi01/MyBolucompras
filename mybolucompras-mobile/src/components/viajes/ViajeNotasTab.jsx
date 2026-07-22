// src/components/viajes/ViajeNotasTab.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { viajeNotasService } from '../../services/viajeNotasService';
import { useViajeNotas } from '../../hooks/queries/useViajeNotas';
import { useViajeNotasMutations } from '../../hooks/mutations/useViajeNotasMutations';
import { colors, spacing, radius, typography } from '../../constants/theme';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ViajeNotasTab({ viaje, dark }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const border = dark ? colors.border.dark : colors.border.light;

  const [nuevoItem, setNuevoItem] = useState('');
  const [nuevaNota, setNuevaNota] = useState('');
  const [showItemInput, setShowItemInput] = useState(false);
  const [showNotaInput, setShowNotaInput] = useState(false);
  const [checklistTab, setChecklistTab] = useState('general');

  const activo = viaje.estado === 'activo';
  const { checklist, notas, loading } = useViajeNotas(viaje.id);
  const { agregarItem, toggleItem, eliminarItem, agregarNota, eliminarNota } = useViajeNotasMutations(viaje.id);

  useEffect(() => {
    const channel = viajeNotasService.subscribeChecklist(viaje.id, () => {
      queryClient.invalidateQueries({ queryKey: ['viaje-checklist', viaje.id] });
    });
    return () => { channel.unsubscribe(); };
  }, [viaje.id, queryClient]);

  const handleToggle = (item) => {
    const marcar = !(item.completadosPor ?? []).includes(user?.id);
    toggleItem.mutate({ itemId: item.id, userId: user?.id, marcar });
  };

  const handleAgregarItem = () => {
    if (!nuevoItem.trim()) return;
    agregarItem.mutate({ texto: nuevoItem.trim(), tipo: checklistTab }, {
      onSuccess: () => { setNuevoItem(''); setShowItemInput(false); },
      onError: (err) => Alert.alert('Error', err.message),
    });
  };

  const handleEliminarItem = (id) => eliminarItem.mutate(id);

  const handleAgregarNota = () => {
    if (!nuevaNota.trim()) return;
    agregarNota.mutate(nuevaNota.trim(), {
      onSuccess: () => { setNuevaNota(''); setShowNotaInput(false); },
      onError: (err) => Alert.alert('Error', err.message),
    });
  };

  const handleEliminarNota = (id) => eliminarNota.mutate(id);

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      {sectionHeader(checklistTab === 'general' ? 'QUÉ LLEVAR' : 'MIS COSAS', () => setShowItemInput(v => !v))}

      <View style={styles.checklistTabsRow}>
        <TouchableOpacity
          style={[styles.checklistTabBtn, checklistTab === 'general' && styles.checklistTabBtnActive]}
          onPress={() => { setChecklistTab('general'); setShowItemInput(false); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.checklistTabText, { color: subtextColor }, checklistTab === 'general' && styles.checklistTabTextActive]}>
            General
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.checklistTabBtn, checklistTab === 'personal' && styles.checklistTabBtnActive]}
          onPress={() => { setChecklistTab('personal'); setShowItemInput(false); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.checklistTabText, { color: subtextColor }, checklistTab === 'personal' && styles.checklistTabTextActive]}>
            Personal
          </Text>
        </TouchableOpacity>
      </View>

      {showItemInput && activo && (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC', borderColor: border, color: textColor }]}
            placeholder={checklistTab === 'general' ? 'Ej: Protector solar...' : 'Ej: Mi pasaporte...'}
            placeholderTextColor={subtextColor}
            value={nuevoItem}
            onChangeText={setNuevoItem}
            onSubmitEditing={handleAgregarItem}
            autoFocus
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAgregarItem} disabled={agregarItem.isPending}>
            {agregarItem.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {checklist.filter(item => item.tipo === checklistTab).map(item => {
        const esPersonal = item.tipo === 'personal';
        const completadosPor = item.completadosPor ?? [];
        const completadoPorMi = completadosPor.includes(user?.id);
        const pendientes = esPersonal ? [] : viaje.participantes.filter(p => !completadosPor.includes(p.userId));
        const todosCompletaron = esPersonal ? completadoPorMi : (viaje.participantes.length > 0 && pendientes.length === 0);
        const alguienMarcó = completadosPor.length > 0;

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.checkItem, { backgroundColor: surfaceBg }]}
            onPress={() => handleToggle(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={todosCompletaron ? 'checkmark-circle' : completadoPorMi ? 'checkmark-circle-outline' : 'ellipse-outline'}
              size={22}
              color={todosCompletaron || completadoPorMi ? '#10B981' : subtextColor}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.checkText, { color: todosCompletaron ? subtextColor : textColor, textDecorationLine: todosCompletaron ? 'line-through' : 'none' }]}>
                {item.texto}
              </Text>
              {!esPersonal && !todosCompletaron && alguienMarcó && (
                <Text style={styles.esperando}>
                  Esperando a: {pendientes.map(p => p.nombre.split(' ')[0]).join(', ')}
                </Text>
              )}
            </View>
            {!esPersonal && <Text style={[styles.autor, { color: subtextColor }]}>{item.autorNombre.split(' ')[0]}</Text>}
            {item.createdBy === user?.id && activo && (
              <TouchableOpacity onPress={() => handleEliminarItem(item.id)}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}

      {checklist.filter(item => item.tipo === checklistTab).length === 0 && (
        <Text style={[styles.checklistEmpty, { color: subtextColor }]}>
          {checklistTab === 'general' ? 'Sin ítems generales todavía' : 'Sin ítems personales todavía'}
        </Text>
      )}

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
          <TouchableOpacity style={styles.addBtn} onPress={handleAgregarNota} disabled={agregarNota.isPending}>
            {agregarNota.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
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
  checkText: { ...typography.body },
  esperando: { fontSize: 11, color: '#F59E0B', marginTop: 2 },
  autor: { fontSize: 11 },
  checklistTabsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  checklistTabBtn: {
    flex: 1, paddingVertical: 6, borderRadius: radius.md,
    alignItems: 'center', backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'transparent',
  },
  checklistTabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checklistTabText: { fontSize: 12, fontWeight: '600' },
  checklistTabTextActive: { color: '#fff' },
  checklistEmpty: { ...typography.body, textAlign: 'center', paddingVertical: spacing.md },
  notaCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  notaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  notaAutor: { ...typography.captionMed, fontWeight: '700', flex: 1 },
  notaTs: { fontSize: 11 },
  notaTexto: { ...typography.body, lineHeight: 22 },
});
