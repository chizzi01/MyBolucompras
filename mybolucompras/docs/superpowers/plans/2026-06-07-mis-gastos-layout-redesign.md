# Mis Gastos Layout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la página de Mis Gastos para eliminar espacio muerto: footer compacto de 1 línea, tabla a pantalla completa, botón Agregar con texto+dropdown, y reporte en la barra de chips.

**Architecture:** Cambios puramente de presentación — JSX + CSS. Sin cambios de lógica, contextos, ni servicios. Se usan inline styles para evitar romper clases CSS compartidas con otras páginas.

**Tech Stack:** React 18, CSS modules + global CSS, react-icons

---

## Mapa de archivos

| Archivo | Qué cambia |
|---|---|
| `src/components/Footer.jsx` | JSX rediseñado a 1 fila horizontal |
| `src/styles/dashboard.css` | Nuevas clases `.footer-compact` (las viejas se mantienen) |
| `src/components/Table.jsx` | Reemplaza `.dropdown` verde por split-btn; elimina `reportesAlign`/`presupuestoAlign`; agrega `useRef` |
| `src/styles/table.css` | Nuevas clases `.agregar-split-btn`, `.agregar-dropdown` |
| `src/components/Navbar.jsx` | Acepta prop `onReporteClick`; renderiza chip de reporte |
| `src/styles/navbar.css` | Nueva clase `.navbar-reporte-chip` |
| `src/pages/MainPage.jsx` | Inline styles para flex layout; prop `onReporteClick` a `<Header>` |
| `src/App.css` | `.tabla` pasa de `height:60vh` a `flex:1`; `.componentContainer` pierde `min-height:100vh` |

---

## Task 1: Footer compacto (1 línea)

**Files:**
- Modify: `src/components/Footer.jsx`
- Modify: `src/styles/dashboard.css`

- [ ] **Step 1: Agregar clases compactas en dashboard.css**

Al final de la sección Footer de `src/styles/dashboard.css` (después de la línea `.footer-credit a { ... }`), agregar:

```css
/* Footer compacto — 1 línea */
.footer-compact {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  height: 40px;
  flex-shrink: 0;
}

.footer-compact-stats {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}

.footer-compact-stat {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.footer-compact-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
}

.footer-compact-sep {
  width: 1px;
  height: 16px;
  background: var(--color-border);
  flex-shrink: 0;
}

.footer-compact-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.footer-compact-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.6;
}

.footer-compact-hint kbd {
  font-family: inherit;
  background: var(--color-border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 10px;
}

.footer-compact-credit {
  font-size: 11px;
  color: var(--color-text-muted);
}

.footer-compact-credit a {
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: none;
}
```

- [ ] **Step 2: Reescribir Footer.jsx**

Reemplazar el contenido completo de `src/components/Footer.jsx`:

```jsx
import React from 'react';
import '../styles/dashboard.css';

function Footer({ totalGastado, tarjetaUsada, bancoUsado }) {
  const formatNumber = (number) => {
    const num = Number(number) || 0;
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderTotales = () => {
    if (totalGastado && typeof totalGastado === 'object' && !Array.isArray(totalGastado)) {
      return Object.entries(totalGastado).map(([moneda, total]) => (
        <span key={moneda} className="footer-stat-value primary">
          {moneda}: ${formatNumber(total)}
        </span>
      ));
    }
    return <span className="footer-stat-value primary">${formatNumber(totalGastado)}</span>;
  };

  return (
    <div className="footer-compact">
      <div className="footer-compact-stats">
        <div className="footer-compact-stat">
          <span className="footer-compact-label">Total gastado</span>
          <div style={{ display: 'flex', gap: 8 }}>{renderTotales()}</div>
        </div>
        <div className="footer-compact-sep" />
        <div className="footer-compact-stat">
          <span className="footer-compact-label">Tarjeta</span>
          <span className="footer-stat-value warning">{tarjetaUsada || 'N/A'}</span>
        </div>
        <div className="footer-compact-sep" />
        <div className="footer-compact-stat">
          <span className="footer-compact-label">Banco</span>
          <span className="footer-stat-value success">{bancoUsado || 'N/A'}</span>
        </div>
        <div className="footer-compact-right">
          <span className="footer-compact-hint">
            <kbd>Esc</kbd> cierra ventanas
          </span>
          <span className="footer-compact-credit">
            <a href="https://chizzi01.github.io/Cv-React/" target="_blank" rel="noreferrer">
              Agustin Chizzini Melo
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Footer);
```

- [ ] **Step 3: Verificar visualmente**

