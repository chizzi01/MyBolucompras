# Modo Viaje — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Modo Viaje" feature that lets groups of registered users create trips, split expenses, manage a shared checklist/notes, and view balances between participants.

**Architecture:** New `ViajesContext` wraps the existing `DataProvider` and exposes trip state to all screens. Three service files handle DB access (viajes CRUD, trip expenses + balance, checklist/notes). All new screens live under the existing `AuthStack`; a 5th tab "Viajes" is added to the bottom tab bar.

**Tech Stack:** React Native / Expo, Supabase (Postgres + RLS + Realtime for checklist), React Navigation (bottom tabs + native stack), existing `colors/spacing/radius/typography` from `src/constants/theme.js`, `@expo/vector-icons` Ionicons.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `supabase/migrations/20260528_modo_viaje.sql` | Creates 5 tables + RLS policies |
| `src/services/viajesService.js` | CRUD for `viajes` + `viaje_participantes` |
| `src/services/viajeGastosService.js` | Trip expense read + balance algorithm |
| `src/services/viajeNotasService.js` | Checklist + notes CRUD |
| `src/context/ViajesContext.jsx` | Global trips state, exposes `viajes`, `viajesActivos`, actions |
| `src/screens/ViajesScreen.jsx` | Tab "Viajes" — list of active + archived trips |
| `src/screens/ViajeDetailScreen.jsx` | Detail screen with segmented control header |
| `src/components/viajes/ViajeCard.jsx` | Trip card used in ViajesScreen |
| `src/components/viajes/CrearViajeModal.jsx` | Bottom sheet to create a new trip |
| `src/components/viajes/ViajeGastosTab.jsx` | Gastos tab inside ViajeDetailScreen |
| `src/components/viajes/ViajeBalanceTab.jsx` | Balance + liquidation tab |
| `src/components/viajes/ViajeNotasTab.jsx` | Checklist + notes tab |
| `src/components/viajes/ViajeOpcionesSheet.jsx` | ⋯ action sheet (edit, close, delete) |
| `src/components/viajes/CerrarViajeModal.jsx` | Confirm-close modal |
| `src/components/viajes/SplitPanel.jsx` | Solo yo / Todos / Algunos split picker |
| `src/components/viajes/ParticipantesPicker.jsx` | Checkboxes bottom sheet for "Algunos" |

### Modified files
| File | Change |
|---|---|
| `App.js` | Add Viajes tab + `ViajeDetail` screen to AuthStack + wrap DataProvider in ViajesProvider |
| `src/screens/AgregarScreen.jsx` | Add viaje banner + SplitPanel above the form |

---

## Task 1: Supabase migration

**Files:**
- Create: `supabase/migrations/20260528_modo_viaje.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260528_modo_viaje.sql

-- 1. viajes
CREATE TABLE IF NOT EXISTS public.viajes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       text        NOT NULL,
  emoji        text        NOT NULL DEFAULT '✈️',
  created_by   uuid        REFERENCES auth.users NOT NULL,
  estado       text        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
  fecha_cierre timestamp,
  created_at   timestamp   DEFAULT now()
);

-- 2. viaje_participantes
CREATE TABLE IF NOT EXISTS public.viaje_participantes (
  id         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id   uuid  REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid  REFERENCES auth.users NOT NULL,
  joined_at  timestamp DEFAULT now(),
  UNIQUE(viaje_id, user_id)
);

-- 3. viaje_gastos
CREATE TABLE IF NOT EXISTS public.viaje_gastos (
  id             uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id       uuid  REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  gasto_id       uuid  REFERENCES public.gastos(id) ON DELETE CASCADE NOT NULL,
  pagado_por     uuid  REFERENCES auth.users NOT NULL,
  modo_split     text  NOT NULL CHECK (modo_split IN ('solo', 'todos', 'algunos')),
  participantes  uuid[],
  created_at     timestamp DEFAULT now()
);

-- 4. viaje_checklist
CREATE TABLE IF NOT EXISTS public.viaje_checklist (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id    uuid    REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  texto       text    NOT NULL,
  completado  boolean NOT NULL DEFAULT false,
  created_by  uuid    REFERENCES auth.users NOT NULL,
  created_at  timestamp DEFAULT now()
);

-- 5. viaje_notas
CREATE TABLE IF NOT EXISTS public.viaje_notas (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id    uuid  REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  texto       text  NOT NULL,
  created_by  uuid  REFERENCES auth.users NOT NULL,
  created_at  timestamp DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.viajes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaje_participantes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaje_gastos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaje_checklist      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaje_notas          ENABLE ROW LEVEL SECURITY;

-- viajes: participants can SELECT; only creator can UPDATE/DELETE
CREATE POLICY "viajes_select" ON public.viajes FOR SELECT
  USING (id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));
CREATE POLICY "viajes_insert" ON public.viajes FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "viajes_update" ON public.viajes FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "viajes_delete" ON public.viajes FOR DELETE USING (created_by = auth.uid());

-- viaje_participantes: avoid self-referential loop — allow if own row OR creator of viaje
CREATE POLICY "vp_select" ON public.viaje_participantes FOR SELECT
  USING (user_id = auth.uid()
    OR viaje_id IN (SELECT id FROM public.viajes WHERE created_by = auth.uid()));
CREATE POLICY "vp_insert" ON public.viaje_participantes FOR INSERT
  WITH CHECK (viaje_id IN (SELECT id FROM public.viajes WHERE created_by = auth.uid())
    OR user_id = auth.uid());
CREATE POLICY "vp_delete" ON public.viaje_participantes FOR DELETE
  USING (viaje_id IN (SELECT id FROM public.viajes WHERE created_by = auth.uid()));

-- viaje_gastos, viaje_checklist, viaje_notas: participants only
CREATE POLICY "vg_all" ON public.viaje_gastos
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));

CREATE POLICY "vc_all" ON public.viaje_checklist
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));

CREATE POLICY "vn_all" ON public.viaje_notas
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Run the migration in Supabase**

Go to the Supabase dashboard → SQL Editor → paste and run the migration. Verify all 5 tables appear in Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260528_modo_viaje.sql
git commit -m "feat: add Modo Viaje Supabase migration (5 tables + RLS)"
```

---

## Task 2: viajesService.js

**Files:**
- Create: `src/services/viajesService.js`

- [ ] **Step 1: Create the service**

