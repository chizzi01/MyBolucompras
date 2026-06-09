# Proyección de Gastos Futuros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar gastos proyectados en el dashboard navegando hasta 6 meses hacia adelante, con visual diferenciado (naranja), KPI "próximo mes" tocable en el mes actual, y modal de desglose por moneda al tocar el hero total.

**Architecture:** Se extrae la lógica de filtrado ya existente en `DashboardScreen.jsx` a `src/utils/proyeccion.js` para reutilizarla. `DashboardScreen` se extiende con estado de navegación futura, visual condicional basado en `esMesFuturo`, y un nuevo `ProyeccionModal` que recibe los gastos ya calculados.

**Tech Stack:** React Native (Expo), React hooks (useState, useMemo), React Native Modal, @expo/vector-icons (Ionicons), colores/estilos del proyecto en `src/constants/theme.js`.

---

## File Map

| Acción | Archivo |
|--------|---------|
| Crear  | `src/utils/proyeccion.js` |
| Crear  | `src/components/ProyeccionModal.jsx` |
| Modificar | `src/screens/DashboardScreen.jsx` |

---

## Task 1: Crear `src/utils/proyeccion.js`

**Files:**
- Create: `src/utils/proyeccion.js`

Extraer la lógica de filtrado mensual de `DashboardScreen.jsx` (líneas 55-100) a funciones reutilizables. Esto permite calcular el "próximo mes" en `statsProxMes` sin duplicar código.

- [ ] **Step 1: Crear el archivo**

```js
// src/utils/proyeccion.js
import { parsePrecio, formatPrecioEuropeo, getCurrencySymbol } from './formatters';
import { gastoEntraEsteMes, getSingleCuotaBillingIndex } from './cuotas';

// Costo que un gasto aporta al mes seleccionado.
// Fijo: precio × cantidad. Crédito multi-cuota: precio / cuotas. Resto: precio.
export function getCostoMes(gasto) {
  if (gasto.isFijo) return parsePrecio(gasto.precio) * (parseInt(gasto.cantidad) || 1);
  if (gasto.tipo === 'credito' && Number(gasto.cuotas) > 1)
    return parsePrecio(gasto.precio) / Number(gasto.cuotas);
  return parsePrecio(gasto.precio);
}

// Filtra los gastos que aplican al mes dado (mesSel = { mes: 0-11, anio: YYYY }).
// Replica exactamente la lógica de gastosVariablesMes + gastosFijosMes de DashboardScreen.
export function getGastosMes(gastos, mesSel, mydata) {
  const targetIndex = mesSel.anio * 12 + mesSel.mes;
  const hoy = new Date();
  const hoyIndex = hoy.getFullYear() * 12 + hoy.getMonth();

  const gastosVariables = gastos.filter(g => {
    if (g.isFijo) return false;
    const [, m, y] = (g.fecha || '').split('/');
    const compraIndex = Number(y) * 12 + (Number(m) - 1);
    const cuotas = parseInt(g.cuotas) || 1;

    if (g.tipo === 'credito') {
      if (cuotas > 1) {
        if (targetIndex < compraIndex || targetIndex >= compraIndex + cuotas) return false;
      } else {
        const billingIndex = getSingleCuotaBillingIndex(g, mydata);
        if (billingIndex !== targetIndex) return false;
      }
      if (targetIndex === hoyIndex) return gastoEntraEsteMes(g, mydata);
      return true;
    }
    return compraIndex === targetIndex;
  });

  const gastosFijos = gastos.filter(g => {
    if (!g.isFijo) return false;
    const [, m, y] = (g.fecha || '').split('/');
    const startIndex = Number(y) * 12 + (Number(m) - 1);
    if (targetIndex < startIndex) return false;
    const period = parseInt(g.cuotas) || 0;
    return period === 0 || targetIndex < startIndex + period;
  });

  return [...gastosVariables, ...gastosFijos];
}

// Suma precio por moneda usando getCostoMes.
// Retorna { ARS: 284500, USD: 25, ... }
export function calcularTotalesPorMoneda(gastos) {
  const totales = {};
  gastos.forEach(g => {
    const moneda = g.moneda || 'ARS';
    totales[moneda] = (totales[moneda] || 0) + getCostoMes(g);
  });
  return totales;
}

// Formato compacto para KPI chips: "$284k", "US$1,2M", etc.
export function formatAmountShort(amount, moneda = 'ARS') {
  const sym = getCurrencySymbol(moneda);
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${sym}${Math.round(amount / 1_000)}k`;
  return formatPrecioEuropeo(amount, moneda);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/proyeccion.js
