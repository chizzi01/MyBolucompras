# Reporte Mensual de Gastos con IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send each opted-in user a monthly email, generated via Claude, analyzing their personal expenses: overspending categories, avoidable expenses, and consumption advice.

**Architecture:** A new Supabase Edge Function `send-monthly-expense-report`, triggered by `pg_cron` on the 1st of each month, mirrors the existing `send-daily-viaje-summary` function's shape (cron-secret auth → query Supabase → loop per user → external send, log-and-continue on per-user errors). Unlike that function, its business logic (date-range math, currency grouping, prompt building, response validation, HTML rendering) lives in a separate pure module (`report.ts`) so it can be unit-tested with `deno test`; `index.ts` only wires I/O (Supabase, Anthropic API, SMTP).

**Tech Stack:** Deno (Supabase Edge Functions), `@supabase/supabase-js`, Anthropic Messages API (raw `fetch`, tool-use for structured output), `denomailer` (SMTP over Gmail/Workspace), PostgreSQL migrations (`pg_cron`/`pg_net`), React Native + `@tanstack/react-query` (existing `configuracion_usuario` flow).

## Global Constraints

- Scope: personal expenses only (`gastos` table); trip expenses (`viaje_gastos`) are explicitly excluded.
- Opt-in only: process only users with `configuracion_usuario.recibir_reporte_mensual = true`.
- No currency conversion: every aggregation is done per `moneda`, never summed across currencies.
- No report history is persisted — the email is the only deliverable, no new "past reports" screen.
- Fixed expenses (`es_fijo = true` / `esFijo: true`) must never be suggested as avoidable.
- Per-user errors (Claude, parsing, SMTP) are logged and skipped; they never abort the batch — same convention as `send-daily-viaje-summary`.
- This repo has no JS test runner configured (no Jest/Vitest in `package.json`) — React Native–side changes in this plan are verified manually (exact steps given per task), not via automated tests. The Edge Function's pure logic module *is* unit-tested, using Deno's built-in `deno test` runner (already required to develop/deploy Edge Functions in this repo).
- SQL migrations in this repo are applied manually via the Supabase dashboard SQL Editor (not auto-run) — follow the exact comment-header convention used in `supabase/migrations/20260723_modo_viaje_redirect.sql`, including the `NOTIFY pgrst, 'reload schema';` footer.

---

### Task 1: Add `recibir_reporte_mensual` column to `configuracion_usuario`

**Files:**
- Create: `supabase/migrations/20260724_reporte_mensual_gastos.sql`

**Interfaces:**
- Produces: a `configuracion_usuario.recibir_reporte_mensual boolean NOT NULL DEFAULT false` column that Task 2 reads/writes and Task 5 (Edge Function) queries to select opted-in users.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260724_reporte_mensual_gastos.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: public.configuracion_usuario must already exist.
--
-- DEPLOYMENT ORDER: apply this migration BEFORE shipping the corresponding app
-- update. configuracionService.js's mapToDB() unconditionally writes this column
-- on every configuracion_usuario upsert, so if the app code ships first,
-- ALL config saves (not just the monthly report toggle) will fail with
-- "column does not exist".

ALTER TABLE public.configuracion_usuario
  ADD COLUMN IF NOT EXISTS recibir_reporte_mensual boolean NOT NULL DEFAULT false;

-- PostgREST caches the table schema; without this, supabase-js writes to the
-- new column fail with "column not found in schema cache" until the cache
-- next auto-refreshes. Run this NOTIFY every time you apply this migration,
-- even if you're just re-running it to pick up a later edit to this file.
NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Apply it manually and verify**

Open the Supabase dashboard SQL Editor for this project, paste the full contents of the file above, and run it.

Verify with this query in the same SQL Editor:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'configuracion_usuario' AND column_name = 'recibir_reporte_mensual';
```

Expected: one row, `data_type = boolean`, `column_default = false`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260724_reporte_mensual_gastos.sql
git commit -m "feat: add recibir_reporte_mensual column to configuracion_usuario"
```

---

### Task 2: Wire `recibirReporteMensual` through the config service and query hook

**Files:**
- Modify: `src/services/configuracionService.js:28-37` (`getDefaults`), `src/services/configuracionService.js:39-56` (`mapFromDB`), `src/services/configuracionService.js:58-75` (`mapToDB`)
- Modify: `src/hooks/queries/useConfiguracion.js:5-12` (`defaultMydata`)

**Interfaces:**
- Consumes: Task 1's `configuracion_usuario.recibir_reporte_mensual` column.
- Produces: `mydata.recibirReporteMensual: boolean` available to any screen using `useConfiguracion()`, and `configuracionService.actualizar({ ...mydata, recibirReporteMensual: boolean })` persists it. Task 3 consumes both.

