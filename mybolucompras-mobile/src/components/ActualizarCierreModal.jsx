import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useConfiguracionMutations } from '../hooks/mutations/useConfiguracionMutations';
import { sumarDiasHabiles } from '../utils/cuotas';
import { colors, spacing, radius, typography } from '../constants/theme';

function formatDisplay(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function formatToDB(date) {
  return date.toISOString().split('T')[0];
}

function parseDBDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function defaultNuevoCierre(oldCierreStr) {
  const old = parseDBDate(oldCierreStr);
  const next = new Date(old);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export default function ActualizarCierreModal({ visible, onClose }) {
  const { dark } = useTheme();
  const { mydata } = useConfiguracion();
  const { actualizar } = useConfiguracionMutations();
  const s = styles(dark);

  const [nuevoCierre, setNuevoCierre] = useState(() => defaultNuevoCierre(mydata?.cierre));
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && mydata?.cierre) {
      setNuevoCierre(defaultNuevoCierre(mydata.cierre));
    }
  }, [visible, mydata?.cierre]);

  const handleGuardar = async () => {
    setLoading(true);
    try {
      const nuevoVencimiento = sumarDiasHabiles(nuevoCierre, 10);
      await actualizar.mutateAsync({
        ...mydata,
        cierreAnterior: mydata.cierre,
        vencimientoAnterior: mydata.vencimiento,
        cierre: formatToDB(nuevoCierre),
        vencimiento: formatToDB(nuevoVencimiento),
      });
      onClose();
    } catch {
      // silently ignore — mutation already handles optimistic rollback
    } finally {
      setLoading(false);
    }
  };

  const oldCierreDisplay = mydata?.cierre
    ? formatDisplay(parseDBDate(mydata.cierre))
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconCircle}>
            <Ionicons name="card-outline" size={38} color={colors.primary} />
          </View>

          <Text style={s.title}>Nuevo período de tarjeta</Text>
          <Text style={s.message}>
            El cierre del {oldCierreDisplay} ya pasó.{'\n'}Ingresá la nueva fecha de cierre.
          </Text>

          <TouchableOpacity
            style={s.dateButton}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar-outline" size={17} color={colors.primary} style={s.dateIcon} />
            <Text style={s.dateText}>{formatDisplay(nuevoCierre)}</Text>
            <Ionicons name="chevron-down" size={15} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} />
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={nuevoCierre}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={mydata?.cierre ? parseDBDate(mydata.cierre) : undefined}
              onChange={(_, date) => {
                setShowPicker(Platform.OS === 'ios');
                if (date) setNuevoCierre(date);
              }}
            />
          )}

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7} disabled={loading}>
              <Text style={s.cancelText}>Ahora no</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.primaryBtn} onPress={handleGuardar} activeOpacity={0.85} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.primaryBtnText}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = (dark) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: dark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderRadius: 20,
    padding: spacing.lg + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: dark ? 0.5 : 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}18`,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: dark ? colors.text.dark : colors.text.light,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    backgroundColor: dark ? '#1e293b' : '#F8FAFC',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  dateIcon: { marginRight: 2 },
  dateText: {
    flex: 1,
    ...typography.bodyMed,
    color: dark ? colors.text.dark : colors.text.light,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#1e293b' : '#F1F5F9',
  },
  cancelText: {
    ...typography.bodyMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryBtnText: {
    ...typography.bodyMed,
    color: '#fff',
    fontWeight: '700',
  },
});
