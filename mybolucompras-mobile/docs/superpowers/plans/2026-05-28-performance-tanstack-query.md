# Performance Optimization: TanStack Query Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc Supabase fetches scattered across three React contexts with TanStack Query, eliminating redundant DB calls, adding automatic caching, and enabling optimistic UI updates.

**Architecture:** TanStack Query (`@tanstack/react-query`) owns all data fetching and cache. Supabase Realtime subscriptions are centralized in a single `useRealtimeInvalidation` hook that calls `queryClient.invalidateQueries()` instead of triggering full re-fetches. Mutations use optimistic updates so UI responds instantly without waiting for Supabase.

**Tech Stack:** React Native + Expo, Supabase JS v2, `@tanstack/react-query` v5, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, existing `@react-native-async-storage/async-storage`

---

## File Map

### New files
```
src/lib/queryClient.js                        — QueryClient instance + cache config
src/hooks/queries/useGastos.js               — useQuery for gastos list
src/hooks/queries/useConfiguracion.js        — useQuery for mydata/config
src/hooks/queries/useDeudas.js               — useQuery for deudas list
src/hooks/queries/useViajes.js               — useQuery for viajes list
src/hooks/queries/useViajeDetalle.js         — useQuery for single viaje + its gastos
src/hooks/mutations/useGastoMutations.js     — agregar/editar/eliminar/marcarPagado
src/hooks/mutations/useDeudaMutations.js     — agregar/editar/eliminar/marcarPagada/recordatorio
src/hooks/mutations/useViajeMutations.js     — crear/cerrar/eliminar/editar viaje
src/hooks/mutations/useViajeGastoMutations.js — agregar gasto a viaje
src/hooks/mutations/useConfiguracionMutations.js — actualizar config
src/hooks/useRealtimeInvalidation.js         — Supabase channels → invalidateQueries
```

### Modified files
```
App.js                                 — add QueryClientProvider + PersistQueryClientProvider + RealtimeProvider
src/screens/GastosScreen.jsx           — replace useData() with useGastos() + useGastoMutations(), remove useFocusEffect fetch
src/screens/DashboardScreen.jsx        — replace useData()/useDeudores() with query hooks, remove gastos-triggered notification refetch
src/screens/DeudoresScreen.jsx         — replace useDeudores() with useDeudas() + useDeudaMutations(), remove useFocusEffect fetch
src/screens/ViajesScreen.jsx           — replace useViajes() with new hook
src/screens/ViajeDetailScreen.jsx      — replace double fetch (useEffect + useFocusEffect) with useViajeDetalle()
src/components/viajes/ViajeOpcionesSheet.jsx — replace useViajes() with useViajeMutations()
src/screens/AgregarScreen.jsx          — replace agregarGasto() with useGastoMutations()
src/screens/EditarGastoModal.jsx       — replace editarGasto() with useGastoMutations()
src/screens/AgregarDeudaModal.jsx      — replace agregarDeuda()/editarDeuda() with useDeudaMutations()
src/screens/ConfiguracionScreen.jsx    — replace useData() writes with useConfiguracionMutations()
src/context/DataContext.jsx            — hollow out (keep empty Provider shell)
src/context/DeudoresContext.jsx        — hollow out (keep empty Provider shell)
src/context/ViajesContext.jsx          — hollow out (keep empty Provider shell)
src/services/configuracionService.js   — replace getUser() with getSession()
src/services/gastosService.js          — replace getUser() with getSession()
src/services/deudoresService.js        — replace getUser() with getSession()
src/services/viajesService.js          — replace getUser() with getSession()
src/services/viajeGastosService.js     — replace getUser() with getSession()
```

---

## Task 1: Create feature branch

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b feat/performance-tanstack-query
```

Expected: `Switched to a new branch 'feat/performance-tanstack-query'`

---

## Task 2: Install TanStack Query dependencies

- [ ] **Step 1: Install packages**

```bash
npm install @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

Expected: packages added to `node_modules` and `package.json` updated without errors.

- [ ] **Step 2: Verify install**

```bash
node -e "require('@tanstack/react-query'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @tanstack/react-query and persistence packages"
```

---

## Task 3: Create queryClient.js

**Files:**
- Create: `src/lib/queryClient.js`

- [ ] **Step 1: Create the QueryClient with cache config**

`src/lib/queryClient.js`:

```js
import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000,    // 3 min: don't refetch if data is fresh
      gcTime: 10 * 60 * 1000,       // 10 min: keep unused cache entries in memory
      retry: 1,
      refetchOnWindowFocus: false,   // React Native: no window focus concept
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'mybolu-query-cache',
  throttleTime: 1000,
});

// Restore cache from AsyncStorage on app start; rehydrated data serves instantly
// while TQ revalidates in background if stale.
persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000,  // discard cache older than 24 hours on restore
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queryClient.js
git commit -m "feat: add QueryClient with AsyncStorage persistence"
```

---

## Task 4: Wrap App.js with QueryClientProvider

**Files:**
- Modify: `App.js`

- [ ] **Step 1: Add QueryClientProvider to App.js**

At the top of `App.js`, add the import after the existing imports:

```js
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
```

- [ ] **Step 2: Wrap the root in QueryClientProvider**

In `App.js`, find the `App` component's return statement:

```jsx
// BEFORE:
return (
  <GestureHandlerRootView style={{ flex: 1, backgroundColor: rootBg }}>
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppWithTheme />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

// AFTER:
return (
  <QueryClientProvider client={queryClient}>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: rootBg }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppWithTheme />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  </QueryClientProvider>
);
```

