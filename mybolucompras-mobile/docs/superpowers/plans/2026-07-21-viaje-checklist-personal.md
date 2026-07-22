# Viaje Checklist General/Personal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the "Qué llevar" checklist inside a viaje's Notas tab into two independent lists — General (needs every participant to confirm, as today) and Personal (each participant's own items, completed by that person alone, never shown to or confirmed by anyone else).

**Architecture:** Add a `tipo` column (`'general'` | `'personal'`) to the existing `viaje_checklist` table, tighten its RLS policies so personal rows are only ever visible/writable by their creator, thread `tipo` through the service/mutation layer, and add a small segmented control in `ViajeNotasTab` to switch between the two filtered lists.

**Tech Stack:** React Native (Expo), Supabase (Postgres + RLS), `@tanstack/react-query`.

## Global Constraints

- Scope is limited to the "Qué llevar" checklist (`viaje_checklist` table / `ViajeNotasTab` "Qué llevar" section). "Notas del grupo" (`viaje_notas`) is untouched.
- Existing rows must keep behaving exactly as today (`tipo` defaults to `'general'`).
- No new tables — reuse `viaje_checklist` with a new column.
- This project has no automated test suite (no Jest config, no `.test.js` files) — verification is manual, by running the app and exercising the flow, per this repo's existing convention. Do not introduce a test framework as part of this plan.
- Supabase migrations in this repo are documented as SQL files but **run manually** in the Supabase Dashboard SQL Editor (see `supabase/migrations/20260528_modo_viaje.sql` and `20260529_viaje_pagos.sql` headers) — this plan follows the same convention.

---

### Task 1: Migration — add `tipo` column and tighten checklist RLS

**Files:**
- Create: `supabase/migrations/20260721_viaje_checklist_personal.sql`

**Interfaces:**
- Produces: `viaje_checklist.tipo` column (`text`, `'general'` default, values `'general'`/`'personal'`), consumed by Task 2's `getChecklist`/`agregarItem`.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260721_viaje_checklist_personal.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: public.viaje_checklist must already exist (see 20260528_modo_viaje.sql).

-- 1. Tipo de ítem: 'general' (requiere confirmación de todo el grupo, comportamiento
--    actual) o 'personal' (solo lo ve y lo marca quien lo creó).
ALTER TABLE public.viaje_checklist
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'general'
  CHECK (tipo IN ('general', 'personal'));

-- 2. RLS: reemplazar la policy única "vc_all" por 4 policies que distinguen
--    general (todo participante) de personal (solo el creador).
DROP POLICY IF EXISTS "vc_all" ON public.viaje_checklist;

CREATE POLICY "vc_select" ON public.viaje_checklist FOR SELECT
  USING (
    (tipo = 'general' AND viaje_id IN (
      SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()
    ))
    OR (tipo = 'personal' AND created_by = auth.uid())
  );

CREATE POLICY "vc_insert" ON public.viaje_checklist FOR INSERT
  WITH CHECK (
    viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid())
    AND (tipo = 'general' OR created_by = auth.uid())
  );

CREATE POLICY "vc_update" ON public.viaje_checklist FOR UPDATE
  USING (
    (tipo = 'general' AND viaje_id IN (
      SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()
    ))
    OR (tipo = 'personal' AND created_by = auth.uid())
  );

CREATE POLICY "vc_delete" ON public.viaje_checklist FOR DELETE
  USING (created_by = auth.uid());
```

- [ ] **Step 2: Run the migration manually and verify**

Open the Supabase Dashboard → SQL Editor for this project, paste the file contents,
and execute it. Verify with:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'viaje_checklist' AND column_name = 'tipo';

SELECT polname FROM pg_policies WHERE tablename = 'viaje_checklist';
```

Expected: the first query returns one row (`tipo`, `text`, `'general'::text`); the
second returns `vc_select`, `vc_insert`, `vc_update`, `vc_delete` (no `vc_all`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260721_viaje_checklist_personal.sql
git commit -m "feat: add tipo column and split RLS policies for viaje_checklist"
```

---

### Task 2: Service layer — thread `tipo` through `viajeNotasService`

**Files:**
- Modify: `src/services/viajeNotasService.js:4-40`

**Interfaces:**
- Consumes: Task 1's `viaje_checklist.tipo` column.
- Produces: `getChecklist(viajeId)` → items now include `tipo: 'general' | 'personal'`.
  `agregarItem(viajeId, texto, tipo = 'general')` → resolved item includes `tipo`.
  Consumed by Task 3 (`useViajeNotasMutations`) and Task 4 (`ViajeNotasTab`).

- [ ] **Step 1: Update `getChecklist` to map `tipo`**

In `src/services/viajeNotasService.js`, change the `getChecklist` mapping:

```js
  async getChecklist(viajeId) {
    const { data, error } = await supabase
      .from('viaje_checklist')
      .select('*, autor:created_by(id, nombre, email)')
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      texto: row.texto,
      tipo: row.tipo,
      completadosPor: row.completados_por ?? [],
      createdBy: row.created_by,
      autorNombre: row.autor?.nombre || row.autor?.email || '',
      createdAt: row.created_at,
    }));
  },
