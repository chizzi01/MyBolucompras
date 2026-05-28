// src/components/viajes/SplitPanel.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../constants/theme';
import ParticipantesPicker from './ParticipantesPicker';

const MODES = [
  { key: 'solo', label: '🙋 Solo yo' },
  { key: 'todos', label: '👥 Todos' },
  { key: 'algunos', label: '👤+ Algunos' },
];

// participantes: [{userId, nombre}], currentUserId: string
// value: { modoSplit, participanteIds }
// onChange: (value) => void
// precio: number
export default function SplitPanel({ participantes, currentUserId, value, onChange, precio, dark }) {
  const [showPicker, setShowPicker] = useState(false);

  const border = dark ? colors.border.dark : colors.border.light;
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const surfaceBg = dark ? '#0F172A' : '#F8FAFC';

  const { modoSplit, participanteIds } = value;

  const handleModeChange = (mode) => {
    if (mode === 'todos') {
      onChange({ modoSplit: 'todos', participanteIds: participantes.map(p => p.userId) });
    } else if (mode === 'solo') {
      onChange({ modoSplit: 'solo', participanteIds: [currentUserId] });
    } else {
      onChange({ modoSplit: 'algunos', participanteIds: participanteIds.length ? participanteIds : [currentUserId] });
    }
  };

  const n = modoSplit === 'todos'
    ? participantes.length
    : modoSplit === 'algunos'
      ? participanteIds.length
      : 1;

  const ppp = n > 0 && precio ? precio / n : 0;

  return (
    <View style={[styles.panel, { backgroundColor: surfaceBg, borderColor: border }]}>
      <Text style={[styles.label, { color: subtextColor }]}>DIVISIÓN DEL GASTO</Text>

      <View style={styles.modeRow}>
        {MODES.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeBtn, { borderColor: border }, modoSplit === m.key && styles.modeBtnActive]}
            onPress={() => handleModeChange(m.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, { color: modoSplit === m.key ? '#fff' : textColor }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {modoSplit === 'algunos' && (
        <TouchableOpacity
          style={[styles.pickerBtn, { borderColor: colors.primary }]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={{ color: colors.primary, fontSize: 13 }}>
            {participanteIds.length} seleccionado{participanteIds.length !== 1 ? 's' : ''} — tocar para editar
          </Text>
        </TouchableOpacity>
      )}

      {precio > 0 && modoSplit !== 'solo' && n > 1 && (
        <Text style={[styles.summary, { color: subtextColor }]}>
          ${precio.toFixed(0)} ÷ {n} personas = ${ppp.toFixed(0)} c/u
        </Text>
      )}

      <ParticipantesPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        participantes={participantes}
        selected={participanteIds}
        onChange={ids => onChange({ modoSplit: 'algunos', participanteIds: ids })}
        currentUserId={currentUserId}
        dark={dark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  label: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText: { fontSize: 12, fontWeight: '600' },
  pickerBtn: { marginTop: spacing.sm, borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: 10, alignItems: 'center' },
  summary: { ...typography.captionMed, textAlign: 'center', marginTop: spacing.sm },
});
