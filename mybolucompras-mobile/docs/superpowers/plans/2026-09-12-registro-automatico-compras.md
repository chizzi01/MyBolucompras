# Registro automático de compras (Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar compras con tarjeta leyendo las notificaciones de apps de banco en Android, y ofrecerlas al usuario en una bandeja de confirmación que las da de alta como gastos reales sin trabajo manual de tipeo.

**Architecture:** Un `NotificationListenerService` nativo (vía librería) encola notificaciones crudas en `AsyncStorage`; al volver la app a foreground se drena la cola, cada notificación pasa por un filtro de contenido → un motor de parseo por reglas (Galicia primero) con fallback a IA → deduplicación → se guarda en `notificaciones_pendientes` (Supabase); una pantalla nueva muestra esas filas como tarjetas swipeables que confirman (creando el gasto real vía `gastosService`, reusando `AgregarScreen` precargada) o descartan.

**Tech Stack:** Expo (prebuild Android), React Native, Supabase, `react-native-android-notification-listener`, OpenRouter (mismo proveedor que `ocrService.js`), TanStack Query, Jest (nuevo, solo para la lógica pura de este feature).

**Spec:** `docs/superpowers/specs/2026-09-12-registro-automatico-compras-design.md`

## Global Constraints

- Solo Android — no tocar nada de iOS ni de la config de `ios/` (no existe hoy).
- Opt-in: todo apagado por defecto hasta que el usuario active el toggle en Configuración.
- Ninguna notificación crea un gasto directamente — siempre pasa por `notificaciones_pendientes` y una confirmación manual del usuario.
- Reusar servicios y patrones existentes en vez de crear paralelos: `gastosService.crear()` para el alta real, mismo proveedor OpenRouter que `ocrService.js`, mismo patrón de hooks (`useQuery`/`useMutation`) que `useConfiguracion`/`useGastoMutations`.
- **Desviación deliberada del spec**: el spec describía un "whitelist de packages" por banco para filtrar notificaciones. Este plan reemplaza eso por un filtro de contenido (keywords + patrón de monto) — evita tener que adivinar ~13 identificadores de paquete de Android que no se pueden verificar sin cada app instalada, y es al menos igual de preciso porque el texto de una notificación de compra real es muy distintivo. La columna `banco_package` se sigue llenando, pero con lo que la propia librería nativa reporte en tiempo real, no con una lista precargada.
- El texto real de Galicia (título `Pagaste: $12.000`, cuerpo `A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35`) es el único ejemplo confirmado; las plantillas de otros bancos no se escriben en este plan — quedan cubiertas por el fallback de IA hasta que se agregue una plantilla dedicada en una iteración futura.
- La API exacta de `react-native-android-notification-listener` (nombres de métodos, forma del payload) se toma de la documentación pública conocida de la librería, pero el Task 9 dedica su primer paso a confirmarla contra el paquete real instalado antes de escribir el wrapper — no asumas los nombres a ciegas si difieren.

---

## File Structure

```
src/services/notificaciones/
  filtro.js              # filtro de contenido (¿es esto una notificación de compra?)
  plantillas.js          # reglas de extracción por banco (Galicia)
  parseIA.js             # fallback a IA (OpenRouter, texto)
  parser.js              # orquestador: filtro -> plantillas -> IA
  dedup.js                # detección de duplicados
  __tests__/
    filtro.test.js
    plantillas.test.js
    parseIA.test.js
    parser.test.js
    dedup.test.js
src/services/notificacionesPendientesService.js   # CRUD Supabase (patrón gastosService)
src/services/comerciosAprendidosService.js        # CRUD Supabase (aprendizaje comercio->etiqueta)
src/services/notificationListenerBridge.js        # wrapper nativo (permiso, start/stop, cola)
src/services/notificacionesQueueProcessor.js      # drena la cola -> parser -> dedup -> insert
src/hooks/queries/useNotificacionesPendientes.js
src/hooks/mutations/useNotificacionesPendientesMutations.js
src/components/PendienteCompraCard.jsx
src/screens/PendientesComprasScreen.jsx
plugins/withNotificationListener.js
supabase/migrations/20260912_notificaciones_pendientes.sql
jest.config.js
babel.config.test.js
```

Modificados: `package.json`, `app.json`, `App.js`, `src/screens/ConfiguracionScreen.jsx`, `src/screens/GastosScreen.jsx`, `src/screens/AgregarScreen.jsx`.

---

### Task 1: Infraestructura de tests + filtro de contenido

El repo no tiene Jest configurado hoy. Se agrega un setup mínimo, aislado de Metro (Metro no lee `babel.config.test.js`, así que esto no afecta el bundling de la app), suficiente para testear la lógica pura de este feature con Node.

**Files:**
- Create: `jest.config.js`
- Create: `babel.config.test.js`
- Modify: `package.json`
- Create: `src/services/notificaciones/filtro.js`
- Test: `src/services/notificaciones/__tests__/filtro.test.js`

**Interfaces:**
- Produces: `esNotificacionDeCompra({ titulo, texto }) => boolean`, usado por Task 4 (`parser.js`).

- [ ] **Step 1: Agregar devDependencies y script de test**

En `package.json`, dentro de `"devDependencies"`:
```json
"devDependencies": {
  "@types/react": "~19.1.10",
  "typescript": "~5.9.2",
  "jest": "^29.7.0",
  "babel-jest": "^29.7.0",
  "@babel/core": "^7.24.0",
  "@babel/preset-env": "^7.24.0"
}
```
Y en `"scripts"`:
```json
"test": "jest"
```

Instalar:
```bash
npm install
```

- [ ] **Step 2: Crear la config de Babel solo para tests**

`babel.config.test.js`:
```js
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
```

- [ ] **Step 3: Crear `jest.config.js`**

```js
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.jsx?$': ['babel-jest', { configFile: './babel.config.test.js' }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  testMatch: ['**/__tests__/**/*.test.js'],
};
```

- [ ] **Step 4: Escribir el test del filtro (falla primero)**

`src/services/notificaciones/__tests__/filtro.test.js`:
```js
const { esNotificacionDeCompra } = require('../filtro');

describe('esNotificacionDeCompra', () => {
  test('acepta una notificación real de compra de Galicia', () => {
    expect(esNotificacionDeCompra({
      titulo: 'Pagaste: $12.000',
      texto: 'A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35',
    })).toBe(true);
  });

  test('rechaza una notificación de transferencia recibida', () => {
    expect(esNotificacionDeCompra({
      titulo: '¡Recibiste plata! 💰🤑',
      texto: 'Agustin Chizzini Melo te envió: $50.000',
    })).toBe(false);
  });

  test('rechaza texto sin monto', () => {
    expect(esNotificacionDeCompra({
      titulo: 'Nuevo mensaje',
      texto: 'Tenés una notificación pendiente',
    })).toBe(false);
  });

  test('rechaza un resumen de cuenta aunque mencione un monto', () => {
    expect(esNotificacionDeCompra({
      titulo: 'Resumen de tu tarjeta',
      texto: 'Tu resumen cerró en $45.230, vencimiento 10/10',
    })).toBe(false);
  });
});
```

- [ ] **Step 5: Correr el test y verificar que falla**

Run: `npm test -- filtro.test.js`
Expected: FAIL — `Cannot find module '../filtro'`

- [ ] **Step 6: Implementar `filtro.js`**

```js
// src/services/notificaciones/filtro.js
// Decide si una notificación de una app cualquiera parece ser una compra con
// tarjeta. No depende de saber el package name del banco: el texto de una
// notificación de compra real es lo bastante distintivo (monto + verbo de
// pago) como para separarlo de mensajería, juegos, etc. sin una whitelist.

const PATRON_MONTO = /\$\s*[\d.,]+/;

const PALABRAS_COMPRA = [
  /pagaste/i,
  /compra(ste)?\b/i,
  /consumo/i,
  /operaci[oó]n (aprobada|realizada)/i,
];

const PALABRAS_EXCLUIR = [
  /recibiste/i,
  /te envi[oó]/i,
  /resumen/i,
  /vencimiento/i,
  /rechazad/i,
  /promoci[oó]n/i,
  /oferta/i,
];

function esNotificacionDeCompra({ titulo = '', texto = '' }) {
  const contenido = `${titulo}\n${texto}`;
  if (!PATRON_MONTO.test(contenido)) return false;
  if (PALABRAS_EXCLUIR.some((rx) => rx.test(contenido))) return false;
  return PALABRAS_COMPRA.some((rx) => rx.test(contenido));
}

module.exports = { esNotificacionDeCompra };
```