```

(Only change: added `tipo: row.tipo,` after `texto: row.texto,`.)

- [ ] **Step 2: Update `agregarItem` to accept and persist `tipo`**

Change the `agregarItem` function:

```js
  async agregarItem(viajeId, texto, tipo = 'general') {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('viaje_checklist')
      .insert([{ viaje_id: viajeId, texto, created_by: user.id, tipo }])
      .select('*, autor:created_by(id, nombre, email)')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      texto: data.texto,
      tipo: data.tipo,
      completadosPor: data.completados_por ?? [],
      createdBy: data.created_by,
      autorNombre: data.autor?.nombre || data.autor?.email || '',
      createdAt: data.created_at,
    };
  },
```

(Changes: new `tipo = 'general'` parameter, `tipo` included in the insert payload,
`tipo: data.tipo,` added to the returned object.)

- [ ] **Step 3: Manual verification**

This is a plain data-mapping change with no branching logic — verified together with
Task 4's manual verification (adding a general and a personal item end-to-end). No
standalone check needed here beyond re-reading the diff.

- [ ] **Step 4: Commit**

```bash
git add src/services/viajeNotasService.js
git commit -m "feat: thread tipo through viajeNotasService checklist methods"
```

---

### Task 3: Mutation hook — pass `tipo` from `agregarItem` mutation

**Files:**
- Modify: `src/hooks/mutations/useViajeNotasMutations.js:7-12`

**Interfaces:**
- Consumes: Task 2's `viajeNotasService.agregarItem(viajeId, texto, tipo)`.
- Produces: `agregarItem` mutation now expects `{ texto, tipo }` as its mutate
  variables (was: a bare `texto` string). Consumed by Task 4's `handleAgregarItem`.

- [ ] **Step 1: Update the `agregarItem` mutation**

In `src/hooks/mutations/useViajeNotasMutations.js`, change:

```js
  const agregarItem = useMutation({
    mutationFn: ({ texto, tipo }) => viajeNotasService.agregarItem(viajeId, texto, tipo),
    onSuccess: (nuevo) => {
      queryClient.setQueryData(['viaje-checklist', viajeId], (prev = []) => [...prev, nuevo]);
    },
  });
```

(Only change: `mutationFn` now destructures `{ texto, tipo }` instead of taking a bare
`texto`. `onSuccess` is unchanged — it already appends whatever `agregarItem` service
call resolves to, which now includes `tipo`.)

- [ ] **Step 2: Manual verification**

Verified together with Task 4 (the only caller of this mutation is
`ViajeNotasTab.handleAgregarItem`, updated next task).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mutations/useViajeNotasMutations.js
git commit -m "feat: accept tipo in agregarItem checklist mutation"
```

---

### Task 4: UI — General/Personal segmented control in `ViajeNotasTab`

**Files:**
- Modify: `src/components/viajes/ViajeNotasTab.jsx`

**Interfaces:**
- Consumes: Task 3's `agregarItem.mutate({ texto, tipo })`; Task 2's checklist items
  now carrying `tipo`.
- Produces: none consumed by later tasks (this is the last task).

- [ ] **Step 1: Add `checklistTab` state**

In `src/components/viajes/ViajeNotasTab.jsx`, in the state block (after
`const [showNotaInput, setShowNotaInput] = useState(false);` around line 29), add:

```js
  const [checklistTab, setChecklistTab] = useState('general');
```

- [ ] **Step 2: Update `handleAgregarItem` to send `{ texto, tipo }`**

Replace:

```js
  const handleAgregarItem = () => {
    if (!nuevoItem.trim()) return;
    agregarItem.mutate(nuevoItem.trim(), {
      onSuccess: () => { setNuevoItem(''); setShowItemInput(false); },
      onError: (err) => Alert.alert('Error', err.message),
    });
  };
```

with:

```js
  const handleAgregarItem = () => {
    if (!nuevoItem.trim()) return;
    agregarItem.mutate({ texto: nuevoItem.trim(), tipo: checklistTab }, {
      onSuccess: () => { setNuevoItem(''); setShowItemInput(false); },
      onError: (err) => Alert.alert('Error', err.message),
    });
  };
```

- [ ] **Step 3: Filter the checklist by `checklistTab` and add the segmented control**

Replace the checklist section — from `{sectionHeader('QUÉ LLEVAR', () =>
setShowItemInput(v => !v))}` down through the closing `})}` of the `checklist.map`
block (original lines 93–149) — with:

