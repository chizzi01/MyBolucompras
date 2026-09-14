import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { formatPrecioEuropeo } from '../utils/formatters';

const DELETE_WIDTH = 80;
const SHINE_WIDTH = 70;

export default function PendienteGastoCard({ pendiente, onPress, onDelete }) {
  const { dark } = useTheme();
  const s = styles(dark);
  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const [cardWidth, setCardWidth] = useState(260);

  // Barrido de brillo tipo "reflejo" de izquierda a derecha, en loop con
  // pausa — es lo único que no requiere que el usuario abra nada para darse
  // cuenta de que hay una compra sin registrar todavía.
  const shine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1400),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shine]);

  const shineTranslateX = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-SHINE_WIDTH, cardWidth + SHINE_WIDTH],
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const base = open ? -DELETE_WIDTH : 0;
        const next = Math.min(0, Math.max(base + g.dx, -DELETE_WIDTH));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (!open && g.dx < -DELETE_WIDTH / 2) {
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(true);
        } else if (open && g.dx > DELETE_WIDTH / 2) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(false);
        } else {
          Animated.spring(translateX, { toValue: open ? -DELETE_WIDTH : 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setOpen(false);
  };

  const handleDelete = () => { close(); onDelete(); };

  const precioDisplay = pendiente.monto != null
    ? formatPrecioEuropeo(pendiente.monto, pendiente.moneda || 'ARS')
    : '—';

  return (
    <View style={s.row}>
      <View style={s.actionsContainer}>
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={s.actionText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }], zIndex: 1, elevation: 1 }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={s.card}
          onPress={() => { if (open) { close(); } else { onPress(); } }}
          onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
          activeOpacity={0.75}
        >
          <View style={s.shineClip} pointerEvents="none">
            <Animated.View style={[s.shineStrip, { transform: [{ translateX: shineTranslateX }] }]}>
              <LinearGradient
                colors={dark
                  ? ['transparent', 'rgba(255,255,255,0.16)', 'transparent']
                  : ['transparent', 'rgba(255,255,255,0.75)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </View>

          <View style={s.badge}>
            <Ionicons name="flash" size={18} color="#fff" />
          </View>
          <View style={s.left}>
            <Text style={s.objeto} numberOfLines={1}>Compra detectada</Text>
            <Text style={s.meta} numberOfLines={1}>
              {pendiente.comercioRaw || 'Comercio desconocido'} · <Text style={s.cta}>tocá para registrar</Text>
            </Text>
          </View>
          <Text style={s.precio}>{precioDisplay}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  row: { marginHorizontal: spacing.md, marginVertical: spacing.xs, overflow: 'visible' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: dark ? '#2d2010' : '#FEF3C7',
    borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 6,
    borderWidth: 1.5, borderColor: colors.warning,
    elevation: 1, zIndex: 1,
    overflow: 'hidden',
  },
  shineClip: { ...StyleSheet.absoluteFillObject },
  shineStrip: { position: 'absolute', top: 0, bottom: 0, width: SHINE_WIDTH },
  badge: {
    width: 38, height: 38, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.warning,
  },
  left: { flex: 1, marginRight: spacing.sm },
  objeto: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 },
  meta: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  cta: { color: colors.warning, fontWeight: '700' },
  precio: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
  actionsContainer: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: DELETE_WIDTH,
    flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden', zIndex: 0, elevation: 0,
  },
  deleteBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: colors.error },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
