# Spec: Módulo Deudores — React Desktop
**Fecha:** 2026-06-04  
**Proyecto:** mybolucompras (React + Electron desktop)  
**Fuente de referencia:** mybolucompras-mobile `src/screens/DeudoresScreen.jsx`, `src/services/deudoresService.js`, `src/context/DeudoresContext.jsx`

---

## Objetivo

Portar el módulo de deudores de la app mobile al desktop React, siguiendo exactamente los patrones existentes del proyecto (DataContext, MUI, CSS variables, lazy routes).

No se incluyen: push notifications, biometría, swipe gestures nativos.

---

## Arquitectura

### Archivos nuevos

| Archivo | Descripción |
|---|---|
| `src/services/deudoresService.js` | CRUD Supabase. Copia del mobile sin `sendPushToUser`. |
| `src/context/DeudoresContext.jsx` | Estado global de deudas. Provee lista, loading, CRUD handlers. |
| `src/pages/DeudoresPage.jsx` | Página principal del módulo. |
| `src/components/DeudaModal.jsx` | Modal crear/editar deuda. Usa MUI igual que Modal.jsx. |
| `src/styles/deudores.css` | Estilos específicos del módulo. |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/App.jsx` | Nueva ruta `/deudores`, lazy import, protegida con DataProvider + DeudoresProvider. |
| `src/components/Navbar.jsx` | Nuevo link "Deudores" en `navbar-nav` con ícono `FaHandshake`. |

---

## DeudoresService

Funciones expuestas (sin cambios de lógica respecto al mobile):

- `getAll()` — trae todas las deudas del usuario autenticado
- `crear(deuda, sharedWith?)` — crea la deuda; si `sharedWith.userId` existe, crea simultáneamente:
  1. La deuda en la cuenta del creador
  2. Una deuda espejo en la cuenta del otro usuario
  3. Un gasto en la cuenta del otro usuario
- `actualizar(id, deuda)` — edita campos de una deuda
- `marcarPagada(id, deudaActual)` — marca pagada y sincroniza con el otro usuario si está compartida (sin push)
- `eliminar(id)` — elimina

---

## DeudoresContext

```jsx
const DeudoresContext = createContext(null);

// Provee:
{
  deudas,          // array de deudas
  loading,         // boolean
  agregarDeuda,    // (deuda, sharedWith?) => Promise
  editarDeuda,     // (id, deuda) => Promise
  marcarPagada,    // (id, deudaActual) => Promise
  eliminarDeuda,   // (id) => Promise
  recargar,        // () => Promise
}
```

---

## DeudoresPage — Layout

```
┌─────────────────────────────────────────────────┐
│  NAVBAR                                         │
├─────────────────────────────────────────────────┤
│  Toolbar                                        │
│  [🔍 Buscar]  [Me deben ▾]  [Moneda ▾]          │
│                              [+ Nueva deuda]    │
├─────────────────────────────────────────────────┤
│  Chips resumen                                  │
│  [💚 A cobrar: $X ARS]  [🔴 A pagar: $X ARS]   │
├─────────────────────────────────────────────────┤
│  Cards agrupadas por nombre                     │
│  ┌──────────────────────────────────────────┐   │
│  │ 👤 Juan García        Total: $1.200 ARS  │   │
│  │  ──────────────────────────────────────  │   │
│  │  Alquiler mes junio   $800   3/6 cuotas  │   │
│  │  Cena restaurante     $400   1 cuota     │   │
│  │  [✓ Marcar todo pagado]  [+ Agregar]     │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Filtros

- **Búsqueda**: filtra por nombre o descripción
- **Tab / segmento**: "Me deben" (esAcreedor=true) / "Debo" (esAcreedor=false) / "Todos"
- **Moneda**: filtra por moneda (ARS, USD, etc.)
- **Estado**: activas / pagadas (toggle)

### Cards

Agrupadas por `nombre`. Cada grupo muestra:
- Header: avatar inicial + nombre + total del grupo (solo pendientes)
- Filas de deudas individuales con: descripción, monto, moneda, cuotas restantes, estado
- Botón "Marcar pagada" por fila
- Menú contextual (tres puntos): Editar, Eliminar

---

## DeudaModal — Formulario

Campos:
- `esAcreedor` toggle — "Me deben" / "Le debo a"
- `nombre` — nombre de la persona
- `descripcion` — descripción opcional
- `monto` — monto
- `moneda` — select (ARS, USD, EUR, BRL)
- `medio` — medio de pago (usa `mediosHabilitados` de configuración)
- `tipo` — débito / crédito
- `cuotas` — número de cuotas (solo si tipo=crédito)
- `cantidad` — cantidad de ítems
- `fechaDeuda` — fecha
- `isFijo` — checkbox gasto fijo/recurrente

**Compartir con usuario:**
- Buscador de usuario (igual al que ya existe en Modal.jsx para gastos compartidos)
- Si se selecciona un usuario, al guardar se ejecuta el flujo de sincronización

---

## Supabase — Tablas requeridas

El mobile ya usa estas tablas en producción:

```sql
-- deudores
id, user_id, nombre, descripcion, monto, moneda, medio, tipo,
es_fijo, cuotas, cantidad, pagado, fecha_deuda, fecha_pago,
compartido_con_nombre, compartido_con_user_id, es_acreedor,
ultimo_recordatorio, created_at
```

No se requiere ninguna migración nueva — las tablas ya existen en el proyecto compartido.

---

## Manejo de errores

- Errores de red/Supabase: Toast de error (igual que en MainPage)
- Loading states: `PageSkeleton` mientras carga
- Si no hay deudas: empty state con ilustración y botón "Agregar primera deuda"

---

## Lo que NO se implementa (excluido explícitamente)

- Push notifications (desktop no las necesita)
- Swipe gestures
- OCR
- `enviarRecordatorio` — función existe en el service pero no se expone en la UI por ahora
