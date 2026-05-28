# Modo Viaje — Design Spec

**Fecha:** 2026-05-27
**App:** Budget Buddy (mybolucompras-mobile)
**Estado:** Aprobado — listo para implementar

---

## Resumen

Agregar a Budget Buddy un **Modo Viaje** que permita a grupos de usuarios con cuenta registrar y dividir gastos de un viaje, mantener un checklist compartido y notas, ver el balance entre participantes, y consultar el historial de viajes cerrados.

---

## Decisiones clave

| Pregunta | Decisión |
|---|---|
| ¿Los participantes necesitan cuenta? | Sí, todos deben tener cuenta en la app |
| ¿Los gastos del viaje aparecen en gastos personales? | Sí, también se registran en la lista personal de cada usuario |
| ¿El checklist es compartido? | Sí, todos los participantes lo ven y editan |
| ¿Los viajes se pueden cerrar? | Sí, pasan a un estado archivado de solo lectura |
| ¿Cómo se divide un gasto? | Híbrido: Solo yo / Todos / Algunos (elección por gasto) |
| Navegación | Nuevo 5to tab "Viajes" en el bottom tab bar |
| Interior del viaje | Segmented control: Gastos · Balance · Notas |

---

## Navegación

### Tab Bar
Se agrega un 5to tab **"Viajes" (✈️)** al bottom tab navigator existente. El orden queda:
`Gastos | Agregar | Dashboard | Viajes | Config`

### Stack de pantallas nuevas
```
Tabs
  └── ViajesScreen          (lista de viajes)
        └── ViajeDetailScreen   (detalle, con segmented control)
```

`ViajeDetailScreen` se abre como stack screen con animación `slide_from_right`.

---

## Pantallas

### 1. ViajesScreen (Lista)

**Ruta:** Tab "Viajes"

**Contenido:**
- Header con título "Mis Viajes ✈️" y contador (N activos · N archivados)
- Botón "Nuevo" en el header (abre `CrearViajeModal`)
- Sección **ACTIVOS**: cards con border izquierdo verde (`#10B981`)
- Sección **ARCHIVADOS**: cards con opacidad reducida y border gris

**Card de viaje muestra:**
- Emoji + título del viaje
- Nombres de participantes
- Total gastado
- Estado (● Activo / ● Cerrado)
- Chips de resumen: `💸 N gastos`, `✅ N/N checklist`, `⚖️ Te deben $X` (solo si aplica)

---

### 2. CrearViajeModal (Bottom Sheet)

**Trigger:** Botón "Nuevo" en ViajesScreen

**Campos:**
- **Título** (TextInput, requerido)
- **Emoji picker** (fila horizontal de 5+ opciones: 🏔️ ✈️ 🌊 🌴 🎿 🏖️ 🎒)
- **Participantes**: chips removibles + buscador por nombre/email (reutiliza `userService` existente y `contactService` para recientes)
- El creador siempre se incluye automáticamente y no es removible

**Acción:** "Crear Viaje" → crea registro en `viajes` + registros en `viaje_participantes`

---

### 3. ViajeDetailScreen

**Header:**
- Gradiente `#6366F1 → #818CF8`
- Back "← Mis Viajes"
- Emoji + Título + nombres de participantes
- Pills de stats: Total | N Gastos | Balance personal
- Badge de estado (● Activo / 🔒 Archivado)
- Botón `⋯` (abre `ViajeOpcionesSheet`)
- **Segmented control** (3 opciones): 💸 Gastos · ⚖️ Balance · ✅ Notas

---

#### Tab Gastos

- Lista de gastos del viaje ordenados por fecha descendente
- Cada ítem muestra:
  - Descripción + emoji/etiqueta
  - Avatar con inicial del que pagó (color único por participante)
  - Texto: `[Nombre] pagó · ÷ N` o `[Nombre] pagó · solo él/ella`
  - Monto total y monto por persona
- **FAB** "＋ Gasto al viaje" (visible solo si el viaje está activo)
  - Abre `AgregarScreen` con el viaje preseleccionado
- Viajes cerrados: sin FAB, banner "🔒 Solo lectura"

---

#### Tab Balance

**Sección "CUÁNTO PUSO CADA UNO":**
- Card por participante con:
  - Avatar (inicial + color único)
  - Nombre + "Pagó por otros: $X"
  - Monto neto en verde (+) o rojo (-)
  - Barra de progreso proporcional al total

