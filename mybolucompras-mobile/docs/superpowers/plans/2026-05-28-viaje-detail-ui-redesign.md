# ViajeDetailScreen UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign ViajeDetailScreen header to Design C+avatares and improve ViajeGastosTab + ViajeBalanceTab visual hierarchy.

**Architecture:** Three self-contained component edits — header (ViajeDetailScreen), gastos list (ViajeGastosTab), balance view (ViajeBalanceTab). No new files, no service/query changes.

**Tech Stack:** React Native (Expo), expo-linear-gradient, react-native-safe-area-context, @expo/vector-icons

---

## File map

| File | What changes |
|---|---|
| `src/screens/ViajeDetailScreen.jsx` | Full header rewrite: insets, emoji box, avatar stack, stat cards, frosted glass icon buttons. DRY fix: single `headerContent` JSX variable. |
| `src/components/viajes/ViajeGastosTab.jsx` | Date separator grouping, card border, rounded-square avatar, dot meta, violet PPP, FAB label. |
| `src/components/viajes/ViajeBalanceTab.jsx` | Card border+radius, subtitle, bar legend, liquidation pill amount. |

---

## Task 1: Header redesign in ViajeDetailScreen

**Files:**
- Modify: `src/screens/ViajeDetailScreen.jsx`

### Background

The current header has `paddingTop: 52` hardcoded and inner content duplicated in both `ImageBackground` and `LinearGradient` branches. This task replaces it with Design C: compact layout with emoji box, inline badge, avatar stack, 2 stat cards, and frosted-glass icon buttons. A `headerContent` variable eliminates the duplication.

Key fields available on `viaje`:
- `viaje.emoji` — string emoji
- `viaje.titulo` — string
- `viaje.estado` — `'activo'` | `'cerrado'`
- `viaje.participantes` — array of `{ userId, nombre, email }`
- `viaje.imagenUrl` — string | null

Key fields on each `g` in `gastos`:
- `g.precio` — number

`PARTICIPANT_COLORS` is already defined in the file: `['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899']`

- [ ] **Step 1: Replace the entire file**

Replace `src/screens/ViajeDetailScreen.jsx` with:

```jsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useViajeDetalle } from '../hooks/queries/useViajeDetalle';
import { colors, spacing, radius } from '../constants/theme';
import ViajeGastosTab from '../components/viajes/ViajeGastosTab';
import ViajeBalanceTab from '../components/viajes/ViajeBalanceTab';
import ViajeNotasTab from '../components/viajes/ViajeNotasTab';
import ViajeOpcionesSheet from '../components/viajes/ViajeOpcionesSheet';

const TABS = ['💸 Gastos', '⚖️ Balance', '✅ Notas'];
const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const MAX_AVATARS = 4;

export default function ViajeDetailScreen() {
  const { dark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { viajeId } = route.params;
  const insets = useSafeAreaInsets();

  const { viaje, gastos, loading, refetch } = useViajeDetalle(viajeId);
  const [tabIdx, setTabIdx] = useState(0);
  const [showOpciones, setShowOpciones] = useState(false);

  const participantColor = (userId) => {
    if (!viaje) return PARTICIPANT_COLORS[0];
    const idx = viaje.participantes.findIndex(p => p.userId === userId);
    return PARTICIPANT_COLORS[Math.max(0, idx) % PARTICIPANT_COLORS.length];
  };

  const totalGastado = gastos.reduce((sum, g) => sum + g.precio, 0);
  const activo = viaje?.estado === 'activo';
  const porPersona = viaje && viaje.participantes.length > 0
    ? (totalGastado / viaje.participantes.length).toFixed(0)
    : '0';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? colors.background.dark : colors.background.light }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!viaje) return null;

  const visibleParticipants = viaje.participantes.slice(0, MAX_AVATARS);
  const overflowCount = viaje.participantes.length - MAX_AVATARS;

  const headerContent = (
    <View style={[styles.headerInner, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.backText}>Mis Viajes</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Tabs')}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            accessibilityLabel="Ir al inicio"
            accessibilityRole="button"
          >
            <Ionicons name="home-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowOpciones(true)}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            accessibilityLabel="Opciones del viaje"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.emojiBox}>
          <Text style={{ fontSize: 24 }}>{viaje.emoji}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.viajeTitulo} numberOfLines={1}>{viaje.titulo}</Text>
          <View style={[styles.badge, {
            backgroundColor: activo ? 'rgba(16,185,129,0.22)' : 'rgba(100,116,139,0.22)',
            borderColor: activo ? 'rgba(16,185,129,0.35)' : 'rgba(100,116,139,0.35)',
          }]}>
            <View style={[styles.badgeDot, { backgroundColor: activo ? '#10B981' : '#64748B' }]} />
            <Text style={[styles.badgeText, { color: activo ? '#6EE7B7' : '#CBD5E1' }]}>
              {activo ? 'Activo' : 'Archivado'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.avatarsRow}>
        {visibleParticipants.map((p, i) => (
          <View
            key={p.userId}
            style={[styles.av, { backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length], marginLeft: i === 0 ? 0 : -7 }]}
          >
            <Text style={styles.avText}>{p.nombre[0]?.toUpperCase()}</Text>
          </View>
        ))}
        {overflowCount > 0 && (
          <View style={[styles.av, styles.avOverflow, { marginLeft: -7 }]}>
            <Text style={styles.avText}>+{overflowCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL</Text>
          <Text style={styles.statVal}>${totalGastado.toFixed(0)}</Text>
          <Text style={styles.statSub}>{gastos.length} gastos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>POR PERSONA</Text>
          <Text style={styles.statVal}>${porPersona}</Text>
          <Text style={styles.statSub}>{viaje.participantes.length} personas</Text>
        </View>
      </View>

      <View style={styles.segmented}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[styles.segTab, tabIdx === i && styles.segTabActive]}
            onPress={() => setTabIdx(i)}
          >
            <Text style={[styles.segTabText, tabIdx === i && styles.segTabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light }} edges={['bottom']}>
      {viaje.imagenUrl ? (
        <ImageBackground
          source={{ uri: viaje.imagenUrl }}
          style={styles.headerBg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.65)']}
            style={StyleSheet.absoluteFill}
          />
          {headerContent}
        </ImageBackground>
      ) : (
        <LinearGradient colors={['#6366F1', '#4338CA']} style={styles.headerBg}>
          {headerContent}
        </LinearGradient>
      )}

      {tabIdx === 0 && (
        <ViajeGastosTab
          viaje={viaje}
          gastos={gastos}
          onGastoAdded={refetch}
          participantColor={participantColor}
          dark={dark}
        />
      )}
      {tabIdx === 1 && (
        <ViajeBalanceTab
          viaje={viaje}
          gastos={gastos}
          participantColor={participantColor}
          dark={dark}
        />
      )}
      {tabIdx === 2 && (
        <ViajeNotasTab
          viaje={viaje}
          dark={dark}
        />
      )}

      <ViajeOpcionesSheet
        visible={showOpciones}
        onClose={() => setShowOpciones(false)}
        viaje={viaje}
        gastos={gastos}
        onUpdated={refetch}
        onDeleted={() => navigation.goBack()}
        dark={dark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBg: {},
  headerInner: { paddingHorizontal: 16, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#fff', fontSize: 15 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emojiBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: { flex: 1 },
  viajeTitulo: { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 4 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  avatarsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  av: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avOverflow: { backgroundColor: 'rgba(255,255,255,0.2)' },
  avText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, padding: 9,
  },
  statLabel: { fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  statVal: { fontSize: 16, color: '#fff', fontWeight: '800', marginBottom: 2 },
  statSub: { fontSize: 8, color: 'rgba(255,255,255,0.5)' },
  segmented: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 11, padding: 3, gap: 3 },
  segTab: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center' },
  segTabActive: { backgroundColor: '#fff' },
  segTabText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  segTabTextActive: { color: colors.primary, fontWeight: '800' },
});
```

