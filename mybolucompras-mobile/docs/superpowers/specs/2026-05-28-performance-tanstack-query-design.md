# Performance Optimization: TanStack Query Migration

**Date:** 2026-05-28  
**Branch:** feat/performance-tanstack-query  
**Status:** Approved

## Problem

The app makes redundant Supabase calls in several patterns:

1. `useFocusEffect → cargarDatos()` in GastosScreen fires a full DB fetch every time the user navigates back to the screen, even when data hasn't changed.
2. `ViajeDetailScreen` has both `useEffect` and `useFocusEffect` calling `cargar()` — two fetches on initial mount.
3. Realtime subscriptions in `DataContext` and `DeudoresContext` call `cargarDatos()` / `cargarDeudas()` on any UPDATE — a full re-fetch instead of applying the delta.
4. `gastosService`, `deudoresService` call `supabase.auth.getUser()` on every operation — an unnecessary network roundtrip since the user is already available in context.
5. No persistent cache — every app open triggers a full fetch, showing spinners instead of instant content.
6. `DashboardScreen` refetches notification count on every `gastos` change.

## Solution

Migrate data fetching to **TanStack Query** (React Query v5). TQ provides automatic caching, deduplication, stale-while-revalidate, and optimistic updates. Supabase Realtime subscriptions are preserved and wired to call `queryClient.invalidateQueries()` for surgical cache invalidation instead of full re-fetches.

## Architecture

```
QueryClient (in-memory + AsyncStorage persistence)
  └─ cache['gastos', userId]
  └─ cache['configuracion', userId]
  └─ cache['deudas', userId]
  └─ cache['viajes', userId]
  └─ cache['viaje', viajeId]
  └─ cache['viaje-gastos', viajeId]

Supabase Realtime (unchanged subscriptions)
  └─ on postgres_changes → queryClient.invalidateQueries(targetKey)

Custom hooks (thin wrappers)
  └─ useGastos()           → useQuery(['gastos', userId])
  └─ useDeudas()           → useQuery(['deudas', userId])
  └─ useViajes()           → useQuery(['viajes', userId])
  └─ useViajeGastos(id)    → useQuery(['viaje-gastos', id])
  └─ useConfiguracion()    → useQuery(['configuracion', userId])
```

## Cache Policy

| Query | staleTime | gcTime |
|---|---|---|
| gastos | 3 min | 10 min |
| configuracion | 10 min | 30 min |
| deudas | 3 min | 10 min |
| viajes | 3 min | 10 min |
| viaje-gastos | 2 min | 8 min |

`staleTime`: how long TQ considers data fresh — no fetch even if the component remounts.  
`gcTime`: how long unused cache entries stay in memory before garbage collection.

## Realtime Integration

Supabase subscriptions move from contexts to a single `useRealtimeInvalidation` hook. Instead of triggering a full re-fetch, they call `invalidateQueries` on the relevant key only:

```js
// Before (full re-fetch on any UPDATE):
.on('UPDATE', () => cargarDatos())

// After (surgical invalidation):
.on('postgres_changes', { event: '*', table: 'gastos' }, () =>
  queryClient.invalidateQueries({ queryKey: ['gastos', userId] })
)
```

Realtime now also listens for INSERT and DELETE events, not just UPDATE (fixing a current gap).

## Mutations with Optimistic Updates

All write operations use `useMutation` with optimistic updates: the UI reflects the change immediately, and rolls back automatically if Supabase returns an error.

Pattern for each mutation:
1. `onMutate`: snapshot current cache, apply optimistic change
2. `onError`: restore snapshot (rollback)
3. `onSettled`: `invalidateQueries` to sync with DB truth

## Startup Cache (AsyncStorage Persistence)

`@tanstack/query-async-storage-persister` serializes the TQ cache to AsyncStorage on write and restores it on app open. On the next launch, data is shown instantly from cache while TQ revalidates in background — no loading spinner for returning users.

Max cache age: 24 hours (stale data older than this is discarded on restore).

## Focus Behavior

`useFocusEffect → cargarDatos()` is removed from all screens. TQ handles staleness automatically: if `staleTime` has elapsed since the last fetch, TQ refetches in background on mount/focus; otherwise it serves the cached value instantly.

`ViajeDetailScreen`'s double fetch (both `useEffect` and `useFocusEffect`) is resolved by replacing both with a single `useQuery`.

## Files

### New files

```
src/lib/queryClient.js
src/hooks/queries/useGastos.js
src/hooks/queries/useDeudas.js
src/hooks/queries/useViajes.js
src/hooks/queries/useViajeGastos.js
src/hooks/queries/useConfiguracion.js
src/hooks/mutations/useGastoMutations.js
src/hooks/mutations/useDeudaMutations.js
src/hooks/mutations/useViajeMutations.js
src/hooks/mutations/useViajeGastoMutations.js
src/hooks/useRealtimeInvalidation.js
```

### Modified files

```
App.js                               — add QueryClientProvider + PersistQueryClientProvider
src/context/DataContext.jsx          — hollow out; keep thin wrapper for backward compat during migration
src/context/DeudoresContext.jsx      — hollow out
src/context/ViajesContext.jsx        — hollow out
src/screens/GastosScreen.jsx         — useGastos(), remove useFocusEffect fetch
src/screens/DashboardScreen.jsx      — useGastos(), useDeudas(), remove notification count effect on gastos
src/screens/DeudoresScreen.jsx       — useDeudas()
src/screens/ViajeDetailScreen.jsx    — useQuery for viaje + gastos, remove double fetch
src/screens/ViajesScreen.jsx         — useViajes()
src/screens/AgregarScreen.jsx        — useGastoMutations()
src/screens/EditarGastoModal.jsx     — useGastoMutations()
src/screens/AgregarDeudaModal.jsx    — useDeudaMutations()
```

### New dependencies

```
@tanstack/react-query
@tanstack/react-query-persist-client
@tanstack/query-async-storage-persister
```

## Migration Phases

### Phase 1 — Infrastructure
- Install dependencies
- Create `queryClient.js` with persistence config
- Wrap `App.js` with `QueryClientProvider` + `PersistQueryClientProvider`

### Phase 2 — Read hooks + read-only screens
- Create all `useQuery` hooks
- Migrate screens that only read data (Dashboard, Gastos, Deudores, Viajes, ViajeDetail)
- Remove `useFocusEffect` fetches and double-fetch in ViajeDetailScreen

### Phase 3 — Mutations
- Create all `useMutation` hooks with optimistic updates
- Migrate screens that write data (Agregar, Editar, AgregarDeuda)

### Phase 4 — Realtime + cleanup
- Create `useRealtimeInvalidation` hook (replaces realtime in DataContext/DeudoresContext)
- Hollow out contexts (keep shell for any remaining consumers)
- Add AsyncStorage persistence
- Remove `supabase.auth.getUser()` calls from services (use user from context/hook instead)

## Success Criteria

- No loading spinners on GastosScreen / Dashboard when navigating back from Agregar
- ViajeDetailScreen makes 1 fetch on open instead of 2
- Realtime updates from other users still appear within ~2 seconds
- App shows content immediately on second open (from persistent cache)
- No regression in any existing feature
