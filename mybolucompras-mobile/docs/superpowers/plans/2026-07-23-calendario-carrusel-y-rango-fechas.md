# Calendario Carrusel y Rango de Fechas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat day-strip in the trip calendar tab into a real carousel (centered day enlarged, side days shrunk/dimmed, tap-to-center, distinct color for "today" vs. "selected other day"), and surface each trip's date range (`fechaDesde` - `fechaHasta`) on the "Mis Viajes" card and on the trip detail header.

**Architecture:** Pure React Native + the built-in `Animated` API (no new dependencies). A shared date-range formatter is added to the existing `utils/formatters.js` and reused by two presentational components; the carousel is a self-contained rewrite of the day-strip inside `ViajeCalendarioTab.jsx`, using `Animated.ScrollView` with `snapToInterval` and per-item `scale`/`opacity` interpolation driven by scroll position.

**Tech Stack:** React Native, `react-native` `Animated` API, `@expo/vector-icons` (Ionicons), existing `theme.js` design tokens.

## Global Constraints

- No new npm dependencies (no `reanimated`, no carousel library) — spec explicitly rules this out.
- Reuse `parseISODate`/`toISODate` from `src/utils/formatters.js`; don't reimplement ISO date parsing.
- Project has no automated test suite (no Jest/RNTL configured) — every task ends with a manual verification step in the running app instead of an automated test run.
- Date formatting stays in Spanish (`es-AR` locale), consistent with existing `dateLabel` formatting already in `ViajeCalendarioTab.jsx`.
- Preserve dark/light theming via existing `colors`/`dark` prop conventions — every new piece of text/background must branch on `dark` like the surrounding code already does.

---

## File Structure

- Modify: `src/utils/formatters.js` — add `formatRangoFechas(fechaDesde, fechaHasta)`.
- Modify: `src/components/viajes/ViajeCard.jsx` — render the trip's date range under the participants line.
- Modify: `src/screens/ViajeDetailScreen.jsx` — render the trip's date range in the header, under the status badge.
- Modify: `src/components/viajes/ViajeCalendarioTab.jsx` — replace the flat day-strip `ScrollView` with an animated, centered carousel.

---

### Task 1: `formatRangoFechas` helper

**Files:**
- Modify: `src/utils/formatters.js`

**Interfaces:**
- Consumes: `parseISODate(iso: string) => Date` (already defined in this file).
- Produces: `formatRangoFechas(fechaDesde: string | null | undefined, fechaHasta: string | null | undefined) => string | null` — used by Task 2 and Task 3.

- [ ] **Step 1: Add the helper function**

Open `src/utils/formatters.js` and add this function after `parseISODate` (which ends around line 30):

```js
export function formatRangoFechas(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return null;
  const start = parseISODate(fechaDesde);
  const end = parseISODate(fechaHasta);
  const currentYear = new Date().getFullYear();
  const crossesYear = start.getFullYear() !== currentYear || end.getFullYear() !== currentYear;
  const opts = crossesYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' };
  const startLabel = start.toLocaleDateString('es-AR', opts);
  const endLabel = end.toLocaleDateString('es-AR', opts);
  return `${startLabel} - ${endLabel}`;
}
```

- [ ] **Step 2: Manual verification**

Run: `node -e "const {formatRangoFechas} = require('./src/utils/formatters.js'); console.log(formatRangoFechas('2026-07-12','2026-07-18')); console.log(formatRangoFechas(null, '2026-07-18')); console.log(formatRangoFechas('2026-12-30','2027-01-03'));"`

This will fail directly with `require` because the file uses ES module `export`, so instead verify by temporarily adding a `console.log(formatRangoFechas('2026-07-12', '2026-07-18'));` at the bottom of the file, running the app (`npx expo start`), checking the Metro log output once any screen that imports `formatters.js` mounts, then removing the temporary `console.log`.

Expected output for the three cases above: `"12 jul - 18 jul"`, `null`, `"30 dic 2026 - 3 ene 2027"` (exact month abbreviation punctuation depends on the JS engine's ICU data, e.g. `"jul."` vs `"jul"` — either is acceptable, just confirm it's not `undefined`/`Invalid Date`).

- [ ] **Step 3: Commit**

```bash
git add src/utils/formatters.js
git commit -m "feat: add formatRangoFechas date-range helper"
```

---

### Task 2: Date range on the "Mis Viajes" card

**Files:**
- Modify: `src/components/viajes/ViajeCard.jsx`

**Interfaces:**
- Consumes: `formatRangoFechas` from Task 1 (`src/utils/formatters.js`); `viaje.fechaDesde` / `viaje.fechaHasta` (already present on the `viaje` object used elsewhere in this file, e.g. `ViajeCalendarioTab.jsx` reads the same fields).

- [ ] **Step 1: Import the helper and compute the label**

In `src/components/viajes/ViajeCard.jsx`, change the import line:

```js
import { colors, spacing, radius, typography } from '../../constants/theme';
```