- [ ] **Step 3: Verify app still boots**

Run `npx expo start --android` and confirm the app loads without errors.

- [ ] **Step 4: Commit**

```bash
git add App.js
git commit -m "feat: wrap app with QueryClientProvider"
```

---

## Task 5: Create query hooks

**Files:**
- Create: `src/hooks/queries/useGastos.js`
- Create: `src/hooks/queries/useConfiguracion.js`
- Create: `src/hooks/queries/useDeudas.js`
- Create: `src/hooks/queries/useViajes.js`
- Create: `src/hooks/queries/useViajeDetalle.js`

- [ ] **Step 1: Create useGastos.js**

```js
// src/hooks/queries/useGastos.js
import { useQuery } from '@tanstack/react-query';
import { gastosService } from '../../services/gastosService';
import { useAuth } from '../../context/AuthContext';

export function useGastos() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['gastos', user?.id],
    queryFn: gastosService.getAll,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user,
  });
  return {
    ...query,
    gastos: query.data ?? [],
    loading: query.isLoading,
  };
}
```

- [ ] **Step 2: Create useConfiguracion.js**

```js
// src/hooks/queries/useConfiguracion.js
import { useQuery } from '@tanstack/react-query';
import { configuracionService } from '../../services/configuracionService';
import { useAuth } from '../../context/AuthContext';

const defaultMydata = {
  cierre: '', vencimiento: '',
  cierreAnterior: '', vencimientoAnterior: '',
  fondos: 0, etiquetas: [], presupuestos: {},
  presupuestoMensualMax: 0, bancosHabilitados: [],
  mediosHabilitados: [], monedaPreferida: 'ARS',
};

export function useConfiguracion() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['configuracion', user?.id],
    queryFn: configuracionService.get,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!user,
    placeholderData: defaultMydata,
  });
  return {
    ...query,
    mydata: query.data ?? defaultMydata,
  };
}
```

- [ ] **Step 3: Create useDeudas.js**

```js
// src/hooks/queries/useDeudas.js
import { useQuery } from '@tanstack/react-query';
import { deudoresService } from '../../services/deudoresService';
import { useAuth } from '../../context/AuthContext';

export function useDeudas() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['deudas', user?.id],
    queryFn: deudoresService.getAll,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user,
  });
  return {
    ...query,
    deudas: query.data ?? [],
    loading: query.isLoading,
  };
}
```

- [ ] **Step 4: Create useViajes.js**

```js
// src/hooks/queries/useViajes.js
import { useQuery } from '@tanstack/react-query';
import { viajesService } from '../../services/viajesService';
import { useAuth } from '../../context/AuthContext';

export function useViajes() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['viajes', user?.id],
    queryFn: viajesService.getAll,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user,
  });
  return {
    ...query,
    viajes: query.data ?? [],
    viajesActivos: (query.data ?? []).filter(v => v.estado === 'activo'),
    loading: query.isLoading,
  };
}
```

- [ ] **Step 5: Create useViajeDetalle.js**

```js
// src/hooks/queries/useViajeDetalle.js
import { useQuery } from '@tanstack/react-query';
import { viajesService } from '../../services/viajesService';
import { viajeGastosService } from '../../services/viajeGastosService';

export function useViajeDetalle(viajeId) {
  const viaje = useQuery({
    queryKey: ['viaje', viajeId],
    queryFn: () => viajesService.getById(viajeId),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!viajeId,
  });

  const gastos = useQuery({
    queryKey: ['viaje-gastos', viajeId],
    queryFn: () => viajeGastosService.getByViaje(viajeId),
    staleTime: 2 * 60 * 1000,
    gcTime: 8 * 60 * 1000,
    enabled: !!viajeId,
  });

  return {
    viaje: viaje.data ?? null,
    gastos: gastos.data ?? [],
    loading: viaje.isLoading || gastos.isLoading,
    refetch: () => { viaje.refetch(); gastos.refetch(); },
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/queries/
git commit -m "feat: add TanStack Query read hooks for all data entities"
```

---

## Task 6: Create mutation hooks

**Files:**
- Create: `src/hooks/mutations/useGastoMutations.js`
- Create: `src/hooks/mutations/useDeudaMutations.js`
- Create: `src/hooks/mutations/useViajeMutations.js`
- Create: `src/hooks/mutations/useViajeGastoMutations.js`
- Create: `src/hooks/mutations/useConfiguracionMutations.js`

- [ ] **Step 1: Create useGastoMutations.js**

```js
// src/hooks/mutations/useGastoMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gastosService } from '../../services/gastosService';
import { useAuth } from '../../context/AuthContext';

export function useGastoMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['gastos', user?.id];

  const agregar = useMutation({
    mutationFn: ({ gasto, sharedWith = null }) => gastosService.crear(gasto, sharedWith),
    onMutate: async ({ gasto }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      const optimistic = {
        id: `temp-${Date.now()}`,
        isFijo: gasto.isFijo ?? false,
        objeto: gasto.objeto,
        fecha: gasto.fecha,
        medio: gasto.medio,
        cuotas: gasto.cuotas,
        tipo: gasto.tipo,
        moneda: gasto.moneda || 'ARS',
        banco: gasto.banco || '',
        cantidad: gasto.cantidad,
        precio: `$ ${Number(gasto.precio).toFixed(2)}`,
        precioNum: Number(gasto.precio),
        etiqueta: gasto.etiqueta || '',
        compartidoConNombre: null,
        compartidoConUserId: null,
        pagado: false,
      };
      queryClient.setQueryData(queryKey, old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const editar = useMutation({
    mutationFn: ({ id, gasto, sharedWith = null }) => gastosService.actualizar(id, gasto, sharedWith),
    onMutate: async ({ id, gasto }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(g => g.id === id ? { ...g, ...gasto, precioNum: Number(gasto.precio), precio: `$ ${Number(gasto.precio).toFixed(2)}` } : g)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const eliminar = useMutation({
    mutationFn: (id) => gastosService.eliminar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old => (old ?? []).filter(g => g.id !== id));
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const marcarPagado = useMutation({
    mutationFn: ({ id, gasto, nombre }) =>
      gastosService.marcarPagadoConNotificacion(id, gasto, nombre),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(g => g.id === id ? { ...g, pagado: true } : g)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { agregar, editar, eliminar, marcarPagado };
}
```