```jsx
      {sectionHeader(checklistTab === 'general' ? 'QUÉ LLEVAR' : 'MIS COSAS', () => setShowItemInput(v => !v))}

      <View style={styles.checklistTabsRow}>
        <TouchableOpacity
          style={[styles.checklistTabBtn, checklistTab === 'general' && styles.checklistTabBtnActive]}
          onPress={() => { setChecklistTab('general'); setShowItemInput(false); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.checklistTabText, { color: subtextColor }, checklistTab === 'general' && styles.checklistTabTextActive]}>
            General
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.checklistTabBtn, checklistTab === 'personal' && styles.checklistTabBtnActive]}
          onPress={() => { setChecklistTab('personal'); setShowItemInput(false); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.checklistTabText, { color: subtextColor }, checklistTab === 'personal' && styles.checklistTabTextActive]}>
            Personal
          </Text>
        </TouchableOpacity>
      </View>

      {showItemInput && activo && (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC', borderColor: border, color: textColor }]}
            placeholder={checklistTab === 'general' ? 'Ej: Protector solar...' : 'Ej: Mi pasaporte...'}
            placeholderTextColor={subtextColor}
            value={nuevoItem}
            onChangeText={setNuevoItem}
            onSubmitEditing={handleAgregarItem}
            autoFocus
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAgregarItem} disabled={agregarItem.isPending}>
            {agregarItem.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {checklist.filter(item => item.tipo === checklistTab).map(item => {
        const esPersonal = item.tipo === 'personal';
        const completadosPor = item.completadosPor ?? [];
        const completadoPorMi = completadosPor.includes(user?.id);
        const pendientes = esPersonal ? [] : viaje.participantes.filter(p => !completadosPor.includes(p.userId));
        const todosCompletaron = esPersonal ? completadoPorMi : (viaje.participantes.length > 0 && pendientes.length === 0);
        const alguienMarcó = completadosPor.length > 0;

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.checkItem, { backgroundColor: surfaceBg }]}
            onPress={() => handleToggle(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={todosCompletaron ? 'checkmark-circle' : completadoPorMi ? 'checkmark-circle-outline' : 'ellipse-outline'}
              size={22}
              color={todosCompletaron || completadoPorMi ? '#10B981' : subtextColor}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.checkText, { color: todosCompletaron ? subtextColor : textColor, textDecorationLine: todosCompletaron ? 'line-through' : 'none' }]}>
                {item.texto}
              </Text>
              {!esPersonal && !todosCompletaron && alguienMarcó && (
                <Text style={styles.esperando}>
                  Esperando a: {pendientes.map(p => p.nombre.split(' ')[0]).join(', ')}
                </Text>
              )}
            </View>
            {!esPersonal && <Text style={[styles.autor, { color: subtextColor }]}>{item.autorNombre.split(' ')[0]}</Text>}
            {item.createdBy === user?.id && activo && (
              <TouchableOpacity onPress={() => handleEliminarItem(item.id)}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}

      {checklist.filter(item => item.tipo === checklistTab).length === 0 && (
        <Text style={[styles.checklistEmpty, { color: subtextColor }]}>
          {checklistTab === 'general' ? 'Sin ítems generales todavía' : 'Sin ítems personales todavía'}
        </Text>
      )}
```

- [ ] **Step 4: Add the new styles**

In the `styles` `StyleSheet.create` block at the bottom of the file, add these entries
(alongside the existing `sectionHeader`, `checkItem`, etc.):

```js
  checklistTabsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  checklistTabBtn: {
    flex: 1, paddingVertical: 6, borderRadius: radius.md,
    alignItems: 'center', backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'transparent',
  },
  checklistTabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checklistTabText: { fontSize: 12, fontWeight: '600' },
  checklistTabTextActive: { color: '#fff' },
  checklistEmpty: { ...typography.body, textAlign: 'center', paddingVertical: spacing.md },
```

- [ ] **Step 5: Manual verification — General tab unchanged**

Run the app (`npm start` / `expo start`) with at least two accounts/participants in a
shared active viaje. Open the viaje → Notas tab → confirm the checklist opens on the
"General" tab and behaves exactly as before: add an item, confirm it shows "Esperando
a: <otro participante>" until every participant marks it, then confirm it flips to the
green checkmark + strikethrough once all have marked it.

- [ ] **Step 6: Manual verification — Personal tab is private and independent**

In the same viaje, switch to the "Personal" tab. Add an item (e.g. "Mi pasaporte").
Confirm:
- It appears immediately with no "Esperando a" text and no author label.
- Marking it toggles it to completed immediately (no dependency on other
  participants).
- Logging in as a second participant of the same viaje, their "Personal" tab does
  **not** show the first user's item (confirms RLS is actually filtering server-side,
  not just the client).
- Switching back to "General" still shows only general items.

- [ ] **Step 7: Commit**

```bash
git add src/components/viajes/ViajeNotasTab.jsx
git commit -m "feat: split viaje checklist into General and Personal tabs"
```
