# Reporte mensual de gastos con análisis de IA

## Contexto

Los usuarios cargan gastos personales en la tabla `gastos` (objeto, precio, moneda, medio, etiqueta libre, es_fijo, cuotas). No existe un sistema de categorías fijas: la categorización más cercana es `etiqueta`, un campo de texto libre que muchos usuarios no completan.

El objetivo es, a fin de cada mes, generar automáticamente un análisis de los gastos del usuario usando IA y enviárselo por email, indicando en qué categorías gastó de más, qué gastos podría evitar (con criterio, sin tocar gastos fijos ni necesidades básicas) y consejos concretos de consumo.

El proyecto ya tiene el patrón exacto a replicar: la Edge Function `send-daily-viaje-summary` (cron protegido con `CRON_SECRET` → consulta Supabase → procesa por usuario → envía). No existe hoy ningún proveedor de email integrado (solo push vía FCM).

## Alcance

- Incluye **únicamente gastos personales** (tabla `gastos`), excluye gastos de viajes (`viaje_gastos`).
- Es **opt-in**: el usuario debe activar un toggle en Configuración. Por defecto está desactivado.
- No persiste histórico de reportes en base de datos — el mail es la única entrega, no hay pantalla de "reportes anteriores" en esta iteración.
- No hace conversión de moneda: cada moneda presente en los gastos del usuario (ARS, USD, etc.) se analiza como bloque independiente, igual que ya hace `DashboardScreen` con `totalesPorMoneda`.

## Arquitectura

Nueva Edge Function `supabase/functions/send-monthly-expense-report/index.ts`, siguiendo el mismo esqueleto que `send-daily-viaje-summary`:

1. Verifica `Authorization: Bearer <CRON_SECRET>`.
2. Calcula el mes recién cerrado en timezone `America/Argentina/Buenos_Aires`.
3. Trae usuarios con `configuracion_usuario.recibir_reporte_mensual = true`.
4. Para cada usuario:
   a. Trae sus `gastos` del mes cerrado y de los 2 meses anteriores (solo para promedios de comparación).
   b. Si no hay gastos variables (`es_fijo = false`) en el mes cerrado, se salta el usuario (no se manda mail vacío).
   c. Arma el payload y llama a la API de Claude (Anthropic) pidiendo un análisis estructurado (ver sección Prompt).
   d. Si Claude responde OK, arma el HTML del mail y lo envía por SMTP (Gmail/Workspace).
   e. Cualquier error (Claude, parseo, SMTP) para un usuario puntual se loguea con `console.error` y se continúa con el siguiente usuario — no aborta el batch.
5. Devuelve `{ success: true, usuariosProcesados, mailsEnviados }`.

Se dispara vía `pg_cron` el día 1 de cada mes a las 06:00 `America/Argentina/Buenos_Aires`, en una migración SQL nueva (mismo patrón que `20260722_viaje_calendario_cron.sql`). No hay reintentos automáticos si el cron falla completo; se puede re-disparar manualmente, igual que la función de viajes.

## Datos y prompt de IA

**Payload por usuario:** por cada gasto del mes cerrado y de los 2 meses previos: `objeto`, `precio`, `moneda`, `medio`, `etiqueta`, `es_fijo`, `fecha`. Se omiten campos irrelevantes para el análisis (ids, compartido_con_*, banco, cuotas) para no gastar tokens de más.

**Multi-moneda:** el payload agrupa los gastos por `moneda` y el prompt indica a Claude que analice cada moneda como bloque independiente, sin inventar conversiones.

**Modelo:** Claude Haiku vía Anthropic API, usando **structured output / tool_use** para forzar un JSON de salida y evitar parseo frágil de texto libre.

**Prompt (resumen funcional):**
> Sos un asesor financiero criterioso. Te paso los gastos variables y fijos de un usuario del mes actual y, si existen, de los 2 meses previos, agrupados por moneda. Agrupá los gastos variables en categorías razonables inferidas del texto (objeto/etiqueta/medio) — no uses una taxonomía fija, inferila de los datos. Identificá en qué categorías gastó notablemente más que su promedio anterior (si hay al menos 2 meses de historial) o qué categorías dominan el gasto del mes (si no hay historial suficiente). Sugerí 2 a 4 gastos o patrones concretos que podría recortar sin afectar necesidades básicas: nunca sugieras recortar gastos con `es_fijo: true`, y sé conservador — si un gasto parece necesario (alquiler, salud, educación, transporte al trabajo) no lo marques como recortable aunque sea alto. Devolvé un JSON con: `resumenGeneral` (string), `categorias[]` (`nombre`, `total`, `variacionPct` opcional), `gastosEvitables[]` (`descripcion`, `motivo`), `consejos[]` (2 a 3 consejos accionables y específicos a estos datos, no genéricos).

**Salida esperada:** JSON validado contra el esquema esperado antes de usarlo para armar el mail; si no matchea, se trata como error de ese usuario (paso 4e).

## Email

- **Proveedor:** SMTP de Gmail/Workspace (cliente `denomailer` para Deno), puerto 465, usando una cuenta con contraseña de aplicación (requiere 2FA activado en esa cuenta).
- **Secrets nuevos en Supabase:** `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ANTHROPIC_API_KEY`. Reutiliza `CRON_SECRET` existente.
- **Contenido del mail (HTML simple, responsive):**
  - Encabezado con mes/año y total gastado por moneda.
  - Sección "Dónde gastaste de más" (categorías con variación o predominancia).
  - Sección "Podrías evitar" (gastos evitables con motivo breve).
  - Sección "Consejos" (2-3 ítems).
  - Pie con nota de cómo desactivar el reporte (deep link a la pantalla de Configuración de la app; no hay backend de unsubscribe por token en esta iteración).

## Configuración y opt-in

- Nuevo campo `recibir_reporte_mensual boolean default false` en la tabla `configuracion_usuario` (migración SQL nueva).
- Se expone `recibirReporteMensual` en `configuracionService.js` (`mapFromDB`/`mapToDB`/`getDefaults`), igual que el resto de los flags existentes.
- Nuevo toggle "Recibir resumen mensual por mail" en la pantalla de Configuración, junto al resto de las opciones existentes.

## Manejo de errores

- Error de Claude (timeout, respuesta inválida) para un usuario → se loguea, se salta ese usuario, sigue el batch.
- Error de parseo del JSON de salida → mismo criterio.
- Error de envío SMTP → mismo criterio.
- Usuario sin gastos variables en el mes → se salta sin loguear error (caso esperado, no una falla).
- Sin tabla de auditoría/histórico de envíos en esta iteración — el único rastro es el log de la función.

## Fuera de alcance (explícitamente no se hace en esta iteración)

- Gastos de viajes (`viaje_gastos`).
- Persistencia de reportes pasados / pantalla "reportes anteriores" en la app.
- Conversión entre monedas.
- Unsubscribe por token/link directo (se resuelve por toggle en la app).
- Reintentos automáticos del cron.
