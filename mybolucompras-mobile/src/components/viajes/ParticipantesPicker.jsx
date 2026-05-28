// src/components/viajes/ParticipantesPicker.jsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../../constants/theme';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// participantes: [{userId, nombre}], currentUserId: string (always included, not removable)
// selected: uuid[], onChange: (uuid[]) => void
export default function ParticipantesPicker({ visible, onClose, participantes, selected, onChange, currentUserId, dark }) {
  const insets = useSafeAreaInsets();
  const bg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;

  const toggle = (userId) => {
    if (userId === currentUserId) return; // can't remove self
    if (selected.includes(userId)) {
      onChange(selected.filter(id => id !== userId));
    } else {
      onChange([...selected, userId]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: textColor }]}>Seleccionar participantes</Text>
          <ScrollView>
            {participantes.map((p, i) => {
              const isSelf = p.userId === currentUserId;
              const checked = selected.includes(p.userId);
              const color = PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length];
              return (
                <TouchableOpacity
                  key={p.userId}
                  style={styles.row}
                  onPress={() => toggle(p.userId)}
                  disabled={isSelf}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, { backgroundColor: color }]}>
                    <Text style={styles.avatarText}>{p.nombre[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.nombre, { color: textColor }]}>{p.nombre}{isSelf ? ' (vos)' : ''}</Text>
                  <Ionicons
                    name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={checked ? colors.primary : '#CBD5E1'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md, maxHeight: '70%' },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nombre: { ...typography.bodyMed, flex: 1 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