- [ ] **Step 1: Add the field to `getDefaults()` in `src/services/configuracionService.js`**

```javascript
function getDefaults() {
  return {
    cierre: '', vencimiento: '',
    cierreAnterior: '', vencimientoAnterior: '',
    fondos: 0, etiquetas: [], presupuestos: {},
    presupuestoMensualMax: 0, bancosHabilitados: [],
    mediosHabilitados: [], monedaPreferida: 'ARS',
    modoViajeActivo: false, modoViajeViajeId: null, modoViajePromptedIds: [],
    recibirReporteMensual: false,
  };
}
```

- [ ] **Step 2: Add the field to `mapFromDB()` in the same file**

```javascript
function mapFromDB(row) {
  return {
    cierre: row.cierre || '',
    vencimiento: row.vencimiento || '',
    cierreAnterior: row.cierre_anterior || '',
    vencimientoAnterior: row.vencimiento_anterior || '',
    fondos: Number(row.fondos) || 0,
    etiquetas: (row.etiquetas || []).map(e => typeof e === 'string' ? { nombre: e, color: '#6366F1' } : e).filter(e => e?.nombre),
    presupuestos: row.presupuestos || {},
    presupuestoMensualMax: Number(row.presupuesto_mensual_max) || 0,
    bancosHabilitados: row.bancos_habilitados || [],
    mediosHabilitados: row.medios_habilitados || [],
    monedaPreferida: row.moneda_preferida || 'ARS',
    modoViajeActivo: row.modo_viaje_activo ?? false,
    modoViajeViajeId: row.modo_viaje_viaje_id ?? null,
    modoViajePromptedIds: row.modo_viaje_prompted_ids ?? [],
    recibirReporteMensual: row.recibir_reporte_mensual ?? false,
  };
}
```

- [ ] **Step 3: Add the field to `mapToDB()` in the same file**

```javascript
function mapToDB(config) {
  return {
    cierre: config.cierre || null,
    vencimiento: config.vencimiento || null,
    cierre_anterior: config.cierreAnterior || null,
    vencimiento_anterior: config.vencimientoAnterior || null,
    fondos: Number(config.fondos) || 0,
    etiquetas: config.etiquetas || [],
    presupuestos: config.presupuestos || {},
    presupuesto_mensual_max: Number(config.presupuestoMensualMax) || 0,
    bancos_habilitados: config.bancosHabilitados || [],
    medios_habilitados: config.mediosHabilitados || [],
    moneda_preferida: config.monedaPreferida || 'ARS',
    modo_viaje_activo: !!config.modoViajeActivo,
    modo_viaje_viaje_id: config.modoViajeViajeId ?? null,
    modo_viaje_prompted_ids: config.modoViajePromptedIds ?? [],
    recibir_reporte_mensual: !!config.recibirReporteMensual,
  };
}
```

- [ ] **Step 4: Add the field to `defaultMydata` in `src/hooks/queries/useConfiguracion.js`**

```javascript
const defaultMydata = {
  cierre: '', vencimiento: '',
  cierreAnterior: '', vencimientoAnterior: '',
  fondos: 0, etiquetas: [], presupuestos: {},
  presupuestoMensualMax: 0, bancosHabilitados: [],
  mediosHabilitados: [], monedaPreferida: 'ARS',
  modoViajeActivo: false, modoViajeViajeId: null, modoViajePromptedIds: [],
  recibirReporteMensual: false,
};
```

- [ ] **Step 5: Manual verification**

There is no automated JS test runner in this repo, so verify by inspection: re-read all four edited spots and confirm `recibirReporteMensual` (JS) / `recibir_reporte_mensual` (DB) appears in `getDefaults`, `mapFromDB`, `mapToDB`, and `defaultMydata` — four occurrences total, consistent naming (camelCase in JS objects, snake_case in DB payloads), matching exactly how `modoViajeActivo` / `modo_viaje_activo` is threaded through the same four spots.

- [ ] **Step 6: Commit**

```bash
git add src/services/configuracionService.js src/hooks/queries/useConfiguracion.js
git commit -m "feat: thread recibirReporteMensual through configuracion service and hook"
```

---

### Task 3: Add "Recibir resumen mensual por mail" toggle to Configuración

**Files:**
- Modify: `src/screens/ConfiguracionScreen.jsx` (new `AccordionSection` block, placed after the existing "Viajes" section at `src/screens/ConfiguracionScreen.jsx:543-563`)

**Interfaces:**
- Consumes: `mydata.recibirReporteMensual` and `actualizar` (`useConfiguracionMutations()`) from Task 2.

- [ ] **Step 1: Add the new section in `ConfiguracionScreen.jsx`, right after the closing `</AccordionSection>` of the "Viajes" section (after line 563) and before the "Cerrar sesión" `TouchableOpacity` (line 566)**

