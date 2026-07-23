# Diseño: Carrusel de días en calendario de viaje + rango de fechas visible

Fecha: 2026-07-23

## Contexto

En la pestaña "📅 Calendario" de un viaje (`ViajeCalendarioTab.jsx`), los días del viaje se muestran como una fila de chips en un `ScrollView` horizontal simple, todos con el mismo tamaño y estilo (activo = color primario, inactivo = fondo de superficie). No hay ningún efecto de foco/profundidad.

Además, en ningún lugar de la UI se ve de un vistazo el rango de fechas del viaje (`fechaDesde` / `fechaHasta`): ni en la card de la lista "Mis Viajes" (`ViajeCard.jsx`), ni en el header de `ViajeDetailScreen.jsx`.

## Objetivo

1. Rediseñar la fila de días como un carrusel: el día activo queda centrado y destacado, los días adyacentes se ven a los costados en tamaño menor y color apagado, dando sensación de profundidad tipo carrusel.
2. Al tocar un día lateral, ese día pasa a centrarse con una animación, y se distingue visualmente si es "hoy" o un día seleccionado distinto de hoy.
3. Mostrar el rango de fechas del viaje (`desde - hasta`) en la card de "Mis Viajes" y en el header de detalle del viaje.

## Parte 1 — Carrusel de días

### Componente afectado
`src/components/viajes/ViajeCalendarioTab.jsx`

### Comportamiento
- Se reemplaza el `ScrollView` horizontal actual por un `Animated.ScrollView` (API de `react-native`, sin nuevas dependencias) con:
  - `snapToInterval` igual al ancho de un chip + gap, para que el scroll libre (swipe) siempre termine con un día centrado.
  - Padding lateral (`contentContainerStyle` con `paddingHorizontal` calculado) para que el primer y último día del viaje también puedan llegar al centro de la pantalla.
  - `onScroll` con `Animated.event` para capturar `scrollX` sin bloquear el hilo de JS (`useNativeDriver` donde sea posible; el interpolado de `scale`/`opacity` puede usar el driver nativo).
- Cada chip interpola, en función de la distancia entre su posición y el centro actual del scroll:
  - `scale`: 1.0 en el centro, ~0.82 en los chips inmediatamente laterales.
  - `opacity`: 1.0 en el centro, ~0.45 en los laterales.
- Al tocar un chip que no está centrado, se llama `scrollViewRef.current.scrollTo({ x: <offset del día>, animated: true })` para centrarlo (no se cambia `selectedIso` hasta que el scroll termina, ver abajo).
- `onMomentumScrollEnd` calcula el índice del día más cercano al centro según el offset final y actualiza `selectedIso` a ese día — esta es la única fuente de verdad de "qué día está seleccionado", tanto para swipe libre como para tap.
- Estado visual del chip centrado:
  - Si el día centrado es "hoy" (`iso === todayIso`): fondo `colors.primary`, texto blanco (comportamiento actual).
  - Si el día centrado es un día distinto de hoy: fondo gris neutro oscuro (`#334155` en dark, `#475569` en light), texto blanco.
  - Chips no centrados: mantienen el fondo de superficie actual (`surfaceBg`) combinado con la opacidad interpolada; no llevan color de marca ni gris destacado, sólo se atenúan.
- El indicador de "hoy" cuando no está centrado (por ejemplo, mientras el usuario mira otro día) se conserva con un pequeño punto o borde de acento en el chip correspondiente, para no perder la referencia de qué día es hoy mientras se navega el carrusel.
- Al montar el componente, el scroll inicial se posiciona (sin animación) sobre `todayIso` si existe entre los días del viaje, o sobre el primer día en caso contrario — mismo criterio que hoy tiene `selectedIso` inicial.

### Fuera de alcance
- No se agrega ninguna librería de carrusel (`reanimated`, `react-native-reanimated-carousel`, etc.). Todo se implementa con `Animated` de `react-native`, ya disponible.
- No cambia la lógica de `computeDias`, `actividadesDelDia`, ni el resto de la pestaña (sección ITINERARIO, cards de actividad, modales).

## Parte 2 — Rango de fechas visible

### Helper compartido
Se agrega `formatRangoFechas(fechaDesde, fechaHasta)` en `src/utils/formatters.js`:
- Recibe fechas en formato ISO (`YYYY-MM-DD`), usa `parseISODate` (ya existente) y devuelve un string tipo `"12 jul - 18 jul"` usando `toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })` para cada extremo, separados por `" - "`.
- Si `fechaDesde` o `fechaHasta` no existen, devuelve `null` (el llamador decide no renderizar nada).
- Si ambas fechas caen en años distintos del año actual, se antepone el año a cada extremo (ej. `"30 dic 2026 - 3 ene 2027"`) para evitar ambigüedad. Si están en el año actual, no se muestra el año (comportamiento por defecto, igual al chip de día ya existente).

### `ViajeCard.jsx` (lista "Mis Viajes")
- Debajo de la fila de participantes (`participantes(dark)`), se agrega una línea nueva: `📅 {formatRangoFechas(viaje.fechaDesde, viaje.fechaHasta)}`, con estilo `typography.caption` y color secundario (mismo tono que participantes pero con `marginTop` propio).
- Sólo se renderiza si `formatRangoFechas` devuelve un valor no nulo (viajes sin fechas cargadas no muestran esta línea, igual que hoy no muestran nada al respecto).

### `ViajeDetailScreen.jsx` (header de detalle)
- Debajo del badge "Activo/Archivado" y antes de la fila de avatares, se agrega una línea con ícono `Ionicons name="calendar-outline"` + texto `formatRangoFechas(...)`, en color `rgba(255,255,255,0.75)` para verse bien tanto sobre imagen de fondo como sobre el gradiente `#6366F1 → #4338CA`.
- Sólo se renderiza si el viaje tiene ambas fechas cargadas.

## Testing / verificación
- No hay tests automatizados existentes para estos componentes (proyecto sin suite de tests para UI de viajes). La verificación es manual:
  - Abrir un viaje con fechas cargadas, ir a la pestaña Calendario, swipear el carrusel y tocar días laterales; confirmar centrado, escalado/opacidad, y diferenciación de color hoy vs. seleccionado.
  - Confirmar que el rango de fechas aparece correctamente en la card de "Mis Viajes" y en el header de detalle, y que no rompe el layout en viajes sin fechas cargadas (no debe mostrar la línea).
  - Probar en modo claro y oscuro.

## Riesgos conocidos
- El cálculo de offsets para centrar un día arbitrario (tap en lateral, o cualquier día del arreglo si hay muchos días) requiere conocer el ancho fijo del chip; se fija un ancho constante para los chips del carrusel (en vez de ancho variable) para simplificar el cálculo de `snapToInterval` y los `scrollTo` por índice.