**Sección "CÓMO LIQUIDAR":**
- Lista de transferencias mínimas (algoritmo greedy: el que más tiene a cobrar, cobra primero)
- Formato: `[Avatar] Nombre → Nombre · $X`
- Solo muestra las transferencias necesarias para saldar todas las deudas

**Cálculo de balance:**
```
neto(usuario) = Σ(gastos donde pagó por otros, su parte excluida) - Σ(gastos donde otros pagaron por él)
```

---

#### Tab Notas

**Sub-sección "QUÉ LLEVAR" (Checklist):**
- Botón "+ ítem" en el header de la sección
- Lista de ítems con checkbox, texto y autor
- Ítems completados: tachados y con checkbox verde
- Cada ítem muestra quién lo agregó (nombre, en pequeño a la derecha)
- Todos los participantes pueden marcar/desmarcar cualquier ítem
- Sync en tiempo real vía Supabase Realtime

**Sub-sección "NOTAS DEL GRUPO":**
- Botón "+ nota" en el header de la sección
- Feed de notas con: autor (nombre en color del participante), timestamp relativo, texto libre
- Solo el autor puede eliminar su nota

---

### 4. ViajeOpcionesSheet (Action Sheet)

**Trigger:** Botón `⋯` en el header de `ViajeDetailScreen`

**Opciones (viaje activo):**
1. ✏️ Editar nombre / emoji
2. 👥 Gestionar participantes (agregar/quitar)
3. 📤 Compartir resumen (genera imagen/PDF para WhatsApp)
4. 🔒 Cerrar viaje → abre `CerrarViajeModal`
5. 🗑️ Eliminar viaje (con confirmación, solo el creador)

**Opciones (viaje archivado):**
1. 📤 Compartir resumen
2. 🗑️ Eliminar viaje

---

### 5. CerrarViajeModal

**Trigger:** "Cerrar viaje" en `ViajeOpcionesSheet`

**Contenido:**
- Ícono 🔒 con borde amarillo
- Explicación: "El viaje quedará archivado. Podrás consultarlo pero no agregar gastos."
- **Resumen final**: Total gastado, N gastos, N participantes, Balance personal
- Botones: "Sí, cerrar viaje" (amarillo) · "Cancelar"

**Acción:** Actualiza `viajes.estado = 'cerrado'` y `fecha_cierre = now()`

---

## Integración con AgregarScreen

### Caso 1: Un solo viaje activo
Aparece un **banner toggle** arriba del formulario:
```
[✈️ Mendoza 2025 · Activo  ¿Es del viaje?  [toggle ON/OFF]]
```
Cuando el toggle está ON, aparece el **panel de división**:
- 3 botones: 🙋 Solo yo | 👥 Todos | 👤+ Algunos
- Resumen dinámico: "$X ÷ N personas = $Y c/u"
- "Algunos" abre bottom sheet con checkboxes (el usuario actual siempre incluido y no removible)

### Caso 2: Dos o más viajes activos
Aparece un **selector de radio buttons**:
- ○ Sin viaje (gasto personal)
- ◉ 🏔️ Mendoza 2025
- ○ 🌊 Uruguay 2025

Tras seleccionar un viaje, aparece el mismo panel de división del Caso 1.

### Caso 3: Sin viajes activos
El formulario de `AgregarScreen` no cambia — sin banner, sin panel.

### Lógica al guardar
- `modo_split = 'solo'`: se crea un solo gasto personal (sin copias), se registra en `viaje_gastos` con `modo_split = 'solo'`
- `modo_split = 'todos'` o `'algunos'`: se crea el gasto del usuario actual + copias para cada participante (extiende `gastosService.crear()` con `sharedWith`), se registra en `viaje_gastos` con el array de participantes

---

## Modelo de Datos — Supabase

### Tabla `viajes`
```sql
id          uuid        PRIMARY KEY DEFAULT gen_random_uuid()
titulo      text        NOT NULL
emoji       text        NOT NULL DEFAULT '✈️'
created_by  uuid        REFERENCES auth.users NOT NULL
estado      text        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado'))
fecha_cierre timestamp  -- null si activo
created_at  timestamp   DEFAULT now()
```

### Tabla `viaje_participantes`
```sql
id          uuid  PRIMARY KEY DEFAULT gen_random_uuid()
viaje_id    uuid  REFERENCES viajes(id) ON DELETE CASCADE NOT NULL
user_id     uuid  REFERENCES auth.users NOT NULL
joined_at   timestamp DEFAULT now()
UNIQUE(viaje_id, user_id)
```