```jsx
        {/* Reportes */}
        <AccordionSection title="Reportes" dark={dark}>
          <View style={s.card}>
            <View style={s.bioRow}>
              <View style={s.bioInfo}>
                <Ionicons name="mail-outline" size={22} color={mydata.recibirReporteMensual ? colors.primary : (dark ? '#475569' : '#94A3B8')} />
                <View style={{ flex: 1 }}>
                  <Text style={s.bioTitle}>Resumen mensual por mail</Text>
                  <Text style={s.bioSub}>
                    Recibí a fin de mes un análisis con IA de tus gastos: dónde gastaste de más, qué podrías evitar y consejos.
                  </Text>
                </View>
              </View>
              <Switch
                value={mydata.recibirReporteMensual}
                onValueChange={(value) => actualizar.mutate({ ...mydata, recibirReporteMensual: value })}
                trackColor={{ false: dark ? '#334155' : '#CBD5E1', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </AccordionSection>
```

- [ ] **Step 2: Manual verification**

Run the app (`npx expo start`, per this project's usual dev flow), open Configuración, expand the new "Reportes" section, and confirm:
- The switch starts off (matches the `false` default from Task 1/2).
- Toggling it on shows the switch move to the "on" state immediately (optimistic update from `useConfiguracionMutations`).
- Closing and reopening the app keeps the toggle in its last-set state (confirms the write reached `configuracion_usuario` and Task 1's column accepts writes — re-run the Task 1 verification query and confirm the row's value flipped to `true`).

- [ ] **Step 3: Commit**

```bash
git add src/screens/ConfiguracionScreen.jsx
git commit -m "feat: add monthly expense report opt-in toggle to Configuración"
```

---

### Task 4: `report.ts` — pure logic module for the monthly report (TDD)

**Files:**
- Create: `supabase/functions/send-monthly-expense-report/report.ts`
- Test: `supabase/functions/send-monthly-expense-report/report.test.ts`

**Interfaces:**
- Produces (consumed by Task 5's `index.ts`):
  - `interface Gasto { objeto: string; precio: number; moneda: string; medio: string | null; etiqueta: string | null; esFijo: boolean; fecha: string }`
  - `interface MesRange { desde: string; hasta: string; mesLabel: string }`
  - `interface AnalisisMensual { resumenGeneral: string; categorias: { nombre: string; total: number; variacionPct?: number }[]; gastosEvitables: { descripcion: string; motivo: string }[]; consejos: string[] }`
  - `getMesCerradoRange(now: Date, timeZone?: string): MesRange`
  - `getMesesPreviosRanges(mesCerrado: MesRange, cantidad: number): MesRange[]`
  - `agruparGastosPorMoneda(gastos: Gasto[]): Record<string, Gasto[]>`
  - `separarFijosYVariables(gastos: Gasto[]): { fijos: Gasto[]; variables: Gasto[] }`
  - `totalPorMoneda(gastos: Gasto[]): Record<string, number>`
  - `buildClaudeUserPrompt(mesLabel: string, gastosDelMesPorMoneda: Record<string, Gasto[]>, gastosPreviosPorMoneda: Record<string, Gasto[]>): string`
  - `parseClaudeAnalysis(raw: unknown): AnalisisMensual` (throws `Error` on invalid shape)
  - `buildEmailHtml(analisis: AnalisisMensual, mesLabel: string, totalesPorMoneda: Record<string, number>): string`

- [ ] **Step 1: Confirm Deno is available locally**

Run: `deno --version`
Expected: version output (e.g. `deno 2.x.x`). If not installed, install it (this repo already targets `deno_version = 2` in `supabase/config.toml` for Edge Functions, so it's needed regardless of this task) and re-run.

- [ ] **Step 2: Write the failing tests in `supabase/functions/send-monthly-expense-report/report.test.ts`**

```typescript
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  getMesCerradoRange,
  getMesesPreviosRanges,
  agruparGastosPorMoneda,
  separarFijosYVariables,
  totalPorMoneda,
  buildClaudeUserPrompt,
  parseClaudeAnalysis,
  buildEmailHtml,
  type Gasto,
} from './report.ts'

Deno.test('getMesCerradoRange - returns the previous month for a run on the 1st', () => {
  const now = new Date('2026-08-01T09:00:00Z') // 06:00 ART (UTC-3)
  const range = getMesCerradoRange(now)
  assertEquals(range, { desde: '2026-07-01', hasta: '2026-07-31', mesLabel: 'julio 2026' })
})

Deno.test('getMesCerradoRange - handles January rolling back to December of the prior year', () => {
  const now = new Date('2026-01-01T09:00:00Z')
  const range = getMesCerradoRange(now)
  assertEquals(range, { desde: '2025-12-01', hasta: '2025-12-31', mesLabel: 'diciembre 2025' })
})

Deno.test('getMesesPreviosRanges - returns the N months before the given range, most recent first', () => {
  const mesCerrado = { desde: '2026-07-01', hasta: '2026-07-31', mesLabel: 'julio 2026' }
  const previos = getMesesPreviosRanges(mesCerrado, 2)
  assertEquals(previos, [
    { desde: '2026-06-01', hasta: '2026-06-30', mesLabel: 'junio 2026' },
    { desde: '2026-05-01', hasta: '2026-05-31', mesLabel: 'mayo 2026' },
  ])
})

function gasto(overrides: Partial<Gasto>): Gasto {
  return {
    objeto: 'Test', precio: 100, moneda: 'ARS', medio: null,
    etiqueta: null, esFijo: false, fecha: '2026-07-15', ...overrides,
  }
}

Deno.test('agruparGastosPorMoneda - groups by moneda, defaults falsy moneda to ARS', () => {
  const gastos = [
    gasto({ moneda: 'ARS' }),
    gasto({ moneda: 'USD' }),
    gasto({ moneda: '' as unknown as string }),
  ]
  const grupos = agruparGastosPorMoneda(gastos)
  assertEquals(Object.keys(grupos).sort(), ['ARS', 'USD'])
  assertEquals(grupos.ARS.length, 2)
  assertEquals(grupos.USD.length, 1)
})

Deno.test('separarFijosYVariables - splits by esFijo', () => {
  const gastos = [gasto({ esFijo: true }), gasto({ esFijo: false }), gasto({ esFijo: false })]
  const { fijos, variables } = separarFijosYVariables(gastos)
  assertEquals(fijos.length, 1)
  assertEquals(variables.length, 2)
})

Deno.test('totalPorMoneda - sums precio per moneda', () => {
  const gastos = [
    gasto({ moneda: 'ARS', precio: 100 }),
    gasto({ moneda: 'ARS', precio: 50 }),
    gasto({ moneda: 'USD', precio: 20 }),
  ]
  assertEquals(totalPorMoneda(gastos), { ARS: 150, USD: 20 })
})

Deno.test('buildClaudeUserPrompt - includes mesLabel and serialized gasto data', () => {
  const gastosDelMes = { ARS: [gasto({ objeto: 'Delivery' })] }
  const gastosPrevios = { ARS: [gasto({ objeto: 'Super' })] }
  const prompt = buildClaudeUserPrompt('julio 2026', gastosDelMes, gastosPrevios)
  assertEquals(prompt.includes('julio 2026'), true)
  assertEquals(prompt.includes('Delivery'), true)
  assertEquals(prompt.includes('Super'), true)
})

Deno.test('parseClaudeAnalysis - accepts a valid shape', () => {
  const raw = {
    resumenGeneral: 'Gastaste bien este mes.',
    categorias: [{ nombre: 'Comida', total: 1000, variacionPct: 12 }],
    gastosEvitables: [{ descripcion: 'Delivery frecuente', motivo: 'Repetido 8 veces en el mes' }],
    consejos: ['Cociná más seguido', 'Revisá suscripciones activas'],
  }
  const result = parseClaudeAnalysis(raw)
  assertEquals(result.resumenGeneral, 'Gastaste bien este mes.')
  assertEquals(result.categorias[0].nombre, 'Comida')
  assertEquals(result.consejos.length, 2)
})

Deno.test('parseClaudeAnalysis - rejects missing resumenGeneral', () => {
  assertThrows(() => parseClaudeAnalysis({ categorias: [], gastosEvitables: [], consejos: ['a', 'b'] }))
})

Deno.test('parseClaudeAnalysis - rejects consejos with fewer than 2 items', () => {
  assertThrows(() => parseClaudeAnalysis({
    resumenGeneral: 'x', categorias: [], gastosEvitables: [], consejos: ['solo uno'],
  }))
})

Deno.test('parseClaudeAnalysis - rejects consejos with more than 3 items', () => {
  assertThrows(() => parseClaudeAnalysis({
    resumenGeneral: 'x', categorias: [], gastosEvitables: [], consejos: ['a', 'b', 'c', 'd'],
  }))
})

Deno.test('buildEmailHtml - includes rendered content and escapes HTML from AI/user text', () => {
  const analisis = {
    resumenGeneral: 'Resumen con <script>alert(1)</script>',
    categorias: [{ nombre: 'Comida', total: 1000, variacionPct: 15 }],
    gastosEvitables: [{ descripcion: 'Delivery', motivo: 'Muy frecuente' }],
    consejos: ['Consejo uno', 'Consejo dos'],
  }
  const html = buildEmailHtml(analisis, 'julio 2026', { ARS: 5000 })
  assertEquals(html.includes('julio 2026'), true)
  assertEquals(html.includes('Comida'), true)
  assertEquals(html.includes('Delivery'), true)
  assertEquals(html.includes('Consejo uno'), true)
  assertEquals(html.includes('<script>alert(1)</script>'), false)
  assertEquals(html.includes('&lt;script&gt;'), true)
})
```

- [ ] **Step 3: Run the tests to verify they fail (module doesn't exist yet)**

Run: `deno test supabase/functions/send-monthly-expense-report/report.test.ts`
Expected: FAIL — `Module not found "./report.ts"` (or equivalent resolution error).

- [ ] **Step 4: Write `supabase/functions/send-monthly-expense-report/report.ts`**

```typescript
export interface Gasto {
  objeto: string
  precio: number
  moneda: string
  medio: string | null
  etiqueta: string | null
  esFijo: boolean
  fecha: string // YYYY-MM-DD
}

export interface MesRange {
  desde: string // YYYY-MM-DD, inclusive
  hasta: string // YYYY-MM-DD, inclusive
  mesLabel: string // e.g. "julio 2026"
}

export interface AnalisisMensual {
  resumenGeneral: string
  categorias: { nombre: string; total: number; variacionPct?: number }[]
  gastosEvitables: { descripcion: string; motivo: string }[]
  consejos: string[]
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function buildMesRange(year: number, month: number): MesRange {
  const desde = `${year}-${String(month).padStart(2, '0')}-01`
  const ultimoDia = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const hasta = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  const mesLabel = `${MESES[month - 1]} ${year}`
  return { desde, hasta, mesLabel }
}

export function getMesCerradoRange(now: Date, timeZone = 'America/Argentina/Buenos_Aires'): MesRange {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now) // YYYY-MM-DD
  const [year, month] = todayStr.split('-').map(Number)
  const cerradoMonth = month === 1 ? 12 : month - 1
  const cerradoYear = month === 1 ? year - 1 : year
  return buildMesRange(cerradoYear, cerradoMonth)
}

export function getMesesPreviosRanges(mesCerrado: MesRange, cantidad: number): MesRange[] {
  const [year, month] = mesCerrado.desde.split('-').map(Number)
  const ranges: MesRange[] = []
  let y = year
  let m = month
  for (let i = 0; i < cantidad; i++) {
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
    ranges.push(buildMesRange(y, m))
  }
  return ranges
}

export function agruparGastosPorMoneda(gastos: Gasto[]): Record<string, Gasto[]> {
  const grupos: Record<string, Gasto[]> = {}
  for (const gasto of gastos) {
    const moneda = gasto.moneda || 'ARS'
    if (!grupos[moneda]) grupos[moneda] = []
    grupos[moneda].push(gasto)
  }
  return grupos
}

export function separarFijosYVariables(gastos: Gasto[]): { fijos: Gasto[]; variables: Gasto[] } {
  return {
    fijos: gastos.filter(g => g.esFijo),
    variables: gastos.filter(g => !g.esFijo),
  }
}

export function totalPorMoneda(gastos: Gasto[]): Record<string, number> {
  const totales: Record<string, number> = {}
  for (const gasto of gastos) {
    const moneda = gasto.moneda || 'ARS'
    totales[moneda] = (totales[moneda] ?? 0) + gasto.precio
  }
  return totales
}

export function buildClaudeUserPrompt(
  mesLabel: string,
  gastosDelMesPorMoneda: Record<string, Gasto[]>,
  gastosPreviosPorMoneda: Record<string, Gasto[]>,
): string {
  return [
    `Mes a analizar: ${mesLabel}.`,
    `Gastos variables del mes, agrupados por moneda (cada gasto tiene objeto, precio, moneda, medio, etiqueta, esFijo, fecha): ${JSON.stringify(gastosDelMesPorMoneda)}`,
    `Gastos variables de hasta 2 meses previos, agrupados por moneda, SOLO para calcular promedios de comparación (no los listes en detalle en la respuesta): ${JSON.stringify(gastosPreviosPorMoneda)}`,
    'Devolvé el análisis usando la herramienta reportar_analisis.',
  ].join('\n\n')
}

export function parseClaudeAnalysis(raw: unknown): AnalisisMensual {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Respuesta de Claude no es un objeto')
  }
  const obj = raw as Record<string, unknown>

  if (typeof obj.resumenGeneral !== 'string' || !obj.resumenGeneral.trim()) {
    throw new Error('resumenGeneral inválido')
  }

  if (!Array.isArray(obj.categorias)) throw new Error('categorias inválido')
  const categorias = obj.categorias.map((c, i) => {
    if (typeof c !== 'object' || c === null) throw new Error(`categorias[${i}] inválido`)
    const cat = c as Record<string, unknown>
    if (typeof cat.nombre !== 'string' || typeof cat.total !== 'number') {
      throw new Error(`categorias[${i}] inválido`)
    }
    return {
      nombre: cat.nombre,
      total: cat.total,
      variacionPct: typeof cat.variacionPct === 'number' ? cat.variacionPct : undefined,
    }
  })

  if (!Array.isArray(obj.gastosEvitables)) throw new Error('gastosEvitables inválido')
  const gastosEvitables = obj.gastosEvitables.map((g, i) => {
    if (typeof g !== 'object' || g === null) throw new Error(`gastosEvitables[${i}] inválido`)
    const ge = g as Record<string, unknown>
    if (typeof ge.descripcion !== 'string' || typeof ge.motivo !== 'string') {
      throw new Error(`gastosEvitables[${i}] inválido`)
    }
    return { descripcion: ge.descripcion, motivo: ge.motivo }
  })

  if (!Array.isArray(obj.consejos) || obj.consejos.length < 2 || obj.consejos.length > 3) {
    throw new Error('consejos inválido')
  }
  const consejos = obj.consejos.map((c, i) => {
    if (typeof c !== 'string' || !c.trim()) throw new Error(`consejos[${i}] inválido`)
    return c
  })

  return { resumenGeneral: obj.resumenGeneral, categorias, gastosEvitables, consejos }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildEmailHtml(analisis: AnalisisMensual, mesLabel: string, totalesPorMoneda: Record<string, number>): string {
  const totalesHtml = Object.entries(totalesPorMoneda)
    .map(([moneda, total]) => `<li>${escapeHtml(moneda)}: ${total.toFixed(2)}</li>`)
    .join('')

  const categoriasHtml = analisis.categorias
    .map(c => {
      const variacion = c.variacionPct !== undefined
        ? ` (${c.variacionPct > 0 ? '+' : ''}${c.variacionPct.toFixed(0)}% vs. promedio)`
        : ''
      return `<li><strong>${escapeHtml(c.nombre)}</strong>: ${c.total.toFixed(2)}${variacion}</li>`
    })
    .join('')

  const evitablesHtml = analisis.gastosEvitables
    .map(g => `<li><strong>${escapeHtml(g.descripcion)}</strong> — ${escapeHtml(g.motivo)}</li>`)
    .join('')

  const consejosHtml = analisis.consejos.map(c => `<li>${escapeHtml(c)}</li>`).join('')

  return `
<html>
  <body style="font-family: Arial, sans-serif; color: #1E293B;">
    <h2>Tu resumen de ${escapeHtml(mesLabel)}</h2>
    <p>${escapeHtml(analisis.resumenGeneral)}</p>
    <h3>Total gastado</h3>
    <ul>${totalesHtml}</ul>
    <h3>Dónde gastaste de más</h3>
    <ul>${categoriasHtml}</ul>
    <h3>Podrías evitar</h3>
    <ul>${evitablesHtml}</ul>
    <h3>Consejos</h3>
    <ul>${consejosHtml}</ul>
    <p style="color: #64748B; font-size: 12px;">
      ¿No querés recibir más este resumen? Desactivalo desde Configuración &gt; Recibir resumen mensual por mail en la app.
    </p>
  </body>
</html>`.trim()
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `deno test supabase/functions/send-monthly-expense-report/report.test.ts`
Expected: PASS — all 13 tests green.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-monthly-expense-report/report.ts supabase/functions/send-monthly-expense-report/report.test.ts
git commit -m "feat: add pure report-building logic for monthly expense report"
```

---

### Task 5: `index.ts` — Edge Function handler wiring

**Files:**
- Create: `supabase/functions/send-monthly-expense-report/index.ts`

**Interfaces:**
- Consumes: everything exported from `report.ts` in Task 4 (exact names above), Task 1's `configuracion_usuario.recibir_reporte_mensual` column, `gastos` table columns (`objeto, precio, moneda, medio, etiqueta, es_fijo, fecha, user_id`).
- Produces: a deployable Edge Function `send-monthly-expense-report` that Task 6's cron job invokes over HTTP.

- [ ] **Step 1: Write `supabase/functions/send-monthly-expense-report/index.ts`**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import {
  getMesCerradoRange,
  getMesesPreviosRanges,
  agruparGastosPorMoneda,
  separarFijosYVariables,
  totalPorMoneda,
  buildClaudeUserPrompt,
  parseClaudeAnalysis,
  buildEmailHtml,
  type Gasto,
} from './report.ts'

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'

const CLAUDE_TOOL = {
  name: 'reportar_analisis',
  description: 'Reporta el análisis financiero mensual estructurado del usuario.',
  input_schema: {
    type: 'object',
    properties: {
      resumenGeneral: { type: 'string' },
      categorias: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            total: { type: 'number' },
            variacionPct: { type: 'number' },
          },
          required: ['nombre', 'total'],
        },
      },
      gastosEvitables: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            descripcion: { type: 'string' },
            motivo: { type: 'string' },
          },
          required: ['descripcion', 'motivo'],
        },
      },
      consejos: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 3,
      },
    },
    required: ['resumenGeneral', 'categorias', 'gastosEvitables', 'consejos'],
  },
}