- [ ] **Step 2: Create useDeudaMutations.js**

```js
// src/hooks/mutations/useDeudaMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deudoresService } from '../../services/deudoresService';
import { useAuth } from '../../context/AuthContext';

export function useDeudaMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['deudas', user?.id];

  const agregar = useMutation({
    mutationFn: ({ deuda, sharedWith = null }) => deudoresService.crear(deuda, sharedWith),
    onMutate: async ({ deuda }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old => [{ id: `temp-${Date.now()}`, ...deuda }, ...(old ?? [])]);
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const editar = useMutation({
    mutationFn: ({ id, deuda }) => deudoresService.actualizar(id, deuda),
    onMutate: async ({ id, deuda }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(d => d.id === id ? { ...d, ...deuda } : d)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const eliminar = useMutation({
    mutationFn: (id) => deudoresService.eliminar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old => (old ?? []).filter(d => d.id !== id));
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const marcarPagada = useMutation({
    mutationFn: ({ id, deuda, nombre }) =>
      deudoresService.marcarPagadaConNotificacion(id, deuda, nombre),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      const today = new Date().toISOString().split('T')[0].split('-').reverse().join('/');
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(d => d.id === id ? { ...d, pagado: true, fechaPago: today } : d)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const enviarRecordatorio = useMutation({
    mutationFn: ({ deuda, nombre }) => deudoresService.enviarRecordatorio(deuda, nombre),
    onMutate: async ({ deuda }) => {
      const prev = queryClient.getQueryData(queryKey);
      const now = new Date().toISOString();
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(d => d.id === deuda.id ? { ...d, ultimoRecordatorio: now } : d)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
  });

  return { agregar, editar, eliminar, marcarPagada, enviarRecordatorio };
}
```

- [ ] **Step 3: Create useViajeMutations.js**

```js
// src/hooks/mutations/useViajeMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viajesService } from '../../services/viajesService';
import { useAuth } from '../../context/AuthContext';

export function useViajeMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const listKey = ['viajes', user?.id];

  const crear = useMutation({
    mutationFn: ({ titulo, emoji, participanteIds }) =>
      viajesService.crear(titulo, emoji, participanteIds),
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  const cerrar = useMutation({
    mutationFn: (id) => viajesService.cerrar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const prev = queryClient.getQueryData(listKey);
      const prevViaje = queryClient.getQueryData(['viaje', id]);
      queryClient.setQueryData(listKey, old =>
        (old ?? []).map(v => v.id === id ? { ...v, estado: 'cerrado' } : v)
      );
      queryClient.setQueryData(['viaje', id], old => old ? { ...old, estado: 'cerrado' } : old);
      return { prev, prevViaje };
    },
    onError: (_, id, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(listKey, context.prev);
      if (context?.prevViaje !== undefined) queryClient.setQueryData(['viaje', id], context.prevViaje);
    },
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ['viaje', id] });
    },
  });

  const eliminar = useMutation({
    mutationFn: (id) => viajesService.eliminar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const prev = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, old => (old ?? []).filter(v => v.id !== id));
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(listKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  const editar = useMutation({
    mutationFn: ({ id, campos }) => viajesService.editarViaje(id, campos),
    onMutate: async ({ id, campos }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const prev = queryClient.getQueryData(listKey);
      const prevViaje = queryClient.getQueryData(['viaje', id]);
      queryClient.setQueryData(listKey, old =>
        (old ?? []).map(v => v.id === id ? { ...v, ...campos } : v)
      );
      queryClient.setQueryData(['viaje', id], old => old ? { ...old, ...campos } : old);
      return { prev, prevViaje };
    },
    onError: (_, { id }, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(listKey, context.prev);
      if (context?.prevViaje !== undefined) queryClient.setQueryData(['viaje', id], context.prevViaje);
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ['viaje', id] });
    },
  });

  return { crear, cerrar, eliminar, editar };
}
```

- [ ] **Step 4: Create useViajeGastoMutations.js**

```js
// src/hooks/mutations/useViajeGastoMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viajeGastosService } from '../../services/viajeGastosService';
import { useAuth } from '../../context/AuthContext';

export function useViajeGastoMutations(viajeId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const agregar = useMutation({
    mutationFn: ({ gastoData, splitConfig, viajeParticipantes }) =>
      viajeGastosService.agregarGasto(viajeId, gastoData, splitConfig, viajeParticipantes),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['viaje-gastos', viajeId] });
      queryClient.invalidateQueries({ queryKey: ['gastos', user?.id] });
    },
  });

  return { agregar };
}
```