Correr el dev server (`npm run dev` o `npm start`) y abrir la app. El footer debe ser una barra delgada de ~40px con todos los datos en una sola línea. Las páginas Deudores y Viajes también deben mostrar el footer compacto (sin datos = N/A, lo cual es correcto).

- [ ] **Step 4: Commit**

```bash
git add src/components/Footer.jsx src/styles/dashboard.css
git commit -m "feat(ui): footer compacto de 1 línea horizontal"
```

---

## Task 2: Botón "Agregar" con texto + dropdown

**Files:**
- Modify: `src/components/Table.jsx`
- Modify: `src/styles/table.css`

- [ ] **Step 1: Agregar clases del split-btn en table.css**

Al final de `src/styles/table.css`, agregar:

```css
/* ── Split button Agregar ── */
.agregar-split-btn {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.agregar-split-inner {
  display: flex;
  border-radius: 100px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 16px rgba(115, 231, 134, 0.35);
}

.agregar-main {
  background: linear-gradient(135deg, rgba(115, 231, 134, 0.9), rgba(115, 231, 134, 0.5));
  color: #fff;
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 0;
  box-shadow: none;
}

.agregar-main:hover {
  background: linear-gradient(135deg, rgba(115, 231, 134, 1), rgba(115, 231, 134, 0.7));
  transform: none;
  box-shadow: none;
}

.agregar-arrow {
  background: rgba(60, 180, 80, 0.7);
  color: #fff;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 0;
  box-shadow: none;
}

.agregar-arrow:hover {
  background: rgba(60, 180, 80, 0.9);
  transform: none;
  box-shadow: none;
}

.agregar-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  min-width: 190px;
  box-shadow: var(--shadow-lg, 0 10px 15px rgba(0,0,0,0.1));
  z-index: 200;
}

.agregar-dropdown button {
  width: 100%;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--color-text-primary, #1e293b);
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  border-radius: 0;
  box-shadow: none;
}

.agregar-dropdown button:last-child {
  border-bottom: none;
}

.agregar-dropdown button:hover {
  background: var(--color-surface-hover, #f8fafc);
  transform: none;
  box-shadow: none;
}
```

- [ ] **Step 2: Agregar useRef al import de React en Table.jsx**

En `src/components/Table.jsx` línea 1, modificar:

```jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
```

- [ ] **Step 3: Agregar estado y ref del dropdown en Table.jsx**

Dentro de la función `Table`, justo después de la línea `const [sortConfig, setSortConfig] = useState(...)` (aprox. línea 118), agregar:

```jsx
const [showAgregarMenu, setShowAgregarMenu] = useState(false);
const agregarMenuRef = useRef(null);

useEffect(() => {
  const handler = (e) => {
    if (agregarMenuRef.current && !agregarMenuRef.current.contains(e.target)) {
      setShowAgregarMenu(false);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, []);
```

- [ ] **Step 4: Reemplazar el bloque `.dropdown` verde en Table.jsx**

Localizar el bloque (aprox. líneas 230–258):

```jsx
<div className="dropdown">
    <button className="dropbtn"><IoMdAdd size={30} /></button>
    <div className="dropdown-content">
        <div className="verticalBtn-text">
            <button id="agregar-btn" onClick={() => openModal('nuevo')}>
                <GiReceiveMoney size={30} />
            </button>
            <div className="button-text">Nuevo</div>
        </div>
        <div className="verticalBtn-text">
            <button id="agregarFijo-btn" onClick={() => openModal('repetitivo')}>
                <PiRepeatBold size={30} />
            </button>
            <div className="button-text">Repetitivo</div>
        </div>
        <div className="verticalBtn-text">
            <button id="agregarFondos-btn" onClick={() => openModal('fondos')}>
                <FaPiggyBank size={30} />
            </button>
            <div className="button-text">Fondos</div>
        </div>
        <div className="verticalBtn-text">
            <button id="vencimientoTarjeta-btn" onClick={() => openModal('vencimiento')}>
                <FaMoneyCheckDollar size={30} />
            </button>
            <div className="button-text">Cierre</div>
        </div>
    </div>
</div>
```

Reemplazarlo por:

```jsx
<div className="agregar-split-btn" ref={agregarMenuRef}>
    <div className="agregar-split-inner">
        <button className="agregar-main" onClick={() => openModal('nuevo')}>
            <IoMdAdd size={16} /> Agregar
        </button>
        <button className="agregar-arrow" onClick={() => setShowAgregarMenu(m => !m)}>
            ▾
        </button>
    </div>
    {showAgregarMenu && (
        <div className="agregar-dropdown">
            <button onClick={() => { openModal('nuevo'); setShowAgregarMenu(false); }}>
                <GiReceiveMoney size={16} /> Nuevo gasto
            </button>
            <button onClick={() => { openModal('repetitivo'); setShowAgregarMenu(false); }}>
                <PiRepeatBold size={16} /> Gasto fijo
            </button>
            <button onClick={() => { openModal('fondos'); setShowAgregarMenu(false); }}>
                <FaPiggyBank size={16} /> Agregar fondos
            </button>
            <button onClick={() => { openModal('vencimiento'); setShowAgregarMenu(false); }}>
                <FaMoneyCheckDollar size={16} /> Actualizar cierre
            </button>
        </div>
    )}
</div>
```