const SYSTEM_PROMPT = [
  'Sos un asesor financiero criterioso.',
  'Agrupá los gastos variables en categorías razonables inferidas del texto (objeto/etiqueta/medio) — no uses una taxonomía fija, inferila de los datos.',
  'Identificá en qué categorías el usuario gastó notablemente más que su promedio de los meses previos (si hay historial) o qué categorías dominan el gasto del mes (si no hay historial suficiente).',
  'Sugerí entre 2 y 4 gastos o patrones concretos que podría recortar sin afectar necesidades básicas: nunca sugieras recortar gastos con esFijo true, y sé conservador — si un gasto parece necesario (alquiler, salud, educación, transporte al trabajo) no lo marques como recortable aunque sea alto.',
  'Analizá cada moneda como bloque independiente, sin convertir entre monedas.',
  'Respondé exclusivamente llamando a la herramienta reportar_analisis.',
].join(' ')

function mapRowToGasto(row: Record<string, unknown>): Gasto {
  return {
    objeto: (row.objeto as string) ?? '',
    precio: Number(row.precio) || 0,
    moneda: (row.moneda as string) || 'ARS',
    medio: (row.medio as string) ?? null,
    etiqueta: (row.etiqueta as string) ?? null,
    esFijo: !!row.es_fijo,
    fecha: row.fecha as string,
  }
}

