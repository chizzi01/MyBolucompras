# Diseño: Resumen de gastos de viaje en Mis Gastos

**Fecha:** 2026-05-29  
**Estado:** Aprobado

---

## Resumen

Cambio de lógica en el manejo de gastos de viaje: los gastos individuales del viaje dejan de sincronizarse con "Mis Gastos" y "Deudas". Al cerrar el viaje, se genera automáticamente un único gasto en "Mis Gastos" por participante con su parte proporcional, con un estilo visual de pasaje de avión (boarding pass clásico).

---

## Contexto

**Comportamiento actual (a eliminar):**  
Cuando se agrega un gasto a un viaje (`viaje_gastos`), el sistema también crea un registro en la tabla `gastos` (Mis Gastos) y en deudas. Esto genera ruido en Mis Gastos durante el viaje activo.

**Comportamiento nuevo:**  
Los gastos de viaje son autocontenidos. Solo al cerrar el viaje se materializa un resumen en Mis Gastos.

---

## Modelo de datos

### Cambios en tabla `gastos`

Agregar dos campos opcionales:

| Campo        | Tipo   | Nullable | Descripción                        |
|-------------|--------|----------|------------------------------------|
| `viaje_id`  | UUID   | Sí       | FK a `viajes`. Identifica origen.  |
| `viaje_nombre` | text | Sí    | Nombre del viaje (desnormalizado). |

Cuando `viaje_id` is not null, GastoCard renderiza el estilo boarding pass.

### Nueva tabla `viaje_pagos`

Registra pagos parciales o totales entre participantes dentro de un viaje activo.

| Campo         | Tipo      | Descripción                          |
|--------------|-----------|--------------------------------------|
| `id`         | UUID PK   |                                      |
| `viaje_id`   | UUID FK   | FK a `viajes`                        |
| `pagador_id` | UUID FK   | Usuario que paga                     |
| `receptor_id`| UUID FK   | Usuario que recibe el pago           |
| `monto`      | numeric   | Monto del pago                       |
| `fecha`      | timestamp | Fecha del pago                       |

---

## Funcionalidades

### 1. Eliminar comportamiento actual

En `viajeGastosService.js`, eliminar toda lógica que al crear, editar o eliminar un gasto de viaje también crea/modifica registros en `gastos` o deudas. Los gastos de viaje quedan aislados en `viaje_gastos` únicamente.

### 2. Resumen al cerrar el viaje

Al cambiar el estado de un viaje a `cerrado`:

1. **Validación previa:** Verificar que todos los participantes deudores (saldo negativo en el balance) tengan saldo $0 cubierto por pagos en `viaje_pagos`. Si alguno tiene saldo pendiente, el cierre se bloquea y se muestra un mensaje indicando quiénes deben saldar su parte.

2. **Cálculo de parte proporcional:** Para cada participante, sumar su share en cada gasto de `viaje_gastos` según el modo de división (todos, algunos, solo el pagador). Esta lógica reutiliza el cálculo existente del balance del viaje.

3. **Creación de gasto en `gastos`:** Un registro por participante con:
   - `objeto`: `"Gastos: <nombre del viaje>"`
   - `precio`: parte proporcional del participante
   - `viaje_id`: id del viaje
   - `viaje_nombre`: nombre del viaje
   - `fecha`: fecha de cierre
   - `isFijo`: false
   - `cuotas`: "1"
   - `medio`: vacío / sin medio de pago

4. **Si el viaje se reabre:** Los gastos generados (identificados por `viaje_id`) se eliminan automáticamente.

### 3. Balance view — Registrar pago

En la vista de balance del viaje (quién le debe a quién):

- Cada fila de deuda muestra un botón **"Registrar pago"**.
- Al tocarlo, abre un modal con:
  - Monto pre-cargado con el total de la deuda
  - Campo editable para ingresar monto parcial
  - Botón confirmar → crea registro en `viaje_pagos`
- El balance se recalcula en tiempo real descontando los pagos registrados.
- Cuando el saldo de un deudor llega a $0, su fila muestra badge **"✓ Saldado"**.
- El botón **"Cerrar viaje"** solo se habilita cuando todos los deudores están saldados.

---

## UI: GastoCard estilo boarding pass (Opción A)

El GastoCard para gastos con `viaje_id` adopta el estilo **boarding pass clásico**:

- **Layout:** Card dividida en dos secciones horizontales.
  - **Sección principal (izquierda):** nombre del gasto, monto, fecha y badges existentes (cuotas, etc.). Fondo con gradiente claro (`#f8faff → #eef2ff`).
  - **Divisor central:** línea dashed vertical con círculos recortados en los bordes superior e inferior (efecto de borde dentado de pasaje).
  - **Stub (derecha):** franja de color con gradiente indigo (`#6366f1 → #4f46e5`), icono ✈️ y nombre del viaje en texto vertical.

- **Colores:** Fondo principal claro con texto oscuro (`#1e1b4b`). Stub en primary indigo. Funciona sobre el fondo oscuro de la app ya que el card tiene fondo propio.

- Solo se aplica este estilo cuando `viaje_id` is not null. Los gastos normales mantienen su GastoCard actual sin cambios.

---

## Archivos a crear / modificar

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/` | Nueva migración: agregar `viaje_id`, `viaje_nombre` a `gastos`; crear tabla `viaje_pagos` |
| `src/services/viajeGastosService.js` | Eliminar lógica que crea gastos regulares |
| `src/services/viajesService.js` | Agregar lógica de cierre: validación + generación de gastos resumen |
| `src/components/GastoCard.jsx` | Detectar `viaje_id` y renderizar estilo boarding pass |
| `src/components/viajes/ViajeBalanceTab.jsx` (confirmar nombre exacto al implementar) | Agregar UI de "Registrar pago" + validación de saldado |
| `src/services/viajePagosService.js` | Nuevo servicio CRUD para `viaje_pagos` |
| `src/hooks/queries/useViajePagos.js` | Nuevo hook de query para pagos del viaje |

---

## Migración de datos existentes

Los registros en `gastos` que fueron creados por la lógica anterior (cuando un viaje gasto también generaba un gasto regular) quedan huérfanos — no tienen `viaje_id`. No se eliminan automáticamente; el usuario puede borrarlos manualmente si lo desea. No se realiza limpieza retroactiva automática para evitar pérdida de datos no intencionada.

---

## Casos borde

- **Viaje con un solo participante:** el único gasto generado es el total (sin división). Botón cerrar siempre habilitado (nadie debe nada).
- **Participante con saldo $0 (no debe nada):** igual recibe un gasto en Mis Gastos con su parte proporcional del total.
- **Participante sin gastos a su cargo:** recibe un gasto de $0 (puede omitirse si el monto es 0).
- **Reapertura del viaje:** los gastos en `gastos` con ese `viaje_id` se borran y el viaje vuelve a estado activo.
