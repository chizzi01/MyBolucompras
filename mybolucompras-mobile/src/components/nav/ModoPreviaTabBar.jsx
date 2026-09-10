import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../constants/theme';

const ITEMS = {
  Gastos: { on: 'list', off: 'list-outline', label: 'Gastos' },
  Dashboard: { on: 'home', off: 'home-outline', label: 'Inicio' },
  Deudores: { on: 'people', off: 'people-outline', label: 'Deudas' },
  Viajes: { on: 'airplane', off: 'airplane-outline', label: 'Viajes' },
};

// Nav de "Modo Previa": píldora flotante ancha con los 4 destinos reales de la
// app (Gastos, Inicio, Deudas, Viajes) más un "+" central grande que sobresale
// y abre Nuevo gasto. Config ya no vive acá — se abre desde el avatar del header.
export default function ModoPreviaTabBar({ state, navigation }) {
  const { dark } = useTheme();
  const insets = useSafeAreaInsets();

  const openAgregar = () => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('Agregar');
  };

  const renderItem = (route, index) => {
    const focused = state.index === index;
    const cfg = ITEMS[route.name] || { on: 'ellipse', off: 'ellipse-outline', label: route.name };
    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => navigation.navigate(route.name)}
        activeOpacity={0.75}
        style={styles.item}
        accessibilityRole="button"
        accessibilityLabel={cfg.label}
      >
        <Ionicons
          name={focused ? cfg.on : cfg.off}
          size={25}
          color={focused ? colors.primary : (dark ? '#6B6785' : '#B7B2C9')}
        />
        <Text
          style={[
            styles.label,
            { color: focused ? colors.primary : (dark ? '#6B6785' : '#B7B2C9') },
          ]}
        >
          {cfg.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // El "+" flota sobre el medio de la píldora: se deja un hueco vacío de su
  // ancho ahí en vez de repartir los 4 accesos parejo, así ninguno queda
  // pegado ni tapado por el botón.
  const mid = Math.ceil(state.routes.length / 2);
  const leftRoutes = state.routes.slice(0, mid);
  const rightRoutes = state.routes.slice(mid);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: dark ? 'rgba(24,22,36,0.96)' : '#FFFFFF' },
          dark ? styles.pillBorderDark : styles.pillBorderLight,
        ]}
      >
        <View style={styles.group}>
          {leftRoutes.map((route, i) => renderItem(route, i))}
        </View>
        <View style={styles.fabGap} />
        <View style={styles.group}>
          {rightRoutes.map((route, i) => renderItem(route, mid + i))}
        </View>
      </View>

      <TouchableOpacity
        onPress={openAgregar}
        activeOpacity={0.85}
        style={[
          styles.fab,
          {
            bottom: Math.max(insets.bottom, 14) + 34,
            borderColor: dark ? colors.background.dark : colors.background.light,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Agregar gasto"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    marginHorizontal: 16,
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  pillBorderDark: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pillBorderLight: { borderWidth: 1, borderColor: '#E8E1D3' },
  group: { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly' },
  fabGap: { width: 74 },
  item: { alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 52 },
  label: { fontSize: 10, fontWeight: '800' },
  fab: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
});
