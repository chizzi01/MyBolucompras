# ViajeDetailScreen UI Redesign — Design Spec

**Date:** 2026-05-28  
**Status:** Approved

---

## Overview

Redesign `ViajeDetailScreen` to a more professional look: compact header (Design C with avatar stack), improved `ViajeGastosTab` with date separators and better visual hierarchy, and improved `ViajeBalanceTab` with gradient bars and pill-styled liquidation amounts.

---

## Scope

Three components are modified. The `ViajeNotasTab` is **not** touched.

| File | Change |
|---|---|
| `src/screens/ViajeDetailScreen.jsx` | Header redesign (Design C + avatares) |
| `src/components/viajes/ViajeGastosTab.jsx` | Date separators, card borders, meta dot, ppp violet, FAB glow |
| `src/components/viajes/ViajeBalanceTab.jsx` | Gradient bars, subtitle, pill amount in liquidation |

---

## 1. Header — Design C with Avatar Stack

### Layout (top to bottom)
```
paddingTop: insets.top + 12
paddingHorizontal: 16
paddingBottom: 0

┌─────────────────────────────────────┐
│ ← Mis Viajes        [🏠] [···]      │  ← top-bar row
├─────────────────────────────────────┤
│ [🏖️]  Cancún 2025   ● Activo        │  ← title-row (emoji box + title + badge inline)
│      [A][M][C][J]                   │  ← avatar stack row
│  ┌─────────────┐ ┌──────────────┐   │
│  │ Total       │ │ Por persona  │   │  ← 2 stat cards
│  │ $48.200     │ │ $12.050      │   │
│  │ 12 gastos   │ │ 4 personas   │   │
│  └─────────────┘ └──────────────┘   │
│  [💸 Gastos] [⚖️ Balance] [✅ Notas] │  ← segmented tab bar
└─────────────────────────────────────┘
```

### Requires `useSafeAreaInsets`

```jsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// inside component:
const insets = useSafeAreaInsets();
// applied:
style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 0 }}
```

Remove `SafeAreaView` wrapper (replace with plain `View`) — insets are handled manually on the header, and `edges={['bottom']}` is no longer needed for the outer container. Keep `edges={['bottom']}` on the outer View only if needed by a tab or sheet; test carefully.

Actually: keep `SafeAreaView edges={['bottom']}` on the outer container for bottom safe area on the tab content and sheet. The top is handled by `paddingTop: insets.top + 12` on the header itself.

### Icon buttons (home + options)

Replace bare `TouchableOpacity` icons with 30×30 frosted glass circles:

```js
optionsBtn: {
  width: 30, height: 30, borderRadius: 15,
  backgroundColor: 'rgba(255,255,255,0.15)',
  borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  alignItems: 'center', justifyContent: 'center',
}
```

Both `home-outline` and `ellipsis-horizontal` use size 18 (down from 22) to fit.

### Emoji box

```js
emojiBox: {
  width: 46, height: 46, borderRadius: 14,
  backgroundColor: 'rgba(255,255,255,0.18)',
  borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  alignItems: 'center', justifyContent: 'center',
}
// emoji fontSize: 24
```

### Title row

Horizontal row: `[emojiBox]  [titleBlock flex:1]  [badge]`

```js
titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }
titleBlock: { flex: 1 }
viajeTitulo: { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 2 }
```

Badge inline (no separate row):

```js
badge: {
  flexDirection: 'row', alignItems: 'center', gap: 3,
  backgroundColor: activo ? 'rgba(16,185,129,0.22)' : 'rgba(100,116,139,0.22)',
  borderWidth: 1, borderColor: activo ? 'rgba(16,185,129,0.35)' : 'rgba(100,116,139,0.35)',
  borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  alignSelf: 'flex-start',
}
badgeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: activo ? '#10B981' : '#64748B' }
badgeText: { fontSize: 9, color: activo ? '#6EE7B7' : '#CBD5E1', fontWeight: '700' }
```

### Avatar stack

Stacked circles, each offset -7px to the left (except first):

```js
avatarsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 }
av: {
  width: 26, height: 26, borderRadius: 13,
  borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  alignItems: 'center', justifyContent: 'center',
  marginLeft: -7,
}
// First avatar has marginLeft: 0 (applied via index check)
avText: { fontSize: 10, fontWeight: '800', color: '#fff' }
```

