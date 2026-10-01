# Graph Report - mybolucompras-mobile  (2026-10-01)

## Corpus Check
- 177 files · ~244,473 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .toml 1)

## Summary
- 812 nodes · 2430 edges · 36 communities (29 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.84)
- Token cost: 401,237 input · 0 output

## Community Hubs (Navigation)
- Shared UI Components
- Trip Debts and Payments
- Auto Purchase Registration
- Expense Projection and Cards
- Catalogs and Config Keys
- Trip Calendar and Activities
- Modo Viaje Navigation
- Monthly Report and Parsing Specs
- Trip Detail UI Redesign
- Expo App Config
- Expo Dependencies
- Package Manifest
- App Root and Navigation
- Edge Functions and Conventions
- Gastos Hooks and Lists
- Auth and Notification Hooks
- Debt Card Display
- Deudores Screen and Hooks
- TanStack Query Migration
- NPM Scripts
- Login and Modal Hook
- Legacy DataContext
- Query Client Persistence
- Dev Dependencies
- Android Build Docs
- Supabase DB Check Script
- App Icon Branding
- TypeScript Config
- BudgetBuddy Logo
- Logo Branding
- Favicon Branding
- Redirect Spec Stub

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 63 edges
2. `react` - 58 edges
3. `react-native` - 52 edges
4. `useAuth()` - 49 edges
5. `colors` - 48 edges
6. `spacing` - 45 edges
7. `radius` - 44 edges
8. `typography` - 43 edges
9. `TanStack Query Migration Plan` - 35 edges
10. `useConfiguracion()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `send-monthly-expense-report Edge Function` --semantically_similar_to--> `Daily trip activity push cron (send-daily-viaje-summary, 08:00 AR)`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-07-24-reporte-mensual-gastos-ia-design.md → docs/superpowers/specs/2026-07-22-viaje-calendario-design.md
- `DataGate()` --calls--> `useDeudas()`  [EXTRACTED]
  App.js → src/hooks/queries/useDeudas.js
- `DataGate()` --calls--> `useGastos()`  [EXTRACTED]
  App.js → src/hooks/queries/useGastos.js
- `RootNavigator()` --calls--> `ModoViajeChecker()`  [EXTRACTED]
  App.js → src/components/ModoViajeChecker.jsx
- `RootNavigator()` --calls--> `useAuth()`  [EXTRACTED]
  App.js → src/context/AuthContext.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Notification purchase parsing pipeline** — src_services_notificationlistenerbridge, src_services_notificacionesqueueprocessor, src_services_notificaciones_filtro, src_services_notificaciones_parser, src_services_notificaciones_dedup, src_services_notificacionespendientesservice [EXTRACTED 1.00]
- **TanStack Query data layer** — src_lib_queryclient, src_hooks_queries_usegastos, src_hooks_queries_useviajes, src_hooks_mutations_usegastomutations, src_hooks_mutations_useviajemutations, src_hooks_userealtimeinvalidation [EXTRACTED 1.00]
- **pg_cron + Edge Function scheduled job pattern** — supabase_functions_send_daily_viaje_summary_index, supabase_functions_send_monthly_expense_report_index, supabase_migrations_20260722_viaje_calendario_cron, supabase_migrations_20260724_reporte_mensual_gastos_cron [INFERRED 0.85]
- **Trip debt settlement flow (balance, debts, payments, close)** — docs_superpowers_specs_2026_05_27_modo_viaje_design_greedy_liquidacion, docs_superpowers_specs_2026_05_28_viaje_deudas_pagos_design_viaje_pagos_table, docs_superpowers_specs_2026_05_29_viaje_gastos_resumen_design_registrar_pago, docs_superpowers_specs_2026_05_29_viaje_gastos_resumen_design_resumen_al_cerrar, docs_superpowers_specs_2026_05_27_modo_viaje_design_cerrarviajemodal [INFERRED 0.85]
- **Features built on trip date range** — docs_superpowers_specs_2026_07_22_viaje_calendario_design_fecha_desde_hasta, docs_superpowers_specs_2026_07_23_calendario_carrusel_y_rango_fechas_design_formatrangofechas, docs_superpowers_specs_2026_07_23_calendario_carrusel_y_rango_fechas_design_day_carousel, docs_superpowers_specs_2026_07_23_modo_viaje_redirect_design_modoviajechecker, docs_superpowers_specs_2026_07_22_viaje_calendario_design_daily_summary_cron [INFERRED 0.85]
- **Opt-in flags on configuracion_usuario via configuracionService** — docs_superpowers_specs_2026_07_23_modo_viaje_redirect_design_modo_viaje_config_columns, docs_superpowers_specs_2026_07_24_reporte_mensual_gastos_ia_design_recibir_reporte_mensual, src_services_configuracionservice [INFERRED 0.75]

## Communities (36 total, 7 thin omitted)

### Community 0 - "Shared UI Components"
Cohesion: 0.10
Nodes (50): expo-linear-gradient, react, react-native, react-native-safe-area-context, TYPE_CONFIG, DateTimeField(), styles, cardBgStyles (+42 more)

### Community 1 - "Trip Debts and Payments"
Cohesion: 0.05
Nodes (42): Modo Viaje Implementation Plan, Viaje Deudas y Pagos Plan, Viaje Gastos Resumen Plan, Viaje Checklist Personal Plan, CerrarViajeModal (archive trip), CrearViajeModal, ViajeOpcionesSheet, viajes / viaje_participantes tables (+34 more)

### Community 2 - "Auto Purchase Registration"
Cohesion: 0.05
Nodes (41): Registro Automatico de Compras Plan, expo, react-native-android-notification-listener, comerciosAprendidosService, esDuplicado(), esNotificacionDeCompra(), PALABRAS_COMPRA, PALABRAS_EXCLUIR (+33 more)

### Community 3 - "Expense Projection and Cards"
Cohesion: 0.08
Nodes (49): Proyeccion de Gastos Futuros Plan, Proyeccion de Gastos Futuros Spec, Dashboard projection mode (up to +6 months), ProyeccionModal (breakdown per currency), BoardingPassContent(), bpStyles, CategoryBadge(), cbStyles (+41 more)

### Community 4 - "Catalogs and Config Keys"
Cohesion: 0.08
Nodes (43): @react-native-async-storage/async-storage, EtiquetaSelector(), styles(), SplitPanel(), OPENROUTER_API_KEY, RESEND_API_KEY, BANCOS, ETIQUETA_COLORS (+35 more)

### Community 5 - "Trip Calendar and Activities"
Cohesion: 0.07
Nodes (39): Viaje Calendario Plan, Calendario Carrusel y Rango de Fechas Plan, Viaje Calendario Spec, AgregarActividadModal, Daily trip activity push cron (send-daily-viaje-summary, 08:00 AR), viajes.fecha_desde / fecha_hasta trip date range, viaje_actividades table, Calendario Carrusel y Rango de Fechas Spec (+31 more)

### Community 6 - "Modo Viaje Navigation"
Cohesion: 0.09
Nodes (31): Modo Viaje Redirect Plan, configuracion_usuario modo_viaje_* columns, ModoViajeChecker (auto-deactivate / prompt / redirect), ModoViajeModal, @react-native-community/datetimepicker, @react-navigation/native, ActualizarCierreModal(), defaultNuevoCierre() (+23 more)

### Community 7 - "Monthly Report and Parsing Specs"
Cohesion: 0.05
Nodes (30): getGastosMes / calcularTotalesPorMoneda (utils/proyeccion.js), Next-month KPI shortcut, Reporte Mensual de Gastos con IA Spec, Claude Haiku structured-output expense analysis, Gmail SMTP email delivery (denomailer), recibir_reporte_mensual opt-in flag, send-monthly-expense-report Edge Function, Registro Automatico de Compras (Android) Spec (+22 more)

### Community 8 - "Trip Detail UI Redesign"
Cohesion: 0.08
Nodes (31): ViajeDetailScreen UI Redesign Plan, Viajes Navigation Back Plan, Modo Viaje Design Spec, Shared trip checklist (Que llevar) with Supabase Realtime, Modo Viaje (group trip expenses), ViajeDetailScreen UI Redesign Spec, Header Design C with avatar stack, PARTICIPANT_COLORS (+23 more)

### Community 9 - "Expo App Config"
Cohesion: 0.06
Nodes (33): backgroundColor, foregroundImage, adaptiveIcon, compileSdkVersion, edgeToEdgeEnabled, googleServicesFile, package, permissions (+25 more)

### Community 10 - "Expo Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, expo, expo-build-properties, expo-camera, expo-device, expo-font, @expo-google-fonts/archivo-black, @expo-google-fonts/manrope (+23 more)

### Community 11 - "Package Manifest"
Cohesion: 0.07
Nodes (27): main, name, private, version, @babel/core, babel-jest, @babel/preset-env, expo-build-properties (+19 more)

### Community 12 - "App Root and Navigation"
Cohesion: 0.13
Nodes (22): AnimatedSplash(), App(), AppWithTheme(), AuthStack, DataGate(), inAppUpdates, RealtimeProvider(), RootNavigator() (+14 more)

### Community 13 - "Edge Functions and Conventions"
Cohesion: 0.12
Nodes (9): Reporte Mensual Gastos IA Plan, base64url(), getAccessToken(), pemToArrayBuffer(), index.ts, report.ts, report.test.ts, 20260724_reporte_mensual_gastos.sql (+1 more)

### Community 14 - "Gastos Hooks and Lists"
Cohesion: 0.18
Nodes (16): FilterBar(), styles(), LoadingSkeleton(), SkeletonBox(), PendienteGastoCard(), styles(), TAB_BAR_CLEARANCE, useTheme() (+8 more)

### Community 15 - "Auth and Notification Hooks"
Cohesion: 0.21
Nodes (13): @tanstack/react-query, AuthContext, AuthProvider(), necesitaOnboarding(), useAuth(), useNotificacionesPendientesMutations(), useNotificacionesPendientes(), NotificationRow() (+5 more)

### Community 16 - "Debt Card Display"
Cohesion: 0.20
Nodes (15): DeudaCard Viaje badge, AVATAR_COLORS, avatarColorFor(), avStyles, cbStyles(), CompensacionBanner(), DeudaCard, fmt() (+7 more)

### Community 17 - "Deudores Screen and Hooks"
Cohesion: 0.24
Nodes (12): ProfileAvatarButton(), styles, deudaEntraEsteMes(), useDeudaMutations(), useDeudas(), deudaEntraEsteMes(), DeudoresScreen(), fmtMonto() (+4 more)

### Community 18 - "TanStack Query Migration"
Cohesion: 0.18
Nodes (3): TanStack Query Migration Plan, ViajesContext, ViajesProvider()

### Community 19 - "NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, android, build:aab, build:apk, ios, start, test, web

### Community 20 - "Login and Modal Hook"
Cohesion: 0.43
Nodes (6): AppModal(), styles(), useModal(), getPasswordStrength(), LoginScreen(), styles()

### Community 21 - "Legacy DataContext"
Cohesion: 0.29
Nodes (3): Performance: TanStack Query Migration Spec, DataContext, DataProvider()

### Community 22 - "Query Client Persistence"
Cohesion: 0.29
Nodes (5): Query cache policy (staleTime/gcTime per key), @tanstack/query-async-storage-persister, @tanstack/react-query-persist-client, persister, queryClient

### Community 23 - "Dev Dependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @babel/core, babel-jest, @babel/preset-env, jest, @types/react, typescript

### Community 25 - "Supabase DB Check Script"
Cohesion: 0.40
Nodes (3): @supabase/supabase-js, { createClient }, supabase

### Community 26 - "App Icon Branding"
Cohesion: 0.50
Nodes (4): App Icon (MyBolucompras), Brand Palette (violet/indigo gradient, teal accent, dark navy bg), Personal Finance / Purchase Tracking Concept, Wallet-shaped 'B' Logo Mark

### Community 27 - "TypeScript Config"
Cohesion: 0.50
Nodes (3): expo/tsconfig.base, compilerOptions, extends

### Community 28 - "BudgetBuddy Logo"
Cohesion: 0.67
Nodes (3): BudgetBuddy App Logo, Purple/Violet Gradient with Teal Accent on Dark Navy Palette, Wallet-shaped 'B' Brand Mark

### Community 29 - "Logo Branding"
Cohesion: 0.67
Nodes (3): MyBolucompras App Logo, Personal Finance / Purchase Tracking, Wallet-shaped 'B' Brand Mark (purple gradient, teal card and clasp)

## Ambiguous Edges - Review These
- `Modo Viaje Design Spec` → `Viajes Navigation Back Spec`  [AMBIGUOUS]
  docs/superpowers/specs/2026-05-28-viajes-navigation-design.md · relation: conceptually_related_to
- `Modo Viaje (group trip expenses)` → `ModoViajeChecker (auto-deactivate / prompt / redirect)`  [AMBIGUOUS]
  docs/superpowers/specs/2026-07-23-modo-viaje-redirect-design.md · relation: conceptually_related_to

## Knowledge Gaps
- **226 isolated node(s):** `inAppUpdates`, `Tab`, `Stack`, `AuthStack`, `appJson` (+221 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 279 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Modo Viaje Design Spec` and `Viajes Navigation Back Spec`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Modo Viaje (group trip expenses)` and `ModoViajeChecker (auto-deactivate / prompt / redirect)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `Shared UI Components` to `Trip Debts and Payments`, `Expense Projection and Cards`, `Catalogs and Config Keys`, `Trip Calendar and Activities`, `Modo Viaje Navigation`, `Trip Detail UI Redesign`, `Package Manifest`, `App Root and Navigation`, `Gastos Hooks and Lists`, `Auth and Notification Hooks`, `Debt Card Display`, `Deudores Screen and Hooks`, `TanStack Query Migration`, `Login and Modal Hook`, `Legacy DataContext`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Expo Dependencies` to `Package Manifest`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `react-native` connect `Shared UI Components` to `Trip Debts and Payments`, `Auto Purchase Registration`, `Expense Projection and Cards`, `Catalogs and Config Keys`, `Trip Calendar and Activities`, `Modo Viaje Navigation`, `Trip Detail UI Redesign`, `Package Manifest`, `App Root and Navigation`, `Gastos Hooks and Lists`, `Debt Card Display`, `Deudores Screen and Hooks`, `Login and Modal Hook`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `inAppUpdates`, `Tab`, `Stack` to the rest of the system?**
  _226 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.1011743450767841 - nodes in this community are weakly interconnected._