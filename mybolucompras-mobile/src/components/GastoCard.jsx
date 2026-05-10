import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getCuotasRestantes } from '../utils/cuotas';
import { formatPrecio } from '../utils/formatters';

export default function GastoCard({ gasto, mydata, onPress, onDelete }) {
  const { dark } = useTheme();
  const s = styles(dark);

  const cuotasRest = getCuotasRestantes(gasto, mydata);
  const cuotasColor = getCuotasColor(cuotasRest, dark);
  const precioDisplay = formatPrecio(gasto.precio, gasto.moneda);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.left}>
        <Text style={s.objeto} numberOfLines={1}>{gasto.objeto}</Text>
        <View style={s.meta}>
          <Text style={s.metaText}>{gasto.medio}</Text>
          {gasto.etiqueta ? (
            <View style={s.tag}>
              <Text style={s.tagText}>{gasto.etiqueta}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={s.right}>
        <Text style={s.precio}>{precioDisplay}</Text>
        <View style={[s.cuotasBadge, { backgroundColor: cuotasColor.bg }]}>
          <Text style={[s.cuotasText, { color: cuotasColor.text }]}>
            {gasto.isFijo ? '∞' : `${cuotasRest}/${gasto.cuotas}`}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={s.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={16} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function getCuotasColor(cuotasRest, dark) {
  if (cuotasRest === '∞') return { bg: dark ? '#1a3a2e' : '#D1FAE5', text: '#10B981' };
  if (cuotasRest === 'N/A') return { bg: dark ? '#1e293b' : '#F1F5F9', text: dark ? '#94A3B8' : '#64748B' };
  if (cuotasRest <= 0) return { bg: dark ? '#1e293b' : '#F1F5F9', text: dark ? '#475569' : '#94A3B8' };
  if (cuotasRest === 1) return { bg: dark ? '#2d2010' : '#FEF3C7', text: '#F59E0B' };
  return { bg: dark ? '#1a3a2e' : '#D1FAE5', text: '#10B981' };
}

const styles = (dark) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: dark ? 0.3 : 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
  },
  left: { flex: 1, marginRight: spacing.sm },
  objeto: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  tag: { backgroundColor: dark ? '#1e3a5f' : '#EEF2FF', borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { ...typography.captionMed, color: dark ? colors.primaryLight : colors.primary },
  right: { alignItems: 'flex-end', marginRight: spacing.sm },
  precio: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 4 },
  cuotasBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, minWidth: 44, alignItems: 'center' },
  cuotasText: { ...typography.captionMed, fontWeight: '600' },
  deleteBtn: { padding: 4 },
});