git commit -m "feat: add proyeccion.js utility for monthly expense projection"
```

---

## Task 2: Refactorizar stats useMemo en DashboardScreen

**Files:**
- Modify: `src/screens/DashboardScreen.jsx`

Reemplazar la lógica inline de filtrado (líneas 61-100) con llamadas a `proyeccion.js`. Sin cambio de comportamiento visible.

- [ ] **Step 1: Agregar el import al inicio del archivo**

Al inicio de `DashboardScreen.jsx`, reemplazar:
```js
import { getCuotasRestantes, gastoEntraEsteMes, getSingleCuotaBillingIndex } from '../utils/cuotas';
```
Por:
```js
import { getCuotasRestantes } from '../utils/cuotas';
import { getGastosMes, getCostoMes, calcularTotalesPorMoneda } from '../utils/proyeccion';
```

- [ ] **Step 2: Reemplazar el stats useMemo**

Ubicar el bloque `const stats = useMemo(() => {` (línea 50) y reemplazarlo completo:

```js
const stats = useMemo(() => {
  const gastosMes = getGastosMes(gastos, mesSel, mydata);
  const totalesPorMoneda = calcularTotalesPorMoneda(gastosMes);

  const cuotasActivas = gastos.filter(g => {
    if (g.isFijo) return true;
    const r = getCuotasRestantes(g, mydata);
    return r === 'N/A' || r > 0;
  }).length;

  const masCaro = gastosMes.reduce((max, g) => {
    const p = getCostoMes(g);
    return p > (max?.precio || 0) ? { ...g, precio: p } : max;
  }, null);

  const porEtiqueta = {};
  gastosMes.forEach(g => {
    if (g.moneda !== 'ARS') return;
    const etiq = g.etiqueta || 'Sin etiqueta';
    porEtiqueta[etiq] = (porEtiqueta[etiq] || 0) + getCostoMes(g);
  });
  const maxEtiqueta = Math.max(...Object.values(porEtiqueta), 1);

  const cuotasPendientes = gastosMes.filter(
    g => !g.isFijo && g.tipo === 'credito' && Number(g.cuotas) > 1
  ).length;
  const fijosMes = gastosMes.filter(g => g.isFijo).length;

  return { totalesPorMoneda, cuotasActivas, masCaro, porEtiqueta, maxEtiqueta, gastosMes, cuotasPendientes, fijosMes };
}, [gastos, mydata, mesSel]);
```

- [ ] **Step 3: Verificar que la app arranca sin errores**

Correr `npx expo start` y abrir el dashboard. Verificar que los totales y KPIs muestran los mismos valores que antes.

- [ ] **Step 4: Commit**

```bash
git add src/screens/DashboardScreen.jsx
git commit -m "refactor: use proyeccion.js in DashboardScreen stats useMemo"
```

---

## Task 3: Desbloquear navegación forward + visual `esMesFuturo`

**Files:**
- Modify: `src/screens/DashboardScreen.jsx`

Permitir navegar hasta +6 meses. Cuando `esMesFuturo`, el nombre del mes se torna naranja, aparece badge "Proyectado", el hero card muestra borde naranja y se vuelve touchable, los KPIs cambian de label y color, y las secciones de deudas quedan ocultas.

- [ ] **Step 1: Agregar derivadas de navegación futura**

Inmediatamente después de la línea `const isHoy = ...` (línea 39), agregar:

```js
const mesSelIndex = mesSel.anio * 12 + mesSel.mes;
const hoyIndex = hoy.getFullYear() * 12 + hoy.getMonth();
const esMesFuturo = mesSelIndex > hoyIndex;
const esMesLimite = mesSelIndex >= hoyIndex + 6;
const [showProyeccionModal, setShowProyeccionModal] = useState(false);
```

- [ ] **Step 2: Cambiar `nextMes` para permitir +6 meses**

Reemplazar la función `nextMes` (líneas 44-48):
```js
const nextMes = () => {
  if (!isHoy) setMesSel(p =>
    p.mes === 11 ? { mes: 0, anio: p.anio + 1 } : { mes: p.mes + 1, anio: p.anio }
  );
};
```
Por:
```js
const nextMes = () => {
  if (!esMesLimite) setMesSel(p =>
    p.mes === 11 ? { mes: 0, anio: p.anio + 1 } : { mes: p.mes + 1, anio: p.anio }
  );
};
```

- [ ] **Step 3: Actualizar heroTotales para excluir deudas en meses futuros**

Reemplazar el bloque `const heroTotales = useMemo(...)` (líneas 145-151):

```js
const heroTotales = useMemo(() => {
  if (esMesFuturo) return stats.totalesPorMoneda;
  const combined = { ...stats.totalesPorMoneda };
  Object.entries(deudaStats.porMoneda).forEach(([moneda, monto]) => {
    combined[moneda] = (combined[moneda] || 0) + monto;
  });
  return combined;
}, [esMesFuturo, stats.totalesPorMoneda, deudaStats.porMoneda]);
```

- [ ] **Step 4: Actualizar el header — nombre del mes en naranja + badge "Proyectado"**

Reemplazar el bloque del `monthLabel` y el botón forward (líneas 192-205):

```jsx
<Text style={[s.monthLabel, esMesFuturo && { color: '#F97316' }]}>
  {MESES[mesSel.mes]} {mesSel.anio}
</Text>
<TouchableOpacity
  onPress={nextMes}
  style={s.monthNavBtn}
  disabled={esMesLimite}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <Ionicons
    name="chevron-forward"
    size={18}
    color={esMesLimite ? 'transparent' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
  />
</TouchableOpacity>
```

El badge va dentro del `<View style={s.monthNav}>`, como último hijo después del botón forward. De este modo queda alineado horizontalmente con la navegación sin romper el layout `space-between` del `headerRow`:

- [ ] **Step 5: Hacer el hero card touchable con estilo naranja**

Reemplazar `<View style={s.totalHero}>` (línea 209) por:

```jsx
<TouchableOpacity
  style={[s.totalHero, esMesFuturo && s.totalHeroFuturo]}
  onPress={esMesFuturo ? () => setShowProyeccionModal(true) : undefined}
  activeOpacity={esMesFuturo ? 0.85 : 1}
>
```

Y su cierre `</View>` (línea 265) por `</TouchableOpacity>`.

Cambiar el color del monto en modo futuro — reemplazar `<Text style={s.totalHeroAmount}>` por:

```jsx
<Text style={[s.totalHeroAmount, esMesFuturo && { color: '#F97316' }]}>
```

Cambiar la etiqueta del hero:
```jsx
<Text style={s.totalHeroLabel}>
  {esMesFuturo
    ? 'proyectado · tocá para ver el desglose'
    : deudaStats.count > 0
      ? `gastado + pendiente de cobro · ${MESES[mesSel.mes].toLowerCase()}`
      : `gastado en ${MESES[mesSel.mes].toLowerCase()}`}
</Text>
```

- [ ] **Step 6: Cambiar los KPI cards según esMesFuturo**

Reemplazar el bloque de KPIs (líneas 268-281):

```jsx
<View style={s.kpiRow}>
  {esMesFuturo ? (
    <>
      <KPICard
        label="Cuotas pendientes"
        value={stats.cuotasPendientes}
        dark={dark}
        accent="#F97316"
      />
      <KPICard
        label="Fijos activos"
        value={stats.fijosMes}
        dark={dark}
        accent="#F97316"
      />
    </>
  ) : (
    <>
      <KPICard
        label="Gastos del mes"
        value={stats.gastosMes.length}
        dark={dark}
        accent={colors.primary}
      />
      <KPICard
        label="Cuotas activas"
        value={stats.cuotasActivas}
        dark={dark}
        accent={colors.accent}
      />
    </>
  )}
</View>
```

- [ ] **Step 7: Ocultar secciones de deudas en meses futuros**

Envolver el bloque "Deudas pendientes de cobro" (líneas 316-333) con:
```jsx
{!esMesFuturo && deudaStats.count > 0 && (
  // ...bloque existente sin la condición `deudaStats.count > 0`...
)}
```

Envolver el bloque "Lo que debo" (líneas 336-353) con:
```jsx
{!esMesFuturo && misDeudaStats.count > 0 && (
  // ...bloque existente sin la condición...
)}
```

- [ ] **Step 8: Agregar estilos faltantes al StyleSheet**

En la función `styles(dark)` al final del archivo, agregar:

```js
proyectadoBadge: {
  backgroundColor: '#F9731620',
  borderRadius: radius.sm,
  paddingHorizontal: spacing.sm,
  paddingVertical: 3,
  borderWidth: 1,
  borderColor: '#F9731650',
},
proyectadoBadgeText: {
  fontSize: 10,
  fontWeight: '700',
  color: '#F97316',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
totalHeroFuturo: {
  borderColor: '#F9731650',
  shadowColor: '#F97316',
},
```

- [ ] **Step 9: Verificar visualmente**

Correr `npx expo start`. En el dashboard: 
- Tocar `›` avanza de mes (hasta 6 veces).
- El nombre del mes se pone naranja, aparece badge "Proyectado" en el header.
- El hero card tiene borde naranja y muestra "proyectado · tocá para ver el desglose".
- Los KPIs muestran "Cuotas pendientes" y "Fijos activos".
- Tocar el hero no hace nada aún (modal no wired todavía — normal).
- Las secciones de deudas desaparecen en meses futuros.
- Al volver al mes actual todo vuelve a normal.

- [ ] **Step 10: Commit**

```bash
git add src/screens/DashboardScreen.jsx
git commit -m "feat: unlock forward navigation up to 6 months with projected month visuals"
```

---

## Task 4: Agregar KPI "próximo mes" + `statsProxMes`

**Files:**
- Modify: `src/screens/DashboardScreen.jsx`

Agregar un tercer KPI al lado de los dos existentes mostrando el total proyectado del mes siguiente. Visible tanto en el mes actual como en meses futuros. Al tocarlo navega al mes siguiente.

- [ ] **Step 1: Agregar import de formatAmountShort**

En el import de proyeccion.js (Task 2 Step 1), agregar `formatAmountShort`:

```js
import { getGastosMes, getCostoMes, calcularTotalesPorMoneda, formatAmountShort } from '../utils/proyeccion';
```

- [ ] **Step 2: Agregar useMemo `statsProxMes`**

Inmediatamente después del bloque `const stats = useMemo(...)`, agregar:

```js
const statsProxMes = useMemo(() => {
  const proxMesSel = mesSel.mes === 11
    ? { mes: 0, anio: mesSel.anio + 1 }
    : { mes: mesSel.mes + 1, anio: mesSel.anio };
  const gastosProx = getGastosMes(gastos, proxMesSel, mydata);
  return {
    totalesPorMoneda: calcularTotalesPorMoneda(gastosProx),
    mesNombre: MESES[proxMesSel.mes],
  };
}, [gastos, mydata, mesSel]);
```

- [ ] **Step 3: Agregar el KPI de próximo mes al kpiRow**

En el bloque de KPIs (modificado en Task 3 Step 6), agregar el KPI de próximo mes en ambas ramas (futuro y actual). Reemplazar el `</View>` de cierre del `kpiRow` por esto:

```jsx
<View style={s.kpiRow}>
  {esMesFuturo ? (
    <>
      <KPICard label="Cuotas pendientes" value={stats.cuotasPendientes} dark={dark} accent="#F97316" />
      <KPICard label="Fijos activos" value={stats.fijosMes} dark={dark} accent="#F97316" />
    </>
  ) : (
    <>
      <KPICard label="Gastos del mes" value={stats.gastosMes.length} dark={dark} accent={colors.primary} />
      <KPICard label="Cuotas activas" value={stats.cuotasActivas} dark={dark} accent={colors.accent} />
    </>
  )}
  {!esMesLimite && (
    <ProxMesKPI
      totales={statsProxMes.totalesPorMoneda}
      mesNombre={statsProxMes.mesNombre}
      onPress={nextMes}
      dark={dark}
    />
  )}
</View>
```

- [ ] **Step 4: Agregar el componente `ProxMesKPI` al final del archivo**

Después del componente `KPICard` (línea 389), agregar:

```jsx
function ProxMesKPI({ totales, mesNombre, onPress, dark }) {
  const arsTotal = totales['ARS'];
  const firstEntry = Object.entries(totales)[0];
  const displayText = arsTotal != null
    ? formatAmountShort(arsTotal, 'ARS')
    : firstEntry
      ? formatAmountShort(firstEntry[1], firstEntry[0])
      : '$ 0';

  const s = StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: dark ? colors.surface.dark : colors.surface.light,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#F9731640',
      alignItems: 'center',
      justifyContent: 'center',
    },
    val: { fontSize: 13, fontWeight: '700', color: '#F97316', marginBottom: 2, textAlign: 'center' },
    lbl: { fontSize: 10, fontWeight: '500', color: '#F97316', textAlign: 'center', opacity: 0.8 },
  });

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.val}>{displayText}</Text>
      <Text style={s.lbl}>{mesNombre} →</Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 5: Verificar visualmente**

En el dashboard del mes actual: aparece un tercer KPI naranja a la derecha mostrando el total del mes siguiente (ej. "$284k / Agosto →"). Al tocarlo, navega a Agosto y el KPI pasa a mostrar Septiembre. En el mes 6 (límite), el tercer KPI desaparece.

- [ ] **Step 6: Commit**

```bash
git add src/screens/DashboardScreen.jsx
git commit -m "feat: add next-month KPI chip with projected total"
```

---

## Task 5: Crear `src/components/ProyeccionModal.jsx`

**Files:**
- Create: `src/components/ProyeccionModal.jsx`

Bottom sheet que muestra el desglose de gastos proyectados agrupados por moneda → cuotas / fijos / otros.

- [ ] **Step 1: Crear el archivo**

```jsx
// src/components/ProyeccionModal.jsx
import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatPrecioEuropeo } from '../utils/formatters';
import { getCostoMes } from '../utils/proyeccion';
import { colors, spacing, radius, typography } from '../constants/theme';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function ProyeccionModal({ visible, onClose, gastos, mes }) {
  const { dark } = useTheme();
  const s = styles(dark);

  const monedas = [...new Set(gastos.map(g => g.moneda || 'ARS'))].sort();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>
            Desglose · {MESES[mes.mes]} {mes.anio}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {gastos.length === 0 ? (
              <Text style={s.empty}>Sin gastos proyectados para este mes.</Text>
            ) : (
              monedas.map(moneda => {
                const gastosMon = gastos.filter(g => (g.moneda || 'ARS') === moneda);
                const cuotas = gastosMon.filter(
                  g => !g.isFijo && g.tipo === 'credito' && Number(g.cuotas) > 1
                );
                const fijos = gastosMon.filter(g => g.isFijo);
                const otros = gastosMon.filter(
                  g => !g.isFijo && !(g.tipo === 'credito' && Number(g.cuotas) > 1)
                );
                const total = gastosMon.reduce((sum, g) => sum + getCostoMes(g), 0);

                return (
                  <View key={moneda} style={s.currencyBlock}>
                    <View style={s.currencyHeader}>
                      <Text style={s.currencyName}>{moneda}</Text>
                      <Text style={s.currencyTotal}>{formatPrecioEuropeo(total, moneda)}</Text>
                    </View>

                    {cuotas.length > 0 && (
                      <>
                        <Text style={s.groupLabel}>Cuotas</Text>
                        {cuotas.map(g => (
                          <ExpenseRow key={g.id} gasto={g} mes={mes} dark={dark} />
                        ))}
                      </>
                    )}

                    {fijos.length > 0 && (
                      <>
                        <Text style={s.groupLabel}>Fijos</Text>
                        {fijos.map(g => (
                          <ExpenseRow key={g.id} gasto={g} mes={mes} dark={dark} />
                        ))}
                      </>
                    )}

                    {otros.length > 0 && (
                      <>
                        <Text style={s.groupLabel}>Otros</Text>
                        {otros.map(g => (
                          <ExpenseRow key={g.id} gasto={g} mes={mes} dark={dark} />
                        ))}
                      </>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function ExpenseRow({ gasto, mes, dark }) {
  const cost = getCostoMes(gasto);

  let badge = '';
  let metaText = gasto.medio || '';

  if (!gasto.isFijo && gasto.tipo === 'credito' && Number(gasto.cuotas) > 1) {
    const [, m, y] = (gasto.fecha || '').split('/');
    const compraIndex = Number(y) * 12 + (Number(m) - 1);
    const targetIndex = mes.anio * 12 + mes.mes;
    const cuotaNum = targetIndex - compraIndex + 1;
    badge = `${cuotaNum}/${gasto.cuotas}`;
    metaText = `${gasto.medio || ''} · cuota ${cuotaNum} de ${gasto.cuotas}`.replace(/^·\s*/, '');
  } else if (gasto.isFijo) {
    badge = 'fijo';
    metaText = `${gasto.medio || ''} · mensual`.replace(/^·\s*/, '');
  }

  const s = StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#1e293b' : '#F1F5F9',
    },
    left: { flex: 1, marginRight: spacing.sm },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
    name: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light },
    badge: {
      backgroundColor: '#F9731620',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#F97316' },
    meta: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 },
    amount: { ...typography.bodyBold, color: '#F97316' },
  });

  return (
    <View style={s.row}>
      <View style={s.left}>
        <View style={s.nameRow}>
          <Text style={s.name}>{gasto.objeto}</Text>
          {!!badge && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {!!metaText && <Text style={s.meta}>{metaText}</Text>}
      </View>
      <Text style={s.amount}>{formatPrecioEuropeo(cost, gasto.moneda || 'ARS')}</Text>
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: dark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: dark ? colors.border.dark : colors.border.light,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: dark ? '#475569' : '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: '#F97316',
    textAlign: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: dark ? colors.border.dark : colors.border.light,
    marginHorizontal: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  empty: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  currencyBlock: {
    marginTop: spacing.md,
  },
  currencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F9731630',
    marginBottom: spacing.xs,
  },
  currencyName: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  currencyTotal: {
    ...typography.bodyBold,
    color: '#F97316',
    fontSize: 16,
  },
  groupLabel: {
    ...typography.caption,
    color: dark ? '#475569' : '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProyeccionModal.jsx
git commit -m "feat: add ProyeccionModal bottom sheet for projected expense breakdown"
```

---

## Task 6: Conectar ProyeccionModal en DashboardScreen

**Files:**
- Modify: `src/screens/DashboardScreen.jsx`

Importar y renderizar el modal. El estado `showProyeccionModal` ya fue agregado en Task 3.

- [ ] **Step 1: Agregar el import del modal**

Al inicio de `DashboardScreen.jsx`, después del import de `NotificationsModal`:

```js
import ProyeccionModal from '../components/ProyeccionModal';
```

- [ ] **Step 2: Renderizar el modal antes del cierre de `</SafeAreaView>`**

Localizar las líneas donde está `<NotificationsModal ... />` (alrededor de la línea 358) y agregar el `ProyeccionModal` después:

```jsx
<ProyeccionModal
  visible={showProyeccionModal}
  onClose={() => setShowProyeccionModal(false)}
  gastos={stats.gastosMes}
  mes={mesSel}
/>
```

- [ ] **Step 3: Verificar el flujo completo**

En la app:
1. Navegar a un mes futuro (ej. Agosto).
2. Tocar el hero card naranja → se abre el bottom sheet "Desglose · Agosto 2026".
3. Verificar que aparecen los gastos agrupados: sección "Cuotas" con badge `X/Y`, sección "Fijos" con badge "fijo".
4. Verificar que el total de cada bloque de moneda es correcto.
5. Swipe down o tocar fuera cierra el modal.
6. Si el mes futuro no tiene gastos proyectados, el modal muestra "Sin gastos proyectados para este mes."

- [ ] **Step 4: Commit final**

```bash
git add src/screens/DashboardScreen.jsx
git commit -m "feat: wire ProyeccionModal — tap hero to see projected expense breakdown"
```
