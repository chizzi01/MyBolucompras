// src/components/viajes/ViajeCard.jsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { formatRangoFechas } from '../../utils/formatters';

export default function ViajeCard({ viaje, onPress, dark }) {
  const activo = viaje.estado === 'activo';
  const borderColor = activo ? '#10B981' : (dark ? '#334155' : '#CBD5E1');
  const gastoCount = viaje._gastoCount ?? 0;
  const checklistTotal = viaje._checklistTotal ?? 0;
  const checklistDone = viaje._checklistDone ?? 0;
  const rangoFechas = formatRangoFechas(viaje.fechaDesde, viaje.fechaHasta);

  return (
    <TouchableOpacity
      style={[card(dark), { borderLeftColor: borderColor, opacity: activo ? 1 : 0.7 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={row}>
        <Text style={emoji}>{viaje.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={titulo(dark)}>{viaje.titulo}</Text>
          <Text style={participantes(dark)}>
            {viaje.participantes.map(p => p.nombre.split(' ')[0]).join(', ')}
          </Text>
          {!!rangoFechas && (
            <Text style={fechas(dark)}>📅 {rangoFechas}</Text>
          )}
        </View>
        <View style={estadoBadge(activo)}>
          <Text style={estadoText(activo)}>{activo ? '● Activo' : '🔒 Cerrado'}</Text>
        </View>
      </View>

      <View style={chips}>
        {gastoCount > 0 && (
          <View style={chip(dark)}><Text style={chipText(dark)}>💸 {gastoCount} gastos</Text></View>
        )}
        {checklistTotal > 0 && (
          <View style={chip(dark)}>
            <Text style={chipText(dark)}>✅ {checklistDone}/{checklistTotal}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const card = dark => ({
  backgroundColor: dark ? '#1E293B' : '#fff',
  borderRadius: radius.md,
  borderLeftWidth: 4,
  padding: spacing.md,
  marginBottom: spacing.sm,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: dark ? 0 : 0.06,
  shadowRadius: 6,
  elevation: 2,
});
const row = { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 };
const emoji = { fontSize: 28 };
const titulo = dark => ({ ...typography.h3, color: dark ? colors.text.dark : colors.text.light });
const participantes = dark => ({ ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 });
const fechas = dark => ({ ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 });
const estadoBadge = activo => ({
  paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
  backgroundColor: activo ? '#10B98120' : '#64748B20',
});
const estadoText = activo => ({ fontSize: 11, fontWeight: '600', color: activo ? '#10B981' : '#64748B' });
const chips = { flexDirection: 'row', flexWrap: 'wrap', gap: 6 };
const chip = dark => ({
  paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
  backgroundColor: dark ? '#0F172A' : '#F1F5F9',
});
const chipText = dark => ({ fontSize: 11, color: dark ? colors.textSecondary.dark : colors.textSecondary.light });
