# Diseño: Deudas y pagos para gastos de viaje

## Contexto

Actualmente los gastos de un viaje se registran con splits entre participantes, se calcula el balance y se muestra "cómo liquidar", pero **no se generan registros en la tabla `deudores`**. Esto significa que las deudas del viaje no aparecen en la pantalla de Deudores, no se pueden deslizar para marcar como pagadas, y no hay historial de pagos en el viaje.

## Objetivo

Que los gastos del viaje funcionen igual que los gastos compartidos:
1. Al agregar un gasto con split, se crean deudas individuales (una por participante que debe al pagador)
2. Esas deudas aparecen en la pantalla de Deudores con un tag `🧳 Viaje`
3. Al deslizar para marcar como pagada, se registra el pago en el viaje
4. El viaje muestra un historial: "Pepito le pagó $500 a Juancito"

## Decisiones de diseño

- **Cuándo se crean las deudas**: al agregar cada gasto (no al cerrar el viaje)
- **Granularidad**: una deuda por participante (no una deuda grupal)
- **Enfoque**: `viaje_id` nullable en `deudores` + nueva tabla `viaje_pagos` (Opción A)

---

## Sección 1: Schema

### 1.1 Migración — columna `viaje_id` en `deudores`

```sql
ALTER TABLE deudores
  ADD COLUMN viaje_id UUID REFERENCES viajes(id) ON DELETE SET NULL;
```

Nullable. Las deudas normales tienen `viaje_id = null`. Las creadas desde gastos de viaje llevan el id del viaje.

### 1.2 Migración — tabla `viaje_pagos`

```sql
CREATE TABLE viaje_pagos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id     UUID        NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
  pagador_id   UUID        NOT NULL,
  receptor_id  UUID        NOT NULL,
  pagador_nombre TEXT      NOT NULL,
  receptor_nombre TEXT     NOT NULL,
  monto        NUMERIC     NOT NULL,
  moneda       TEXT        NOT NULL DEFAULT 'ARS',
  fecha        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Un registro por pago realizado dentro del viaje.

---

## Sección 2: Cambios en servicios

### 2.1 `viajeGastosService.agregarGasto()`

**Archivo:** `src/services/viajeGastosService.js`

Después de crear los gastos para cada participante (lógica existente), insertar deudas en `deudores` para cada participante que debe al pagador.

**Lógica de deudas:**

```
Para cada participante en splitConfig.participanteIds (excluyendo pagadoPor):
  share = gastoData.precio / numParticipantes  (según modo_split)

  // Registro del pagador (es_acreedor = true — le deben)
  INSERT INTO deudores {
    user_id:                pagadoPor,
    nombre:                 participante.nombre,
    descripcion:            gastoData.objeto,
    monto:                  share,
    moneda:                 gastoData.moneda,
    medio:                  gastoData.medio,
    tipo:                   gastoData.tipo,
    es_fijo:                false,
    cuotas:                 1,
    cantidad:               1,
    pagado:                 false,
    fecha_deuda:            gastoData.fecha (ISO),
    compartido_con_user_id: participante.userId,
    compartido_con_nombre:  participante.nombre,
    es_acreedor:            true,
    viaje_id:               viajeId,
  }

  // Registro del participante (es_acreedor = false — le debe al pagador)
  INSERT INTO deudores {
    user_id:                participante.userId,
    nombre:                 pagador.nombre,
    descripcion:            gastoData.objeto,
    monto:                  share,
    moneda:                 gastoData.moneda,
    medio:                  gastoData.medio,
    tipo:                   gastoData.tipo,
    es_fijo:                false,
    cuotas:                 1,
    cantidad:               1,
    pagado:                 false,
    fecha_deuda:            gastoData.fecha (ISO),
    compartido_con_user_id: pagadoPor,
    compartido_con_nombre:  pagador.nombre,
    es_acreedor:            false,
    viaje_id:               viajeId,
  }