- [ ] **Step 7: Correr el test y verificar que pasa**

Run: `npm test -- filtro.test.js`
Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add jest.config.js babel.config.test.js package.json package-lock.json src/services/notificaciones/filtro.js src/services/notificaciones/__tests__/filtro.test.js
git commit -m "feat: infraestructura de tests + filtro de notificaciones de compra"
```

---

### Task 2: Plantilla de parseo de Galicia

**Files:**
- Create: `src/services/notificaciones/plantillas.js`
- Test: `src/services/notificaciones/__tests__/plantillas.test.js`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `PLANTILLAS` (array de `{ banco, extraer(titulo, texto) }`), `parseMontoBancario(str) => number`. Usado por Task 4 (`parser.js`).

- [ ] **Step 1: Escribir el test (falla primero)**

`src/services/notificaciones/__tests__/plantillas.test.js`:
```js
const { PLANTILLAS, parseMontoBancario } = require('../plantillas');

describe('parseMontoBancario', () => {
  test('miles con punto, sin decimales', () => {
    expect(parseMontoBancario('12.000')).toBe(12000);
  });
  test('miles con punto y decimales con coma', () => {
    expect(parseMontoBancario('1.234,56')).toBe(1234.56);
  });
  test('sin separadores', () => {
    expect(parseMontoBancario('500')).toBe(500);
  });
});