Use `PARTICIPANT_COLORS` (already in the file) to color each avatar.  
Limit display to first 4 participants. If `viaje.participantes.length > 4`, show 3 avatars then a "+N" overflow circle (`backgroundColor: 'rgba(255,255,255,0.2)'`).

### Stat cards

```js
statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 }
statCard: {
  flex: 1, backgroundColor: 'rgba(255,255,255,0.13)',
  borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  borderRadius: 12, padding: 9,  // paddingHorizontal: 11
}
statLabel: { fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }
statVal: { fontSize: 16, color: '#fff', fontWeight: '800', marginBottom: 2 }
statSub: { fontSize: 8, color: 'rgba(255,255,255,0.5)' }
```

Card 1: label="TOTAL", val=`$${totalGastado.toFixed(0)}`, sub=`${gastos.length} gastos`  
Card 2: label="POR PERSONA", val=`$${porPersona}`, sub=`${viaje.participantes.length} personas`  
`porPersona = viaje.participantes.length > 0 ? (totalGastado / viaje.participantes.length).toFixed(0) : '0'`

### Tab bar (segmented)

```js
segmented: {
  flexDirection: 'row',
  backgroundColor: 'rgba(0,0,0,0.25)',
  borderRadius: 11, padding: 3, gap: 3,
}
segTab: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center' }
segTabActive: { backgroundColor: '#fff' }
segTabText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' }
segTabTextActive: { color: colors.primary, fontWeight: '800' }
```

### DRY fix: render inner header content once

Extract the inner header JSX (top-bar + title-row + avatars + stats + tabs) into a single inline block shared by both `ImageBackground` and `LinearGradient` branches:

```jsx
const headerContent = (
  <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 0 }}>
    {/* top-bar, title-row, avatars, stats, tabs */}
  </View>
);

return (
  <SafeAreaView edges={['bottom']} style={...}>
    {viaje.imagenUrl ? (
      <ImageBackground source={{ uri: viaje.imagenUrl }} style={styles.headerBg} resizeMode="cover">
        <LinearGradient colors={['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFill} />
        {headerContent}
      </ImageBackground>
    ) : (
      <LinearGradient colors={['#6366F1', '#4338CA']} style={styles.headerBg}>
        {headerContent}
      </LinearGradient>
    )}
    {/* tabs content */}
  </SafeAreaView>
);
```

`styles.headerBg` has no padding (padding is on `headerContent` View directly).

---

## 2. ViajeGastosTab — Improvements

### Date separators

Group `gastos` by date before rendering. Show a date separator row above each group.

```js
function formatDateSep(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return 'Hoy';
  if (isSameDay(d, yesterday)) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
```

Group gastos by `g.fecha` (date portion, e.g. `"2025-12-15"`). `viajeGastosService` already maps `row.gastos?.fecha` → `fecha` on each gasto, so the field is available. Flatten into a list of `{ type: 'sep', label }` or `{ type: 'gasto', ...g }` items. Pass this flat list to a single `FlatList`.

### Item card changes

```js
gastoCard: {
  backgroundColor: dark ? colors.surface.dark : colors.surface.light,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
  padding: 10,
  flexDirection: 'row', alignItems: 'center', gap: 8,
  marginBottom: 5,
}
```

Avatar shape: rounded square (borderRadius: 10) instead of circle.

```js
gastoAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }
```

Meta line: `"Agus · ÷ 4 personas"` using a dot separator View:

```jsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
  <Text style={styles.metaName}>{pagadorNombre}</Text>
  <View style={styles.metaDot} />
  <Text style={styles.metaDiv}>{divisor}</Text>
</View>
```

```js
metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: dark ? '#334155' : '#CBD5E1' }
metaName: { fontSize: 11, color: dark ? '#64748B' : '#94A3B8' }
metaDiv:  { fontSize: 11, color: dark ? '#64748B' : '#94A3B8' }
```

`divisor` logic (same as current but readable):
- If `g.divisores.length === viaje.participantes.length` → `÷ ${g.divisores.length} personas`
- Else if `g.divisores.length === 1` → `solo él/ella`
- Else → `÷ ${g.divisores.length} personas`

Monto: `fontSize: 14, fontWeight: '800'`.

PPP (precio por persona) — change color to violet:

```js
gastoPpp: { fontSize: 11, color: colors.primary, fontWeight: '600' }
```

Only show PPP if `g.divisores.length > 1`.

### FAB

```js
fab: {
  ...existing position/size...
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.45,
  shadowRadius: 10,
  elevation: 8,
}
```

