# Diseño: Toggle de viaje en Case 0 (AgregarScreen)

## Contexto

En `AgregarScreen`, cuando el usuario abre la pantalla desde el FAB dentro de un viaje activo (`routeViajeId` presente), el banner del viaje estaba bloqueado en modo ON — sin posibilidad de desactivarlo. El gasto siempre se registraba como gasto del viaje con división entre participantes.

## Objetivo

Permitir que el usuario desactive el viaje desde el banner, convirtiendo el gasto en personal (fuera de la lógica del viaje), con navegación adecuada al guardar.

## Comportamiento por caso

| Case | Condición | Comportamiento |
|------|-----------|---------------|
| 0 | `routeViajeId` presente | Banner con toggle ON/OFF (nuevo) |
| 1 | 1 viaje activo, sin `routeViajeId` | Banner con toggle ON/OFF (existente) |
| 2 | 2+ viajes activos, sin `routeViajeId` | Radio buttons con opción "Sin viaje" (existente) |

## Cambios en AgregarScreen.jsx

### Cambio 1 — Banner Case 0

Agregar el mismo toggle ON/OFF del Case 1 al banner del Case 0.

**Antes:** Banner estático, sin interacción posible.

**Después:** Banner con toggle pill a la derecha. Al tocarlo:
- `viajeToggleOn` → `false`
- `selectedViajeId` → `null`

Efectos automáticos (ya implementados en condiciones existentes):
- `SplitPanel` desaparece (`selectedViaje && viajeToggleOn` → false)
- Sección "Compartir gasto" aparece (`!(selectedViaje && viajeToggleOn)` → true)

### Cambio 2 — Navegación al guardar

```js
// Antes:
onClose: () => routeViajeId ? navigation.goBack() : navigation.navigate('Gastos')

// Después:
onClose: () => (routeViajeId && viajeToggleOn) ? navigation.goBack() : navigation.navigate('Gastos')
```

- Toggle ON → vuelve a la pantalla del viaje
- Toggle OFF → navega a GastosScreen

## Archivos a modificar

- `src/screens/AgregarScreen.jsx` — 2 cambios puntuales (banner Case 0 + navegación)

## Estado nuevo requerido

Ninguno. Se reutiliza `viajeToggleOn` y `selectedViajeId` existentes.