```js
// src/services/viajesService.js
import { supabase } from '../lib/supabase';

export const viajesService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('viajes')
      .select(`
        *,
        viaje_participantes(user_id, profiles:user_id(id, nombre, email))
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapViaje);
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('viajes')
      .select(`
        *,
        viaje_participantes(user_id, profiles:user_id(id, nombre, email))
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapViaje(data);
  },

  async crear(titulo, emoji, participanteIds) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: viaje, error } = await supabase
      .from('viajes')
      .insert([{ titulo, emoji, created_by: user.id }])
      .select()
      .single();
    if (error) throw error;

    // Always include creator; deduplicate
    const ids = [...new Set([user.id, ...participanteIds])];
    const rows = ids.map(uid => ({ viaje_id: viaje.id, user_id: uid }));
    const { error: partError } = await supabase.from('viaje_participantes').insert(rows);
    if (partError) throw partError;

    return viajesService.getById(viaje.id);
  },

  async cerrar(id) {
    const { error } = await supabase
      .from('viajes')
      .update({ estado: 'cerrado', fecha_cierre: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async eliminar(id) {
    const { error } = await supabase.from('viajes').delete().eq('id', id);
    if (error) throw error;
  },

  async agregarParticipante(viajeId, userId) {
    const { error } = await supabase
      .from('viaje_participantes')
      .insert([{ viaje_id: viajeId, user_id: userId }]);
    if (error) throw error;
  },

  async quitarParticipante(viajeId, userId) {
    const { error } = await supabase
      .from('viaje_participantes')
      .delete()
      .eq('viaje_id', viajeId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async editarViaje(id, { titulo, emoji }) {
    const { error } = await supabase
      .from('viajes')
      .update({ titulo, emoji })
      .eq('id', id);
    if (error) throw error;
  },
};

function mapViaje(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    emoji: row.emoji,
    estado: row.estado,
    createdBy: row.created_by,
    fechaCierre: row.fecha_cierre,
    createdAt: row.created_at,
    participantes: (row.viaje_participantes || []).map(p => ({
      userId: p.user_id,
      nombre: p.profiles?.nombre || p.profiles?.email || p.user_id,
      email: p.profiles?.email || '',
    })),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/viajesService.js
git commit -m "feat: add viajesService (CRUD viajes + participantes)"
```

---

## Task 3: viajeGastosService.js

**Files:**
- Create: `src/services/viajeGastosService.js`

- [ ] **Step 1: Create the service**

```js
// src/services/viajeGastosService.js
import { supabase } from '../lib/supabase';
import { gastosService } from './gastosService';

export const viajeGastosService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_gastos')
      .select(`
        *,
        gastos:gasto_id(id, objeto, precio, fecha, etiqueta),
        pagador:pagado_por(id, nombre, email)
      `)
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      gastoId: row.gasto_id,
      objeto: row.gastos?.objeto || '',
      precio: Number(row.gastos?.precio || 0),
      fecha: row.gastos?.fecha || '',
      etiqueta: row.gastos?.etiqueta || '',
      pagadoPor: row.pagado_por,
      pagadorNombre: row.pagador?.nombre || row.pagador?.email || row.pagado_por,
      modoSplit: row.modo_split,
      participantes: row.participantes || [],
      createdAt: row.created_at,
    }));
  },

  // Split config: { modoSplit: 'solo'|'todos'|'algunos', participanteIds: uuid[] }
  // participanteIds needed only for 'algunos'; for 'todos' pass all participant IDs
  async agregarGasto(viajeId, gastoData, splitConfig, viajeParticipantes) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { modoSplit, participanteIds } = splitConfig;

    let precioBase = Number(gastoData.precio);
    let copias = [];

    if (modoSplit === 'todos') {
      const n = viajeParticipantes.length;
      precioBase = Number(gastoData.precio) / n;
      copias = viajeParticipantes
        .filter(p => p.userId !== user.id)
        .map(p => ({ ...gastoData, precio: precioBase, compartidoConNombre: gastoData.objeto }));
    } else if (modoSplit === 'algunos') {
      const n = participanteIds.length;
      precioBase = Number(gastoData.precio) / n;
      copias = participanteIds
        .filter(id => id !== user.id)
        .map(uid => {
          const p = viajeParticipantes.find(p => p.userId === uid);
          return { ...gastoData, precio: precioBase, compartidoConNombre: gastoData.objeto, _userId: uid };
        });
    }

    // Create main gasto for payer
    const mainGasto = await gastosService.crear({ ...gastoData, precio: precioBase });

    // Create copies for other participants
    for (const copia of copias) {
      const uid = copia._userId;
      const { _userId, ...copiaData } = copia;
      await supabase.from('gastos').insert([{
        es_fijo: copiaData.isFijo ?? false,
        objeto: `${copiaData.objeto} (viaje: ${copiaData.compartidoConNombre})`,
        fecha: copiaData.fecha?.includes('/') ? copiaData.fecha.split('/').reverse().join('-') : copiaData.fecha,
        medio: copiaData.medio,
        cuotas: copiaData.cuotas ?? 1,
        tipo: copiaData.tipo || null,
        moneda: copiaData.moneda || 'ARS',
        banco: copiaData.banco || null,
        cantidad: 1,
        precio: copiaData.precio,
        etiqueta: copiaData.etiqueta || null,
        compartido_con_nombre: copiaData.compartidoConNombre,
        user_id: uid,
      }]);
    }

    // Register in viaje_gastos
    const participantesIds = modoSplit === 'todos'
      ? viajeParticipantes.map(p => p.userId)
      : modoSplit === 'algunos'
        ? participanteIds
        : [user.id];

    const { error } = await supabase.from('viaje_gastos').insert([{
      viaje_id: viajeId,
      gasto_id: mainGasto.id,
      pagado_por: user.id,
      modo_split: modoSplit,
      participantes: participantesIds,
    }]);
    if (error) throw error;

    return mainGasto;
  },

  // Returns { porPersona: [{userId, nombre, total, neto}], liquidacion: [{de, hacia, monto}] }
  calcularBalance(viajeGastos, participantes) {
    // Initialize nets to 0
    const nets = {};
    for (const p of participantes) nets[p.userId] = 0;

    for (const g of viajeGastos) {
      if (g.modoSplit === 'solo') continue;

      const ids = g.participantes.length ? g.participantes : participantes.map(p => p.userId);
      const n = ids.length;
      const porPersona = g.precio / n;

      // Payer receives money from others (excluding his own share)
      nets[g.pagadoPor] = (nets[g.pagadoPor] || 0) + g.precio - porPersona;

      // Others owe their share
      for (const id of ids) {
        if (id !== g.pagadoPor) {
          nets[id] = (nets[id] || 0) - porPersona;
        }
      }
    }

    // Build per-person summary
    const porPersona = participantes.map(p => ({
      userId: p.userId,
      nombre: p.nombre,
      total: viajeGastos
        .filter(g => g.pagadoPor === p.userId)
        .reduce((sum, g) => sum + g.precio, 0),
      neto: nets[p.userId] || 0,
    }));

    // Greedy liquidation: highest creditor collects from highest debtor first
    const creditors = porPersona.filter(p => p.neto > 0.01).map(p => ({ ...p }));
    const debtors   = porPersona.filter(p => p.neto < -0.01).map(p => ({ ...p }));
    creditors.sort((a, b) => b.neto - a.neto);
    debtors.sort((a, b) => a.neto - b.neto);

    const liquidacion = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const amount = Math.min(creditors[ci].neto, -debtors[di].neto);
      liquidacion.push({ de: debtors[di].userId, deNombre: debtors[di].nombre, hacia: creditors[ci].userId, haciaNombre: creditors[ci].nombre, monto: Math.round(amount * 100) / 100 });
      creditors[ci].neto -= amount;
      debtors[di].neto  += amount;
      if (creditors[ci].neto < 0.01) ci++;
      if (-debtors[di].neto  < 0.01) di++;
    }

    return { porPersona, liquidacion };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/viajeGastosService.js
git commit -m "feat: add viajeGastosService with balance algorithm"
```

---

## Task 4: viajeNotasService.js

**Files:**
- Create: `src/services/viajeNotasService.js`

- [ ] **Step 1: Create the service**

```js
// src/services/viajeNotasService.js
import { supabase } from '../lib/supabase';

export const viajeNotasService = {
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
      completado: row.completado,
      createdBy: row.created_by,
      autorNombre: row.autor?.nombre || row.autor?.email || '',
      createdAt: row.created_at,
    }));
  },

  async agregarItem(viajeId, texto) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('viaje_checklist')
      .insert([{ viaje_id: viajeId, texto, created_by: user.id }])
      .select('*, autor:created_by(id, nombre, email)')
      .single();
    if (error) throw error;
    return { id: data.id, texto: data.texto, completado: data.completado, createdBy: data.created_by, autorNombre: data.autor?.nombre || data.autor?.email || '', createdAt: data.created_at };
  },

  async toggleItem(itemId, completado) {
    const { error } = await supabase
      .from('viaje_checklist')
      .update({ completado })
      .eq('id', itemId);
    if (error) throw error;
  },

  async eliminarItem(itemId) {
    const { error } = await supabase.from('viaje_checklist').delete().eq('id', itemId);
    if (error) throw error;
  },

  async getNotas(viajeId) {
    const { data, error } = await supabase
      .from('viaje_notas')
      .select('*, autor:created_by(id, nombre, email)')
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      texto: row.texto,
      createdBy: row.created_by,
      autorNombre: row.autor?.nombre || row.autor?.email || '',
      createdAt: row.created_at,
    }));
  },

  async agregarNota(viajeId, texto) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('viaje_notas')
      .insert([{ viaje_id: viajeId, texto, created_by: user.id }])
      .select('*, autor:created_by(id, nombre, email)')
      .single();
    if (error) throw error;
    return { id: data.id, texto: data.texto, createdBy: data.created_by, autorNombre: data.autor?.nombre || data.autor?.email || '', createdAt: data.created_at };
  },

  async eliminarNota(notaId) {
    const { error } = await supabase.from('viaje_notas').delete().eq('id', notaId);
    if (error) throw error;
  },

  subscribeChecklist(viajeId, onChange) {
    return supabase
      .channel(`checklist:${viajeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viaje_checklist', filter: `viaje_id=eq.${viajeId}` }, () => onChange())
      .subscribe();
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/viajeNotasService.js
git commit -m "feat: add viajeNotasService (checklist + notas + realtime)"
```

---

## Task 5: ViajesContext.jsx

**Files:**
- Create: `src/context/ViajesContext.jsx`

- [ ] **Step 1: Create the context**

```jsx
// src/context/ViajesContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { viajesService } from '../services/viajesService';
import { useAuth } from './AuthContext';

const ViajesContext = createContext(null);

export function ViajesProvider({ children }) {
  const { user } = useAuth();
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargarViajes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await viajesService.getAll();
      setViajes(data);
    } catch (err) {
      console.warn('[ViajesContext] cargarViajes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) cargarViajes();
    else setViajes([]);
  }, [user?.id]);

  const crearViaje = async (titulo, emoji, participanteIds) => {
    const nuevo = await viajesService.crear(titulo, emoji, participanteIds);
    setViajes(prev => [nuevo, ...prev]);
    return nuevo;
  };

  const cerrarViaje = async (id) => {
    await viajesService.cerrar(id);
    setViajes(prev => prev.map(v => v.id === id ? { ...v, estado: 'cerrado' } : v));
  };

  const eliminarViaje = async (id) => {
    await viajesService.eliminar(id);
    setViajes(prev => prev.filter(v => v.id !== id));
  };

  const editarViaje = async (id, campos) => {
    await viajesService.editarViaje(id, campos);
    setViajes(prev => prev.map(v => v.id === id ? { ...v, ...campos } : v));
  };

  const viajesActivos = viajes.filter(v => v.estado === 'activo');

  return (
    <ViajesContext.Provider value={{
      viajes, viajesActivos, loading,
      cargarViajes, crearViaje, cerrarViaje, eliminarViaje, editarViaje,
    }}>
      {children}
    </ViajesContext.Provider>
  );
}

export function useViajes() {
  const ctx = useContext(ViajesContext);
  if (!ctx) throw new Error('useViajes debe usarse dentro de ViajesProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/ViajesContext.jsx
git commit -m "feat: add ViajesContext with trip state management"
```

---

## Task 6: ViajesScreen + ViajeCard + App.js tab

**Files:**
- Create: `src/screens/ViajesScreen.jsx`
- Create: `src/components/viajes/ViajeCard.jsx`
- Modify: `App.js`

- [ ] **Step 1: Create ViajeCard component**

```jsx
// src/components/viajes/ViajeCard.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../constants/theme';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ViajeCard({ viaje, onPress, dark }) {
  const activo = viaje.estado === 'activo';
  const borderColor = activo ? '#10B981' : (dark ? '#334155' : '#CBD5E1');
  const gastoCount = viaje._gastoCount ?? 0;
  const checklistTotal = viaje._checklistTotal ?? 0;
  const checklistDone = viaje._checklistDone ?? 0;

  return (
    <TouchableOpacity
      style={[s.card(dark), { borderLeftColor: borderColor, opacity: activo ? 1 : 0.7 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={s.row}>
        <Text style={s.emoji}>{viaje.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo(dark)}>{viaje.titulo}</Text>
          <Text style={s.participantes(dark)}>
            {viaje.participantes.map(p => p.nombre.split(' ')[0]).join(', ')}
          </Text>
        </View>
        <View style={s.estadoBadge(activo)}>
          <Text style={s.estadoText(activo)}>{activo ? '● Activo' : '🔒 Cerrado'}</Text>
        </View>
      </View>

      <View style={s.chips}>
        {gastoCount > 0 && (
          <View style={s.chip(dark)}><Text style={s.chipText(dark)}>💸 {gastoCount} gastos</Text></View>
        )}
        {checklistTotal > 0 && (
          <View style={s.chip(dark)}>
            <Text style={s.chipText(dark)}>✅ {checklistDone}/{checklistTotal}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = {
  card: dark => ({
    backgroundColor: dark ? '#1E293B' : '#fff',
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: dark ? 0 : 0.06,
    shadowRadius: 6,
    elevation: 2,
  }),
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  emoji: { fontSize: 28 },
  titulo: dark => ({ ...typography.h3, color: dark ? colors.text.dark : colors.text.light }),
  participantes: dark => ({ ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 2 }),
  estadoBadge: activo => ({
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
    backgroundColor: activo ? '#10B98120' : '#64748B20',
  }),
  estadoText: activo => ({ fontSize: 11, fontWeight: '600', color: activo ? '#10B981' : '#64748B' }),
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: dark => ({
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
    backgroundColor: dark ? '#0F172A' : '#F1F5F9',
  }),
  chipText: dark => ({ fontSize: 11, color: dark ? colors.textSecondary.dark : colors.textSecondary.light }),
};
```

- [ ] **Step 2: Create ViajesScreen**

```jsx
// src/screens/ViajesScreen.jsx
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useViajes } from '../context/ViajesContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import ViajeCard from '../components/viajes/ViajeCard';
import CrearViajeModal from '../components/viajes/CrearViajeModal';

export default function ViajesScreen() {
  const { dark } = useTheme();
  const { viajes, loading, cargarViajes } = useViajes();
  const navigation = useNavigation();
  const [showCrear, setShowCrear] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activos = viajes.filter(v => v.estado === 'activo');
  const archivados = viajes.filter(v => v.estado === 'cerrado');

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarViajes();
    setRefreshing(false);
  };

  const renderSection = (title, data) => {
    if (!data.length) return null;
    return (
      <>
        <Text style={[styles.sectionTitle, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
          {title}
        </Text>
        {data.map(v => (
          <ViajeCard
            key={v.id}
            viaje={v}
            dark={dark}
            onPress={() => navigation.navigate('ViajeDetail', { viajeId: v.id })}
          />
        ))}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: dark ? colors.background.dark : colors.background.light }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: dark ? colors.text.dark : colors.text.light }]}>Mis Viajes ✈️</Text>
          <Text style={[styles.subtitle, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
            {activos.length} activo{activos.length !== 1 ? 's' : ''} · {archivados.length} archivado{archivados.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setShowCrear(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => 'empty'}
        renderItem={null}
        ListHeaderComponent={
          <View style={{ padding: spacing.md }}>
            {renderSection('ACTIVOS', activos)}
            {renderSection('ARCHIVADOS', archivados)}
            {!viajes.length && !loading && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>✈️</Text>
                <Text style={[styles.emptyText, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
                  No tenés viajes todavía.{'\n'}¡Creá uno para empezar!
                </Text>
              </View>
            )}
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <CrearViajeModal visible={showCrear} onClose={() => setShowCrear(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { ...typography.h2 },
  subtitle: { ...typography.caption, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyEmoji: { fontSize: 56 },
  emptyText: { ...typography.body, textAlign: 'center', lineHeight: 24 },
});
```

- [ ] **Step 3: Update App.js** — add ViajesProvider, Viajes tab, and ViajeDetail screen

In `App.js`, make three changes:

**3a. Add imports** (after existing screen imports):

```js
import { ViajesProvider } from './src/context/ViajesContext';
import ViajesScreen from './src/screens/ViajesScreen';
import ViajeDetailScreen from './src/screens/ViajeDetailScreen';
```

**3b. Update TabNavigator** — add the Viajes tab and update the icon logic:

Replace the existing `tabBarIcon` function and screens block with:

```js
tabBarIcon: ({ focused, color, size }) => {
  const icons = {
    Gastos: focused ? 'list' : 'list-outline',
    Agregar: focused ? 'add-circle' : 'add-circle-outline',
    Dashboard: focused ? 'bar-chart' : 'bar-chart-outline',
    Viajes: focused ? 'airplane' : 'airplane-outline',
    Configuracion: focused ? 'settings' : 'settings-outline',
  };
  return <Ionicons name={icons[route.name]} size={route.name === 'Agregar' ? 28 : size} color={color} />;
},
```

And add the Viajes tab (between Dashboard and Configuracion):
```jsx
<Tab.Screen name="Viajes" component={ViajesScreen} options={{ tabBarLabel: 'Viajes' }} />
```

**3c. Update RootNavigator** — wrap DataProvider with ViajesProvider and add ViajeDetail to AuthStack:

```jsx
<DataProvider>
  <ViajesProvider>
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Tabs" component={TabNavigator} />
      <AuthStack.Screen
        name="EditarGasto"
        component={EditarGastoScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
      />
      <AuthStack.Screen
        name="ViajeDetail"
        component={ViajeDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </AuthStack.Navigator>
  </ViajesProvider>
</DataProvider>
```

- [ ] **Step 4: Create a placeholder ViajeDetailScreen** (so App.js compiles):

```jsx
// src/screens/ViajeDetailScreen.jsx  — placeholder, replaced in Task 8
import React from 'react';
import { View, Text } from 'react-native';
export default function ViajeDetailScreen() {
  return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Viaje Detail</Text></View>;
}
```

- [ ] **Step 5: Verify the app starts and the Viajes tab appears**

Run `npx expo start` (or your dev script). Open the app and confirm:
- 5 tabs visible: Gastos | Agregar | Dashboard | Viajes | Config
- Viajes tab opens ViajesScreen (empty state "No tenés viajes")

- [ ] **Step 6: Commit**

```bash
git add src/screens/ViajesScreen.jsx src/components/viajes/ViajeCard.jsx src/screens/ViajeDetailScreen.jsx App.js
git commit -m "feat: add Viajes tab with ViajesScreen and ViajeCard"
```

---

## Task 7: CrearViajeModal

**Files:**
- Create: `src/components/viajes/CrearViajeModal.jsx`

- [ ] **Step 1: Create the modal**

```jsx
// src/components/viajes/CrearViajeModal.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useViajes } from '../../context/ViajesContext';
import { userService } from '../../services/userService';
import { contactService } from '../../services/contactService';
import { colors, spacing, radius, typography } from '../../constants/theme';

const EMOJIS = ['✈️', '🏔️', '🌊', '🌴', '🎿', '🏖️', '🎒', '🗺️'];

export default function CrearViajeModal({ visible, onClose }) {
  const { dark } = useTheme();
  const { crearViaje } = useViajes();
  const insets = useSafeAreaInsets();

  const [titulo, setTitulo] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [participantes, setParticipantes] = useState([]); // [{id, nombre, email}]
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [recentContacts, setRecentContacts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) contactService.getRecent().then(setRecentContacts);
  }, [visible]);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setError('');
    try {
      const found = await userService.buscarPorEmail(searchEmail.trim());
      if (!found) { setError('No se encontró ningún usuario con ese email.'); return; }
      if (participantes.find(p => p.id === found.id)) { setError('Ya está en la lista.'); return; }
      setParticipantes(prev => [...prev, found]);
      setSearchEmail('');
      const next = await contactService.saveContact(found);
      setRecentContacts(next);
    } catch (err) {
      setError('Error al buscar usuario.');
    } finally {
      setSearching(false);
    }
  };

  const handleCrear = async () => {
    if (!titulo.trim()) { setError('El título es requerido.'); return; }
    setSaving(true);
    setError('');
    try {
      await crearViaje(titulo.trim(), emoji, participantes.map(p => p.id));
      setTitulo('');
      setEmoji('✈️');
      setParticipantes([]);
      onClose();
    } catch (err) {
      setError('Error al crear el viaje: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const inputBg = dark ? '#0F172A' : '#F8FAFC';
  const border = dark ? colors.border.dark : colors.border.light;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: textColor }]}>Nuevo Viaje</Text>

            {/* Emoji picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Titulo */}
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]}
              placeholder="Nombre del viaje"
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
              value={titulo}
              onChangeText={setTitulo}
            />

            {/* Participant search */}
            <Text style={[styles.label, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>PARTICIPANTES</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: inputBg, borderColor: border, color: textColor }]}
                placeholder="Buscar por email..."
                placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                value={searchEmail}
                onChangeText={v => { setSearchEmail(v); setError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>

            {/* Recent contacts */}
            {recentContacts.length > 0 && (
              <View style={styles.recents}>
                {recentContacts.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.recentPill}
                    onPress={() => {
                      if (!participantes.find(p => p.id === c.id)) setParticipantes(prev => [...prev, c]);
                    }}
                  >
                    <Text style={{ fontSize: 12, color: dark ? colors.textSecondary.dark : colors.textSecondary.light }}>
                      {c.nombre || c.email?.split('@')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Participant chips */}
            <View style={styles.chips}>
              {participantes.map(p => (
                <View key={p.id} style={[styles.chip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={{ fontSize: 13, color: colors.primary }}>{p.nombre || p.email}</Text>
                  <TouchableOpacity onPress={() => setParticipantes(prev => prev.filter(x => x.id !== p.id))}>
                    <Ionicons name="close-circle" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handleCrear} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crear Viaje</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: dark ? colors.textSecondary.dark : colors.textSecondary.light }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h2, marginBottom: spacing.md },
  emojiBtn: { padding: 8, marginRight: 6, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, ...typography.body, marginBottom: spacing.md },
  label: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  searchBtn: { backgroundColor: colors.primary, borderRadius: radius.md, width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  recents: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  recentPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
```

- [ ] **Step 2: Test flow** — tap "Nuevo" in ViajesScreen, fill a title, pick emoji, tap "Crear Viaje". Verify the trip appears in the list.

- [ ] **Step 3: Commit**

```bash
git add src/components/viajes/CrearViajeModal.jsx
git commit -m "feat: add CrearViajeModal bottom sheet"
```

---

## Task 8: ViajeDetailScreen (full implementation)

**Files:**
- Modify: `src/screens/ViajeDetailScreen.jsx` (replace placeholder)
- Create: `src/components/viajes/ViajeOpcionesSheet.jsx`
- Create: `src/components/viajes/CerrarViajeModal.jsx`

- [ ] **Step 1: Implement ViajeDetailScreen**

```jsx
// src/screens/ViajeDetailScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useViajes } from '../context/ViajesContext';
import { viajesService } from '../services/viajesService';
import { viajeGastosService } from '../services/viajeGastosService';
import { colors, spacing, radius, typography } from '../constants/theme';
import ViajeGastosTab from '../components/viajes/ViajeGastosTab';
import ViajeBalanceTab from '../components/viajes/ViajeBalanceTab';
import ViajeNotasTab from '../components/viajes/ViajeNotasTab';
import ViajeOpcionesSheet from '../components/viajes/ViajeOpcionesSheet';

const TABS = ['💸 Gastos', '⚖️ Balance', '✅ Notas'];
const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ViajeDetailScreen() {
  const { dark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { viajeId } = route.params;
  const { cargarViajes } = useViajes();

  const [viaje, setViaje] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabIdx, setTabIdx] = useState(0);
  const [showOpciones, setShowOpciones] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [v, g] = await Promise.all([
        viajesService.getById(viajeId),
        viajeGastosService.getByViaje(viajeId),
      ]);
      setViaje(v);
      setGastos(g);
    } catch (err) {
      console.warn('[ViajeDetail] cargar:', err.message);
    } finally {
      setLoading(false);
    }
  }, [viajeId]);

  useEffect(() => { cargar(); }, [cargar]);

  const participantColor = (userId) => {
    if (!viaje) return PARTICIPANT_COLORS[0];
    const idx = viaje.participantes.findIndex(p => p.userId === userId);
    return PARTICIPANT_COLORS[Math.max(0, idx) % PARTICIPANT_COLORS.length];
  };

  const totalGastado = gastos.reduce((sum, g) => sum + g.precio, 0);
  const activo = viaje?.estado === 'activo';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? colors.background.dark : colors.background.light }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!viaje) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light }} edges={['bottom']}>
      {/* Header Gradient */}
      <LinearGradient colors={['#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backText}>Mis Viajes</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowOpciones(true)} style={styles.optionsBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.viajeEmoji}>{viaje.emoji}</Text>
        <Text style={styles.viajeTitulo}>{viaje.titulo}</Text>
        <Text style={styles.viajeParticipantes}>
          {viaje.participantes.map(p => p.nombre.split(' ')[0]).join(' · ')}
        </Text>

        <View style={styles.pills}>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Total</Text>
            <Text style={styles.pillValue}>${totalGastado.toFixed(0)}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Gastos</Text>
            <Text style={styles.pillValue}>{gastos.length}</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: activo ? '#10B98130' : '#64748B30' }]}>
            <Text style={[styles.badgeText, { color: activo ? '#6EE7B7' : '#CBD5E1' }]}>
              {activo ? '● Activo' : '🔒 Archivado'}
            </Text>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmented}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[styles.segTab, tabIdx === i && styles.segTabActive]}
              onPress={() => setTabIdx(i)}
            >
              <Text style={[styles.segTabText, tabIdx === i && styles.segTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Tab Content */}
      {tabIdx === 0 && (
        <ViajeGastosTab
          viaje={viaje}
          gastos={gastos}
          onGastoAdded={cargar}
          participantColor={participantColor}
          dark={dark}
        />
      )}
      {tabIdx === 1 && (
        <ViajeBalanceTab
          viaje={viaje}
          gastos={gastos}
          participantColor={participantColor}
          dark={dark}
        />
      )}
      {tabIdx === 2 && (
        <ViajeNotasTab
          viaje={viaje}
          dark={dark}
        />
      )}

      <ViajeOpcionesSheet
        visible={showOpciones}
        onClose={() => setShowOpciones(false)}
        viaje={viaje}
        onUpdated={() => { cargar(); cargarViajes(); }}
        onDeleted={() => { navigation.goBack(); cargarViajes(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingHorizontal: spacing.md, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#fff', fontSize: 15 },
  optionsBtn: { padding: 4 },
  viajeEmoji: { fontSize: 36, marginBottom: 4 },
  viajeTitulo: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  viajeParticipantes: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.md },
  pills: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  pill: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, alignItems: 'center' },
  pillLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  pillValue: { fontSize: 15, color: '#fff', fontWeight: '700' },
  badgeRow: { marginBottom: spacing.md },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  segmented: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: radius.md, padding: 3 },
  segTab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  segTabActive: { backgroundColor: '#fff' },
  segTabText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  segTabTextActive: { color: colors.primary, fontWeight: '700' },
});
```

**Note:** This file imports `expo-linear-gradient`. Run: `npx expo install expo-linear-gradient` if not already installed.

- [ ] **Step 2: Check if expo-linear-gradient is installed**

```bash
npx expo install expo-linear-gradient
```

- [ ] **Step 3: Commit ViajeDetailScreen shell**

```bash
git add src/screens/ViajeDetailScreen.jsx
git commit -m "feat: add ViajeDetailScreen with gradient header and segmented control"
```

---

## Task 9: ViajeGastosTab

**Files:**
- Create: `src/components/viajes/ViajeGastosTab.jsx`

- [ ] **Step 1: Create the tab**

```jsx
// src/components/viajes/ViajeGastosTab.jsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function ViajeGastosTab({ viaje, gastos, onGastoAdded, participantColor, dark }) {
  const navigation = useNavigation();
  const activo = viaje.estado === 'activo';
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const handleAgregarGasto = () => {
    navigation.navigate('Agregar', { viajeId: viaje.id, viajeNombre: `${viaje.emoji} ${viaje.titulo}` });
  };

  const renderItem = ({ item: g }) => {
    const color = participantColor(g.pagadoPor);
    const initial = g.pagadorNombre?.[0]?.toUpperCase() || '?';
    const n = g.participantes.length || viaje.participantes.length;
    const splitText = g.modoSplit === 'solo'
      ? 'solo él/ella'
      : `÷ ${n}`;

    return (
      <View style={[styles.item, { backgroundColor: surfaceBg }]}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.objeto, { color: textColor }]} numberOfLines={1}>{g.objeto}</Text>
          <Text style={[styles.meta, { color: subtextColor }]}>
            {g.pagadorNombre} pagó · {splitText}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.monto, { color: textColor }]}>${g.precio.toFixed(0)}</Text>
          {g.modoSplit !== 'solo' && n > 1 && (
            <Text style={[styles.ppp, { color: subtextColor }]}>
              ${(g.precio / n).toFixed(0)} c/u
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {!activo && (
        <View style={styles.readonlyBanner}>
          <Ionicons name="lock-closed-outline" size={14} color="#F59E0B" />
          <Text style={styles.readonlyText}>Solo lectura</Text>
        </View>
      )}
      <FlatList
        data={gastos}
        keyExtractor={g => g.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>💸</Text>
            <Text style={[styles.emptyText, { color: subtextColor }]}>Sin gastos todavía</Text>
          </View>
        }
      />
      {activo && (
        <TouchableOpacity style={styles.fab} onPress={handleAgregarGasto} activeOpacity={0.9}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Gasto al viaje</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  objeto: { ...typography.bodyMed },
  meta: { ...typography.caption, marginTop: 2 },
  monto: { ...typography.bodyBold },
  ppp: { fontSize: 11 },
  readonlyBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B20', padding: spacing.sm, paddingHorizontal: spacing.md },
  readonlyText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.body },
  fab: {
    position: 'absolute', bottom: 24, right: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.full,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/viajes/ViajeGastosTab.jsx
git commit -m "feat: add ViajeGastosTab with expense list and FAB"
```

---

## Task 10: ViajeBalanceTab

**Files:**
- Create: `src/components/viajes/ViajeBalanceTab.jsx`

- [ ] **Step 1: Create the tab**

```jsx
// src/components/viajes/ViajeBalanceTab.jsx
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { viajeGastosService } from '../../services/viajeGastosService';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function ViajeBalanceTab({ viaje, gastos, participantColor, dark }) {
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const { porPersona, liquidacion } = useMemo(
    () => viajeGastosService.calcularBalance(gastos, viaje.participantes),
    [gastos, viaje.participantes]
  );

  const maxTotal = Math.max(...porPersona.map(p => p.total), 1);

  const sectionLabel = (title) => (
    <Text style={[styles.sectionLabel, { color: subtextColor }]}>{title}</Text>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      {sectionLabel('CUÁNTO PUSO CADA UNO')}
      {porPersona.map(p => {
        const color = participantColor(p.userId);
        const netoPositive = p.neto > 0;
        return (
          <View key={p.userId} style={[styles.card, { backgroundColor: surfaceBg }]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: color }]}>
                <Text style={styles.avatarText}>{p.nombre[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombre, { color: textColor }]}>{p.nombre}</Text>
                <Text style={[styles.sub, { color: subtextColor }]}>Pagó por otros: ${p.total.toFixed(0)}</Text>
              </View>
              <Text style={[styles.neto, { color: netoPositive ? '#10B981' : p.neto < 0 ? colors.error : subtextColor }]}>
                {netoPositive ? '+' : ''}{p.neto.toFixed(0)}
              </Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.bar, { width: `${(p.total / maxTotal) * 100}%`, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}

      {liquidacion.length > 0 && (
        <>
          {sectionLabel('CÓMO LIQUIDAR')}
          {liquidacion.map((t, i) => (
            <View key={i} style={[styles.card, styles.transRow, { backgroundColor: surfaceBg }]}>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.de) }]}>
                <Text style={styles.avatarText}>{t.deNombre[0]?.toUpperCase()}</Text>
              </View>
              <Text style={[styles.transName, { color: textColor }]}>{t.deNombre}</Text>
              <Text style={{ color: subtextColor }}>→</Text>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.hacia) }]}>
                <Text style={styles.avatarText}>{t.haciaNombre[0]?.toUpperCase()}</Text>
              </View>
              <Text style={[styles.transName, { color: textColor }]}>{t.haciaNombre}</Text>
              <Text style={[styles.transMonto, { color: colors.primary }]}>${t.monto.toFixed(0)}</Text>
            </View>
          ))}
        </>
      )}

      {liquidacion.length === 0 && porPersona.length > 0 && (
        <View style={[styles.card, { backgroundColor: surfaceBg, alignItems: 'center', padding: spacing.lg }]}>
          <Text style={{ fontSize: 32 }}>✅</Text>
          <Text style={[styles.sub, { color: subtextColor, marginTop: 8 }]}>Todo está saldado</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm },
  card: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nombre: { ...typography.bodyMed },
  sub: { ...typography.caption, marginTop: 2 },
  neto: { ...typography.bodyBold, fontSize: 18 },
  barBg: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  transRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  transName: { ...typography.bodyMed, flex: 1 },
  transMonto: { ...typography.bodyBold },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/viajes/ViajeBalanceTab.jsx
git commit -m "feat: add ViajeBalanceTab with per-person amounts and greedy liquidation"
```

---

## Task 11: ViajeNotasTab

**Files:**
- Create: `src/components/viajes/ViajeNotasTab.jsx`

- [ ] **Step 1: Create the tab**

```jsx
// src/components/viajes/ViajeNotasTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { viajeNotasService } from '../../services/viajeNotasService';
import { colors, spacing, radius, typography } from '../../constants/theme';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ViajeNotasTab({ viaje, dark }) {
  const { user } = useAuth();
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const border = dark ? colors.border.dark : colors.border.light;

  const [checklist, setChecklist] = useState([]);
  const [notas, setNotas] = useState([]);
  const [nuevoItem, setNuevoItem] = useState('');
  const [nuevaNota, setNuevaNota] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [addingNota, setAddingNota] = useState(false);
  const [showItemInput, setShowItemInput] = useState(false);
  const [showNotaInput, setShowNotaInput] = useState(false);

  const activo = viaje.estado === 'activo';

  const cargar = useCallback(async () => {
    const [c, n] = await Promise.all([
      viajeNotasService.getChecklist(viaje.id),
      viajeNotasService.getNotas(viaje.id),
    ]);
    setChecklist(c);
    setNotas(n);
  }, [viaje.id]);

  useEffect(() => {
    cargar();
    // Realtime sync for checklist
    const channel = viajeNotasService.subscribeChecklist(viaje.id, cargar);
    return () => { channel.unsubscribe(); };
  }, [cargar]);

  const handleToggle = async (item) => {
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, completado: !i.completado } : i));
    try {
      await viajeNotasService.toggleItem(item.id, !item.completado);
    } catch {
      cargar();
    }
  };

  const handleAgregarItem = async () => {
    if (!nuevoItem.trim()) return;
    setAddingItem(true);
    try {
      const nuevo = await viajeNotasService.agregarItem(viaje.id, nuevoItem.trim());
      setChecklist(prev => [...prev, nuevo]);
      setNuevoItem('');
      setShowItemInput(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAddingItem(false);
    }
  };

  const handleEliminarItem = async (id) => {
    setChecklist(prev => prev.filter(i => i.id !== id));
    await viajeNotasService.eliminarItem(id);
  };

  const handleAgregarNota = async () => {
    if (!nuevaNota.trim()) return;
    setAddingNota(true);
    try {
      const nueva = await viajeNotasService.agregarNota(viaje.id, nuevaNota.trim());
      setNotas(prev => [nueva, ...prev]);
      setNuevaNota('');
      setShowNotaInput(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAddingNota(false);
    }
  };

  const handleEliminarNota = async (id) => {
    setNotas(prev => prev.filter(n => n.id !== id));
    await viajeNotasService.eliminarNota(id);
  };

  const participantColor = (userId) => {
    const idx = viaje.participantes.findIndex(p => p.userId === userId);
    return PARTICIPANT_COLORS[Math.max(0, idx) % PARTICIPANT_COLORS.length];
  };

  const sectionHeader = (title, onAdd) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionLabel, { color: subtextColor }]}>{title}</Text>
      {activo && (
        <TouchableOpacity onPress={onAdd}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      {/* Checklist */}
      {sectionHeader('QUÉ LLEVAR', () => setShowItemInput(v => !v))}

      {showItemInput && activo && (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC', borderColor: border, color: textColor }]}
            placeholder="Ej: Protector solar..."
            placeholderTextColor={subtextColor}
            value={nuevoItem}
            onChangeText={setNuevoItem}
            onSubmitEditing={handleAgregarItem}
            autoFocus
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAgregarItem} disabled={addingItem}>
            {addingItem ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {checklist.map(item => (
        <TouchableOpacity
          key={item.id}
          style={[styles.checkItem, { backgroundColor: surfaceBg }]}
          onPress={() => handleToggle(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.completado ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={item.completado ? '#10B981' : subtextColor}
          />
          <Text style={[styles.checkText, { color: item.completado ? subtextColor : textColor, textDecorationLine: item.completado ? 'line-through' : 'none' }]}>
            {item.texto}
          </Text>
          <Text style={[styles.autor, { color: subtextColor }]}>{item.autorNombre.split(' ')[0]}</Text>
          {item.createdBy === user?.id && activo && (
            <TouchableOpacity onPress={() => handleEliminarItem(item.id)}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}

      <View style={{ height: spacing.lg }} />

      {/* Notas */}
      {sectionHeader('NOTAS DEL GRUPO', () => setShowNotaInput(v => !v))}

      {showNotaInput && activo && (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC', borderColor: border, color: textColor }]}
            placeholder="Escribe una nota..."
            placeholderTextColor={subtextColor}
            value={nuevaNota}
            onChangeText={setNuevaNota}
            multiline
            autoFocus
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAgregarNota} disabled={addingNota}>
            {addingNota ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {notas.map(nota => (
        <View key={nota.id} style={[styles.notaCard, { backgroundColor: surfaceBg }]}>
          <View style={styles.notaHeader}>
            <Text style={[styles.notaAutor, { color: participantColor(nota.createdBy) }]}>{nota.autorNombre}</Text>
            <Text style={[styles.notaTs, { color: subtextColor }]}>
              {new Date(nota.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
            </Text>
            {nota.createdBy === user?.id && activo && (
              <TouchableOpacity onPress={() => handleEliminarNota(nota.id)}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.notaTexto, { color: textColor }]}>{nota.texto}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionLabel: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, ...typography.body },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.md, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, marginBottom: 6 },
  checkText: { ...typography.body, flex: 1 },
  autor: { fontSize: 11 },
  notaCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  notaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  notaAutor: { ...typography.captionMed, fontWeight: '700', flex: 1 },
  notaTs: { fontSize: 11 },
  notaTexto: { ...typography.body, lineHeight: 22 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/viajes/ViajeNotasTab.jsx
git commit -m "feat: add ViajeNotasTab with realtime checklist and notes"
```

---

## Task 12: ViajeOpcionesSheet + CerrarViajeModal

**Files:**
- Create: `src/components/viajes/ViajeOpcionesSheet.jsx`
- Create: `src/components/viajes/CerrarViajeModal.jsx`

- [ ] **Step 1: Create CerrarViajeModal**

```jsx
// src/components/viajes/CerrarViajeModal.jsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViajes } from '../../context/ViajesContext';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function CerrarViajeModal({ visible, onClose, viaje, gastos, onCerrado, dark }) {
  const { cerrarViaje } = useViajes();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const totalGastado = (gastos || []).reduce((sum, g) => sum + g.precio, 0);

  const handleCerrar = async () => {
    setLoading(true);
    try {
      await cerrarViaje(viaje.id);
      onClose();
      onCerrado?.();
    } catch (err) {
      console.warn('[CerrarViajeModal]', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={32} color="#F59E0B" />
          </View>

          <Text style={[styles.title, { color: textColor }]}>¿Cerrar el viaje?</Text>
          <Text style={[styles.sub, { color: subtextColor }]}>
            El viaje quedará archivado. Podrás consultarlo pero no agregar gastos.
          </Text>

          <View style={[styles.summary, { backgroundColor: dark ? '#1E293B' : '#F8FAFC' }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: subtextColor }]}>Total gastado</Text>
              <Text style={[styles.summaryValue, { color: textColor }]}>${totalGastado.toFixed(0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: subtextColor }]}>Gastos</Text>
              <Text style={[styles.summaryValue, { color: textColor }]}>{(gastos || []).length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: subtextColor }]}>Participantes</Text>
              <Text style={[styles.summaryValue, { color: textColor }]}>{viaje?.participantes?.length || 0}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#F59E0B' }]}
            onPress={handleCerrar}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sí, cerrar viaje</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={{ color: subtextColor, fontSize: 15 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  iconWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.sm },
  sub: { ...typography.body, textAlign: 'center', lineHeight: 22, marginBottom: spacing.md },
  summary: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...typography.body },
  summaryValue: { ...typography.bodyBold },
  btn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
```

- [ ] **Step 2: Create ViajeOpcionesSheet**

```jsx
// src/components/viajes/ViajeOpcionesSheet.jsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useViajes } from '../../context/ViajesContext';
import { colors, spacing, radius, typography } from '../../constants/theme';
import CerrarViajeModal from './CerrarViajeModal';

export default function ViajeOpcionesSheet({ visible, onClose, viaje, onUpdated, onDeleted, dark }) {
  const { user } = useAuth();
  const { eliminarViaje } = useViajes();
  const insets = useSafeAreaInsets();
  const [showCerrar, setShowCerrar] = useState(false);

  const bg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const activo = viaje?.estado === 'activo';
  const esCreador = viaje?.createdBy === user?.id;

  const handleEliminar = () => {
    Alert.alert(
      'Eliminar viaje',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarViaje(viaje.id);
              onClose();
              onDeleted?.();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const Option = ({ icon, label, onPress, color }) => (
    <TouchableOpacity style={styles.option} onPress={() => { onClose(); setTimeout(onPress, 300); }} activeOpacity={0.7}>
      <View style={[styles.optionIcon, { backgroundColor: (color || colors.primary) + '20' }]}>
        <Ionicons name={icon} size={20} color={color || colors.primary} />
      </View>
      <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={subtextColor} />
    </TouchableOpacity>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: textColor }]}>{viaje?.emoji} {viaje?.titulo}</Text>

            {activo && (
              <>
                <Option icon="lock-closed-outline" label="Cerrar viaje" onPress={() => setShowCerrar(true)} color="#F59E0B" />
              </>
            )}
            {esCreador && (
              <Option icon="trash-outline" label="Eliminar viaje" onPress={handleEliminar} color={colors.error} />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <CerrarViajeModal
        visible={showCerrar}
        onClose={() => setShowCerrar(false)}
        viaje={viaje}
        dark={dark}
        onCerrado={() => { setShowCerrar(false); onUpdated?.(); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  optionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { ...typography.bodyMed, flex: 1 },
});
```

- [ ] **Step 3: Test** — open a trip detail, tap ⋯, verify options appear. Test closing the trip.

- [ ] **Step 4: Commit**

```bash
git add src/components/viajes/ViajeOpcionesSheet.jsx src/components/viajes/CerrarViajeModal.jsx
git commit -m "feat: add ViajeOpcionesSheet and CerrarViajeModal"
```

---

## Task 13: SplitPanel + ParticipantesPicker

**Files:**
- Create: `src/components/viajes/SplitPanel.jsx`
- Create: `src/components/viajes/ParticipantesPicker.jsx`

These components are used by AgregarScreen (Task 14).

- [ ] **Step 1: Create ParticipantesPicker**

```jsx
// src/components/viajes/ParticipantesPicker.jsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../../constants/theme';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// participantes: [{userId, nombre}], currentUserId: string (always included, not removable)
// selected: uuid[], onChange: (uuid[]) => void
export default function ParticipantesPicker({ visible, onClose, participantes, selected, onChange, currentUserId, dark }) {
  const insets = useSafeAreaInsets();
  const bg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;

  const toggle = (userId) => {
    if (userId === currentUserId) return; // can't remove self
    if (selected.includes(userId)) {
      onChange(selected.filter(id => id !== userId));
    } else {
      onChange([...selected, userId]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: textColor }]}>Seleccionar participantes</Text>
          <ScrollView>
            {participantes.map((p, i) => {
              const isSelf = p.userId === currentUserId;
              const checked = selected.includes(p.userId);
              const color = PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length];
              return (
                <TouchableOpacity
                  key={p.userId}
                  style={styles.row}
                  onPress={() => toggle(p.userId)}
                  disabled={isSelf}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, { backgroundColor: color }]}>
                    <Text style={styles.avatarText}>{p.nombre[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.nombre, { color: textColor }]}>{p.nombre}{isSelf ? ' (vos)' : ''}</Text>
                  <Ionicons
                    name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={checked ? colors.primary : '#CBD5E1'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md, maxHeight: '70%' },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nombre: { ...typography.bodyMed, flex: 1 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2: Create SplitPanel**

```jsx
// src/components/viajes/SplitPanel.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../constants/theme';
import ParticipantesPicker from './ParticipantesPicker';

const MODES = [
  { key: 'solo', label: '🙋 Solo yo' },
  { key: 'todos', label: '👥 Todos' },
  { key: 'algunos', label: '👤+ Algunos' },
];

// participantes: [{userId, nombre}], currentUserId: string
// value: { modoSplit, participanteIds }
// onChange: (value) => void
// precio: number
export default function SplitPanel({ participantes, currentUserId, value, onChange, precio, dark }) {
  const [showPicker, setShowPicker] = useState(false);

  const border = dark ? colors.border.dark : colors.border.light;
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const surfaceBg = dark ? '#0F172A' : '#F8FAFC';

  const { modoSplit, participanteIds } = value;

  const handleModeChange = (mode) => {
    if (mode === 'todos') {
      onChange({ modoSplit: 'todos', participanteIds: participantes.map(p => p.userId) });
    } else if (mode === 'solo') {
      onChange({ modoSplit: 'solo', participanteIds: [currentUserId] });
    } else {
      onChange({ modoSplit: 'algunos', participanteIds: participanteIds.length ? participanteIds : [currentUserId] });
    }
  };

  const n = modoSplit === 'todos'
    ? participantes.length
    : modoSplit === 'algunos'
      ? participanteIds.length
      : 1;

  const ppp = n > 0 && precio ? precio / n : 0;

  return (
    <View style={[styles.panel, { backgroundColor: surfaceBg, borderColor: border }]}>
      <Text style={[styles.label, { color: subtextColor }]}>DIVISIÓN DEL GASTO</Text>

      <View style={styles.modeRow}>
        {MODES.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeBtn, { borderColor: border }, modoSplit === m.key && styles.modeBtnActive]}
            onPress={() => handleModeChange(m.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, { color: modoSplit === m.key ? '#fff' : textColor }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {modoSplit === 'algunos' && (
        <TouchableOpacity
          style={[styles.pickerBtn, { borderColor: colors.primary }]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={{ color: colors.primary, fontSize: 13 }}>
            {participanteIds.length} seleccionado{participanteIds.length !== 1 ? 's' : ''} — tocar para editar
          </Text>
        </TouchableOpacity>
      )}

      {precio > 0 && modoSplit !== 'solo' && n > 1 && (
        <Text style={[styles.summary, { color: subtextColor }]}>
          ${precio.toFixed(0)} ÷ {n} personas = ${ppp.toFixed(0)} c/u
        </Text>
      )}

      <ParticipantesPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        participantes={participantes}
        selected={participanteIds}
        onChange={ids => onChange({ modoSplit: 'algunos', participanteIds: ids })}
        currentUserId={currentUserId}
        dark={dark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  label: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText: { fontSize: 12, fontWeight: '600' },
  pickerBtn: { marginTop: spacing.sm, borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: 10, alignItems: 'center' },
  summary: { ...typography.captionMed, textAlign: 'center', marginTop: spacing.sm },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/viajes/SplitPanel.jsx src/components/viajes/ParticipantesPicker.jsx
git commit -m "feat: add SplitPanel and ParticipantesPicker components"
```

---

## Task 14: AgregarScreen integration

**Files:**
- Modify: `src/screens/AgregarScreen.jsx`

AgregarScreen receives optional route params: `{ viajeId, viajeNombre }`.
Three cases need to be handled (see spec §Integración con AgregarScreen).

- [ ] **Step 1: Add viaje state and imports to AgregarScreen**

At the top of `AgregarScreen.jsx`, add these imports after existing ones:

```js
import { useViajes } from '../context/ViajesContext';
import { useRoute } from '@react-navigation/native';
import SplitPanel from '../components/viajes/SplitPanel';
import { useAuth } from '../context/AuthContext';
import { viajeGastosService } from '../services/viajeGastosService';
```

- [ ] **Step 2: Add viaje state inside AgregarScreen function**

Add after the existing state declarations (after `const [recentContacts, setRecentContacts] = useState([]);`):

```js
const route = useRoute();
const { user } = useAuth();
const { viajesActivos } = useViajes();

// Viaje state
const routeViajeId = route.params?.viajeId;
const routeViajeNombre = route.params?.viajeNombre;

// Which viaje is selected (null = no viaje)
const [selectedViajeId, setSelectedViajeId] = useState(routeViajeId || null);
const [viajeToggleOn, setViajeToggleOn] = useState(!!routeViajeId);
const [splitConfig, setSplitConfig] = useState({ modoSplit: 'todos', participanteIds: [] });

const selectedViaje = viajesActivos.find(v => v.id === selectedViajeId) || null;

// Initialize split participanteIds when viaje changes
useEffect(() => {
  if (selectedViaje) {
    setSplitConfig({
      modoSplit: 'todos',
      participanteIds: selectedViaje.participantes.map(p => p.userId),
    });
  }
}, [selectedViajeId]);
```

- [ ] **Step 3: Update handleGuardar to handle viaje splits**

Replace the existing `handleGuardar` function with:

```js
const handleGuardar = async () => {
  if (!form.objeto.trim()) {
    return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá el objeto del gasto.' });
  }
  if (!form.precio || isNaN(Number(form.precio))) {
    return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá un precio válido.' });
  }

  setLoading(true);
  try {
    const gastoData = {
      ...form,
      cuotas: parseInt(form.cuotas) || 1,
      cantidad: parseInt(form.cantidad) || 1,
      precio: Number(form.precio),
    };

    if (selectedViaje && viajeToggleOn) {
      // Save via viajeGastosService (handles split + viaje_gastos registration)
      await viajeGastosService.agregarGasto(
        selectedViaje.id,
        gastoData,
        splitConfig,
        selectedViaje.participantes
      );
    } else {
      // Normal gasto (existing behavior)
      const sharedWith = sharedUser ? { userId: sharedUser.id, mode: shareMode, nombre: sharedUser.nombre || sharedUser.email } : null;
      await agregarGasto(gastoData, sharedWith);
    }

    setForm({
      ...INITIAL,
      medio: mediosDisponibles[0] || '',
      moneda: mydata.monedaPreferida || 'ARS',
    });
    setPrecioDisplay('');
    setSharedUser(null);
    setSearchEmail('');
    setViajeToggleOn(!!routeViajeId);
    setSelectedViajeId(routeViajeId || null);

    showModal({
      type: 'success',
      title: '¡Guardado!',
      message: 'El gasto fue agregado correctamente.',
      onClose: () => navigation.navigate(routeViajeId ? 'Tabs' : 'Gastos'),
    });
  } catch (err) {
    showModal({ type: 'error', title: 'Error al guardar', message: err.message });
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 4: Add the viaje banner JSX above the form fields**

In the JSX, add this block immediately after the `<View style={s.titleRow}>` closing tag and before `<Field label="Tipo de gasto">`:

```jsx
{/* Viaje Banner — Case 0: opened from FAB inside a viaje (locked ON) */}
{routeViajeId && selectedViaje && (
  <View style={[s.viajeBanner, { borderColor: '#10B981', backgroundColor: '#10B98112' }]}>
    <Text style={s.viajeBannerText}>{selectedViaje.emoji} {selectedViaje.titulo} · Activo</Text>
    <Text style={[s.viajeBannerSub, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>Gasto del viaje</Text>
  </View>
)}

{/* Viaje Banner — Case 1: exactly 1 active viaje, not opened from FAB */}
{!routeViajeId && viajesActivos.length === 1 && (
  <View style={[s.viajeBanner, { borderColor: dark ? colors.border.dark : colors.border.light }]}>
    <View style={{ flex: 1 }}>
      <Text style={s.viajeBannerText}>{viajesActivos[0].emoji} {viajesActivos[0].titulo} · Activo</Text>
      <Text style={[s.viajeBannerSub, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
        ¿Es del viaje?
      </Text>
    </View>
    <TouchableOpacity
      style={[s.toggle, viajeToggleOn && s.toggleOn]}
      onPress={() => {
        const next = !viajeToggleOn;
        setViajeToggleOn(next);
        setSelectedViajeId(next ? viajesActivos[0].id : null);
      }}
    >
      <Text style={{ color: viajeToggleOn ? '#fff' : (dark ? colors.textSecondary.dark : colors.textSecondary.light), fontSize: 12, fontWeight: '600' }}>
        {viajeToggleOn ? 'ON' : 'OFF'}
      </Text>
    </TouchableOpacity>
  </View>
)}

{/* Viaje Selector — Case 2: 2+ active viajes, not opened from FAB */}
{!routeViajeId && viajesActivos.length > 1 && (
  <View style={[s.viajeBanner, { borderColor: dark ? colors.border.dark : colors.border.light }]}>
    <Text style={s.viajeBannerText}>¿A qué viaje pertenece?</Text>
    {[{ id: null, emoji: '🏠', titulo: 'Sin viaje (personal)' }, ...viajesActivos].map(v => (
      <TouchableOpacity
        key={v.id || 'none'}
        style={s.radioRow}
        onPress={() => {
          setSelectedViajeId(v.id);
          setViajeToggleOn(!!v.id);
        }}
      >
        <View style={[s.radio, selectedViajeId === v.id && s.radioActive]}>
          {selectedViajeId === v.id && <View style={s.radioDot} />}
        </View>
        <Text style={[s.radioText, { color: dark ? colors.text.dark : colors.text.light }]}>
          {v.emoji} {v.titulo}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)}

{/* SplitPanel — shown when a viaje is selected */}
{selectedViaje && viajeToggleOn && (
  <SplitPanel
    participantes={selectedViaje.participantes}
    currentUserId={user?.id}
    value={splitConfig}
    onChange={setSplitConfig}
    precio={Number(form.precio) || 0}
    dark={dark}
  />
)}
```

- [ ] **Step 5: Add new styles to the `styles()` function in AgregarScreen**

Add these entries inside the `StyleSheet.create({...})` call:

```js
viajeBanner: {
  borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
  marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  flexWrap: 'wrap',
},
viajeBannerText: { ...typography.bodyMed, color: '#10B981', flex: 1 },
viajeBannerSub: { ...typography.caption, marginTop: 2 },
toggle: {
  paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
  borderWidth: 1, borderColor: '#CBD5E1',
},
toggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 8, width: '100%' },
radio: {
  width: 18, height: 18, borderRadius: 9, borderWidth: 2,
  borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center',
},
radioActive: { borderColor: colors.primary },
radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
radioText: { ...typography.body },
```

- [ ] **Step 6: Test the integration**

Test all 4 cases:
- **Case 3 (no viajes):** AgregarScreen looks unchanged.
- **Case 1 (1 viaje activo):** Banner with toggle appears. Toggle ON → SplitPanel shows. Toggle OFF → SplitPanel hides. Save with toggle ON → trip expense registered.
- **Case 2 (2+ viajes):** Radio buttons appear. Selecting a viaje shows SplitPanel.
- **Case 0 (from FAB in ViajeDetail):** Navigate to Agregar from the FAB. Banner locked ON. Save → expense appears in the viaje's gastos tab.

- [ ] **Step 7: Final commit**

```bash
git add src/screens/AgregarScreen.jsx
git commit -m "feat: integrate AgregarScreen with Modo Viaje (viaje banner + SplitPanel)"
```

---

## Self-Review

### Spec Coverage

| Spec section | Covered in task |
|---|---|
| 5 Supabase tables + RLS | Task 1 |
| viajesService CRUD | Task 2 |
| viajeGastosService + balance algo | Task 3 |
| viajeNotasService checklist/notas | Task 4 |
| ViajesContext | Task 5 |
| ViajesScreen list + sections | Task 6 |
| ViajeCard with chips | Task 6 |
| 5th tab "Viajes" in App.js | Task 6 |
| CrearViajeModal fields + emoji + participants | Task 7 |
| ViajeDetailScreen gradient header + segmented | Task 8 |
| ViajeGastosTab list + FAB + readonly banner | Task 9 |
| ViajeBalanceTab per-person + liquidation | Task 10 |
| ViajeNotasTab checklist + notes + realtime | Task 11 |
| ViajeOpcionesSheet actions | Task 12 |
| CerrarViajeModal confirm + summary | Task 12 |
| SplitPanel Solo/Todos/Algunos | Task 13 |
| ParticipantesPicker bottom sheet | Task 13 |
| AgregarScreen Case 0/1/2/3 | Task 14 |
| ViajeDetail → AgregarScreen with viajeId param | Task 9 (FAB) + Task 14 |
| Greedy balance liquidation algorithm | Task 3 |
| Participant colors (deterministic by index) | Tasks 8–11 |

**Out of scope (per spec):** push notifications, expense editing, percentage splits, invite links.

### Potential Issues to Watch
- `expo-linear-gradient` may need installation (`npx expo install expo-linear-gradient`). Noted in Task 8.
- `ViajeOpcionesSheet` receives `gastos` for the `CerrarViajeModal` summary but `ViajeDetailScreen` passes it as a prop — verify the prop chain when wiring.
- Supabase join `profiles:user_id(...)` requires a `profiles` table with `id`, `nombre`, `email` columns — this is the existing setup referenced by `userService.js`.