Label: "Agregar gasto" (shorter, no "al viaje").

### Date separator style

```js
dateSep: {
  fontSize: 11, color: dark ? '#475569' : '#94A3B8',
  fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
  marginTop: 12, marginBottom: 4,
}
```

---

## 3. ViajeBalanceTab — Improvements

### "Cuánto puso cada uno" section

Card style update (subtle border, larger radius):

```js
balCard: {
  backgroundColor: dark ? colors.surface.dark : colors.surface.light,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
  padding: 10, marginBottom: 6,
}
```

Row: avatar (24px circle) + name + "Pagó $X total" subtitle:

```jsx
<View style={{ flex: 1 }}>
  <Text style={styles.balNombre}>{nombre}</Text>
  <Text style={styles.balSub}>Pagó ${totalPagado} total</Text>
</View>
```

```js
balNombre: { fontSize: 13, fontWeight: '700', color: dark ? colors.text.dark : colors.text.light }
balSub: { fontSize: 10, color: dark ? colors.textSecondary.dark : colors.textSecondary.light }
```

Progress bar: height 6px, color per participant (`participantColor(p.userId)`):

```js
barBg: { height: 6, borderRadius: 4, backgroundColor: dark ? '#263347' : '#E2E8F0', overflow: 'hidden', marginBottom: 4 }
barFill: { height: 6, borderRadius: 4 }  // backgroundColor: participantColor(p.userId)
```

Add a small legend below bar:

```jsx
<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
  <Text style={styles.barLeg}>$0</Text>
  <Text style={styles.barLeg}>${maxPagado}</Text>
</View>
```

```js
barLeg: { fontSize: 9, color: dark ? '#475569' : '#94A3B8' }
```

`maxPagado` = max across all participants of their total pagado.

Neto value styling unchanged (`color: neto >= 0 ? colors.accent : colors.error`).

### "Cómo liquidar" section

Transaction row: replace plain text layout with a card + pill amount:

```js
transCard: {
  backgroundColor: dark ? colors.surface.dark : colors.surface.light,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
  padding: 10, marginBottom: 5,
  flexDirection: 'row', alignItems: 'center', gap: 6,
}
transInfo: { flex: 1 }
transNames: { fontSize: 12, fontWeight: '600', color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 }
transSub: { fontSize: 10, color: dark ? colors.textSecondary.dark : colors.textSecondary.light }
transAmountPill: {
  backgroundColor: 'rgba(99,102,241,0.12)',
  borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
  borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
}
transAmountText: { fontSize: 13, fontWeight: '800', color: '#818CF8' }
```

Layout:

Keep both avatars (current implementation has `de` and `hacia` avatars). Replace the inline `transMonto` text with a pill:

```jsx
<View style={styles.transCard}>
  <View style={[styles.avatar, { backgroundColor: participantColor(t.de) }]}>
    <Text style={styles.avatarText}>{t.deNombre[0]?.toUpperCase()}</Text>
  </View>
  <View style={styles.transInfo}>
    <Text style={styles.transNames}>{t.deNombre} → {t.haciaNombre}</Text>
    <Text style={styles.transSub}>debe transferir</Text>
  </View>
  <View style={[styles.avatar, { backgroundColor: participantColor(t.hacia) }]}>
    <Text style={styles.avatarText}>{t.haciaNombre[0]?.toUpperCase()}</Text>
  </View>
  <View style={styles.transAmountPill}>
    <Text style={styles.transAmountText}>${t.monto.toFixed(0)}</Text>
  </View>
</View>
```

---

## Out of Scope

- ViajeNotasTab — no changes
- ViajeOpcionesSheet — no changes
- Backend/queries — no changes
- Navigation — no changes

---

## Testing Criteria

1. Header renders correctly with and without `viaje.imagenUrl`
2. Safe area padding looks correct on notched devices (paddingTop = insets.top + 12)
3. Avatar stack: 4 participants shows 4 avatars; 6 participants shows 3 + "+2" overflow
4. Por persona stat shows $0 gracefully when no gastos
5. Gastos tab: gastos with same date share one separator; different dates get separate separators
6. Gastos tab: PPP row only shown when `divisores.length > 1`
7. Balance tab: progress bar fill matches participantColor; bar does not overflow
8. Balance tab: liquidation shows "$0" gracefully when no transfers needed
9. Dark mode: all new styles respect `dark` flag
10. No regression in tab switching, gasto creation flow, or opciones sheet
