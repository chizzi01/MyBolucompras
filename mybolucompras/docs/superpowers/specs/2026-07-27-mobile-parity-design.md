# Paridad con mobile: fixes de fechas, rango de fechas de viaje, calendario, modo viaje y checklist personal

## Contexto

`mybolucompras` (desktop, Electron/React) y `mybolucompras-mobile` (Expo/React Native) comparten el mismo
proyecto de Supabase (`hmlcgwptszhqknyrmarf`). Mobile incorporó varias features nuevas en los últimos días
que no existen en desktop. Todas las migraciones de DB que esas features necesitan (`viajes.fecha_desde`/
`fecha_hasta`, tabla `viaje_actividades`, `viaje_checklist.tipo` + RLS, columnas `modo_viaje_*` en
`configuracion_usuario`) ya fueron aplicadas manualmente contra la base compartida — este trabajo es
puramente de capa de servicio + UI en desktop, sin migraciones nuevas.

Desktop usa React Context (`ViajesContext`, `DeudoresContext`, `DataContext`) con `useState`/`useEffect` y
actualizaciones optimistas manuales — no usa `@tanstack/react-query` como mobile. Todo lo que sigue debe
integrarse a ese patrón existente, no copiar la arquitectura de mobile.

## 1. Fix de fechas al marcar deudas pagadas

**Problema actual:** `deudoresService.marcarPagada` (`src/services/deudoresService.js:108`) actualiza las
filas recíprocas de `deudores`/`gastos` del otro usuario filtrando solo por `monto`/`precio`. Si hay dos
deudas compartidas con el mismo monto entre las mismas dos personas, puede marcar la incorrecta como pagada.

**Cambio:** agregar `.eq('fecha_deuda', fechaISO)` / `.eq('fecha', fechaISO)` a esas queries, normalizando
`deudaActual.fechaDeuda` a ISO si viene en formato `DD/MM/YYYY` (igual que el fix ya aplicado en mobile,
commit `28e8c31`).

**Problema actual 2:** no hay guarda para evitar marcar como pagada una deuda en cuotas de crédito cuya
compra fue posterior al cierre actual (todavía no "entra" en la facturación de este mes). Desktop ya tiene
`gastoEntraEsteMes`/`montoMensualDeuda` en `src/utils/cuotas.js`, usados en `useCalculations.js`, pero
`DeudoresContext.marcarPagada` no los usa.

**Cambio:** en `DeudoresContext.jsx`, `marcarPagada(id, deudaActual)` debe recibir `mydata` (vía `useData()`)
y rechazar (throw) si `gastoEntraEsteMes({ ...deudaActual, fecha: deudaActual.fechaDeuda }, mydata)` es
`false`. En `DeudoresPage.jsx`, ocultar/deshabilitar el botón "marcar pagada" (individual y "marcar todas")
para deudas que no entran este mes, igual que mobile hace en `DeudoresScreen.jsx`.

No hay flujo equivalente de "marcar gasto pagado con reciprocidad" del lado de gastos en desktop — no aplica
cambio ahí.

## 2. Rango de fechas de viaje + edición

**Cambios en servicio/contexto:**
- `viajesService.crear(titulo, emoji, participanteIds, fechaDesde, fechaHasta)`: insertar `fecha_desde`/
  `fecha_hasta` (nullable).
- `viajesService.editarViaje(id, campos)`: aceptar `fechaDesde`/`fechaHasta` en `campos` igual que ya acepta
  `titulo`/`emoji`/`imagenUrl`.
- `mapViaje`: exponer `fechaDesde`/`fechaHasta`.
- `ViajesContext.crear`/`editarViaje`: pasar los nuevos parámetros.

**UI:** `CrearViajeModal.jsx` ya soporta modo edición reutilizando el mismo componente (`isEdit = !!viaje`) —
no hace falta un `EditarViajeModal` separado como en mobile. Agregar dos campos `<input type="date">`
(Desde/Hasta, ambos opcionales) al formulario, con validación simple: si ambos están seteados, `hasta >=
desde`.

**Formato:** agregar `formatRangoFechas(fechaDesde, fechaHasta)` a `src/utils/formatters.js`, adaptado de
mobile (`mybolucompras-mobile/src/utils/formatters.js:32-44`) pero parseando fechas ISO directas (sin el
parser de mobile, no hace falta): retorna `null` si falta alguna fecha, y el label incluye el año solo si
alguna fecha no es del año actual.

**Display:** mostrar el rango (si existe) en la tarjeta de `ViajesPage.jsx` y en el header de
`ViajeDetallePage.jsx`, junto al título/emoji.

## 3. Tab Calendario de viaje

Nuevo tab `📅 Calendario` en `ViajeDetallePage.jsx` (agregar a la constante `TABS`).