to:

```js
import { colors, spacing, radius, typography } from '../../constants/theme';
import { formatRangoFechas } from '../../utils/formatters';
```

Then inside `ViajeCard`, right after the existing `const checklistDone = ...` line, add:

```js
const rangoFechas = formatRangoFechas(viaje.fechaDesde, viaje.fechaHasta);
```

- [ ] **Step 2: Render the line under participants**

Find this block:

```jsx
        <View style={{ flex: 1 }}>
          <Text style={titulo(dark)}>{viaje.titulo}</Text>
          <Text style={participantes(dark)}>
            {viaje.participantes.map(p => p.nombre.split(' ')[0]).join(', ')}
          </Text>
        </View>
```

Replace it with:

```jsx
        <View style={{ flex: 1 }}>
          <Text style={titulo(dark)}>{viaje.titulo}</Text>
          <Text style={participantes(dark)}>
            {viaje.participantes.map(p => p.nombre.split(' ')[0]).join(', ')}
          </Text>
          {!!rangoFechas && (
            <Text style={fechas(dark)}>📅 {rangoFechas}</Text>
          )}
        </View>
```

- [ ] **Step 3: Add the `fechas` style**

Find the `participantes` style definition:

```js
const participantes = dark => ({ ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 });
```

Add right after it:

```js
const fechas = dark => ({ ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 });
```

- [ ] **Step 4: Manual verification**

Run the app (`npx expo start`), open "Mis Viajes". For a trip that has `fechaDesde`/`fechaHasta` set, confirm a line like `📅 12 jul - 18 jul` appears under the participant names, in both light and dark mode. For a trip with no dates loaded (if any exists, or temporarily via the "Cargar fechas" flow), confirm no extra line/blank space appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/viajes/ViajeCard.jsx
git commit -m "feat: show trip date range on Mis Viajes card"
```

---

### Task 3: Date range on the trip detail header

**Files:**
- Modify: `src/screens/ViajeDetailScreen.jsx`

**Interfaces:**
- Consumes: `formatRangoFechas` from Task 1.

- [ ] **Step 1: Import the helper**

Change:

```js
import { formatMontoEuropeo } from '../utils/formatters';
```

to:

```js
import { formatMontoEuropeo, formatRangoFechas } from '../utils/formatters';
```

- [ ] **Step 2: Compute the label after the `viaje` null-check**

Find:

```js
  if (!viaje) return null;

  const visibleParticipants = viaje.participantes.slice(0, MAX_AVATARS);
```

Replace with:

```js
  if (!viaje) return null;

  const rangoFechas = formatRangoFechas(viaje.fechaDesde, viaje.fechaHasta);
  const visibleParticipants = viaje.participantes.slice(0, MAX_AVATARS);
```

- [ ] **Step 3: Render it between the title row and the avatars row**

Find:

```jsx
      <View style={styles.avatarsRow}>
```

Replace with:

```jsx
      {!!rangoFechas && (
        <View style={styles.fechaRow}>
          <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.75)" />
          <Text style={styles.fechaText}>{rangoFechas}</Text>
        </View>
      )}

      <View style={styles.avatarsRow}>
```

- [ ] **Step 4: Add the new styles**

Find the `avatarsRow` style:

```js
  avatarsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
```

Add right before it:

```js
  fechaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  fechaText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  avatarsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
```

- [ ] **Step 5: Manual verification**

Open a trip with dates loaded, confirm a `📅 12 jul - 18 jul`-style line appears below the Activo/Archivado badge and above the participant avatars, readable both over the image background and over the gradient background (test a trip with and without `imagenUrl`). Open a trip with no dates loaded and confirm nothing renders in that spot (no gap collapse issues).

- [ ] **Step 6: Commit**

```bash
git add src/screens/ViajeDetailScreen.jsx
git commit -m "feat: show trip date range on trip detail header"
```

---

### Task 4: Carousel day-strip in the calendar tab

**Files:**
- Modify: `src/components/viajes/ViajeCalendarioTab.jsx`

**Interfaces:**
- Consumes: `dias` array (already computed by `computeDias`, each item `{ n, iso, label, dateLabel }`); `selectedIso` / `setSelectedIso` state (already defined); `todayIso` (already defined); `colors`, `spacing`, `radius` from `../../constants/theme`.
- Produces: no new exports — this is a self-contained internal rewrite. `selectedIso` continues to be the single source of truth consumed by `actividadesDelDia` further down in the same file (unchanged).

- [ ] **Step 1: Add imports and module-level constants**

Change the top imports:

```js
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
```

to:

```js
import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
  Animated, useWindowDimensions,
} from 'react-native';
```

Then, right after the `computeDias` function definition (before `sortActividades`), add:

```js
const CHIP_WIDTH = 68;
const CHIP_GAP = spacing.sm;
const ITEM_WIDTH = CHIP_WIDTH + CHIP_GAP;
```

- [ ] **Step 2: Add carousel state/refs and helpers inside the component**

Find, inside `ViajeCalendarioTab`:

```js
  const esCreador = viaje.createdBy === user?.id;
  const activo = viaje.estado === 'activo';
  const dias = useMemo(() => computeDias(viaje.fechaDesde, viaje.fechaHasta), [viaje.fechaDesde, viaje.fechaHasta]);
  const todayIso = toISODate(new Date());
  const [selectedIso, setSelectedIso] = useState(() => {
    if (dias.some(d => d.iso === todayIso)) return todayIso;
    return dias[0]?.iso ?? null;
  });
