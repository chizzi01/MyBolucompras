# Diseño: Navegación de vuelta en la sección Viajes

**Fecha:** 2026-05-28  
**Estado:** Aprobado

## Problema

Las pantallas de la sección Viajes (`ViajesScreen` y `ViajeDetailScreen`) viven en el `AuthStack` como hermanas del `TabNavigator`, por lo que el bottom tab bar desaparece al navegar a ellas. `ViajesScreen` no tiene ningún affordance para volver a las tabs principales, y `ViajeDetailScreen` solo permite volver a `ViajesScreen` pero no ir directamente a Inicio.

## Decisiones de diseño

### Arquitectura de navegación

Se mantiene la estructura actual: Viajes como stack separado por encima del TabNavigator (opción B). No se mueve Viajes al tab navigator ni se anida dentro de Gastos. Mínimo cambio estructural, conserva la sensación de "modo viaje" separado.

### Cambio 1 — ViajesScreen: agregar "← Inicio" en el header

El header actual muestra el título a la izquierda y "+ Nuevo" a la derecha. Se reestructura para:

- **Izquierda:** botón "← Inicio" (ícono `arrow-back` + texto "Inicio") — mismo estilo visual que el "← Mis Viajes" de ViajeDetailScreen
- **Centro:** título "Mis Viajes ✈️" + subtítulo de conteo
- **Derecha:** botón "+ Nuevo" (sin cambios)

**Acción al tocar "← Inicio":** `navigation.navigate('Tabs')` — navega al TabNavigator independientemente del historial de stack.

### Cambio 2 — ViajeDetailScreen: agregar ícono 🏠 en el header

El header actual tiene "← Mis Viajes" a la izquierda y ⋯ a la derecha. Se agrega un ícono de casa (Ionicons `home-outline`) entre el espacio disponible y el ⋯:

- **Izquierda:** "← Mis Viajes" (sin cambios, `navigation.goBack()`)
- **Derecha:** `home-outline` (nuevo) + ⋯ opciones (sin cambios)

**Acción al tocar 🏠:** `navigation.navigate('Tabs')` — atajo directo a Inicio sin pasar por ViajesScreen.

## Flujos resultantes

```
Tabs → Viajes         → [← Inicio] → Tabs
Tabs → Viajes → Detail → [← Mis Viajes] → Viajes → [← Inicio] → Tabs
Tabs → Viajes → Detail → [🏠]           → Tabs  (atajo directo)
```

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/screens/ViajesScreen.jsx` | Reestructurar header: centrar título, agregar botón "← Inicio" a la izquierda |
| `src/screens/ViajeDetailScreen.jsx` | Agregar ícono `home-outline` en `headerTop`, junto al botón de opciones |

## Lo que NO cambia

- Estructura del `AuthStack` y `TabNavigator` en `App.js`
- Comportamiento del botón "← Mis Viajes" en `ViajeDetailScreen`
- Botón "+ Nuevo" en `ViajesScreen`
- Botón ⋯ (opciones) en `ViajeDetailScreen`
- Ningún otro screen ni navigator
