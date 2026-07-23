import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useConfiguracionMutations } from '../hooks/mutations/useConfiguracionMutations';
import { navigate } from '../navigation/navigationRef';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function ModoViajeModal({ visible, viaje, onClose }) {
  const { dark } = useTheme();
  const { mydata } = useConfiguracion();
  const { actualizar } = useConfiguracionMutations();
  const s = styles(dark);

  const [activar, setActivar] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!viaje) return null;

  const handleConfirmar = async (overrideActivar) => {
    const activarFlag = overrideActivar !== undefined ? overrideActivar : activar;
    setLoading(true);
    try {
      const promptedIds = [...new Set([...(mydata.modoViajePromptedIds || []), viaje.id])];
      await actualizar.mutateAsync({
        ...mydata,
        modoViajePromptedIds: promptedIds,
        ...(activarFlag ? { modoViajeActivo: true, modoViajeViajeId: viaje.id } : {}),
      });
      if (activarFlag) {
        navigate('ViajeDetail', { viajeId: viaje.id });
      }
    } catch {
      // silently ignore — mutation already handles optimistic rollback
    } finally {
      setLoading(false);
      setActivar(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => handleConfirmar(false)}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconCircle}>
            <Ionicons name="airplane-outline" size={38} color={colors.primary} />
          </View>

          <Text style={s.title}>¿Activar Modo Viaje?</Text>
          <Text style={s.message}>
            {viaje.emoji} {viaje.titulo} ya empezó. Con Modo Viaje activado, la app te va a llevar directo a este viaje al abrirla.
          </Text>

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Activar Modo Viaje</Text>
            <Switch
              value={activar}
              onValueChange={setActivar}
              disabled={loading}
              trackColor={{ false: dark ? '#334155' : '#CBD5E1', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => handleConfirmar()}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.primaryBtnText}>Confirmar</Text>
            }
          </TouchableOpacity>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: dark ? '#1e293b' : '#F8FAFC',
    marginBottom: spacing.lg,
  },
  switchLabel: {
    ...typography.bodyMed,
    color: dark ? colors.text.dark : colors.text.light,
  },
  primaryBtn: {
    width: '100%',
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