describe('plantilla Galicia', () => {
  const galicia = PLANTILLAS.find((p) => p.banco === 'Galicia');

  test('extrae los datos de la notificación real', () => {
    const resultado = galicia.extraer(
      'Pagaste: $12.000',
      'A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35',
    );
    expect(resultado).toEqual({
      monto: 12000,
      moneda: 'ARS',
      comercio_raw: 'MANTECA LB-MANTECA LB HE',
      medio: 'Visa',
      tipo: 'debito',
      ultimos4: '2665',
    });
  });

  test('devuelve null si el título no matchea', () => {
    expect(galicia.extraer('Notificación', 'algo')).toBeNull();
  });

  test('reconoce tarjeta de crédito', () => {
    const resultado = galicia.extraer(
      'Pagaste: $3.500',
      'A FARMACIA DEL SUR con tu Mastercard Crédito 7788 a las 09:10',
    );
    expect(resultado.tipo).toBe('credito');
    expect(resultado.medio).toBe('Mastercard');
    expect(resultado.ultimos4).toBe('7788');
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- plantillas.test.js`
Expected: FAIL — `Cannot find module '../plantillas'`

- [ ] **Step 3: Implementar `plantillas.js`**

```js
// src/services/notificaciones/plantillas.js
// Reglas de extracción por banco, basadas en el texto real de sus
// notificaciones de compra. Cada plantilla intenta matchear; si no matchea
// devuelve null y el orquestador (parser.js) sigue probando las demás o cae
// al fallback de IA.

function parseMontoBancario(valor) {
  const limpio = String(valor).replace(/\s/g, '');
  if (limpio.includes(',')) {
    return Number(limpio.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return Number(limpio.replace(/\./g, '')) || 0;
}

function normalizarTipo(valor) {
  const v = valor.toLowerCase();
  if (v.startsWith('d')) return 'debito';
  if (v.startsWith('c')) return 'credito';
  return null;
}

const PLANTILLAS = [
  {
    banco: 'Galicia',
    // Notificación real confirmada por el usuario:
    //   título: "Pagaste: $12.000"
    //   cuerpo: "A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35"
    // La fecha/hora no se extrae del texto (no trae día/mes): se usa el
    // timestamp de la notificación, que el orquestador agrega por fuera.
    extraer(titulo, texto) {
      const montoMatch = titulo.match(/Pagaste:\s*\$\s*([\d.,]+)/i);
      const comercioMatch = texto.match(/^A\s+(.+?)\s+con tu/i);
      const medioMatch = texto.match(
        /con tu\s+(Visa|Mastercard|American Express)\s+(D[ée]bito|Cr[ée]dito)\s+(\d{4})/i,
      );
      if (!montoMatch || !comercioMatch || !medioMatch) return null;
      return {
        monto: parseMontoBancario(montoMatch[1]),
        moneda: 'ARS',
        comercio_raw: comercioMatch[1].trim(),
        medio: medioMatch[1],
        tipo: normalizarTipo(medioMatch[2]),
        ultimos4: medioMatch[3],
      };
    },
  },
];

module.exports = { PLANTILLAS, parseMontoBancario, normalizarTipo };
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test -- plantillas.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/notificaciones/plantillas.js src/services/notificaciones/__tests__/plantillas.test.js
git commit -m "feat: plantilla de parseo de notificaciones de Galicia"
```

---

### Task 3: Fallback de parseo con IA

**Files:**
- Create: `src/services/notificaciones/parseIA.js`
- Test: `src/services/notificaciones/__tests__/parseIA.test.js`

**Interfaces:**
- Consumes: nada de tasks anteriores (mismo estilo que `src/services/ocrService.js`, pero texto en vez de imagen).
- Produces: `parseConIA(titulo, texto, apiKey) => Promise<{ monto, moneda, comercio_raw, medio, tipo, ultimos4 } | null>`. Usado por Task 4.

- [ ] **Step 1: Escribir el test (falla primero)**

`src/services/notificaciones/__tests__/parseIA.test.js`:
```js
const { parseConIA } = require('../parseIA');

describe('parseConIA', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('parsea la respuesta del modelo cuando es una compra', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              monto: '2450.00',
              comercio_raw: 'COTO CICSA',
              medio: 'Visa',
              tipo: 'credito',
              ultimos4: '4821',
              moneda: 'ARS',
            }),
          },
        }],
      }),
    });

    const resultado = await parseConIA('Compraste', 'texto de un banco sin plantilla', 'fake-key');

    expect(resultado).toEqual({
      monto: 2450,
      moneda: 'ARS',
      comercio_raw: 'COTO CICSA',
      medio: 'Visa',
      tipo: 'credito',
      ultimos4: '4821',
    });
  });

  test('devuelve null si el modelo dice que no es una compra', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"esCompra": false}' } }],
      }),
    });

    const resultado = await parseConIA('Hola', 'no es un pago', 'fake-key');
    expect(resultado).toBeNull();
  });

  test('devuelve null si la respuesta HTTP falla', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const resultado = await parseConIA('x', 'y', 'fake-key');
    expect(resultado).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- parseIA.test.js`
Expected: FAIL — `Cannot find module '../parseIA'`

- [ ] **Step 3: Implementar `parseIA.js`**

```js
// src/services/notificaciones/parseIA.js
// Fallback de parseo cuando ninguna plantilla de reglas matchea. Mismo
// proveedor que ocrService.js (OpenRouter), pero sobre texto en vez de imagen.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const PROMPT = `Extraé los datos de esta notificación de una app de banco o billetera virtual argentina. Es una notificación de una COMPRA con tarjeta (no un resumen de cuenta, ni un envío/recepción de dinero, ni una promoción).
Devolvé SOLO este JSON, sin texto adicional ni markdown:
{
  "monto": "número sin símbolo de moneda, con punto como separador decimal (ej 12000 o 1234.56)",
  "comercio_raw": "nombre del comercio tal cual aparece en el texto",
  "medio": "Visa, Mastercard, American Express u otro medio mencionado, o null si no aparece",
  "tipo": "debito o credito si se menciona, o null si no aparece",
  "ultimos4": "últimos 4 dígitos de la tarjeta si aparecen, o null",
  "moneda": "ARS, USD u otra si se menciona explícitamente, sino ARS"
}
Si el texto NO es una notificación de compra, respondé exactamente: {"esCompra": false}`;

async function parseConIA(titulo, texto, apiKey) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://mybolucompras.app',
      'X-Title': 'Budget Buddy',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'user', content: `${PROMPT}\n\nTítulo: ${titulo}\nTexto: ${texto}` },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  if (parsed.esCompra === false || parsed.monto == null) return null;

  return {
    monto: Number(parsed.monto) || 0,
    moneda: parsed.moneda || 'ARS',
    comercio_raw: parsed.comercio_raw || null,
    medio: parsed.medio || null,
    tipo: parsed.tipo || null,
    ultimos4: parsed.ultimos4 || null,
  };
}

module.exports = { parseConIA };
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test -- parseIA.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/notificaciones/parseIA.js src/services/notificaciones/__tests__/parseIA.test.js
git commit -m "feat: fallback de parseo de notificaciones con IA"
```

---

### Task 4: Orquestador del motor de parseo

**Files:**
- Create: `src/services/notificaciones/parser.js`
- Test: `src/services/notificaciones/__tests__/parser.test.js`

**Interfaces:**
- Consumes: `esNotificacionDeCompra` (Task 1), `PLANTILLAS` (Task 2), `parseConIA` (Task 3).
- Produces: `parsearNotificacion({ titulo, texto, apiKey }) => Promise<{ monto, moneda, comercio_raw, medio, tipo, ultimos4, banco, fuente } | null>`. Usado por Task 10 (`notificacionesQueueProcessor.js`).

- [ ] **Step 1: Escribir el test (falla primero)**

`src/services/notificaciones/__tests__/parser.test.js`:
```js
jest.mock('../parseIA');
const { parseConIA } = require('../parseIA');
const { parsearNotificacion } = require('../parser');

describe('parsearNotificacion', () => {
  afterEach(() => jest.clearAllMocks());

  test('descarta notificaciones que no son de compra sin llamar a la IA', async () => {
    const resultado = await parsearNotificacion({
      titulo: '¡Recibiste plata!',
      texto: 'te envió $50.000',
      apiKey: 'fake',
    });
    expect(resultado).toBeNull();
    expect(parseConIA).not.toHaveBeenCalled();
  });

  test('usa la plantilla de Galicia cuando matchea, sin llamar a la IA', async () => {
    const resultado = await parsearNotificacion({
      titulo: 'Pagaste: $12.000',
      texto: 'A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35',
      apiKey: 'fake',
    });
    expect(resultado).toMatchObject({ monto: 12000, banco: 'Galicia', fuente: 'regla' });
    expect(parseConIA).not.toHaveBeenCalled();
  });

  test('cae al fallback de IA cuando ninguna plantilla matchea', async () => {
    parseConIA.mockResolvedValue({
      monto: 2450, moneda: 'ARS', comercio_raw: 'COTO', medio: 'Visa', tipo: 'credito', ultimos4: '4821',
    });
    const resultado = await parsearNotificacion({
      titulo: 'Compraste $2.450 en COTO',
      texto: 'con tu tarjeta',
      apiKey: 'fake',
    });
    expect(resultado).toMatchObject({ monto: 2450, banco: null, fuente: 'ia' });
    expect(parseConIA).toHaveBeenCalledTimes(1);
  });

  test('sin apiKey y sin plantilla, no llama a la IA y devuelve null', async () => {
    const resultado = await parsearNotificacion({
      titulo: 'Compraste $2.450 en COTO',
      texto: 'con tu tarjeta',
      apiKey: null,
    });
    expect(resultado).toBeNull();
    expect(parseConIA).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- parser.test.js`
Expected: FAIL — `Cannot find module '../parser'`

- [ ] **Step 3: Implementar `parser.js`**

```js
// src/services/notificaciones/parser.js
// Orquesta el motor de parseo: filtro de contenido -> plantillas de reglas
// -> fallback de IA. Nunca llama a la IA si el filtro ya descartó la
// notificación o si ya hubo match por regla.

const { esNotificacionDeCompra } = require('./filtro');
const { PLANTILLAS } = require('./plantillas');
const { parseConIA } = require('./parseIA');

async function parsearNotificacion({ titulo, texto, apiKey }) {
  if (!esNotificacionDeCompra({ titulo, texto })) return null;

  for (const plantilla of PLANTILLAS) {
    const resultado = plantilla.extraer(titulo, texto);
    if (resultado) {
      return { ...resultado, banco: plantilla.banco, fuente: 'regla' };
    }
  }

  if (!apiKey) return null;

  const resultadoIA = await parseConIA(titulo, texto, apiKey);
  if (!resultadoIA) return null;

  return { ...resultadoIA, banco: null, fuente: 'ia' };
}

module.exports = { parsearNotificacion };
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test -- parser.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/notificaciones/parser.js src/services/notificaciones/__tests__/parser.test.js
git commit -m "feat: orquestador del motor de parseo de notificaciones"
```

---

### Task 5: Deduplicación

**Files:**
- Create: `src/services/notificaciones/dedup.js`
- Test: `src/services/notificaciones/__tests__/dedup.test.js`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `esDuplicado(candidata, existentes) => boolean`. Usado por Task 10.

- [ ] **Step 1: Escribir el test (falla primero)**

`src/services/notificaciones/__tests__/dedup.test.js`:
```js
const { esDuplicado } = require('../dedup');

const base = {
  monto: 12000,
  ultimos4: '2665',
  fecha_detectada: '2026-09-12T14:36:00.000Z',
  estado: 'pendiente',
};

describe('esDuplicado', () => {
  test('detecta el mismo monto y tarjeta dentro de 5 minutos', () => {
    const candidata = { ...base, fecha_detectada: '2026-09-12T14:38:00.000Z' };
    expect(esDuplicado(candidata, [base])).toBe(true);
  });

  test('no lo considera duplicado si pasaron más de 5 minutos', () => {
    const candidata = { ...base, fecha_detectada: '2026-09-12T14:50:00.000Z' };
    expect(esDuplicado(candidata, [base])).toBe(false);
  });

  test('no lo considera duplicado si el monto difiere', () => {
    const candidata = { ...base, monto: 500 };
    expect(esDuplicado(candidata, [base])).toBe(false);
  });

  test('ignora filas ya descartadas', () => {
    const existente = { ...base, estado: 'descartado' };
    const candidata = { ...base };
    expect(esDuplicado(candidata, [existente])).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- dedup.test.js`
Expected: FAIL — `Cannot find module '../dedup'`

- [ ] **Step 3: Implementar `dedup.js`**

```js
// src/services/notificaciones/dedup.js
// Evita crear una fila pendiente repetida cuando el banco manda la misma
// notificación dos veces (pasa con algunos bancos al reconectar la app).

const CINCO_MINUTOS_MS = 5 * 60 * 1000;

function esDuplicado(candidata, existentes) {
  return existentes.some((existente) => {
    if (existente.estado === 'descartado') return false;
    if (Number(existente.monto) !== Number(candidata.monto)) return false;
    if ((existente.ultimos4 || null) !== (candidata.ultimos4 || null)) return false;
    const diffMs = Math.abs(
      new Date(existente.fecha_detectada).getTime() - new Date(candidata.fecha_detectada).getTime(),
    );
    return diffMs <= CINCO_MINUTOS_MS;
  });
}

module.exports = { esDuplicado };
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test -- dedup.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/notificaciones/dedup.js src/services/notificaciones/__tests__/dedup.test.js
git commit -m "feat: deduplicación de notificaciones pendientes"
```

---

### Task 6: Migración SQL

Las migraciones de este proyecto no corren solas — se pegan a mano en el SQL Editor de Supabase (ver `supabase/migrations/20260721_viaje_checklist_personal.sql` como referencia del formato).

**Files:**
- Create: `supabase/migrations/20260912_notificaciones_pendientes.sql`

**Interfaces:**
- Produces: tablas `notificaciones_pendientes` y `comercios_aprendidos`. Usadas por Task 7.

- [ ] **Step 1: Escribir la migración**

```sql
-- supabase/migrations/20260912_notificaciones_pendientes.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.

CREATE TABLE IF NOT EXISTS public.notificaciones_pendientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  banco text,
  banco_package text,
  texto_raw text NOT NULL,
  monto numeric,
  moneda text,
  comercio_raw text,
  ultimos4 text,
  medio text,
  tipo text CHECK (tipo IN ('debito', 'credito') OR tipo IS NULL),
  fuente text CHECK (fuente IN ('regla', 'ia')),
  fecha_detectada timestamptz NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'descartado')),
  gasto_id uuid REFERENCES public.gastos(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_pendientes_user_estado
  ON public.notificaciones_pendientes(user_id, estado);

ALTER TABLE public.notificaciones_pendientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "np_select" ON public.notificaciones_pendientes FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "np_insert" ON public.notificaciones_pendientes FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "np_update" ON public.notificaciones_pendientes FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "np_delete" ON public.notificaciones_pendientes FOR DELETE
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.comercios_aprendidos (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  comercio_raw text NOT NULL,
  etiqueta text,
  medio_pago text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comercio_raw)
);

ALTER TABLE public.comercios_aprendidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ca_select" ON public.comercios_aprendidos FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "ca_upsert" ON public.comercios_aprendidos FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "ca_update" ON public.comercios_aprendidos FOR UPDATE
  USING (user_id = auth.uid());
```

- [ ] **Step 2: Ejecutar manualmente**

Copiar y pegar el contenido completo del archivo en el SQL Editor del dashboard de Supabase del proyecto y ejecutarlo. Confirmar que ambas tablas aparecen en el listado de tablas y que RLS está activado (ícono de candado) en cada una.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260912_notificaciones_pendientes.sql
git commit -m "feat(db): tablas notificaciones_pendientes y comercios_aprendidos"
```

---

### Task 7: Servicios Supabase (notificaciones pendientes y comercios aprendidos)

Mismo patrón que `src/services/gastosService.js` y `src/services/configuracionService.js`: obtener sesión, filtrar por `user_id`, mapear entre snake_case (DB) y camelCase (app).

**Files:**
- Create: `src/services/notificacionesPendientesService.js`
- Create: `src/services/comerciosAprendidosService.js`
- Test: `src/services/__tests__/notificacionesPendientesService.test.js` (solo las funciones puras de mapeo, sin tocar Supabase)

**Interfaces:**
- Consumes: tablas de Task 6.
- Produces:
  - `notificacionesPendientesService.getPendientes() => Promise<Array<mapped row>>`
  - `notificacionesPendientesService.crear(datos) => Promise<mapped row>` donde `datos` es la salida de `parsearNotificacion` + `texto_raw`, `fecha_detectada`
  - `notificacionesPendientesService.confirmar(id, gastoId) => Promise<void>`
  - `notificacionesPendientesService.descartar(id) => Promise<void>`
  - `notificacionesPendientesService.mapFromDB(row)` / `mapToDB(datos)` (exportadas para el test)
  - `comerciosAprendidosService.buscar(comercioRaw) => Promise<{ etiqueta, medioPago } | null>`
  - `comerciosAprendidosService.guardar(comercioRaw, { etiqueta, medioPago }) => Promise<void>`

Usados por Task 8 (hooks) y Task 10 (queue processor).

- [ ] **Step 1: Escribir el test de mapeo (falla primero)**

`src/services/__tests__/notificacionesPendientesService.test.js`:
```js
// El service real importa ../lib/supabase, que a su vez importa 'react-native'
// y 'expo-constants' — no cargan bajo Jest plano (sin jest-expo). Se mockea
// el módulo antes de requerir el service para poder testear solo el mapeo.
jest.mock('../lib/supabase', () => ({ supabase: {} }));

const { mapFromDB, mapToDB } = require('../notificacionesPendientesService');

describe('notificacionesPendientesService mapping', () => {
  test('mapFromDB convierte snake_case a camelCase', () => {
    const row = {
      id: 'abc', banco: 'Galicia', banco_package: 'com.bancogalicia.appandroid',
      texto_raw: 'A COTO con tu Visa Débito 1234', monto: 12000, moneda: 'ARS',
      comercio_raw: 'COTO', ultimos4: '1234', medio: 'Visa', tipo: 'debito',
      fuente: 'regla', fecha_detectada: '2026-09-12T14:36:00Z', estado: 'pendiente',
      gasto_id: null, created_at: '2026-09-12T14:36:05Z',
    };
    expect(mapFromDB(row)).toEqual({
      id: 'abc', banco: 'Galicia', bancoPackage: 'com.bancogalicia.appandroid',
      textoRaw: 'A COTO con tu Visa Débito 1234', monto: 12000, moneda: 'ARS',
      comercioRaw: 'COTO', ultimos4: '1234', medio: 'Visa', tipo: 'debito',
      fuente: 'regla', fechaDetectada: '2026-09-12T14:36:00Z', estado: 'pendiente',
      gastoId: null, createdAt: '2026-09-12T14:36:05Z',
    });
  });

  test('mapToDB convierte camelCase a snake_case', () => {
    const datos = {
      banco: 'Galicia', bancoPackage: 'com.bancogalicia.appandroid',
      textoRaw: 'A COTO con tu Visa Débito 1234', monto: 12000, moneda: 'ARS',
      comercioRaw: 'COTO', ultimos4: '1234', medio: 'Visa', tipo: 'debito',
      fuente: 'regla', fechaDetectada: '2026-09-12T14:36:00Z',
    };
    expect(mapToDB(datos)).toEqual({
      banco: 'Galicia', banco_package: 'com.bancogalicia.appandroid',
      texto_raw: 'A COTO con tu Visa Débito 1234', monto: 12000, moneda: 'ARS',
      comercio_raw: 'COTO', ultimos4: '1234', medio: 'Visa', tipo: 'debito',
      fuente: 'regla', fecha_detectada: '2026-09-12T14:36:00Z',
    });
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- notificacionesPendientesService.test.js`
Expected: FAIL — `Cannot find module '../notificacionesPendientesService'`

- [ ] **Step 3: Implementar `notificacionesPendientesService.js`**

```js
// src/services/notificacionesPendientesService.js
import { supabase } from '../lib/supabase';

export const notificacionesPendientesService = {
  async getPendientes() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('notificaciones_pendientes')
      .select('*')
      .eq('user_id', user.id)
      .eq('estado', 'pendiente')
      .order('fecha_detectada', { ascending: false });
    if (error) throw error;
    return data.map(mapFromDB);
  },

  // Trae también confirmadas/descartadas recientes, usadas por dedup.js para
  // no re-insertar algo que ya se procesó.
  async getRecientes() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('notificaciones_pendientes')
      .select('monto, ultimos4, fecha_detectada, estado')
      .eq('user_id', user.id)
      .gte('fecha_detectada', desde);
    if (error) throw error;
    return data;
  },

  async crear(datos) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('notificaciones_pendientes')
      .insert([{ ...mapToDB(datos), user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async confirmar(id, gastoId) {
    const { error } = await supabase
      .from('notificaciones_pendientes')
      .update({ estado: 'confirmado', gasto_id: gastoId })
      .eq('id', id);
    if (error) throw error;
  },

  async descartar(id) {
    const { error } = await supabase
      .from('notificaciones_pendientes')
      .update({ estado: 'descartado' })
      .eq('id', id);
    if (error) throw error;
  },
};

export function mapFromDB(row) {
  return {
    id: row.id,
    banco: row.banco || null,
    bancoPackage: row.banco_package || null,
    textoRaw: row.texto_raw,
    monto: row.monto != null ? Number(row.monto) : null,
    moneda: row.moneda || null,
    comercioRaw: row.comercio_raw || null,
    ultimos4: row.ultimos4 || null,
    medio: row.medio || null,
    tipo: row.tipo || null,
    fuente: row.fuente || null,
    fechaDetectada: row.fecha_detectada,
    estado: row.estado,
    gastoId: row.gasto_id || null,
    createdAt: row.created_at,
  };
}

export function mapToDB(datos) {
  return {
    banco: datos.banco || null,
    banco_package: datos.bancoPackage || null,
    texto_raw: datos.textoRaw,
    monto: datos.monto ?? null,
    moneda: datos.moneda || null,
    comercio_raw: datos.comercioRaw || null,
    ultimos4: datos.ultimos4 || null,
    medio: datos.medio || null,
    tipo: datos.tipo || null,
    fuente: datos.fuente || null,
    fecha_detectada: datos.fechaDetectada,
  };
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test -- notificacionesPendientesService.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Implementar `comerciosAprendidosService.js`** (sin test dedicado — es CRUD directo a Supabase sin lógica propia, igual que `configuracionService.js`)

```js
// src/services/comerciosAprendidosService.js
import { supabase } from '../lib/supabase';

export const comerciosAprendidosService = {
  async buscar(comercioRaw) {
    if (!comercioRaw) return null;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return null;

    const { data, error } = await supabase
      .from('comercios_aprendidos')
      .select('etiqueta, medio_pago')
      .eq('user_id', user.id)
      .eq('comercio_raw', comercioRaw)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { etiqueta: data.etiqueta || null, medioPago: data.medio_pago || null };
  },

  async guardar(comercioRaw, { etiqueta, medioPago }) {
    if (!comercioRaw) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('comercios_aprendidos')
      .upsert({
        user_id: user.id,
        comercio_raw: comercioRaw,
        etiqueta: etiqueta || null,
        medio_pago: medioPago || null,
      });
    if (error) throw error;
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add src/services/notificacionesPendientesService.js src/services/comerciosAprendidosService.js src/services/__tests__/notificacionesPendientesService.test.js
git commit -m "feat: servicios Supabase de notificaciones pendientes y comercios aprendidos"
```

---

### Task 8: Hooks de datos (queries y mutations)

Mismo patrón que `src/hooks/queries/useConfiguracion.js` y `src/hooks/mutations/useGastoMutations.js`.

**Files:**
- Create: `src/hooks/queries/useNotificacionesPendientes.js`
- Create: `src/hooks/mutations/useNotificacionesPendientesMutations.js`

**Interfaces:**
- Consumes: `notificacionesPendientesService`, `comerciosAprendidosService` (Task 7), `useAuth` (existente).
- Produces:
  - `useNotificacionesPendientes() => { pendientes: Array, loading: boolean, refetch: fn }`
  - `useNotificacionesPendientesMutations() => { confirmar: mutation, descartar: mutation }` donde `confirmar.mutate({ id, gastoId })` y `descartar.mutate(id)`

Usados por Task 13 (`PendientesComprasScreen.jsx`) y Task 14 (`AgregarScreen.jsx`).

- [ ] **Step 1: Implementar `useNotificacionesPendientes.js`**

```js
// src/hooks/queries/useNotificacionesPendientes.js
import { useQuery } from '@tanstack/react-query';
import { notificacionesPendientesService } from '../../services/notificacionesPendientesService';
import { useAuth } from '../../context/AuthContext';

export function useNotificacionesPendientes() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['notificacionesPendientes', user?.id],
    queryFn: notificacionesPendientesService.getPendientes,
    staleTime: 60 * 1000,
    enabled: !!user,
    placeholderData: [],
  });
  return {
    ...query,
    pendientes: query.data ?? [],
    loading: query.isLoading,
  };
}
```

- [ ] **Step 2: Implementar `useNotificacionesPendientesMutations.js`**

```js
// src/hooks/mutations/useNotificacionesPendientesMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacionesPendientesService } from '../../services/notificacionesPendientesService';
import { useAuth } from '../../context/AuthContext';

export function useNotificacionesPendientesMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['notificacionesPendientes', user?.id];

  const confirmar = useMutation({
    mutationFn: ({ id, gastoId }) => notificacionesPendientesService.confirmar(id, gastoId),
    onSuccess: (_, { id }) => {
      queryClient.setQueryData(queryKey, (old) => (old ?? []).filter((p) => p.id !== id));
    },
  });

  const descartar = useMutation({
    mutationFn: (id) => notificacionesPendientesService.descartar(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKey, (old) => (old ?? []).filter((p) => p.id !== id));
    },
  });

  return { confirmar, descartar };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/useNotificacionesPendientes.js src/hooks/mutations/useNotificacionesPendientesMutations.js
git commit -m "feat: hooks de datos para notificaciones pendientes"
```

---

### Task 9: Captura nativa (listener de notificaciones)

Este task depende de una librería externa. **Antes de escribir el wrapper, confirmá su API real** — los nombres de método de abajo son los conocidos públicamente para `react-native-android-notification-listener`, pero pueden haber cambiado de versión.

**Files:**
- Create: `plugins/withNotificationListener.js`
- Create: `src/services/notificationListenerBridge.js`
- Modify: `app.json`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `notificationListenerBridge.tienePermiso() => Promise<boolean>`
  - `notificationListenerBridge.abrirAjustesDePermiso() => void`
  - `notificationListenerBridge.registrarListener(onNotificacion) => () => void` (devuelve función de limpieza)
  - Cola persistida en `AsyncStorage` bajo la key `@mybolu:colaNotificaciones` con forma `Array<{ packageName, titulo, texto, timestamp }>`, consumida por Task 10.

- [ ] **Step 1: Instalar la librería y confirmar su API**

```bash
npx expo install react-native-android-notification-listener
```

Después de instalar, abrí `node_modules/react-native-android-notification-listener/README.md` y `node_modules/react-native-android-notification-listener/index.d.ts` (o el `.js` principal si no hay tipos) y confirmá:
1. El nombre exacto del método para chequear el permiso (se asume `getPermissionStatus()`).
2. El nombre exacto del método para abrir la pantalla de ajustes del sistema (se asume `requestPermission()`).
3. El nombre del evento/callback que entrega una notificación nueva y la forma exacta del objeto (se asume `{ app, title, text, time, ... }` vía un `headless task`).
4. El nombre exportado de la tarea headless (se asume `RNAndroidNotificationListenerHeadlessJsName`).

Si alguno difiere, ajustá los Steps 2 y 4 de este task con los nombres reales — no sigas adelante con los asumidos sin este chequeo.

- [ ] **Step 2: Config plugin para el manifest**

`plugins/withNotificationListener.js` (mismo patrón que `plugins/withGoogleVerification.js`, pero usando `withAndroidManifest` en vez de `withDangerousMod` porque acá se edita el manifest, no se escribe un asset):

```js
const { withAndroidManifest } = require('@expo/config-plugins');

const SERVICE_NAME = 'com.notificationlistener.NotificationListenerService';

function withNotificationListener(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    app.service = app.service || [];

    const yaExiste = app.service.some(
      (s) => s['$']['android:name'] === SERVICE_NAME,
    );
    if (!yaExiste) {
      app.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:label': 'Budget Buddy - Detección de compras',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.service.notification.NotificationListenerService' } }],
          },
        ],
      });
    }
    return config;
  });
}

module.exports = withNotificationListener;
```

> Nota: `SERVICE_NAME` debe coincidir con la clase de servicio real que expone la librería instalada (confirmalo en su README junto con el Step 1 — algunas versiones registran el servicio ellas mismas vía su propio config plugin, en cuyo caso este archivo no hace falta y se reemplaza directamente por el plugin que la librería ya trae).

- [ ] **Step 3: Registrar el plugin en `app.json`**

En el array `"plugins"` de `app.json`, agregar antes del plugin `"./plugins/withGoogleVerification"`:
```json
"./plugins/withNotificationListener",
```

- [ ] **Step 4: Implementar el wrapper**

```js
// src/services/notificationListenerBridge.js
import { NativeEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';

const QUEUE_KEY = '@mybolu:colaNotificaciones';

async function tienePermiso() {
  const status = await RNAndroidNotificationListener.getPermissionStatus();
  return status === 'authorized';
}

function abrirAjustesDePermiso() {
  RNAndroidNotificationListener.requestPermission();
}

async function encolarNotificacion(entrada) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const cola = raw ? JSON.parse(raw) : [];
  cola.push(entrada);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(cola));
}

async function leerYVaciarCola() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const cola = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  return cola;
}

// Se suscribe a notificaciones nuevas mientras la app está en foreground.
// Las notificaciones recibidas con la app en background las captura la
// headless task registrada en index.js (Task 11) y las encola de la misma
// forma.
function registrarListener() {
  const emitter = new NativeEventEmitter(NativeModules.RNAndroidNotificationListener);
  const subscription = emitter.addListener('RNAndroidNotificationListener', async (notificacion) => {
    await encolarNotificacion({
      packageName: notificacion.app,
      titulo: notificacion.title || '',
      texto: notificacion.text || notificacion.bigText || '',
      timestamp: notificacion.time || new Date().toISOString(),
    });
  });
  return () => subscription.remove();
}

export const notificationListenerBridge = {
  tienePermiso,
  abrirAjustesDePermiso,
  registrarListener,
  leerYVaciarCola,
  QUEUE_KEY,
};
```

> El nombre del evento (`'RNAndroidNotificationListener'`) y los campos del objeto `notificacion` (`app`, `title`, `text`, `bigText`, `time`) son los documentados públicamente por la librería al momento de escribir este plan — ajustalos si el Step 1 encontró nombres distintos.

- [ ] **Step 5: Commit**

```bash
git add plugins/withNotificationListener.js src/services/notificationListenerBridge.js app.json package.json package-lock.json
git commit -m "feat: captura nativa de notificaciones bancarias (Android)"
```

---

### Task 10: Procesador de la cola

Drena lo que encoló `notificationListenerBridge`, corre el parser (Task 4) y el dedup (Task 5), e inserta en `notificaciones_pendientes` (Task 7).

**Files:**
- Create: `src/services/notificacionesQueueProcessor.js`
- Test: `src/services/__tests__/notificacionesQueueProcessor.test.js`

**Interfaces:**
- Consumes: `notificationListenerBridge.leerYVaciarCola` (Task 9), `parsearNotificacion` (Task 4), `esDuplicado` (Task 5), `notificacionesPendientesService.crear`/`getRecientes` (Task 7).
- Produces: `procesarColaDeNotificaciones({ apiKey }) => Promise<number>` (cantidad de pendientes nuevas creadas). Usado por Task 11.

- [ ] **Step 1: Escribir el test (falla primero)**

`src/services/__tests__/notificacionesQueueProcessor.test.js`:
```js
jest.mock('../notificationListenerBridge', () => ({
  notificationListenerBridge: { leerYVaciarCola: jest.fn() },
}));
jest.mock('../notificaciones/parser', () => ({ parsearNotificacion: jest.fn() }));
jest.mock('../notificacionesPendientesService', () => ({
  notificacionesPendientesService: {
    getRecientes: jest.fn(),
    crear: jest.fn(),
  },
}));

const { notificationListenerBridge } = require('../notificationListenerBridge');
const { parsearNotificacion } = require('../notificaciones/parser');
const { notificacionesPendientesService } = require('../notificacionesPendientesService');
const { procesarColaDeNotificaciones } = require('../notificacionesQueueProcessor');

describe('procesarColaDeNotificaciones', () => {
  afterEach(() => jest.clearAllMocks());

  test('crea una fila pendiente por cada notificación parseable y no duplicada', async () => {
    notificationListenerBridge.leerYVaciarCola.mockResolvedValue([
      { packageName: 'com.bancogalicia.appandroid', titulo: 'Pagaste: $12.000', texto: 'A COTO con tu Visa Débito 1234', timestamp: '2026-09-12T14:36:00Z' },
    ]);
    notificacionesPendientesService.getRecientes.mockResolvedValue([]);
    parsearNotificacion.mockResolvedValue({
      monto: 12000, moneda: 'ARS', comercio_raw: 'COTO', medio: 'Visa', tipo: 'debito', ultimos4: '1234', banco: 'Galicia', fuente: 'regla',
    });

    const creadas = await procesarColaDeNotificaciones({ apiKey: 'fake' });

    expect(creadas).toBe(1);
    expect(notificacionesPendientesService.crear).toHaveBeenCalledWith(expect.objectContaining({
      banco: 'Galicia', bancoPackage: 'com.bancogalicia.appandroid', monto: 12000,
      fechaDetectada: '2026-09-12T14:36:00Z', textoRaw: 'Pagaste: $12.000\nA COTO con tu Visa Débito 1234',
    }));
  });

  test('no crea nada si el parser descarta la notificación', async () => {
    notificationListenerBridge.leerYVaciarCola.mockResolvedValue([
      { packageName: 'com.whatsapp', titulo: 'Juan', texto: 'Hola!', timestamp: '2026-09-12T14:36:00Z' },
    ]);
    notificacionesPendientesService.getRecientes.mockResolvedValue([]);
    parsearNotificacion.mockResolvedValue(null);

    const creadas = await procesarColaDeNotificaciones({ apiKey: 'fake' });

    expect(creadas).toBe(0);
    expect(notificacionesPendientesService.crear).not.toHaveBeenCalled();
  });

  test('no crea nada si es duplicado de una reciente', async () => {
    notificationListenerBridge.leerYVaciarCola.mockResolvedValue([
      { packageName: 'com.bancogalicia.appandroid', titulo: 'Pagaste: $12.000', texto: 'A COTO con tu Visa Débito 1234', timestamp: '2026-09-12T14:36:00Z' },
    ]);
    notificacionesPendientesService.getRecientes.mockResolvedValue([
      { monto: 12000, ultimos4: '1234', fecha_detectada: '2026-09-12T14:35:30Z', estado: 'confirmado' },
    ]);
    parsearNotificacion.mockResolvedValue({
      monto: 12000, moneda: 'ARS', comercio_raw: 'COTO', medio: 'Visa', tipo: 'debito', ultimos4: '1234', banco: 'Galicia', fuente: 'regla',
    });

    const creadas = await procesarColaDeNotificaciones({ apiKey: 'fake' });

    expect(creadas).toBe(0);
    expect(notificacionesPendientesService.crear).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- notificacionesQueueProcessor.test.js`
Expected: FAIL — `Cannot find module '../notificacionesQueueProcessor'`

- [ ] **Step 3: Implementar `notificacionesQueueProcessor.js`**

```js
// src/services/notificacionesQueueProcessor.js
import { notificationListenerBridge } from './notificationListenerBridge';
import { parsearNotificacion } from './notificaciones/parser';
import { esDuplicado } from './notificaciones/dedup';
import { notificacionesPendientesService } from './notificacionesPendientesService';

export async function procesarColaDeNotificaciones({ apiKey }) {
  const cola = await notificationListenerBridge.leerYVaciarCola();
  if (cola.length === 0) return 0;

  const recientes = await notificacionesPendientesService.getRecientes();

  let creadas = 0;
  for (const entrada of cola) {
    const resultado = await parsearNotificacion({
      titulo: entrada.titulo,
      texto: entrada.texto,
      apiKey,
    });
    if (!resultado) continue;

    const candidata = {
      monto: resultado.monto,
      ultimos4: resultado.ultimos4,
      fecha_detectada: entrada.timestamp,
    };
    if (esDuplicado(candidata, recientes)) continue;

    await notificacionesPendientesService.crear({
      banco: resultado.banco,
      bancoPackage: entrada.packageName,
      textoRaw: `${entrada.titulo}\n${entrada.texto}`,
      monto: resultado.monto,
      moneda: resultado.moneda,
      comercioRaw: resultado.comercio_raw,
      ultimos4: resultado.ultimos4,
      medio: resultado.medio,
      tipo: resultado.tipo,
      fuente: resultado.fuente,
      fechaDetectada: entrada.timestamp,
    });
    creadas += 1;
  }
  return creadas;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test -- notificacionesQueueProcessor.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/notificacionesQueueProcessor.js src/services/__tests__/notificacionesQueueProcessor.test.js
git commit -m "feat: procesador de la cola de notificaciones"
```

---

### Task 11: Wiring en `App.js` (headless task + drenado en foreground)

**Files:**
- Modify: `App.js`
- Modify: `index.js`

**Interfaces:**
- Consumes: `notificationListenerBridge` (Task 9), `procesarColaDeNotificaciones` (Task 10), `OPENROUTER_API_KEY` (`src/config/keys.js`, existente).

- [ ] **Step 1: Registrar la headless task en `index.js`**

Leer primero el `index.js` actual del repo para no pisar el `registerRootComponent` existente, y agregar antes de él (confirmando contra el Step 1 del Task 9 el nombre real exportado por la librería):

```js
import { AppRegistry } from 'react-native';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';

// Notificaciones recibidas con la app en background/cerrada: la librería
// invoca esta tarea headless, que solo encola (no puede tocar AsyncStorage
// desde JS puro sin RN inicializado del todo en algunas versiones — si el
// Step 1 del Task 9 confirma que la librería expone un helper propio de cola,
// usá ese en vez de este cuerpo).
AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListener.headlessJsTaskName ?? 'RNAndroidNotificationListenerHeadlessJs',
  () => async (notificacion) => {
    const { notificationListenerBridge } = require('./src/services/notificationListenerBridge');
    await notificationListenerBridge.encolarDesdeHeadless(notificacion);
  },
);
```

- [ ] **Step 2: Exponer `encolarDesdeHeadless` en el bridge**

En `src/services/notificationListenerBridge.js`, agregar (reusa `encolarNotificacion`, ya privada del módulo):
```js
async function encolarDesdeHeadless(notificacion) {
  await encolarNotificacion({
    packageName: notificacion.app,
    titulo: notificacion.title || '',
    texto: notificacion.text || notificacion.bigText || '',
    timestamp: notificacion.time || new Date().toISOString(),
  });
}
```
Y agregarla al objeto exportado `notificationListenerBridge`.

- [ ] **Step 3: Drenar la cola cuando la app vuelve a foreground**

En `App.js`, en `AppWithTheme` (junto al `useEffect` del `responseListener` ya existente):

```js
import { AppState } from 'react-native';
import { notificationListenerBridge } from './src/services/notificationListenerBridge';
import { procesarColaDeNotificaciones } from './src/services/notificacionesQueueProcessor';
import { OPENROUTER_API_KEY } from './src/config/keys';
```

Y dentro de `AppWithTheme`:
```js
useEffect(() => {
  if (Platform.OS !== 'android') return;

  const procesar = () => {
    procesarColaDeNotificaciones({ apiKey: OPENROUTER_API_KEY }).catch((err) => {
      console.warn('[Notificaciones] error al procesar la cola:', err?.message ?? err);
    });
  };

  procesar(); // por si hay pendientes de cuando la app estaba cerrada
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') procesar();
  });
  return () => subscription.remove();
}, []);
```

(`Platform` ya está importado en `App.js`; agregar `AppState` al import existente de `'react-native'`.)

- [ ] **Step 4: Verificación manual**

No es testeable con Jest (depende de `AppState`, `AppRegistry` y el módulo nativo real). Se valida en el Task 15 (QA manual en dispositivo).

- [ ] **Step 5: Commit**

```bash
git add App.js index.js src/services/notificationListenerBridge.js
git commit -m "feat: procesar la cola de notificaciones al volver a foreground"
```

---

### Task 12: Toggle en Configuración

**Files:**
- Modify: `src/screens/ConfiguracionScreen.jsx`

**Interfaces:**
- Consumes: `notificationListenerBridge.tienePermiso`/`abrirAjustesDePermiso`/`registrarListener` (Task 9).

- [ ] **Step 1: Agregar estado y efecto de permiso**

Cerca de los otros `useState` de `ConfiguracionScreen.jsx` (junto a los de biometría):
```js
import { AppState } from 'react-native';
import { notificationListenerBridge } from '../services/notificationListenerBridge';
```
```js
const [deteccionAutomaticaActiva, setDeteccionAutomaticaActiva] = useState(false);

const revisarPermisoNotificaciones = useCallback(async () => {
  if (Platform.OS !== 'android') return;
  const tiene = await notificationListenerBridge.tienePermiso();
  setDeteccionAutomaticaActiva(tiene);
}, []);

useEffect(() => {
  revisarPermisoNotificaciones();
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') revisarPermisoNotificaciones();
  });
  return () => subscription.remove();
}, [revisarPermisoNotificaciones]);

const handleToggleDeteccionAutomatica = () => {
  if (deteccionAutomaticaActiva) {
    showModal({
      type: 'info',
      title: 'Desactivar detección automática',
      message: 'Para desactivarla, quitá el permiso desde Ajustes del sistema → Notificaciones → Acceso a notificaciones → Budget Buddy.',
    });
    return;
  }
  showModal({
    type: 'info',
    title: 'Detectar compras automáticamente',
    message: 'Budget Buddy va a leer las notificaciones de tu app de banco para sugerirte cargar la compra. No lee WhatsApp ni mensajes personales, y nunca carga un gasto sin que lo confirmes vos.',
    confirmText: 'Ir a Ajustes',
    onConfirm: () => notificationListenerBridge.abrirAjustesDePermiso(),
  });
};
```

`Platform` y `useCallback` ya deberían estar importados en el archivo (confirmar; si no, agregarlos al import de `react` / `react-native` existente).

- [ ] **Step 2: Agregar la sección de UI**

Junto a la `AccordionSection` de "Seguridad" (mismo patrón de `Switch` + `bioRow`):
```jsx
{Platform.OS === 'android' && (
  <AccordionSection title="Detección automática" dark={dark}>
    <View style={s.card}>
      <View style={s.bioRow}>
        <View style={s.bioInfo}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color={deteccionAutomaticaActiva ? colors.primary : (dark ? '#475569' : '#94A3B8')}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.bioTitle}>Detectar compras automáticamente</Text>
            <Text style={s.bioSub}>
              Lee las notificaciones de tu app de banco y te sugiere cargar la compra.
            </Text>
          </View>
        </View>
        <Switch
          value={deteccionAutomaticaActiva}
          onValueChange={handleToggleDeteccionAutomatica}
          trackColor={{ false: dark ? '#334155' : '#CBD5E1', true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
    </View>
  </AccordionSection>
)}
```

- [ ] **Step 3: Verificación manual**

No testeable con Jest (depende del módulo nativo real y de Ajustes del sistema). Se valida en el Task 15.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ConfiguracionScreen.jsx
git commit -m "feat: toggle de detección automática de compras en Configuración"
```

---

### Task 13: Bandeja de pendientes (pantalla + tarjeta + navegación)

**Files:**
- Create: `src/components/PendienteCompraCard.jsx`
- Create: `src/screens/PendientesComprasScreen.jsx`
- Modify: `App.js`
- Modify: `src/screens/GastosScreen.jsx`

**Interfaces:**
- Consumes: `useNotificacionesPendientes`, `useNotificacionesPendientesMutations` (Task 8).
- Produces: navegación a `'PendientesCompras'` con `params: { pendiente }` hacia `'Agregar'` (usado por Task 14).

- [ ] **Step 1: Implementar `PendienteCompraCard.jsx`**

Mismo lenguaje visual y mecánica de swipe que `GastoCard.jsx`, pero con dos acciones (confirmar / descartar) en vez de una:

```jsx
// src/components/PendienteCompraCard.jsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { formatPrecioEuropeo } from '../utils/formatters';

const ACTION_WIDTH = 160;

export default function PendienteCompraCard({ pendiente, onConfirmar, onDescartar }) {
  const { dark } = useTheme();
  const s = styles(dark);
  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const base = open ? -ACTION_WIDTH : 0;
        const next = Math.min(0, Math.max(base + g.dx, -ACTION_WIDTH));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (!open && g.dx < -ACTION_WIDTH / 2) {
          Animated.spring(translateX, { toValue: -ACTION_WIDTH, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(true);
        } else if (open && g.dx > ACTION_WIDTH / 2) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(false);
        } else {
          Animated.spring(translateX, { toValue: open ? -ACTION_WIDTH : 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const precioDisplay = pendiente.monto != null
    ? formatPrecioEuropeo(pendiente.monto, pendiente.moneda || 'ARS')
    : '—';

  return (
    <View style={s.row}>
      <View style={s.actionsContainer}>
        <TouchableOpacity style={s.descartarBtn} onPress={onDescartar} activeOpacity={0.8}>
          <Ionicons name="close-circle-outline" size={22} color="#fff" />
          <Text style={s.actionText}>Descartar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.confirmarBtn} onPress={onConfirmar} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={s.actionText}>Confirmar</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }], zIndex: 1, elevation: 1 }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={s.card}
          onPress={onConfirmar}
          activeOpacity={0.75}
        >
          <View style={s.left}>
            <Text style={s.comercio} numberOfLines={1}>
              {pendiente.comercioRaw || 'Comercio desconocido'}
            </Text>
            <Text style={s.meta} numberOfLines={1}>
              {pendiente.banco || 'Banco no identificado'}
              {pendiente.medio ? ` · ${pendiente.medio}` : ''}
              {pendiente.ultimos4 ? ` ····${pendiente.ultimos4}` : ''}
            </Text>
          </View>
          <Text style={s.precio}>{precioDisplay}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  row: { marginHorizontal: spacing.md, marginVertical: spacing.xs, overflow: 'hidden' },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 6,
    elevation: 1, zIndex: 1,
  },
  left: { flex: 1, marginRight: spacing.sm },
  comercio: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, marginBottom: 2 },
  meta: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  precio: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
  actionsContainer: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden', zIndex: 0, elevation: 0,
  },
  descartarBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: colors.error },
  confirmarBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: colors.accent },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
```

- [ ] **Step 2: Implementar `PendientesComprasScreen.jsx`**

```jsx
// src/screens/PendientesComprasScreen.jsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useNotificacionesPendientes } from '../hooks/queries/useNotificacionesPendientes';
import { useNotificacionesPendientesMutations } from '../hooks/mutations/useNotificacionesPendientesMutations';
import PendienteCompraCard from '../components/PendienteCompraCard';

export default function PendientesComprasScreen() {
  const { dark } = useTheme();
  const s = styles(dark);
  const navigation = useNavigation();
  const { pendientes, loading, refetch } = useNotificacionesPendientes();
  const { descartar } = useNotificacionesPendientesMutations();

  const handleConfirmar = (pendiente) => {
    navigation.navigate('Agregar', { pendiente });
  };

  const handleDescartar = (pendiente) => {
    descartar.mutate(pendiente.id);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={dark ? colors.text.dark : colors.text.light} />
        </TouchableOpacity>
        <Text style={s.title}>Compras detectadas</Text>
      </View>

      {!loading && pendientes.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={48} color={dark ? '#334155' : '#CBD5E1'} />
          <Text style={s.emptyText}>No hay compras pendientes de confirmar.</Text>
        </View>
      ) : (
        <FlatList
          data={pendientes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: spacing.md }}
          onRefresh={refetch}
          refreshing={loading}
          renderItem={({ item }) => (
            <PendienteCompraCard
              pendiente={item}
              onConfirmar={() => handleConfirmar(item)}
              onDescartar={() => handleDescartar(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyText: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, textAlign: 'center' },
});
```

- [ ] **Step 3: Registrar la pantalla en `App.js`**

Import junto a los demás screens:
```js
import PendientesComprasScreen from './src/screens/PendientesComprasScreen';
```
Nuevo `<AuthStack.Screen>` junto a `"AgregarDeuda"`:
```jsx
<AuthStack.Screen
  name="PendientesCompras"
  component={PendientesComprasScreen}
  options={{ animation: 'slide_from_right' }}
/>
```

- [ ] **Step 4: Entrada de navegación con badge en `GastosScreen.jsx`**

Import:
```js
import { useNotificacionesPendientes } from '../hooks/queries/useNotificacionesPendientes';
```
Dentro del componente:
```js
const { pendientes } = useNotificacionesPendientes();
```
En el header, junto a `<ProfileAvatarButton size={30} />` (antes de él, mismo `View` con `flexDirection: 'row'`):
```jsx
{pendientes.length > 0 && (
  <TouchableOpacity
    onPress={() => navigation.navigate('PendientesCompras')}
    style={s.pendientesBadge}
    activeOpacity={0.75}
  >
    <Ionicons name="notifications" size={16} color="#fff" />
    <Text style={s.pendientesBadgeText}>{pendientes.length}</Text>
  </TouchableOpacity>
)}
```
Y en `styles(dark)`:
```js
pendientesBadge: {
  flexDirection: 'row', alignItems: 'center', gap: 4,
  backgroundColor: colors.primary, borderRadius: radius.full,
  paddingHorizontal: 10, paddingVertical: 6,
},
pendientesBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
```

- [ ] **Step 5: Verificación manual**

No testeable con Jest (pantalla RN con navegación real y Supabase). Se valida en el Task 15.

- [ ] **Step 6: Commit**

```bash
git add src/components/PendienteCompraCard.jsx src/screens/PendientesComprasScreen.jsx App.js src/screens/GastosScreen.jsx
git commit -m "feat: bandeja de compras pendientes de confirmar"
```

---

### Task 14: Prefill en `AgregarScreen` + confirmación del pendiente

**Files:**
- Modify: `src/screens/AgregarScreen.jsx`

**Interfaces:**
- Consumes: `route.params.pendiente` (de Task 13), `useNotificacionesPendientesMutations` (Task 8), `comerciosAprendidosService` (Task 7).

- [ ] **Step 1: Leer el `pendiente` de los route params y precargar el form**

En `AgregarScreen.jsx`, junto a donde ya se lee `routeViajeId = route.params?.viajeId`:
```js
const pendiente = route.params?.pendiente || null;
```
```js
import { useNotificacionesPendientesMutations } from '../hooks/mutations/useNotificacionesPendientesMutations';
import { comerciosAprendidosService } from '../services/comerciosAprendidosService';
```
```js
const { confirmar: confirmarPendienteMutation } = useNotificacionesPendientesMutations();
```

Modificar el `useState(form)` inicial para precargar cuando hay `pendiente` (agregar antes de la declaración de `form`, tras `mediosDisponibles`/`bancosDisponibles`):
```js
useEffect(() => {
  if (!pendiente) return;
  comerciosAprendidosService.buscar(pendiente.comercioRaw).then((aprendido) => {
    setForm((prev) => ({
      ...prev,
      objeto: pendiente.comercioRaw || prev.objeto,
      precio: pendiente.monto != null ? String(pendiente.monto) : prev.precio,
      moneda: pendiente.moneda || prev.moneda,
      medio: aprendido?.medioPago || pendiente.medio || prev.medio,
      tipo: pendiente.tipo || prev.tipo,
      etiqueta: aprendido?.etiqueta || prev.etiqueta,
      fecha: pendiente.fechaDetectada ? formatFecha(new Date(pendiente.fechaDetectada)) : prev.fecha,
    }));
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [pendiente?.id]);
```

- [ ] **Step 2: Al guardar, confirmar el pendiente y aprender el comercio**

Localizar la función que hoy llama a `agregarMutation.mutate(...)` (el submit del form) y, después de que la mutación de alta resuelva con el gasto creado, agregar:
```js
const gastoCreado = await agregarMutation.mutateAsync({ gasto, sharedWith });

if (pendiente) {
  await confirmarPendienteMutation.mutateAsync({ id: pendiente.id, gastoId: gastoCreado.id });
  if (pendiente.comercioRaw) {
    comerciosAprendidosService.guardar(pendiente.comercioRaw, {
      etiqueta: gasto.etiqueta || null,
      medioPago: gasto.medio || null,
    }).catch(() => {}); // best-effort, no bloquea el alta si falla
  }
}
```

Ubicar este bloque en el mismo `try` donde hoy se llama a `agregarMutation` (o a la mutation equivalente cuando el gasto es de un viaje — en ese caso, igual, confirmar el pendiente sirve para cualquiera de las dos ramas: gasto personal o gasto de viaje). Revisar el código real del handler de submit en `AgregarScreen.jsx` antes de aplicar el cambio, ya que el archivo tiene ramas para gasto compartido/viaje que no se transcriben acá completas — el punto de inserción es "justo después de que la mutation de creación del gasto haya resuelto exitosamente, antes de navegar hacia atrás".

- [ ] **Step 3: Verificación manual**

No testeable con Jest (pantalla RN de 1459 líneas con múltiples ramas de mutación). Se valida en el Task 15.

- [ ] **Step 4: Commit**

```bash
git add src/screens/AgregarScreen.jsx
git commit -m "feat: precargar AgregarScreen desde una compra detectada y confirmarla al guardar"
```

---

### Task 15: QA manual end-to-end

No automatizable — requiere un dispositivo Android real con la app de Galicia instalada.

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Build de desarrollo**

```bash
npx expo prebuild --platform android --clean
npm run android
```

- [ ] **Step 2: Activar el permiso**

Abrir Configuración → Detección automática → activar el toggle → conceder el acceso a notificaciones para Budget Buddy en la pantalla del sistema que se abre.

- [ ] **Step 3: Confirmar el packageName real de Galicia**

Mientras la app está en foreground, generar (o esperar) una notificación real de "Pagaste: $X" de Galicia. Confirmar en los logs (`npx expo start` con `--dev-client` o `adb logcat *:S ReactNative:V ReactNativeJS:V`) que la notificación se encoló y que `procesarColaDeNotificaciones` la proceso sin error.

- [ ] **Step 4: Verificar el flujo completo**

1. Ir a Gastos → confirmar que aparece el badge con la compra detectada.
2. Tocar el badge → ver la tarjeta en la bandeja con comercio, banco, medio y monto correctos.
3. Swipe a confirmar → se abre `AgregarScreen` con los campos precargados → guardar.
4. Confirmar que el gasto aparece en la lista de Gastos y que la tarjeta desapareció de la bandeja.
5. Repetir con una segunda compra del mismo comercio y confirmar que la etiqueta/medio quedan precargados automáticamente (aprendizaje de `comercios_aprendidos`).
6. Probar "descartar" en una tarjeta y confirmar que desaparece sin crear ningún gasto.
7. Cerrar la app completamente (swipe desde recientes), generar una notificación de compra, reabrir la app y confirmar que igual aparece en la bandeja (valida la headless task del Task 11).

- [ ] **Step 5: Anotar en el spec cualquier ajuste**

Si el packageName real de Galicia, los nombres de la librería (Task 9 Step 1) o el formato de alguna notificación difieren de lo asumido en este plan, actualizar `docs/superpowers/specs/2026-09-12-registro-automatico-compras-design.md` con los valores reales antes de cerrar la feature.

---

## Spec Coverage Check

- Captura nativa opt-in con permiso manual → Task 9, 12.
- Filtro para no procesar apps ajenas al dominio bancario → Task 1 (reemplaza whitelist de packages por filtro de contenido, documentado como desviación en Global Constraints).
- Motor de parseo por capas (reglas → IA) → Task 2, 3, 4.
- Plantilla real de Galicia → Task 2.
- Aprendizaje comercio → categoría → Task 7 (`comerciosAprendidosService`), Task 14.
- Esquema de datos y RLS → Task 6.
- Deduplicación → Task 5, 10.
- Bandeja de pendientes con confirmar/descartar → Task 13.
- Reusar `gastosService.crear()` en vez de una inserción paralela → Task 14 (via `AgregarScreen`).
- Manejo de notificaciones no-compra (resumen, vencimiento, rechazo) → Task 1 (`PALABRAS_EXCLUIR`).
- Testing de la lógica pura → Task 1, 2, 3, 4, 5, 7, 10.
- Verificación manual de lo no testeable → Task 15.