- [ ] **Step 5: Verificar visualmente**

El botón verde circular ya no debe aparecer. En su lugar debe haber un botón verde alargado con texto "Agregar" y una flecha ▾. Al hacer click en la flecha debe abrirse un dropdown con las 4 opciones. Al hacer click fuera debe cerrarse.

- [ ] **Step 6: Commit**

```bash
git add src/components/Table.jsx src/styles/table.css
git commit -m "feat(ui): reemplaza círculo verde por split-button Agregar con dropdown"
```

---

## Task 3: Botón Reporte en barra de chips (Navbar)

**Files:**
- Modify: `src/components/Navbar.jsx`
- Modify: `src/styles/navbar.css`
- Modify: `src/pages/MainPage.jsx`
- Modify: `src/components/Table.jsx`

- [ ] **Step 1: Agregar clase .navbar-reporte-chip en navbar.css**

Al final de `src/styles/navbar.css`, agregar:

```css
.navbar-reporte-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(251, 191, 36, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  box-shadow: none;
}

.navbar-reporte-chip:hover {
  background: rgba(251, 191, 36, 0.22);
  transform: none;
  box-shadow: none;
}
```

- [ ] **Step 2: Agregar import FaChartPie y prop onReporteClick en Navbar.jsx**

En `src/components/Navbar.jsx`, agregar el import:

```jsx
import { FaChartPie } from 'react-icons/fa';
```

Modificar la firma de la función para aceptar la nueva prop:

```jsx
function Header({ totalGastado, onPresupuestoClick, onFondosClick, onReporteClick }) {
```

- [ ] **Step 3: Renderizar el chip de reporte en Navbar.jsx**

Dentro del `<div className="navbar-chips">`, agregar el botón de reporte **inmediatamente después** del chip de presupuesto y **antes** del chip de fondos:

```jsx
{onReporteClick && (
  <button className="navbar-reporte-chip" onClick={onReporteClick}>
    <FaChartPie size={13} /> Reporte de gastos
  </button>
)}
```

El bloque `.navbar-chips` completo queda así:

```jsx
<div className="navbar-chips">
  {mydata?.presupuestoMensualMax > 0 && totalGastado && onPresupuestoClick && (() => {
    const gastadoUSD = parseFloat(totalGastado['USD'] || 0);
    const gastadoARS = parseFloat(totalGastado['ARS'] || 0) +
      (usdToArs && gastadoUSD ? gastadoUSD * usdToArs : 0);
    const limite = mydata.presupuestoMensualMax;
    const pct = Math.min((gastadoARS / limite) * 100, 100);
    const color = gastadoARS > limite ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
    return (
      <button
        className="navbar-presupuesto-chip"
        onClick={onPresupuestoClick}
        style={{ '--chip-color': color }}
        title="Ver presupuesto"
      >
        <span className="navbar-presupuesto-dot" />
        <span className="navbar-presupuesto-label">Presupuesto</span>
        <span className="navbar-presupuesto-pct">{Math.round(pct)}%</span>
      </button>
    );
  })()}
  {onReporteClick && (
    <button className="navbar-reporte-chip" onClick={onReporteClick}>
      <FaChartPie size={13} /> Reporte de gastos
    </button>
  )}
  {mydata?.fondos != null && (
    <button className="navbar-fondos-chip" onClick={onFondosClick}>
      <FaWallet size={13} />
      <span className="navbar-fondos-label">Fondos</span>
      <span
        className="navbar-fondos-value"
        style={
          Number(mydata.fondos) - parseFloat(totalGastado?.ARS || 0) < 0
            ? { background: 'none', WebkitTextFillColor: '#ef4444', color: '#ef4444' }
            : undefined
        }
      >
        ${(Number(mydata.fondos) - parseFloat(totalGastado?.ARS || 0))
          .toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </button>
  )}
</div>
```

- [ ] **Step 4: Pasar onReporteClick desde MainPage.jsx**

En `src/pages/MainPage.jsx`, modificar la línea del `<Header>`:

```jsx
<Header
  totalGastado={totalGastado}
  onPresupuestoClick={() => openModal('presupuesto')}
  onFondosClick={() => openModal('fondos')}
  onReporteClick={() => openModal('reporte')}
/>
```

- [ ] **Step 5: Eliminar reportesAlign y presupuestoAlign de Table.jsx**

En `src/components/Table.jsx`, localizar y eliminar estos dos bloques (aprox. líneas 635–644):

```jsx
<div className="reportesAlign">
    <button id="report-btn" onClick={() => openModal('reporte')}>
        <FaChartPie size={20} /> Reporte de Gastos
    </button>
</div>
<div className="presupuestoAlign">
    <button id="presupuesto-btn" onClick={() => openModal('presupuesto')}>
        <CiBank size={20} /> Presupuestos
    </button>
</div>
```

- [ ] **Step 6: Verificar visualmente**

La barra de chips de la navbar debe mostrar: `[Presupuesto X%]` · `[📊 Reporte de gastos]` · `[💰 Fondos $X]`. Al hacer click en "Reporte de gastos" debe abrirse el modal de reporte. Los botones de reporte y presupuesto absolutos dentro de la tabla ya no deben aparecer.

- [ ] **Step 7: Commit**

```bash
git add src/components/Navbar.jsx src/styles/navbar.css src/pages/MainPage.jsx src/components/Table.jsx
git commit -m "feat(ui): mueve botón reporte a barra de chips de la navbar"
```

---

## Task 4: Tabla a pantalla completa (flex:1)

**Files:**
- Modify: `src/App.css`
- Modify: `src/pages/MainPage.jsx`
- Modify: `src/components/Table.jsx`

- [ ] **Step 1: Actualizar .componentContainer y .tabla en App.css**

En `src/App.css`, localizar `.componentContainer` (aprox. línea 687):

```css
.componentContainer {
  background-attachment: fixed;
  width: 100%;
  min-height: 100vh;
  padding-top: 10px;
}
```

Reemplazarlo por:

```css
.componentContainer {
  background-attachment: fixed;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 10px;
}
```

Localizar `.tabla` (aprox. línea 695):

```css
.tabla {
  padding: 20px;
  margin-bottom: 20px;
  margin-top: 10px;
  margin-bottom: 10px;
  height: 60vh;
  overflow: auto;
  overflow-y: scroll;
  border-radius: 12px;
}
```

Reemplazarlo por:

```css
.tabla {
  padding: 20px;
  margin-top: 10px;
  margin-bottom: 10px;
  flex: 1;
  overflow-y: auto;
  border-radius: 12px;
}
```

- [ ] **Step 2: Agregar flex layout en MainPage.jsx**

En `src/pages/MainPage.jsx`, el return principal:

```jsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <CierreChecker />
    <Header ... />
    <div
      className="main-content"
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <Table ... />
      <Footer ... />
    </div>
    {modalVisible && ( ... )}
  </div>
);
```

- [ ] **Step 3: Agregar flex en el section#gastos de Table.jsx**

En `src/components/Table.jsx`, la línea de apertura del section:

```jsx
<section id="gastos" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
```

- [ ] **Step 4: Verificar visualmente**

Abrir la app. La tabla debe extenderse hasta el footer compacto sin dejar espacio vacío. Al redimensionar la ventana la tabla debe crecer/achicarse dinámicamente. El scroll de la tabla debe funcionar cuando hay muchos registros.

- [ ] **Step 5: Verificar que ConfiguracionPage y otras páginas no se rompan**

Navegar a `/configuracion`. La página debe verse correcta — el `min-height: 100vh` en `.main-content` sigue siendo el del CSS de navbar.css, no se tocó.

- [ ] **Step 6: Commit**

```bash
git add src/App.css src/pages/MainPage.jsx src/components/Table.jsx
git commit -m "feat(ui): tabla ocupa pantalla completa con flex layout"
```

---

## Self-Review

**Cobertura del spec:**
- ✅ Footer compacto 1 línea → Task 1
- ✅ Tabla flex:1 → Task 4
- ✅ Split button Agregar con dropdown → Task 2
- ✅ Botón Reporte en chips → Task 3
- ✅ Filtro azul circular sin cambios → no se toca (correcto por omisión)
- ✅ Chips presupuesto/fondos sin cambios → no se tocan (correcto)
- ✅ Calculadora flotante sin cambios → no se toca (correcto)
- ✅ inline styles en MainPage para no romper ConfiguracionPage → Task 4 Step 2

**Placeholders:** Ninguno — todo el código está escrito.

**Consistencia de tipos:** `openModal` se llama igual en todas las tareas. Los nombres de clases CSS en table.css coinciden con los del JSX en Task 2.