**Servicio nuevo** `src/services/viajeActividadesService.js`, CRUD sobre `viaje_actividades`
(`viaje_id`, `fecha`, `hora`, `titulo`, `ubicacion`, `nota`, `created_by`), mismo esquema de columnas que
mobile usa contra la misma tabla.

**Componente nuevo** `TabCalendario` (dentro de `ViajeDetallePage.jsx`, siguiendo el patrón de los tabs
existentes: fetch local con `useState`/`useEffect`, sin React Query):
- Si el viaje no tiene `fechaDesde`/`fechaHasta`, mostrar estado vacío invitando al creador a setear fechas
  (editar viaje).
- Si tiene rango, generar la lista de días entre `fechaDesde` y `fechaHasta` inclusive.
- **Adaptación de UX respecto a mobile:** en vez del carrusel táctil centrado con swipe y rellenos de
  borde animados (gestos táctiles, no aplican a mouse/teclado), una tira horizontal de chips de día con
  scroll nativo del navegador + botones de flecha izquierda/derecha para desplazar. Un día queda
  seleccionado (resaltado); debajo se listan sus actividades ordenadas por `hora`.
- Modal `AgregarActividadModal.jsx` (nuevo, sigue el patrón visual de `ViajeGastoModal.jsx`): campos
  título, hora, ubicación, nota; guarda contra `viajeActividadesService`.
- Eliminar actividad: mismo patrón de confirmación que ya usa `TabGastos` (`window.confirm` + toast).

Estilos nuevos en `src/styles/viajes.css` para la tira de días y las filas de actividad.

## 4. Checklist General/Personal

**Servicio:** `viajeNotasService.js` — `getChecklist` debe mapear la columna `tipo` (`'general'|'personal'`,
default `'general'`); `agregarItem(viajeId, texto, userId, tipo = 'general')` debe insertarla.

**UI:** en la sección "Checklist" del tab Notas (`TabNotas` en `ViajeDetallePage.jsx`), agregar un toggle
General/Personal (dos botones simples, similar al switch Del Mes/Todas que ya existe en `GastosPage`),
filtrando `checklist` por `tipo`. Solo los ítems `general` muestran el texto "Esperando a: ..." (participantes
pendientes) y el nombre del autor debajo — los `personal` no, porque solo los ve/edita quien los creó (regla
ya aplicada por RLS en la base). El input de "agregar ítem" pasa el `tipo` del tab activo.

Las policies RLS ya están migradas en la base compartida (4 policies: select/insert/update/delete
distinguiendo general de personal) — no hay cambio de DB.

## 5. Modo Viaje

**Servicio:** `configuracionService.js` — mapear las columnas nuevas de `configuracion_usuario`:
`modoViajeActivo` (bool), `modoViajeViajeId` (uuid|null), `modoViajePromptedIds` (array de uuid) en
`mapFromDB`/`mapToDB`/`getDefaults`.

**Componentes nuevos:**
- `ModoViajeChecker.jsx`: montado dentro de `App.jsx` bajo el `<Router>` (para poder usar `useNavigate()`
  de react-router en vez del `navigationRef` de mobile). Al cambiar `mydata`/lista de viajes:
  - Si `modoViajeActivo` es true: buscar el viaje por `modoViajeViajeId`. Si no existe o su `fechaHasta` ya
    pasó (+1 día de gracia), desactivar (`actualizar({ modoViajeActivo: false, modoViajeViajeId: null })`) y
    no navegar. Si sigue vigente, hacer `navigate('/viajes/' + viajeId)` una sola vez (usar un `ref` para no
    re-navegar en cada render, igual que mobile usa `redirectedRef`).
  - Si `modoViajeActivo` es false: buscar viajes activos cuyo rango `fechaDesde`–`fechaHasta` incluya hoy y
    que no estén en `modoViajePromptedIds`. Si hay alguno (tomar el de `fechaDesde` más reciente si hay
    varios), mostrar `ModoViajeModal`.
- `ModoViajeModal.jsx`: modal de confirmación simple (siguiendo el patrón visual de `modal.css` existente,
  sin las animaciones custom de Reanimated de mobile) con un switch "Activar Modo Viaje" y botón Confirmar.
  Al confirmar, agrega el viaje a `modoViajePromptedIds` siempre, y si el switch está activado también
  setea `modoViajeActivo`/`modoViajeViajeId` y navega al detalle del viaje.

**UI de configuración:** `ConfiguracionPage.jsx` — agregar un toggle manual "Modo Viaje" (on/off) que
permite desactivarlo manualmente incluso fuera del flujo del modal, igual que mobile.

## Fuera de alcance

- Push notification diaria de resumen de viaje (mobile-only, depende de `pg_cron` + Expo push tokens — no
  aplica a Electron).
- Reporte mensual de gastos por IA (todavía en fase de spec/plan en mobile, no implementado — nada que
  portar aún).
- Cambios de versión Android / Google Play (`app.json`, API 36) — no aplican a Electron.