- [ ] **Step 2: Start Expo and open ViajeDetailScreen**

```
npx expo start
```

Open the app on a device/simulator. Navigate to any viaje detail screen and verify:

- Header shows emoji in glass box (not raw emoji), title 19px bold, badge "Activo"/"Archivado" inline
- Avatar stack appears with colored circles, overlapping. With >4 participants a "+N" overflow circle shows.
- "TOTAL" and "POR PERSONA" stat cards show correct values and counts
- Home and options buttons are 30×30 circles with frosted glass background
- Safe area: header content does not overlap the status bar (test on a notched device or simulator)
- Tab bar tabs have correct padding and active tab shows white background with violet text
- Switching tabs (Gastos, Balance, Notas) works correctly
- Viaje with `imagenUrl` set shows the image with dark gradient overlay
- Viaje without `imagenUrl` shows the `#6366F1 → #4338CA` gradient (darker than before)

- [ ] **Step 3: Commit**

```bash
git add src/screens/ViajeDetailScreen.jsx
git commit -m "feat: redesign ViajeDetailScreen header (Design C + avatar stack)"
```

---

## Task 2: ViajeGastosTab — date separators and card improvements

**Files:**
- Modify: `src/components/viajes/ViajeGastosTab.jsx`

### Background

Current tab uses a simple FlatList with no date grouping and round avatar circles. This task adds date separators ("Hoy" / "Ayer" / "DD MMM"), changes avatar to rounded square, adds dot separator in meta, makes PPP violet, and updates FAB label.

Key fields on each gasto `g`:
- `g.fecha` — string from DB, either `"YYYY-MM-DD"` (ISO) or `"DD/MM/YYYY"` (Argentine). May be empty string.
- `g.objeto` — expense title
- `g.precio` — number
- `g.pagadoPor` — userId (string)
- `g.pagadorNombre` — display name
- `g.modoSplit` — `'solo'` | `'todos'` | `'algunos'`
- `g.participantes` — array of user IDs who split; empty for `'todos'` mode

The gastos array is already ordered newest-first (by `created_at DESC`).

- [ ] **Step 1: Replace the entire file**

Replace `src/components/viajes/ViajeGastosTab.jsx` with:

```jsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function parseFecha(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateSep(dateStr) {
  const d = parseFecha(dateStr);
  if (!d) return 'Sin fecha';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return 'Hoy';
  if (isSameDay(d, yesterday)) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function groupGastos(gastos) {
  const items = [];
  let lastKey = null;
  for (const g of gastos) {
    const dateKey = g.fecha ? g.fecha.slice(0, 10) : 'sin-fecha';
    if (dateKey !== lastKey) {
      items.push({ type: 'sep', label: formatDateSep(g.fecha), key: `sep-${dateKey}-${items.length}` });
      lastKey = dateKey;
    }
    items.push({ type: 'gasto', ...g, key: g.id });
  }
  return items;
}

export default function ViajeGastosTab({ viaje, gastos, onGastoAdded, participantColor, dark }) {
  const navigation = useNavigation();
  const activo = viaje.estado === 'activo';
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  const handleAgregarGasto = () => {
    navigation.navigate('Tabs', {
      screen: 'Agregar',
      params: { viajeId: viaje.id, viajeNombre: `${viaje.emoji} ${viaje.titulo}` },
    });
  };

  const flatItems = groupGastos(gastos);

  const renderItem = ({ item }) => {
    if (item.type === 'sep') {
      return <Text style={[styles.dateSep, { color: subtextColor }]}>{item.label}</Text>;
    }

    const g = item;
    const color = participantColor(g.pagadoPor);
    const initial = g.pagadorNombre?.[0]?.toUpperCase() || '?';
    const n = g.participantes.length || viaje.participantes.length;
    const splitText = g.modoSplit === 'solo' ? 'solo él/ella' : `÷ ${n} personas`;

    return (
      <View style={[styles.item, { backgroundColor: surfaceBg, borderColor }]}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.objeto, { color: textColor }]} numberOfLines={1}>{g.objeto}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: subtextColor }]}>{g.pagadorNombre}</Text>
            <View style={[styles.metaDot, { backgroundColor: dark ? '#334155' : '#CBD5E1' }]} />
            <Text style={[styles.metaText, { color: subtextColor }]}>{splitText}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.monto, { color: textColor }]}>${g.precio.toFixed(0)}</Text>
          {g.modoSplit !== 'solo' && n > 1 && (
            <Text style={styles.ppp}>${(g.precio / n).toFixed(0)} c/u</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {!activo && (
        <View style={styles.readonlyBanner}>
          <Ionicons name="lock-closed-outline" size={14} color="#F59E0B" />
          <Text style={styles.readonlyText}>Solo lectura</Text>
        </View>
      )}
      <FlatList
        data={flatItems}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>💸</Text>
            <Text style={[styles.emptyText, { color: subtextColor }]}>Sin gastos todavía</Text>
          </View>
        }
      />
      {activo && (
        <TouchableOpacity style={styles.fab} onPress={handleAgregarGasto} activeOpacity={0.9}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Agregar gasto</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateSep: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 12, marginBottom: 4,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 5,
  },
  avatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  objeto: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5 },
  metaText: { fontSize: 11 },
  monto: { fontSize: 14, fontWeight: '800' },
  ppp: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  readonlyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F59E0B20', padding: spacing.sm, paddingHorizontal: spacing.md,
  },
  readonlyText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.body },
  fab: {
    position: 'absolute', bottom: 24, right: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.full,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 2: Verify visually**

In the running Expo app, open a viaje that has multiple gastos on different dates. Verify:

- Gastos are grouped under date separators ("Hoy", "Ayer", or "DD MMM" for older dates)
- All gastos with the same date share one separator header; gastos with different dates each have their own header
- Avatar shape is rounded square (not circle)
- Meta row shows: "Agus · ÷ 4 personas" with a small dot separator (not "Agus pagó · ÷ 4")
- "solo él/ella" mode shows correctly (no PPP row, meta shows "solo él/ella")
- PPP amount "$X c/u" appears in violet instead of gray
- FAB shows "Agregar gasto" (not "Gasto al viaje")
- FAB has a violet glow shadow
- Empty state (no gastos) still shows the 💸 emoji and text
- Archived viaje (estado ≠ 'activo') shows the yellow readonly banner and no FAB

- [ ] **Step 3: Commit**

```bash
git add src/components/viajes/ViajeGastosTab.jsx
git commit -m "feat: improve ViajeGastosTab with date separators, card border, violet PPP"
```

---

## Task 3: ViajeBalanceTab — card borders, bar legend, pill liquidation

**Files:**
- Modify: `src/components/viajes/ViajeBalanceTab.jsx`

### Background

The current balance tab has plain cards (no border), a basic progress bar, and inline monto text for transfers. This task adds subtle borders, a "Pagó $X total" subtitle, bar legend, and a violet pill for the transfer amount.

Data shape from `viajeGastosService.calcularBalance(gastos, participantes)`:
- `porPersona` — array of `{ userId, nombre, total, neto }` where `total` = amount they paid, `neto` = positive means they're owed money, negative means they owe
- `liquidacion` — array of `{ de, deNombre, hacia, haciaNombre, monto }` representing transfers

- [ ] **Step 1: Replace the entire file**

Replace `src/components/viajes/ViajeBalanceTab.jsx` with:

```jsx
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { viajeGastosService } from '../../services/viajeGastosService';
import { colors, spacing, typography } from '../../constants/theme';

