import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useConfiguracionMutations } from '../hooks/mutations/useConfiguracionMutations';
import { navigate } from '../navigation/navigationRef';
import { colors, spacing, radius, typography } from '../constants/theme';

const SWITCH_WIDTH = 68;
const SWITCH_HEIGHT = 36;
const THUMB_SIZE = 28;
const THUMB_TRAVEL = SWITCH_WIDTH - THUMB_SIZE - 8;

function TravelSwitch({ value, onValueChange, disabled, dark }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, friction: 7, tension: 90, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.spring(thumbScale, { toValue: 1.18, speed: 40, useNativeDriver: true }),
      Animated.spring(thumbScale, { toValue: 1, speed: 30, useNativeDriver: true }),
    ]).start();
  }, [value]);

  const thumbTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [4, THUMB_TRAVEL + 4] });
  const gradientOpacity = anim;
  const iconRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[s2.track, { backgroundColor: dark ? '#334155' : '#CBD5E1', opacity: disabled ? 0.6 : 1 }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: gradientOpacity }]}>
        <LinearGradient
          colors={[colors.primary, colors.warning]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s2.track}
        />
      </Animated.View>
      <Animated.View
        style={[
          s2.thumb,
          { backgroundColor: dark ? colors.surface.dark : '#fff', transform: [{ translateX: thumbTranslate }, { scale: thumbScale }] },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: iconRotate }] }}>
          <Ionicons name="airplane" size={15} color={value ? colors.primary : (dark ? '#64748B' : '#94A3B8')} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const s2 = StyleSheet.create({
  track: {
    width: SWITCH_WIDTH,
    height: SWITCH_HEIGHT,
    borderRadius: SWITCH_HEIGHT / 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

export default function ModoViajeModal({ visible, viaje, onClose }) {
  const { dark } = useTheme();
  const { mydata } = useConfiguracion();
  const { actualizar } = useConfiguracionMutations();
  const s = styles(dark);

  const [activar, setActivar] = useState(false);
  const [loading, setLoading] = useState(false);

  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const floatLoop = useRef(null);

  useEffect(() => {
    if (!visible) return;

    cardScale.setValue(0.85);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    floatLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(iconFloat, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    floatLoop.current.start();

    return () => floatLoop.current?.stop();
  }, [visible]);

  if (!viaje) return null;

  const iconTransform = [
    { translateY: iconFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
    { rotate: iconFloat.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) },
  ];

  const handlePressIn = () => {
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };

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
    } catch (err) {
      // mutation already handles optimistic rollback — still log so failures
      // (e.g. Supabase schema cache not yet reloaded) aren't invisible
      console.warn('[ModoViaje] Error al guardar:', err?.message ?? err);
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
        <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
          <View style={s.iconCircle}>
            <LinearGradient
              colors={[colors.primary, colors.warning]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.iconGradient}
            >
              <Animated.View style={{ transform: iconTransform }}>
                <Ionicons name="airplane" size={34} color="#fff" />
              </Animated.View>
            </LinearGradient>
          </View>

          <Text style={s.title}>¿Activar Modo Viaje?</Text>
          <Text style={s.message}>
            {viaje.emoji} {viaje.titulo} ya empezó. Con Modo Viaje activado, la app te va a llevar directo a este viaje al abrirla.
          </Text>

          <View style={[s.switchRow, activar && s.switchRowActive]}>
            <Text style={s.switchLabel}>Activar Modo Viaje</Text>
            <TravelSwitch
              value={activar}
              onValueChange={setActivar}
              disabled={loading}
              dark={dark}
            />
          </View>

          <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => handleConfirmar()}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.primaryBtnText}>Confirmar</Text>
              }
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
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
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: dark ? 0.5 : 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  iconGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
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
  switchRowActive: {
    borderColor: colors.primary,
    backgroundColor: dark ? `${colors.primary}22` : `${colors.primary}12`,
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
