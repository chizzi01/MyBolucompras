# Viajes Navigation — Back to Inicio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar navegación de vuelta a Inicio en ViajesScreen (botón "← Inicio" en header) y en ViajeDetailScreen (ícono 🏠 junto al ⋯).

**Architecture:** Dos cambios quirúrgicos en los headers de las pantallas de viaje. Ambas acciones usan `navigation.navigate('Tabs')` para volver al TabNavigator. Sin cambios en App.js ni en el navigator.

**Tech Stack:** React Native, React Navigation v7, Ionicons (Expo), `useNavigation` hook.

---

## File Map

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `src/screens/ViajesScreen.jsx` | Modificar | Reestructurar header: agregar backBtn izquierda, centrar título |
| `src/screens/ViajeDetailScreen.jsx` | Modificar | Agregar ícono `home-outline` en `headerActions` junto a ⋯ |

---

## Task 1: ViajesScreen — agregar "← Inicio" en el header

**Files:**
- Modify: `src/screens/ViajesScreen.jsx`

### Contexto

El header actual tiene `flexDirection: 'row', justifyContent: 'space-between'` con el título alineado a la izquierda y "+ Nuevo" a la derecha. Hay que reestructurarlo en 3 columnas: [← Inicio] [título centrado] [+ Nuevo].

- [ ] **Step 1: Reemplazar el JSX del header en ViajesScreen**

En `src/screens/ViajesScreen.jsx`, reemplazá el bloque `<View style={styles.header}>...</View>` (líneas 52–67) con:

```jsx
<View style={styles.header}>
  <TouchableOpacity
    style={styles.backBtn}
    onPress={() => navigation.navigate('Tabs')}
    activeOpacity={0.7}
  >
    <Ionicons name="arrow-back" size={18} color={colors.primary} />
    <Text style={[styles.backBtnText, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
      Inicio
    </Text>
  </TouchableOpacity>

  <View style={styles.headerCenter}>
    <Text style={[styles.title, { color: dark ? colors.text.dark : colors.text.light }]}>
      Mis Viajes ✈️
    </Text>
    <Text style={[styles.subtitle, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
      {activos.length} activo{activos.length !== 1 ? 's' : ''} · {archivados.length} archivado{archivados.length !== 1 ? 's' : ''}
    </Text>
  </View>

  <TouchableOpacity
    style={styles.newBtn}
    onPress={() => setShowCrear(true)}
    activeOpacity={0.8}
  >
    <Ionicons name="add" size={18} color="#fff" />
    <Text style={styles.newBtnText}>Nuevo</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 2: Actualizar los estilos del header**

En `src/screens/ViajesScreen.jsx`, dentro del `StyleSheet.create({...})`, reemplazá la línea de `header:` y agregá los estilos nuevos:

```js
header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
},
backBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  minWidth: 72,
},
backBtnText: {
  fontSize: 14,
},
headerCenter: {
  flex: 1,
  alignItems: 'center',
},
```

> `title` y `subtitle` no cambian. `newBtn` y `newBtnText` no cambian.

- [ ] **Step 3: Verificar visualmente**

Corré la app (`npx expo start`) y navegá a Mis Viajes desde la pantalla de Gastos. Verificá:
- El header muestra "← Inicio" a la izquierda, "Mis Viajes ✈️" centrado, "+ Nuevo" a la derecha
- Tocar "← Inicio" vuelve al tab de Gastos (el tab activo antes de entrar a Viajes)
- El subtítulo de conteo aparece bajo el título centrado
- El botón "+ Nuevo" abre el modal de crear viaje (sin cambios)

- [ ] **Step 4: Commit**

```bash
git add src/screens/ViajesScreen.jsx
git commit -m "feat: add back-to-inicio button in ViajesScreen header"
```

---

## Task 2: ViajeDetailScreen — agregar ícono 🏠 junto al ⋯

**Files:**
- Modify: `src/screens/ViajeDetailScreen.jsx`

### Contexto

El `headerTop` actual tiene "← Mis Viajes" a la izquierda y un solo `TouchableOpacity` con ⋯ a la derecha. Hay que envolver los botones de la derecha en un `View` con `flexDirection: 'row'` y agregar el ícono `home-outline` antes del ⋯.

- [ ] **Step 1: Reemplazar headerTop en ViajeDetailScreen**

En `src/screens/ViajeDetailScreen.jsx`, reemplazá el bloque `<View style={styles.headerTop}>...</View>` (líneas 77–85) con:

```jsx
<View style={styles.headerTop}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
    <Ionicons name="arrow-back" size={20} color="#fff" />
    <Text style={styles.backText}>Mis Viajes</Text>
  </TouchableOpacity>
  <View style={styles.headerActions}>
    <TouchableOpacity onPress={() => navigation.navigate('Tabs')} style={styles.optionsBtn}>
      <Ionicons name="home-outline" size={22} color="#fff" />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setShowOpciones(true)} style={styles.optionsBtn}>
      <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
    </TouchableOpacity>
  </View>
</View>
```

- [ ] **Step 2: Agregar estilo `headerActions`**

En `src/screens/ViajeDetailScreen.jsx`, dentro del `StyleSheet.create({...})`, agregá después de `optionsBtn`:

```js
headerActions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
```

> `backBtn`, `backText`, `optionsBtn` no cambian.

- [ ] **Step 3: Verificar visualmente**

Navegá a cualquier viaje desde Mis Viajes. Verificá:
- El header del detalle muestra "← Mis Viajes" a la izquierda y los íconos 🏠 ⋯ a la derecha
- Tocar 🏠 va directamente al tab de Gastos (sin pasar por Mis Viajes)
- Tocar "← Mis Viajes" vuelve a ViajesScreen (comportamiento anterior sin cambios)
- Tocar ⋯ abre el sheet de opciones (sin cambios)

- [ ] **Step 4: Commit**

```bash
git add src/screens/ViajeDetailScreen.jsx
git commit -m "feat: add home shortcut icon in ViajeDetailScreen header"
```

---

## Self-review checklist

- [x] ViajesScreen: "← Inicio" → `navigate('Tabs')` ✓
- [x] ViajeDetailScreen: 🏠 → `navigate('Tabs')` ✓
- [x] ViajeDetailScreen: "← Mis Viajes" → `goBack()` sin cambios ✓
- [x] Estilos nuevos nombrados consistentemente (`backBtn`, `backBtnText`, `headerCenter`, `headerActions`)
- [x] `colors.primary` usado para el ícono de back en ViajesScreen (coincide con el color del ícono en `newBtn`)
- [x] Sin cambios en App.js ni en el navigator