### Tabla `viaje_gastos`
```sql
id              uuid  PRIMARY KEY DEFAULT gen_random_uuid()
viaje_id        uuid  REFERENCES viajes(id) ON DELETE CASCADE NOT NULL
gasto_id        uuid  REFERENCES gastos(id) ON DELETE CASCADE NOT NULL
pagado_por      uuid  REFERENCES auth.users NOT NULL
modo_split      text  NOT NULL CHECK (modo_split IN ('solo', 'todos', 'algunos'))
participantes   uuid[] -- solo para modo_split = 'algunos'
created_at      timestamp DEFAULT now()
```

### Tabla `viaje_checklist`
```sql
id          uuid    PRIMARY KEY DEFAULT gen_random_uuid()
viaje_id    uuid    REFERENCES viajes(id) ON DELETE CASCADE NOT NULL
texto       text    NOT NULL
completado  boolean NOT NULL DEFAULT false
created_by  uuid    REFERENCES auth.users NOT NULL
created_at  timestamp DEFAULT now()
```

### Tabla `viaje_notas`
```sql
id          uuid  PRIMARY KEY DEFAULT gen_random_uuid()
viaje_id    uuid  REFERENCES viajes(id) ON DELETE CASCADE NOT NULL
texto       text  NOT NULL
created_by  uuid  REFERENCES auth.users NOT NULL
created_at  timestamp DEFAULT now()
```

### Row Level Security (RLS)
Todas las tablas tienen RLS habilitado. La política base:
```sql
-- Solo participantes del viaje pueden leer/escribir
CREATE POLICY "participantes_only" ON viaje_gastos
  USING (
    viaje_id IN (
      SELECT viaje_id FROM viaje_participantes WHERE user_id = auth.uid()
    )
  );
-- (misma lógica para viaje_checklist, viaje_notas, viaje_participantes)
```

Para `viajes`: el creador puede actualizar/cerrar; todos los participantes pueden leer.

---

## Servicios nuevos

### `viajesService.js`
```
getAll()                  → viajes del usuario (activos + cerrados)
getById(id)               → viaje + participantes
crear(titulo, emoji, participantes)
cerrar(id)
eliminar(id)
agregarParticipante(viajeId, userId)
quitarParticipante(viajeId, userId)
```

### `viajeGastosService.js`
```
getByViaje(viajeId)        → gastos con info de split
agregarGasto(viajeId, gastoData, splitConfig)
calcularBalance(viajeId)   → { porPersona, liquidacion }
```

### `viajeNotasService.js`
```
getChecklist(viajeId)
agregarItem(viajeId, texto)
toggleItem(itemId, completado)
eliminarItem(itemId)
getNotas(viajeId)
agregarNota(viajeId, texto)
eliminarNota(notaId)
```

---

## Contexto nuevo: ViajesContext

Expone a toda la app:
- `viajes` — lista de viajes del usuario
- `viajesActivos` — filtro de estado = 'activo' (para AgregarScreen)
- `cargarViajes()`
- `crearViaje()`
- `cerrarViaje()`

---

## Componentes nuevos

| Componente | Descripción |
|---|---|
| `ViajeCard` | Card de viaje en la lista (chips de resumen) |
| `CrearViajeModal` | Bottom sheet para crear viaje |
| `ViajeDetailScreen` | Pantalla principal del viaje con segmented control |
| `ViajeGastosTab` | Tab de gastos del viaje |
| `ViajeBalanceTab` | Tab de balance y liquidación |
| `ViajeNotasTab` | Tab de checklist + notas |
| `ViajeOpcionesSheet` | Action sheet de opciones del viaje |
| `CerrarViajeModal` | Confirmación de cierre |
| `SplitPanel` | Panel de división (Solo yo / Todos / Algunos) — usado en AgregarScreen |
| `ParticipantesPicker` | Bottom sheet de selección de participantes para "Algunos" |

---

## Archivos a modificar

- `App.js` — agregar tab "Viajes" y `ViajesScreen` al navigator
- `src/screens/AgregarScreen.jsx` — integrar banner de viaje + `SplitPanel`
- `src/context/DataContext.jsx` — opcionalmente absorber ViajesContext o dejarlo separado

---

## Fuera de scope (v1)

- Notificaciones push cuando alguien agrega un gasto al viaje (se puede agregar en v2 usando el sistema de `notificationService` existente)
- Editar un gasto ya registrado en el viaje
- División con porcentajes distintos (por ahora siempre partes iguales)
- Invitación a participantes vía link (requieren cuenta)