export default function ViajeBalanceTab({ viaje, gastos, participantColor, dark }) {
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const barBgColor = dark ? '#263347' : '#E2E8F0';

  const { porPersona, liquidacion } = useMemo(
    () => viajeGastosService.calcularBalance(gastos, viaje.participantes),
    [gastos, viaje.participantes]
  );

  const maxTotal = Math.max(...porPersona.map(p => p.total), 1);

  const sectionLabel = (title) => (
    <Text style={[styles.sectionLabel, { color: subtextColor }]}>{title}</Text>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
    >
      {sectionLabel('CUÁNTO PUSO CADA UNO')}
      {porPersona.map(p => {
        const color = participantColor(p.userId);
        const netoPositive = p.neto > 0;
        return (
          <View key={p.userId} style={[styles.card, { backgroundColor: surfaceBg, borderColor }]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: color }]}>
                <Text style={styles.avatarText}>{p.nombre[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombre, { color: textColor }]}>{p.nombre}</Text>
                <Text style={[styles.sub, { color: subtextColor }]}>Pagó ${p.total.toFixed(0)} total</Text>
              </View>
              <Text style={[styles.neto, { color: netoPositive ? '#10B981' : p.neto < 0 ? colors.error : subtextColor }]}>
                {netoPositive ? '+' : ''}{p.neto.toFixed(0)}
              </Text>
            </View>
            <View style={[styles.barBg, { backgroundColor: barBgColor }]}>
              <View style={[styles.bar, { width: `${(p.total / maxTotal) * 100}%`, backgroundColor: color }]} />
            </View>
            <View style={styles.barLegend}>
              <Text style={[styles.barLeg, { color: subtextColor }]}>$0</Text>
              <Text style={[styles.barLeg, { color: subtextColor }]}>${maxTotal.toFixed(0)}</Text>
            </View>
          </View>
        );
      })}

      {liquidacion.length > 0 && (
        <>
          {sectionLabel('CÓMO LIQUIDAR')}
          {liquidacion.map((t, i) => (
            <View key={i} style={[styles.transCard, { backgroundColor: surfaceBg, borderColor }]}>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.de) }]}>
                <Text style={styles.avatarText}>{t.deNombre[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.transInfo}>
                <Text style={[styles.transNames, { color: textColor }]}>{t.deNombre} → {t.haciaNombre}</Text>
                <Text style={[styles.transSub, { color: subtextColor }]}>debe transferir</Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.hacia) }]}>
                <Text style={styles.avatarText}>{t.haciaNombre[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.amountPill}>
                <Text style={styles.amountText}>${t.monto.toFixed(0)}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {liquidacion.length === 0 && porPersona.length > 0 && (
        <View style={[styles.card, { backgroundColor: surfaceBg, borderColor, alignItems: 'center', padding: spacing.lg }]}>
          <Text style={{ fontSize: 32 }}>✅</Text>
          <Text style={[styles.sub, { color: subtextColor, marginTop: 8 }]}>Todo está saldado</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.captionMed, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  card: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nombre: { ...typography.bodyMed },
  sub: { ...typography.caption, marginTop: 2 },
  neto: { ...typography.bodyBold, fontSize: 18 },
  barBg: { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  bar: { height: 6, borderRadius: 4 },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  barLeg: { fontSize: 9 },
  transCard: {
    borderRadius: 12, padding: 10, marginBottom: 5,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  transInfo: { flex: 1 },
  transNames: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  transSub: { fontSize: 10 },
  amountPill: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  amountText: { fontSize: 13, fontWeight: '800', color: '#818CF8' },
});
```

- [ ] **Step 2: Verify visually**

In the running Expo app, switch to the Balance tab of a viaje that has gastos. Verify:

- Each participant card has a visible (subtle) border
- Subtitle shows "Pagó $X total" (not "Pagó por otros: $X")
- Progress bar fills proportionally — the participant who paid the most has a full bar, others are proportional
- Below each bar: "$0" on the left, max amount on the right
- Bar color matches the participant's avatar color
- "CÓMO LIQUIDAR" section: each row shows deudor avatar + "Nombre → Nombre" + acreedor avatar + violet pill with amount
- "Todo está saldado" card shows when liquidacion is empty
- Light mode: card backgrounds are white, borders barely visible
- Dark mode: card backgrounds are `#1E293B`, borders subtle white

- [ ] **Step 3: Commit**

```bash
git add src/components/viajes/ViajeBalanceTab.jsx
git commit -m "feat: improve ViajeBalanceTab with card borders, bar legend, pill amounts"
```