```

Replace with:

```js
  const esCreador = viaje.createdBy === user?.id;
  const activo = viaje.estado === 'activo';
  const dias = useMemo(() => computeDias(viaje.fechaDesde, viaje.fechaHasta), [viaje.fechaDesde, viaje.fechaHasta]);
  const todayIso = toISODate(new Date());
  const [selectedIso, setSelectedIso] = useState(() => {
    if (dias.some(d => d.iso === todayIso)) return todayIso;
    return dias[0]?.iso ?? null;
  });

  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const selectedOtherBg = dark ? '#334155' : '#475569';
  const sidePadding = (windowWidth - CHIP_WIDTH) / 2;

  const initialIndex = useMemo(() => {
    const idx = dias.findIndex(d => d.iso === todayIso);
    return idx >= 0 ? idx : 0;
  }, [dias, todayIso]);

  const handleMomentumScrollEnd = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.min(Math.max(Math.round(offsetX / ITEM_WIDTH), 0), dias.length - 1);
    setSelectedIso(dias[idx].iso);
  };

  const scrollToIndex = (index) => {
    scrollRef.current?.scrollTo({ x: index * ITEM_WIDTH, animated: true });
  };
```

- [ ] **Step 3: Replace the day-strip JSX**

Find:

```jsx
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diasStrip} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
        {dias.map(dia => {
          const active = dia.iso === selectedIso;
          return (
            <TouchableOpacity
              key={dia.iso}
              style={[styles.diaChip, { backgroundColor: active ? colors.primary : surfaceBg }]}
              onPress={() => setSelectedIso(dia.iso)}
              activeOpacity={0.7}
            >
              <Text style={[styles.diaChipLabel, { color: active ? '#fff' : textColor }]}>{dia.label}</Text>
              <Text style={[styles.diaChipDate, { color: active ? 'rgba(255,255,255,0.8)' : subtextColor }]}>{dia.dateLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
```

Replace with:

```jsx
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.diasStrip}
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentOffset={{ x: initialIndex * ITEM_WIDTH, y: 0 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {dias.map((dia, index) => {
          const isToday = dia.iso === todayIso;
          const isSelected = dia.iso === selectedIso;
          const chipBg = isSelected ? (isToday ? colors.primary : selectedOtherBg) : surfaceBg;
          const chipTextColor = isSelected ? '#fff' : textColor;
          const chipSubTextColor = isSelected ? 'rgba(255,255,255,0.8)' : subtextColor;

          const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];
          const scale = scrollX.interpolate({ inputRange, outputRange: [0.82, 1, 0.82], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' });

          return (
            <View key={dia.iso} style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
              <Animated.View style={{ transform: [{ scale }], opacity }}>
                <TouchableOpacity
                  style={[styles.diaChip, { width: CHIP_WIDTH, backgroundColor: chipBg }]}
                  onPress={() => scrollToIndex(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.diaChipLabel, { color: chipTextColor }]}>{dia.label}</Text>
                  <Text style={[styles.diaChipDate, { color: chipSubTextColor }]}>{dia.dateLabel}</Text>
                  {isToday && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>
```

- [ ] **Step 4: Update the `diaChip` style and add `todayDot`**

Find:

```js
  diaChip: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, alignItems: 'center' },
```

Replace with:

```js
  diaChip: { borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  todayDot: { position: 'absolute', bottom: 6, width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary },
```

- [ ] **Step 5: Manual verification**

Run the app, open a trip with several days loaded, go to the "📅 Calendario" tab, and confirm:
1. On mount, today's chip (if within the trip range) starts centered, colored with the app's primary color, at full size/opacity; the neighboring days are visibly smaller and dimmer.
2. Swiping left/right smoothly scales/fades chips as they move toward/away from the center, and releasing the swipe snaps a day to the center.
3. Tapping a side chip animates it to the center; once settled, if it's not today it turns the neutral gray color (not the primary brand color), and the itinerary list below updates to that day's activities.
4. If you scroll away from today, today's chip (now off-center) shows the small dot indicator.
5. Repeat in dark mode and confirm colors/contrast look correct.
6. Confirm the first and last day of the trip can still be centered (don't get stuck against the screen edge).

- [ ] **Step 6: Commit**

```bash
git add src/components/viajes/ViajeCalendarioTab.jsx
git commit -m "feat: turn trip calendar day-strip into a centered carousel"
```