async function fetchGastosDelRango(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  desde: string,
  hasta: string,
): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from('gastos')
    .select('objeto, precio, moneda, medio, etiqueta, es_fijo, fecha')
    .eq('user_id', userId)
    .gte('fecha', desde)
    .lte('fecha', hasta)
  if (error) throw error
  return (data ?? []).map(mapRowToGasto)
}

async function callClaude(apiKey: string, prompt: string): Promise<unknown> {
  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [CLAUDE_TOOL],
      tool_choice: { type: 'tool', name: 'reportar_analisis' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Claude API error: ${JSON.stringify(json)}`)
  const toolUse = (json.content ?? []).find((block: { type: string }) => block.type === 'tool_use')
  if (!toolUse) throw new Error('Claude no devolvió tool_use')
  return toolUse.input
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY secret not configured')

  const gmailUser = Deno.env.get('GMAIL_USER')
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')
  if (!gmailUser || !gmailAppPassword) throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD secrets not configured')

  const smtp = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: gmailUser, password: gmailAppPassword },
    },
  })

  const mesCerrado = getMesCerradoRange(new Date())
  const mesesPrevios = getMesesPreviosRanges(mesCerrado, 2)

  const { data: usuarios, error: usuariosError } = await supabase
    .from('configuracion_usuario')
    .select('user_id')
    .eq('recibir_reporte_mensual', true)

  if (usuariosError) {
    console.error('[MonthlyReport] Error fetching usuarios:', usuariosError.message)
    return new Response(JSON.stringify({ error: usuariosError.message }), { status: 500 })
  }

  let usuariosProcesados = 0
  let mailsEnviados = 0

  for (const { user_id } of usuarios ?? []) {
    usuariosProcesados++
    try {
      const gastosDelMes = await fetchGastosDelRango(supabase, user_id, mesCerrado.desde, mesCerrado.hasta)
      const { fijos, variables } = separarFijosYVariables(gastosDelMes)
      if (variables.length === 0) continue

      const gastosPreviosArrays = await Promise.all(
        mesesPrevios.map(rango => fetchGastosDelRango(supabase, user_id, rango.desde, rango.hasta)),
      )
      const gastosPreviosVariables = gastosPreviosArrays.flat().filter(g => !g.esFijo)

      const gastosDelMesPorMoneda = agruparGastosPorMoneda(variables)
      const gastosPreviosPorMoneda = agruparGastosPorMoneda(gastosPreviosVariables)

      const prompt = buildClaudeUserPrompt(mesCerrado.mesLabel, gastosDelMesPorMoneda, gastosPreviosPorMoneda)
      const rawAnalysis = await callClaude(anthropicApiKey, prompt)
      const analisis = parseClaudeAnalysis(rawAnalysis)

      const totales = totalPorMoneda([...fijos, ...variables])
      const html = buildEmailHtml(analisis, mesCerrado.mesLabel, totales)

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id)
      if (userError || !userData?.user?.email) throw userError ?? new Error('Usuario sin email')

      await smtp.send({
        from: gmailUser,
        to: userData.user.email,
        subject: `Tu resumen de gastos de ${mesCerrado.mesLabel}`,
        html,
      })
      mailsEnviados++
    } catch (err) {
      console.error(`[MonthlyReport] Error procesando usuario ${user_id}:`, err instanceof Error ? err.message : err)
    }
  }

  await smtp.close()

  return new Response(JSON.stringify({ success: true, usuariosProcesados, mailsEnviados }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Type-check the function**

Run: `deno check supabase/functions/send-monthly-expense-report/index.ts`
Expected: no type errors (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-monthly-expense-report/index.ts
git commit -m "feat: add send-monthly-expense-report Edge Function handler"
```

---

### Task 6: Deploy, configure secrets, and schedule the cron job

**Files:**
- Create: `supabase/migrations/20260724_reporte_mensual_gastos_cron.sql`

**Interfaces:**
- Consumes: the deployed `send-monthly-expense-report` function from Task 5, `CRON_SECRET` (already used by `send-daily-viaje-summary`).

- [ ] **Step 1: Set the new secrets (run once, from the repo root, with the Supabase CLI already linked to this project)**

```bash
supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-api-key>
supabase secrets set GMAIL_USER=<your-gmail-or-workspace-address>
supabase secrets set GMAIL_APP_PASSWORD=<your-16-char-app-password>
```

`GMAIL_APP_PASSWORD` requires 2FA enabled on the Gmail/Workspace account and an "App Password" generated for it (not the account's login password). `CRON_SECRET` should already be set from the existing `send-daily-viaje-summary` function — reused as-is.

- [ ] **Step 2: Deploy the function**

```bash
supabase functions deploy send-monthly-expense-report
```

Expected: deploy succeeds, CLI prints the function URL (`https://<PROJECT_REF>.supabase.co/functions/v1/send-monthly-expense-report`).

- [ ] **Step 3: Write the cron migration file**

```sql
-- supabase/migrations/20260724_reporte_mensual_gastos_cron.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: the `send-monthly-expense-report` Edge Function must already be
-- deployed (supabase functions deploy send-monthly-expense-report), and its
-- CRON_SECRET / SUPABASE_SERVICE_ROLE_KEY / ANTHROPIC_API_KEY / GMAIL_USER /
-- GMAIL_APP_PASSWORD secrets must already be set.
--
-- Before running, replace the two placeholders below:
--   <PROJECT_REF>   — your Supabase project ref (from the project URL / dashboard settings)
--   <CRON_SECRET>   — the exact same value already set via `supabase secrets set CRON_SECRET=...`

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'monthly-expense-report',
  '0 9 1 * *', -- 09:00 UTC = 06:00 America/Argentina/Buenos_Aires (fixed UTC-3, no DST), day 1 of each month
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-monthly-expense-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 4: Apply the migration manually and verify the schedule exists**

Paste the file above (with placeholders replaced) into the Supabase dashboard SQL Editor and run it. Verify with:

```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'monthly-expense-report';
```

Expected: one row, `schedule = '0 9 1 * *'`, `active = true`.

- [ ] **Step 5: Manual end-to-end smoke test**

Using a test account: toggle "Resumen mensual por mail" on (Task 3), add at least one non-fixed `gasto` dated within the current calendar month, then manually invoke the deployed function to simulate the cron call (since the real cron only fires on the 1st):

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-monthly-expense-report \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
```

Expected: HTTP 200 with `{"success":true,"usuariosProcesados":N,"mailsEnviados":M}`. Note this will compute the *previous* calendar month's range (per `getMesCerradoRange`), so for a true smoke test either temporarily backdate the test gasto's `fecha` into last month, or accept `mailsEnviados: 0` if the test gasto is dated in the still-open current month — confirm by checking the function logs (`supabase functions logs send-monthly-expense-report`) that the test user was found and either processed or correctly skipped (no variable gastos in the closed month range).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260724_reporte_mensual_gastos_cron.sql
git commit -m "feat: schedule monthly cron trigger for send-monthly-expense-report"
```

---

## Manual QA Checklist (after all tasks)

- [ ] Toggle on in Configuración → row persists (`recibir_reporte_mensual = true` in `configuracion_usuario`).
- [ ] Toggle off → row persists as `false`, function skips that user on the next run.
- [ ] User with the toggle on but zero gastos in the closed month → no email sent, no error logged.
- [ ] User with the toggle on and only `es_fijo = true` gastos in the closed month → no email sent (treated as "no variable gastos").
- [ ] User with mixed ARS and USD gastos → email shows both totals separately, no converted/summed figure anywhere.
- [ ] Email renders correctly in Gmail and at least one other client (e.g. Apple Mail or Outlook web) — check the HTML isn't mangled.
- [ ] A gasto `objeto` containing `<`/`>` characters does not break the email's HTML structure (covered by the `buildEmailHtml` escaping test in Task 4, but worth eyeballing once in a real send).
