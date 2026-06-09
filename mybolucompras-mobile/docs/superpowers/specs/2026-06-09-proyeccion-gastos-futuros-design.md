# Proyección de gastos futuros en el dashboard

**Fecha:** 2026-06-09  
**Estado:** Aprobado

---

## Resumen

Agregar al dashboard la capacidad de navegar hasta 6 meses hacia adelante para ver los gastos proyectados (cuotas pendientes + fijos activos). El mes actual incorpora un KPI tocable que muestra el total del próximo mes como acceso rápido.

---

## Comportamiento

### Navegación

- La flecha `›` del mes se habilita para avanzar hasta 6 meses desde el mes actual (actualmente está bloqueada).
- No hay límite para navegar hacia atrás (comportamiento existente sin cambios).
- Navegar más allá del mes actual (+1 a +6) activa el **modo proyección**.

### Modo proyección (mes futuro)

Cuando `mesSel > mesActual`:

1. **Header**: el nombre del mes se muestra en color naranja/ámbar + badge "Proyectado" a la derecha.
2. **Hero card**: gradiente naranja (`#c2410c → #b45309`) en lugar del gradiente púrpura habitual. Etiqueta "⏱ PROYECTADO" sutil en la esquina. El total se muestra desglosado por moneda (ej. `ARS $284.500 · USD 25`).
3. **KPIs**: cambian de "Gastos del mes / Cuotas activas" → "Cuotas pendientes / Fijos activos" con colores naranjas. El tercer KPI muestra el mes siguiente como acceso rápido.
4. **Lista de gastos**: muestra los gastos proyectados (cuotas + fijos) con badge `X/Y` para cuotas y `fijo` para fijos.
5. **Tap en hero**: abre el `ProyeccionModal` con el desglose detallado.

### KPI "próximo mes" en el mes actual

- Tercer KPI box (tocable) en el mes actual que muestra el total proyectado del mes siguiente.
- Al tocarlo navega al mes siguiente (incrementa `mesSel`).
- Borde y colores en naranja para diferenciarlo de los KPIs normales.

### Modal de desglose (`ProyeccionModal`)

Accesible tocando el hero card en cualquier mes futuro.

Estructura:
- Un bloque por moneda (solo monedas con al menos un gasto ese mes).
- Dentro de cada bloque: sección **Cuotas** y sección **Fijos**.
- Cada item: nombre del gasto, medio de pago, número de cuota (`cuota X de Y`) o "mensual" para fijos.
- Total de la moneda en el header del bloque.
- Se cierra con swipe down o toque fuera (comportamiento estándar de bottom sheet).

---

## Arquitectura técnica

### Archivos a modificar

**`src/screens/DashboardScreen.jsx`**
- Quitar el guard que bloquea `mesSel > mesActual`; agregar guard `mesSel <= mesActual + 6`.
- Derivar `esMesFuturo` como `mesSel > mesActual`.
- Condicionar colores del hero, badge del header, labels de KPIs en base a `esMesFuturo`.
- Agregar tercer KPI "próximo mes" con su handler de navegación.
- Agregar `onPress` al hero card que abre `ProyeccionModal` cuando `esMesFuturo`.

### Archivos a crear

**`src/utils/proyeccion.js`** *(nuevo)*
- Extrae la lógica de filtrado que ya existe en el `stats` useMemo de `DashboardScreen.jsx` (la cual ya funciona para cualquier mes, incluyendo futuros). La extracción permite calcular el mes siguiente de forma independiente para el KPI "próximo mes" sin duplicar la lógica.
- `getGastosMes(gastos, mesSel, mydata)`: filtra los gastos que aplican a un mes dado. Retorna `{ gastosMes, gastosFijos, gastosVariables }`.
- `calcularTotalesPorMoneda(gastos, getCostoMes)`: agrupa y suma por `moneda`. Retorna `{ ARS: 284500, USD: 25, ... }`.

**`src/components/ProyeccionModal.jsx`** *(nuevo)*
- Bottom sheet que recibe `gastos` (ya filtrados para el mes) y `mes` (objeto `{mes, anio}`).
- Agrupa internamente por `moneda`, luego por tipo (`cuota` vs `fijo`).
- Renderiza los bloques de moneda con sus secciones.
- Usa React Native `Modal` con `animationType="slide"` y fondo semitransparente (igual que `AppModal.jsx`).

### Sin cambios en

- `src/utils/cuotas.js` — la lógica de filtrado ya soporta cualquier mes.
- `src/services/gastosService.js` — no se necesitan nuevas queries; todo se calcula en cliente con los datos existentes.
- Base de datos / Supabase — sin cambios de esquema.

---

## Casos borde

- **Sin gastos proyectados en un mes**: el hero muestra `$0` por moneda; el modal muestra "Sin gastos proyectados para este mes".
- **Gasto fijo sin fecha de fin**: aparece en todos los meses futuros dentro del rango de 6 meses.
- **Gasto fijo con fecha de fin**: aparece solo hasta el mes en que termina (`cuotas` campo = duración; si llega a 0 deja de aparecer).
- **Multi-moneda**: cada moneda aparece como bloque independiente; no se hace conversión de cambio.

---

## Fuera de alcance (esta iteración)

- Notificaciones push de gastos proyectados.
- Exportar proyección.
- Conversión multi-moneda a una sola divisa.