```

**Nota:** No usar `deudoresService.crear()` directamente porque ese método tiene side-effects (crea gastos espejo). Usar `supabase.from('deudores').insert()` directamente para las dos filas.

**Modo `solo`** (solo el pagador): no se crean deudas.

El nombre del pagador se obtiene de `viajeParticipantes.find(p => p.userId === pagadoPor)?.nombre`.

### 2.2 `deudoresService` — `mapFromDB()` y `marcarPagadaConNotificacion()`

**Archivo:** `src/services/deudoresService.js`

**`mapFromDB()`:** agregar `viaje_id: row.viaje_id || null` y `user_id: row.user_id` al objeto mapeado (necesario para construir el registro de `viaje_pagos`).

**`marcarPagadaConNotificacion(id, deudaActual, currentUserName)`:** al final de la función, después de marcar pagada, si `deudaActual.viaje_id` existe:

```js
if (deudaActual.viaje_id) {
  const esAcreedor = deudaActual.es_acreedor;
  await supabase.from('viaje_pagos').insert({
    viaje_id:        deudaActual.viaje_id,
    pagador_id:      esAcreedor ? deudaActual.compartido_con_user_id : deudaActual.user_id,
    receptor_id:     esAcreedor ? deudaActual.user_id : deudaActual.compartido_con_user_id,
    pagador_nombre:  esAcreedor ? deudaActual.compartido_con_nombre : currentUserName,
    receptor_nombre: esAcreedor ? currentUserName : deudaActual.compartido_con_nombre,
    monto:           deudaActual.monto,
    moneda:          deudaActual.moneda,
  });
}
```

### 2.3 Nuevo `viajePagosService.js`

**Archivo:** `src/services/viajePagosService.js`

```js
export const viajePagosService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_pagos')
      .select('*')
      .eq('viaje_id', viajeId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data;
  },
};
```

---

## Sección 3: UI

### 3.1 `DeudaCard` — tag de viaje

**Archivo:** `src/components/DeudaCard.jsx`

Cuando `deuda.viaje_id` es truthy, mostrar un badge pequeño `🧳 Viaje` junto al nombre. Sin nombre específico del viaje (YAGNI — evita join extra).

### 3.2 `ViajeDetailScreen` — 4to tab "Pagos"

**Archivo:** `src/screens/ViajeDetailScreen.jsx`

```js
const TABS = ['💸 Gastos', '⚖️ Balance', '💳 Pagos', '✅ Notas'];
```

Agregar `pagos` al estado y cargarlo en `cargar()`:

```js
const [pagos, setPagos] = useState([]);

// En cargar():
const [v, g, p] = await Promise.all([
  viajesService.getById(viajeId),
  viajeGastosService.getByViaje(viajeId),
  viajePagosService.getByViaje(viajeId),
]);
setPagos(p);
```

Renderizar el nuevo tab:

```jsx
{tabIdx === 2 && (
  <ViajesPagosTab pagos={pagos} participantColor={participantColor} dark={dark} />
)}
{tabIdx === 3 && (
  <ViajeNotasTab viaje={viaje} dark={dark} />
)}
```

### 3.3 Nuevo componente `ViajesPagosTab`

**Archivo:** `src/components/viajes/ViajesPagosTab.jsx`

Lista de pagos del viaje, ordenada por fecha descendente.

Cada item muestra:
```
[Avatar] Pepito → Juancito    $500 ARS
                              28/05/2026
```

Estado vacío: `"Nadie ha pagado sus deudas del viaje todavía."`

---

## Archivos modificados / creados

| Acción  | Archivo |
|---------|---------|
| Modificar | `src/services/viajeGastosService.js` |
| Modificar | `src/services/deudoresService.js` |
| Crear   | `src/services/viajePagosService.js` |
| Modificar | `src/components/DeudaCard.jsx` |
| Modificar | `src/screens/ViajeDetailScreen.jsx` |
| Crear   | `src/components/viajes/ViajesPagosTab.jsx` |

## Migraciones Supabase

Ejecutar en el dashboard de Supabase (SQL Editor):
1. `ALTER TABLE deudores ADD COLUMN viaje_id UUID REFERENCES viajes(id) ON DELETE SET NULL;`
2. `CREATE TABLE viaje_pagos (...)` — ver schema completo en Sección 1.2
