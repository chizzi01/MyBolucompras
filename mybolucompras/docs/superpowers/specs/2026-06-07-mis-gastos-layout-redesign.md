# Diseño: Reestructuración visual de Mis Gastos

**Fecha:** 2026-06-07  
**Alcance:** Página `/` (MainPage + Table + Navbar + Footer) — solo desktop

---

## Objetivo

Eliminar espacio muerto en la página principal de gastos, hacer que la tabla ocupe el máximo de pantalla disponible y reubicar los controles de acción en lugares más accesibles.

---

## Cambios aprobados

### 1. Footer → Barra compacta de 1 línea

**Actual:** `Footer` renderiza un bloque de ~120px con 4 stats apiladas (Total gastado, Medio más usado, Banco más usado, Atajo).

**Nuevo:** La misma información en una barra de 40px de alto, en una sola fila horizontal.

- Stats a mostrar: Total ARS · Banco más usado · Tarjeta más usada · Total USD (si existe) · hint `Esc cierra ventanas`
- CSS: `height: 40px`, `display: flex`, `align-items: center`, `gap: 24px`
- El componente `Footer` se modifica en su JSX y CSS (`.footer-section` / `.footer-stats`).

### 2. Tabla → altura dinámica (`flex: 1`)

**Actual:** `.tabla` tiene `height: 60vh` fijo con `overflow-y: scroll`.

**Nuevo:** La tabla ocupa todo el espacio entre el toolbar y el footer compacto.

- El outer `<div>` de `MainPage` recibe `style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}` (inline, no afecta otras páginas)
- El `<div className="main-content">` recibe `style={{ flex:1, display:'flex', flexDirection:'column' }}` via inline style — **no** se modifica la clase CSS global (la comparte `ConfiguracionPage`)
- Dentro de `Table.jsx`, el wrapper `.table-container` recibe `style={{ flex:1, display:'flex', flexDirection:'column' }}` via inline style
- `.tabla` pasa a `flex: 1; overflow-y: auto` (sin altura fija) — se modifica en `App.css`

### 3. Botón "Agregar" con texto + dropdown (reemplaza círculo verde)

**Actual:** `.dropbtn` = círculo verde con ícono `IoMdAdd`, hover muestra dropdown con botones sin texto.

**Nuevo:** Botón pill verde con texto **"＋ Agregar"** + flecha **▾** que abre dropdown al hacer click.

- Estructura: `<div class="agregar-split-btn">` con dos partes:
  - `.agregar-main` → abre modal `'nuevo'` directamente
  - `.agregar-arrow` → toggle dropdown
- Dropdown muestra 4 opciones con punto de color:
  - 🟢 Agregar gasto → `openModal('nuevo')`
  - 🟠 Gasto fijo → `openModal('repetitivo')`
  - 🔵 Agregar fondos → `openModal('fondos')`
  - 🟣 Actualizar cierre → `openModal('vencimiento')`
- El dropdown se cierra al hacer click fuera (handler en `useEffect` con `mousedown`)
- Estilos en `table.css` bajo clase `.agregar-split-btn`

**El círculo azul de filtros (`.dropbtnFilter`) NO cambia.**

### 4. Botón "📊 Reporte de gastos" en barra de chips (Navbar)

**Actual:** Botón `#report-btn` y `#presupuesto-btn` están posicionados de forma absoluta dentro de `Table.jsx` (`.reportesAlign`, `.presupuestoAlign`).

**Nuevo:** El botón de reporte se mueve a la barra `.navbar-chips` del `Navbar.jsx`, al lado del chip de Presupuesto.

- Se agrega prop `onReporteClick` a `<Header>` desde `MainPage`.
- En `Navbar.jsx`, dentro del `.navbar-chips`, se renderiza el botón de reporte si `onReporteClick` está definido:
  ```jsx
  {onReporteClick && (
    <button className="navbar-reporte-chip" onClick={onReporteClick}>
      <FaChartPie size={13} /> Reporte de gastos
    </button>
  )}
  ```
- Clase `.navbar-reporte-chip` en `navbar.css`: estilo similar a los chips existentes, color ámbar/dorado.
- Los elementos `#report-btn`, `#presupuesto-btn` y sus contenedores absolutos se eliminan de `Table.jsx`.

---

## Archivos a modificar

| Archivo | Qué cambia |
|---|---|
| `src/pages/MainPage.jsx` | Layout flex en el wrapper, agregar prop `onReporteClick` a `<Header>` |
| `src/components/Navbar.jsx` | Aceptar `onReporteClick`, renderizar chip de reporte en `.navbar-chips` |
| `src/components/Footer.jsx` | Rediseño JSX a 1 línea horizontal, mismos datos |
| `src/components/Table.jsx` | Reemplazar `.dropbtn` + dropdown por `.agregar-split-btn`; eliminar `reportesAlign` y `presupuestoAlign` |
| `src/styles/navbar.css` | Agregar `.navbar-reporte-chip` |
| `src/styles/table.css` | Agregar `.agregar-split-btn`, `.agregar-main`, `.agregar-arrow`, `.agregar-dropdown`; ajustar `.tabla` |
| `src/styles/dashboard.css` | Reducir `.footer-section` / `.footer-stats` a layout horizontal compacto |
| `src/App.css` | Eliminar `.reportesAlign`, `.presupuestoAlign` (si no se usan en otros lugares) |

---

## Lo que NO cambia

- Círculo azul de filtros (`.dropbtnFilter`) — sin tocar
- Chips de Presupuesto y Fondos en la navbar
- Botón calculadora flotante (`.calculadora-align`) — solo visible con modal abierto
- Todas las demás páginas (Deudores, Viajes, ViajeDetalle)
- Lógica de modales, filtros, cálculos — solo cambios de presentación

---

## Notas de implementación

- El dropdown de "Agregar" debe cerrarse con `Escape` y con click fuera (consistente con el resto de la app).
- La altura de la tabla debe funcionar correctamente con el `PageSkeleton` — verificar que el skeleton no rompa el layout flex.
- `FaChartPie` ya está importado en `Table.jsx`; importarlo también en `Navbar.jsx`.