- [ ] **Step 5: Create useConfiguracionMutations.js**

```js
// src/hooks/mutations/useConfiguracionMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configuracionService } from '../../services/configuracionService';
import { useAuth } from '../../context/AuthContext';

export function useConfiguracionMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['configuracion', user?.id];

  const actualizar = useMutation({
    mutationFn: (config) => configuracionService.actualizar(config),
    onMutate: async (nuevoConfig) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old => ({ ...(old ?? {}), ...nuevoConfig }));
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { actualizar };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/mutations/
git commit -m "feat: add TanStack Query mutation hooks with optimistic updates"
```

---

## Task 7: Create useRealtimeInvalidation hook

**Files:**
- Create: `src/hooks/useRealtimeInvalidation.js`

- [ ] **Step 1: Create the hook**

```js
// src/hooks/useRealtimeInvalidation.js
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useRealtimeInvalidation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const gastosChannel = supabase
      .channel(`gastos-rt-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gastos', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['gastos', user.id] })
      )
      .subscribe();

    const deudoresChannel = supabase
      .channel(`deudores-rt-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deudores', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['deudas', user.id] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gastosChannel);
      supabase.removeChannel(deudoresChannel);
    };
  }, [user?.id, queryClient]);
}
```

- [ ] **Step 2: Add RealtimeProvider component to App.js and mount hook**

In `App.js`, add import at the top:

```js
import { useRealtimeInvalidation } from './src/hooks/useRealtimeInvalidation';
```

Add the `RealtimeProvider` component after the imports:

```jsx
function RealtimeProvider({ children }) {
  useRealtimeInvalidation();
  return children;
}
```

In the `RootNavigator` function, wrap the `Main` screen content with `RealtimeProvider`. Find the `<Stack.Screen name="Main">` section and update:

```jsx
<Stack.Screen name="Main">
  {() => (
    <DataProvider>
      <ViajesProvider>
        <DeudoresProvider>
          <RealtimeProvider>
            <AuthStack.Navigator screenOptions={{ headerShown: false }}>
              {/* ... existing screens unchanged ... */}
            </AuthStack.Navigator>
          </RealtimeProvider>
        </DeudoresProvider>
      </ViajesProvider>
    </DataProvider>
  )}
</Stack.Screen>
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useRealtimeInvalidation.js App.js
git commit -m "feat: add centralized Realtime invalidation hook"
```

---

## Task 8: Migrate GastosScreen

**Files:**
- Modify: `src/screens/GastosScreen.jsx`

- [ ] **Step 1: Replace imports and hook calls**

At the top of `GastosScreen.jsx`, replace the data-related imports:

```js
// REMOVE these imports:
// import { useData } from '../context/DataContext';

// ADD these imports:
import { useGastos } from '../hooks/queries/useGastos';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useGastoMutations } from '../hooks/mutations/useGastoMutations';
```

- [ ] **Step 2: Replace hook destructuring at the top of the component**

Find:
```js
const { gastos, mydata, loading, cargarDatos, eliminarGasto, marcarGastoPagado } = useData();
```

Replace with:
```js
const { gastos, loading, refetch } = useGastos();
const { mydata } = useConfiguracion();
const { eliminar: eliminarMutation, marcarPagado: marcarPagadoMutation } = useGastoMutations();
```

- [ ] **Step 3: Remove useFocusEffect fetch**

Find and delete the entire `useFocusEffect` block:
```js
useFocusEffect(useCallback(() => {
  cargarDatos();
}, [cargarDatos]));
```

- [ ] **Step 4: Update onRefresh**

Find:
```js
const onRefresh = useCallback(async () => {
  setRefreshing(true);
  await cargarDatos();
  setRefreshing(false);
}, [cargarDatos]);
```

Replace with:
```js
const onRefresh = useCallback(async () => {
  setRefreshing(true);
  await refetch();
  setRefreshing(false);
}, [refetch]);
```

- [ ] **Step 5: Update handleDelete to use mutation**

Find:
```js
onConfirm: () => eliminarGasto(gasto.id),
```

Replace with:
```js
onConfirm: () => eliminarMutation.mutate(gasto.id),
```

- [ ] **Step 6: Update handleMarkPaid to use mutation**

Find:
```js
onConfirm: () => marcarGastoPagado(gasto.id),
```

Replace with:
```js
onConfirm: () => marcarPagadoMutation.mutate({
  id: gasto.id,
  gasto,
  nombre: user?.user_metadata?.nombre || user?.email || 'Alguien',
}),
```

- [ ] **Step 7: Verify screen works**

Open the app, navigate to Gastos, navigate away and back — confirm no loading spinner on return (data served from cache). Verify delete and mark-paid still work.

- [ ] **Step 8: Commit**

```bash
git add src/screens/GastosScreen.jsx
git commit -m "perf: migrate GastosScreen to TanStack Query — remove useFocusEffect fetch"
```

---

## Task 9: Migrate DashboardScreen

**Files:**
- Modify: `src/screens/DashboardScreen.jsx`

- [ ] **Step 1: Replace imports**

In `DashboardScreen.jsx`, replace:
```js
// REMOVE:
// import { useData } from '../context/DataContext';
// import { useDeudores } from '../context/DeudoresContext';

// ADD:
import { useGastos } from '../hooks/queries/useGastos';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useDeudas } from '../hooks/queries/useDeudas';
import { notificationService } from '../services/notificationService';
```

(Keep the `notificationService` import which is already there.)

- [ ] **Step 2: Replace hook destructuring in the component**

Find:
```js
const { gastos, mydata } = useData();
const { deudas } = useDeudores();
```

Replace with:
```js
const { gastos } = useGastos();
const { mydata } = useConfiguracion();
const { deudas } = useDeudas();
```

- [ ] **Step 3: Fix notification count effect**

Find the effect that re-fetches notification count on every `gastos` change:
```js
React.useEffect(() => {
  const fetchCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (e) {}
  };
  fetchCount();
}, [gastos]); // Refresh when gastos change
```

Replace with a one-time fetch on mount (notifications don't need to re-fetch every time gastos changes):
```js
React.useEffect(() => {
  notificationService.getUnreadCount()
    .then(setUnreadCount)
    .catch(() => {});
}, []);
```

- [ ] **Step 4: Verify Dashboard**

Open Dashboard, navigate away and back — no spinner, stats update instantly from cache.

- [ ] **Step 5: Commit**

```bash
git add src/screens/DashboardScreen.jsx
git commit -m "perf: migrate DashboardScreen to TanStack Query — remove gastos-triggered notification refetch"
```

---

## Task 10: Migrate DeudoresScreen

**Files:**
- Modify: `src/screens/DeudoresScreen.jsx`

- [ ] **Step 1: Replace imports**

```js
// REMOVE:
// import { useDeudores } from '../context/DeudoresContext';

// ADD:
import { useDeudas } from '../hooks/queries/useDeudas';
import { useDeudaMutations } from '../hooks/mutations/useDeudaMutations';
import { useAuth } from '../context/AuthContext';
```

- [ ] **Step 2: Replace hook destructuring**

Find:
```js
const {
  deudas, loading, cargarDeudas,
  marcarPagadaConNotificacion, eliminarDeuda, enviarRecordatorio,
} = useDeudores();
```

Replace with:
```js
const { user } = useAuth();
const { deudas, loading, refetch } = useDeudas();
const {
  marcarPagada: marcarPagadaMutation,
  eliminar: eliminarMutation,
  enviarRecordatorio: recordatorioMutation,
} = useDeudaMutations();
```

- [ ] **Step 3: Remove useFocusEffect fetch**

Delete:
```js
useFocusEffect(useCallback(() => {
  cargarDeudas();
}, [cargarDeudas]));
```

- [ ] **Step 4: Update onRefresh**

Find:
```js
const onRefresh = useCallback(async () => {
  setRefreshing(true);
  await cargarDeudas();
  setRefreshing(false);
}, [cargarDeudas]);
```

Replace with:
```js
const onRefresh = useCallback(async () => {
  setRefreshing(true);
  await refetch();
  setRefreshing(false);
}, [refetch]);
```

- [ ] **Step 5: Update all mutation calls in the component**

Find every call to `marcarPagadaConNotificacion(id, deuda)` and replace with:
```js
marcarPagadaMutation.mutate({
  id: deuda.id,
  deuda,
  nombre: user?.user_metadata?.nombre || user?.email || 'Alguien',
})
```

Find every call to `eliminarDeuda(id)` and replace with:
```js
eliminarMutation.mutate(id)
```

Find every call to `enviarRecordatorio(deuda)` and replace with:
```js
recordatorioMutation.mutate({
  deuda,
  nombre: user?.user_metadata?.nombre || user?.email || 'Alguien',
})
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/DeudoresScreen.jsx
git commit -m "perf: migrate DeudoresScreen to TanStack Query — remove useFocusEffect fetch"
```

---

## Task 11: Migrate ViajesScreen

**Files:**
- Modify: `src/screens/ViajesScreen.jsx`

- [ ] **Step 1: Replace imports**

```js
// REMOVE:
// import { useViajes } from '../context/ViajesContext';

// ADD:
import { useViajes } from '../hooks/queries/useViajes';
```

- [ ] **Step 2: Update onRefresh**

Find:
```js
const onRefresh = async () => {
  setRefreshing(true);
  await cargarViajes();
  setRefreshing(false);
};
```

Replace with:
```js
const onRefresh = async () => {
  setRefreshing(true);
  await refetch();
  setRefreshing(false);
};
```

Also update the hook destructuring at the top to include `refetch`:
```js
const { viajes, loading, refetch } = useViajes();
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/ViajesScreen.jsx
git commit -m "perf: migrate ViajesScreen to TanStack Query"
```

---

## Task 12: Migrate ViajeDetailScreen + ViajeOpcionesSheet

**Files:**
- Modify: `src/screens/ViajeDetailScreen.jsx`
- Modify: `src/components/viajes/ViajeOpcionesSheet.jsx`

- [ ] **Step 1: Replace imports in ViajeDetailScreen.jsx**

```js
// REMOVE these imports:
// import { useViajes } from '../context/ViajesContext';
// import { viajesService } from '../services/viajesService';
// import { viajeGastosService } from '../services/viajeGastosService';

// ADD:
import { useViajeDetalle } from '../hooks/queries/useViajeDetalle';
```

- [ ] **Step 2: Replace component state and hooks**

Find:
```js
const { cargarViajes } = useViajes();

const [viaje, setViaje] = useState(null);
const [gastos, setGastos] = useState([]);
const [loading, setLoading] = useState(true);

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
useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
```

Replace with:
```js
const { viaje, gastos, loading, refetch } = useViajeDetalle(viajeId);
```

- [ ] **Step 3: Update ViajeOpcionesSheet props**

Find the `ViajeOpcionesSheet` usage in `ViajeDetailScreen.jsx`:
```jsx
<ViajeOpcionesSheet
  ...
  onUpdated={() => { cargar(); cargarViajes(); }}
  onDeleted={() => { navigation.goBack(); cargarViajes(); }}
/>
```

Replace with (viaje mutations now happen inside ViajeOpcionesSheet directly):
```jsx
<ViajeOpcionesSheet
  ...
  onUpdated={refetch}
  onDeleted={() => navigation.goBack()}
/>
```

- [ ] **Step 4: Update ViajeGastosTab onGastoAdded prop**

Find:
```jsx
<ViajeGastosTab
  ...
  onGastoAdded={cargar}
/>
```

Replace with:
```jsx
<ViajeGastosTab
  ...
  onGastoAdded={refetch}
/>
```

- [ ] **Step 5: Replace useViajes in ViajeOpcionesSheet.jsx**

In `src/components/viajes/ViajeOpcionesSheet.jsx`, replace:
```js
// REMOVE:
// import { useViajes } from '../../context/ViajesContext';

// ADD:
import { useViajeMutations } from '../../hooks/mutations/useViajeMutations';
```

Find:
```js
const { eliminarViaje } = useViajes();
```

Replace with:
```js
const { eliminar: eliminarMutation, cerrar: cerrarMutation } = useViajeMutations();
```

Find all calls to `eliminarViaje(viaje.id)` and replace with:
```js
eliminarMutation.mutate(viaje.id, {
  onSuccess: () => onDeleted?.(),
  onError: (err) => Alert.alert('Error', err.message),
})
```

Also migrate `CerrarViajeModal.jsx` which calls `cerrarViaje()` from `useViajes()`:

In `src/components/viajes/CerrarViajeModal.jsx`, replace:
```js
// REMOVE:
// import { useViajes } from '../../context/ViajesContext';

// ADD:
import { useViajeMutations } from '../../hooks/mutations/useViajeMutations';
```

Find:
```js
const { cerrarViaje } = useViajes();
```
Replace with:
```js
const { cerrar: cerrarMutation } = useViajeMutations();
```

Find:
```js
await cerrarViaje(viaje.id);
onClose();
onCerrado?.();
```
Replace with:
```js
await cerrarMutation.mutateAsync(viaje.id);
onClose();
onCerrado?.();
```

Remove `const [loading, setLoading] = useState(false);` and replace with:
```js
const loading = cerrarMutation.isPending;
```
Remove all `setLoading(true/false)` calls.

- [ ] **Step 6: Verify ViajeDetail**

Navigate to a viaje — confirm it loads with a single fetch (no double spinner). Navigate away and back — confirm no re-fetch if within stale time.

- [ ] **Step 7: Commit**

```bash
git add src/screens/ViajeDetailScreen.jsx src/components/viajes/ViajeOpcionesSheet.jsx
git commit -m "perf: migrate ViajeDetailScreen to TanStack Query — eliminate double fetch"
```

---

## Task 13: Migrate AgregarScreen

**Files:**
- Modify: `src/screens/AgregarScreen.jsx`

- [ ] **Step 1: Replace imports**

```js
// REMOVE:
// import { useData } from '../context/DataContext';

// ADD:
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useGastoMutations } from '../hooks/mutations/useGastoMutations';
import { useViajeGastoMutations } from '../hooks/mutations/useViajeGastoMutations';
```

Also replace:
```js
// REMOVE:
// import { useViajes } from '../context/ViajesContext';

// ADD:
import { useViajes } from '../hooks/queries/useViajes';
```

- [ ] **Step 2: Replace hook destructuring**

Find:
```js
const { agregarGasto, mydata, actualizarConfig } = useData();
```

Replace with:
```js
const { mydata } = useConfiguracion();
const { agregar: agregarMutation } = useGastoMutations();
// Note: viajeGastoMutation is created inline below because it needs selectedViajeId
```

Find:
```js
const { viajesActivos } = useViajes();
```

This stays the same — `useViajes` now comes from queries instead of context but exports the same shape.

- [ ] **Step 3: Create viajeGastoMutation after selectedViajeId is defined**

After `const selectedViaje = viajesActivos.find(v => v.id === selectedViajeId) || null;`, add:

```js
const { agregar: agregarViajeGastoMutation } = useViajeGastoMutations(selectedViajeId);
```

- [ ] **Step 4: Update handleGuardar to use mutations**

Find the `handleGuardar` function's try block. Replace:
```js
if (selectedViaje && viajeToggleOn) {
  await viajeGastosService.agregarGasto(
    selectedViaje.id,
    gastoData,
    splitConfig,
    selectedViaje.participantes
  );
} else {
  const sharedWith = sharedUser ? { userId: sharedUser.id, mode: shareMode, nombre: sharedUser.nombre || sharedUser.email } : null;
  await agregarGasto(gastoData, sharedWith);
}
```

With:
```js
if (selectedViaje && viajeToggleOn) {
  await agregarViajeGastoMutation.mutateAsync({
    gastoData,
    splitConfig,
    viajeParticipantes: selectedViaje.participantes,
  });
} else {
  const sharedWith = sharedUser
    ? { userId: sharedUser.id, mode: shareMode, nombre: sharedUser.nombre || sharedUser.email }
    : null;
  await agregarMutation.mutateAsync({ gasto: gastoData, sharedWith });
}
```

Also remove the `setLoading(true/false)` wrapping the try/catch since the mutation has its own `isPending`. Update:
```js
const loading = agregarMutation.isPending || agregarViajeGastoMutation.isPending;
```

And remove the `const [loading, setLoading] = useState(false);` line.

- [ ] **Step 5: Replace actualizarConfig usage**

AgregarScreen calls `actualizarConfig({ etiquetas })` in `handleCrearEtiqueta` (line ~372). Add the mutation import and update the function:

First, add this import:
```js
import { useConfiguracionMutations } from '../hooks/mutations/useConfiguracionMutations';
```

Inside the component, add:
```js
const { actualizar: actualizarConfigMutation } = useConfiguracionMutations();
```

Find:
```js
const handleCrearEtiqueta = async (nuevaEtiqueta) => {
  const etiquetas = [...(mydata.etiquetas || []), nuevaEtiqueta];
  await actualizarConfig({ etiquetas });
};
```

Replace with:
```js
const handleCrearEtiqueta = async (nuevaEtiqueta) => {
  const etiquetas = [...(mydata.etiquetas || []), nuevaEtiqueta];
  await actualizarConfigMutation.mutateAsync({ ...mydata, etiquetas });
};
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/AgregarScreen.jsx
git commit -m "perf: migrate AgregarScreen mutations to TanStack Query"
```

---

## Task 14: Migrate EditarGastoModal

**Files:**
- Modify: `src/screens/EditarGastoModal.jsx`

- [ ] **Step 1: Replace imports**

```js
// REMOVE:
// import { useData } from '../context/DataContext';

// ADD:
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useGastoMutations } from '../hooks/mutations/useGastoMutations';
```

- [ ] **Step 2: Replace hook destructuring**

Find:
```js
const { editarGasto, mydata, actualizarConfig } = useData();
```

Replace with:
```js
const { mydata } = useConfiguracion();
const { editar: editarMutation } = useGastoMutations();
```

- [ ] **Step 3: Update the save handler**

Find the function that calls `editarGasto(gasto.id, form, sharedWith)` (look for `await editarGasto(...)`).

Replace:
```js
await editarGasto(gasto.id, { ...form, cuotas: parseInt(form.cuotas)||1, cantidad: parseInt(form.cantidad)||1, precio: Number(form.precio) }, sharedWith);
```

With:
```js
await editarMutation.mutateAsync({
  id: gasto.id,
  gasto: { ...form, cuotas: parseInt(form.cuotas)||1, cantidad: parseInt(form.cantidad)||1, precio: Number(form.precio) },
  sharedWith,
});
```

- [ ] **Step 4: Replace loading state**

Remove `const [loading, setLoading] = useState(false);` and replace usages with:
```js
const loading = editarMutation.isPending;
```

Remove `setLoading(true)` and `setLoading(false)` calls in the save handler.

- [ ] **Step 5: Commit**

```bash
git add src/screens/EditarGastoModal.jsx
git commit -m "perf: migrate EditarGastoModal mutations to TanStack Query"
```

---

## Task 15: Migrate AgregarDeudaModal + ConfiguracionScreen

**Files:**
- Modify: `src/screens/AgregarDeudaModal.jsx`
- Modify: `src/screens/ConfiguracionScreen.jsx`

- [ ] **Step 1: Replace imports in AgregarDeudaModal.jsx**

```js
// REMOVE:
// import { useDeudores } from '../context/DeudoresContext';

// ADD:
import { useDeudaMutations } from '../hooks/mutations/useDeudaMutations';
```

- [ ] **Step 2: Replace hook calls in AgregarDeudaModal.jsx**

Find:
```js
const { agregarDeuda, editarDeuda } = useDeudores();
```

Replace with:
```js
const { agregar: agregarMutation, editar: editarMutation } = useDeudaMutations();
```

- [ ] **Step 3: Update save calls in AgregarDeudaModal.jsx**

Find `await agregarDeuda(deudaData, sharedWith)` and replace with:
```js
await agregarMutation.mutateAsync({ deuda: deudaData, sharedWith });
```

Find `await editarDeuda(deudaEdit.id, deudaData)` and replace with:
```js
await editarMutation.mutateAsync({ id: deudaEdit.id, deuda: deudaData });
```

Replace `const [loading, setLoading] = useState(false)` with:
```js
const loading = agregarMutation.isPending || editarMutation.isPending;
```

Remove all `setLoading(true/false)` calls.

- [ ] **Step 4: Replace imports in ConfiguracionScreen.jsx**

```js
// REMOVE:
// import { useData } from '../context/DataContext';

// ADD:
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useConfiguracionMutations } from '../hooks/mutations/useConfiguracionMutations';
```

- [ ] **Step 5: Replace hook calls in ConfiguracionScreen.jsx**

Find:
```js
const { mydata, actualizarConfig, actualizarFondos, actualizarCierre, setMydata } = useData();
```

Replace with:
```js
const { mydata } = useConfiguracion();
const { actualizar } = useConfiguracionMutations();
```

- [ ] **Step 6: Replace actualizarConfig calls in ConfiguracionScreen.jsx**

Find every `actualizarConfig(nuevaConfig)` call and replace with:
```js
actualizar.mutate({ ...mydata, ...nuevaConfig });
```

Find every `actualizarFondos(fondos)` call and replace with:
```js
actualizar.mutate({ ...mydata, fondos: Number(fondos) });
```

Find every `actualizarCierre(cierre, vencimiento, cierreAnterior, vencimientoAnterior)` call and replace with:
```js
actualizar.mutate({ ...mydata, cierre, vencimiento, cierreAnterior, vencimientoAnterior });
```

Find any `setMydata` calls and replace with:
```js
actualizar.mutate({ ...mydata, ...patch }); // where patch is whatever setMydata was called with
```

- [ ] **Step 7: Commit**

```bash
git add src/screens/AgregarDeudaModal.jsx src/screens/ConfiguracionScreen.jsx
git commit -m "perf: migrate AgregarDeudaModal and ConfiguracionScreen to TanStack Query"
```

---

## Task 16: Hollow out old contexts

**Files:**
- Modify: `src/context/DataContext.jsx`
- Modify: `src/context/DeudoresContext.jsx`
- Modify: `src/context/ViajesContext.jsx`

The contexts are still mounted in `App.js` (as provider wrappers), but their internal logic is no longer needed. We keep the shells to avoid import errors from any file not yet migrated.

- [ ] **Step 1: Hollow out DataContext.jsx**

Replace the entire file with a minimal shell:

```jsx
// src/context/DataContext.jsx
// Shell: all data fetching migrated to TanStack Query hooks.
import React, { createContext, useContext } from 'react';
const DataContext = createContext({});
export function DataProvider({ children }) {
  return <DataContext.Provider value={{}}>{children}</DataContext.Provider>;
}
export function useData() {
  return useContext(DataContext);
}
```

- [ ] **Step 2: Hollow out DeudoresContext.jsx**

```jsx
// src/context/DeudoresContext.jsx
import React, { createContext, useContext } from 'react';
const DeudoresContext = createContext({});
export function DeudoresProvider({ children }) {
  return <DeudoresContext.Provider value={{}}>{children}</DeudoresContext.Provider>;
}
export function useDeudores() {
  return useContext(DeudoresContext);
}
```

- [ ] **Step 3: Hollow out ViajesContext.jsx**

```jsx
// src/context/ViajesContext.jsx
import React, { createContext, useContext } from 'react';
const ViajesContext = createContext({});
export function ViajesProvider({ children }) {
  return <ViajesContext.Provider value={{}}>{children}</ViajesContext.Provider>;
}
export function useViajes() {
  return useContext(ViajesContext);
}
```

- [ ] **Step 4: Run the app and verify no crash**

Run `npx expo start --android` and navigate through all main screens (Gastos, Dashboard, Deudores, Viajes, Configuracion). There should be no runtime errors from missing context values.

- [ ] **Step 5: Commit**

```bash
git add src/context/DataContext.jsx src/context/DeudoresContext.jsx src/context/ViajesContext.jsx
git commit -m "perf: hollow out old contexts — all data fetching migrated to TanStack Query"
```

---

## Task 17: Replace getUser() with getSession() in services

`supabase.auth.getUser()` makes a network request to validate the JWT on every call. `getSession()` reads from the local AsyncStorage cache. Since our RLS policies validate the JWT server-side on every DB query, we only need the user object locally for metadata — `getSession()` is safe and instant.

**Files:**
- Modify: `src/services/gastosService.js`
- Modify: `src/services/configuracionService.js`
- Modify: `src/services/deudoresService.js`
- Modify: `src/services/viajesService.js`
- Modify: `src/services/viajeGastosService.js`

- [ ] **Step 1: Replace all getUser() calls in gastosService.js**

Find every occurrence of:
```js
const { data: { user } } = await supabase.auth.getUser();
```

Replace with:
```js
const { data: { session } } = await supabase.auth.getSession();
const user = session?.user ?? null;
```

- [ ] **Step 2: Repeat for configuracionService.js**

Same replacement in `configuracionService.js`.

- [ ] **Step 3: Repeat for deudoresService.js**

Same replacement in `deudoresService.js`.

- [ ] **Step 4: Repeat for viajesService.js**

Same replacement in `viajesService.js`.

- [ ] **Step 5: Repeat for viajeGastosService.js**

Same replacement in `viajeGastosService.js`.

- [ ] **Step 6: Verify all service operations still work**

In the running app: add a gasto, edit it, delete it, mark a deuda as paid. Confirm all operations succeed without errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/
git commit -m "perf: replace getUser() with getSession() in all services — avoid network roundtrip"
```

---

## Task 18: Final end-to-end verification

- [ ] **Step 1: Test cache behavior**

1. Open app, navigate to Gastos — note data loads
2. Navigate to Dashboard — confirm data is instant (no spinner)
3. Navigate to Agregar, add a gasto, save
4. Navigate back to Gastos — confirm new gasto appears instantly (optimistic update)
5. Kill and reopen the app — confirm Gastos/Dashboard show content immediately (AsyncStorage cache)

- [ ] **Step 2: Test realtime behavior**

With two devices/simulators logged in as the same user:
1. Add a gasto on device A
2. Confirm it appears on device B within ~2 seconds (realtime invalidation)

- [ ] **Step 3: Test ViajeDetail no double fetch**

Open Chrome DevTools / Supabase logs and navigate to a ViajeDetail. Confirm only 2 DB queries on load (one for viaje, one for viaje-gastos) — not 4.

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git status  # verify only expected files changed
git commit -m "perf: complete TanStack Query migration — final cleanup"
```

---

## Summary of query key registry

| Key | Description |
|---|---|
| `['gastos', userId]` | All gastos for current user |
| `['configuracion', userId]` | User config / mydata |
| `['deudas', userId]` | All deudas for current user |
| `['viajes', userId]` | All viajes for current user |
| `['viaje', viajeId]` | Single viaje detail |
| `['viaje-gastos', viajeId]` | Gastos within a specific viaje |
