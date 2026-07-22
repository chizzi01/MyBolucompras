# Checklist General / Personal en Viajes

## Contexto

En la pestaña "Notas" de un viaje, la sección "Qué llevar" es un checklist compartido:
cualquier participante agrega ítems, y un ítem solo se marca como completado (✓ verde,
tachado) cuando **todos** los participantes lo confirmaron — mientras tanto se muestra
"Esperando a: X, Y". Esto tiene sentido para objetos realmente compartidos del grupo
(ej: "botiquín", "cargador universal"), pero no para objetos personales de cada uno
(ej: "mi pasaporte", "mis medicamentos"), donde no debería hacer falta que el resto del
grupo confirme nada.

## Alcance

Únicamente la sección "Qué llevar" (`viaje_checklist`) dentro de `ViajeNotasTab`.
La sección "Notas del grupo" (texto libre, `viaje_notas`) no cambia.

## Modelo de datos

Migración `supabase/migrations/20260721_viaje_checklist_personal.sql` (a ejecutar
manualmente en el SQL Editor de Supabase, siguiendo la convención de migraciones
anteriores de este proyecto):

```sql
ALTER TABLE public.viaje_checklist
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'general'
  CHECK (tipo IN ('general', 'personal'));
```

### RLS

La policy única actual `vc_all` (USING/WITH CHECK idénticos para todos los comandos)
se reemplaza por 4 policies separadas sobre `viaje_checklist`:

- **SELECT**: ítems `general` visibles para cualquier participante del viaje; ítems
  `personal` visibles solo si `created_by = auth.uid()`.
- **INSERT**: el usuario debe ser participante del viaje; si `tipo = 'personal'`,
  además `created_by` debe ser el propio usuario (no se puede crear un personal a
  nombre de otro).
- **UPDATE**: mismo criterio que SELECT (necesario para el toggle de completado).
- **DELETE**: solo el creador del ítem, sea `general` o `personal`. Esto endurece el
  comportamiento actual: hoy la policy `vc_all` permite a cualquier participante
  borrar el ítem de otro a nivel de base de datos (la UI ya oculta el botón de borrar
  si `item.createdBy !== user.id`, pero no había enforcement en RLS).

Con esto, un ítem personal ajeno nunca llega al cliente — no es un filtro de UI, es
invisibilidad a nivel de fila.

## Backend

`src/services/viajeNotasService.js`:
- `getChecklist(viajeId)`: agrega `tipo: row.tipo` al objeto mapeado. Sigue siendo una
  sola query — RLS ya devuelve generales (de todos) + personales (solo propios), no
  hace falta separar en dos llamadas.
- `agregarItem(viajeId, texto, tipo)`: nuevo parámetro `tipo` (`'general'` o
  `'personal'`), se inserta en la fila.
- `toggleItem`, `eliminarItem`: sin cambios de firma. Para un ítem personal,
  `completados_por` solo puede contener el id del propio dueño (en la práctica, un
  array de 0 o 1 elemento).

`src/hooks/mutations/useViajeNotasMutations.js`:
- `agregarItem` pasa el `tipo` seleccionado al service.

## UI — `ViajeNotasTab.jsx`

Dentro de la sección "Qué llevar" se agrega un segmented control chico con dos tabs,
mismo patrón visual que los tabs superiores del detalle de viaje (Gastos/Balance/Notas):

- **General**: comportamiento actual sin cambios. Lista filtrada a `tipo === 'general'`.
  Requiere confirmación de todos los participantes, muestra "Esperando a: ...", el
  botón "+" agrega con `tipo: 'general'`.
- **Personal**: lista filtrada a `tipo === 'personal'` (por RLS, ya son solo los
  propios). El check es individual: se completa apenas el dueño lo marca, sin depender
  de nadie más. No se muestra "Esperando a: ..." ni el nombre del autor (siempre es el
  usuario actual). El botón "+" agrega con `tipo: 'personal'`.

Cada tab mantiene su propio estado de input (`showItemInput`) y lista vacía propia
("Sin ítems generales" / "Sin ítems personales").

La sección "Notas del grupo" queda debajo, sin cambios.

## Fuera de alcance

- No se tocan `viaje_gastos` ni el flujo de balance/liquidación (confirmado con el
  usuario que la ambigüedad inicial de "confirmación del grupo" se refería al
  checklist, no a los gastos).
- No se agregan notificaciones push para ítems personales.
- No se migra el dato histórico: los ítems existentes quedan `tipo = 'general'` por el
  `DEFAULT`, que es el comportamiento que ya tenían.
