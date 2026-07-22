// src/components/common/DateTimeField.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function DateTimeField({ value, onChange, dark, mode = 'date', placeholder, style }) {
  const [show, setShow] = useState(false);
  const dateObj = value instanceof Date && !isNaN(value) ? value : new Date();

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') return;
    if (selected) onChange(selected);
  };

  const displayText = value
    ? mode === 'time'
      ? value.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      : value.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : (placeholder || (mode === 'time' ? 'Seleccionar hora' : 'Seleccionar fecha'));

  const border = dark ? colors.border.dark : colors.border.light;
  const inputBg = dark ? '#0F172A' : '#F8FAFC';
  const textColor = value
    ? (dark ? colors.text.dark : colors.text.light)
    : (dark ? colors.textSecondary.dark : colors.textSecondary.light);
  const modalBg = dark ? '#1E293B' : '#fff';
  const titleColor = dark ? colors.text.dark : colors.text.light;

  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: inputBg, borderColor: border }]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
          size={16}
          color={dark ? colors.textSecondary.dark : colors.textSecondary.light}
        />
        <Text style={[styles.btnText, { color: textColor }]}>{displayText}</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && show && (
        <DateTimePicker value={dateObj} mode={mode} display="default" onChange={handleChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modalCard, { backgroundColor: modalBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: titleColor }]}>
                  {mode === 'time' ? 'Seleccionar hora' : 'Seleccionar fecha'}
                </Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.modalDone}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateObj}
                mode={mode}
                display="spinner"
                onChange={handleChange}
                textColor={titleColor}
                locale="es-AR"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  btnText: { ...typography.body },
  modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: 20 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#33415533',
  },
  modalTitle: { ...typography.bodyMed },
  modalDone: { color: colors.primary, fontWeight: '700' },
});
