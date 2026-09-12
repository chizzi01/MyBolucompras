# Registro automático de compras vía notificaciones bancarias (Android)

## Contexto

Hoy el alta de un gasto es siempre manual: formulario o escaneo de ticket con IA (`ocrService.js` vía OpenRouter). El usuario pidió poder registrar compras automáticamente leyendo la notificación que le manda su banco al realizar una compra con tarjeta.

Android permite que una app lea notificaciones de otras apps mediante `NotificationListenerService` (permiso `BIND_NOTIFICATION_LISTENER_SERVICE`, habilitado a mano por el usuario en Ajustes → Acceso a notificaciones). iOS no expone ninguna API equivalente, y el proyecto no tiene carpeta `ios/` hoy, así que esta iteración es **exclusivamente Android**. Si en el futuro se necesita iOS, el mecanismo de captura tendría que ser reenvío de mail a una Edge Function — queda fuera de alcance.

El proyecto ya es un prebuild de Expo (carpeta `android/` generada, config plugin propio en `plugins/withGoogleVerification.js`), lo que permite agregar módulos nativos y modificar el `AndroidManifest.xml` vía config plugin sin salir del flujo de Expo/EAS.

## Alcance

- Solo Android. No se toca nada de iOS en esta iteración.
- Cubre **todos los bancos** del catálogo `BANCOS` en `src/constants/catalogos.js`, con **Galicia como plantilla principal** (primer banco soportado con reglas dedicadas; el resto arranca con el fallback de IA hasta sumar sus plantillas).
- Es **opt-in**: toggle en Configuración, apagado por defecto. Requiere que el usuario otorgue el permiso de acceso a notificaciones manualmente (Android no permite pedirlo por diálogo estándar).
- El resultado de leer una notificación **nunca se inserta directo en `gastos`**: siempre pasa por una bandeja de pendientes que el usuario confirma, edita o descarta. No hay auto-alta silenciosa en esta iteración (ver "Futuro" en Fuera de alcance).
- No reemplaza el alta manual ni el OCR de tickets; es una tercera vía de entrada al mismo `gastosService.crear()`.
- No lee SMS, no lee mail, no usa ningún agregador bancario (open banking no existe regulado en Argentina; los agregadores B2B existentes piden credenciales de home banking, inaceptable para este caso de uso).

### Fuera de alcance (futuro, no en esta iteración)
- iOS vía reenvío de mail a webhook.
- Auto-confirmación automática de comercios ya aprendidos (queda anotado como posible mejora, pero no se construye ahora: toda notificación pasa por la bandeja).
- Deduplicación cruzada con un futuro canal de mail.

## Arquitectura

```
Notificación bancaria (Android)
        │
NotificationListenerService (módulo nativo, vía librería)
        │  → package name + título + texto + timestamp
        ▼
Cola local (AsyncStorage) — persiste con la app cerrada
        │
Headless JS task (se procesa al abrir la app / en foreground)
        │
Motor de parseo por capas (reglas → fallback IA)
        ▼
Tabla `notificaciones_pendientes` en Supabase
        │
Pantalla "Bandeja de pendientes" → usuario confirma/edita/descarta
        ▼
gastosService.crear()  (mismo flujo ya existente)
```

## Captura nativa

- Librería `react-native-android-notification-listener` en vez de escribir el servicio Kotlin a mano — resuelve el `NotificationListenerService` y el intent hacia Ajustes del sistema.
- Config plugin nuevo `plugins/withNotificationListener.js` (mismo patrón que `withGoogleVerification.js`, usando `withDangerousMod`/`withAndroidManifest` de `@expo/config-plugins`) que agrega el `<service>` con `BIND_NOTIFICATION_LISTENER_SERVICE` al `AndroidManifest.xml`.
- Pantalla de Configuración: toggle "Detectar compras automáticamente" que:
  - Explica qué hace (lee notificaciones de apps de banco de una whitelist) y qué no (no lee WhatsApp, SMS ni mensajes personales).
  - Dispara el intent a `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` para que el usuario habilite el permiso.
  - Al volver a la app, verifica si el permiso quedó otorgado (la librería expone un check) y refleja el estado real del toggle — si el usuario lo revoca después desde Ajustes, el toggle vuelve a "apagado" la próxima vez que se abre la app.
- **Whitelist de packages** hardcodeada en el cliente (no en Supabase, no necesita estar sincronizada), un entry por cada banco de `BANCOS` con su package de Android conocido, más medios de pago no bancarios ya en el catálogo (Mercado Pago). Notificación de un package fuera de la whitelist se descarta antes de tocar disco — nunca se persiste texto de apps ajenas al dominio bancario.

## Motor de parseo por capas

1. **Reglas por plantilla de banco**: objeto declarativo por package (`{ packageName, matchKeywords, extractRegexes: { monto, comercio, ultimos4, tipo, moneda } }`). Determinístico, offline, gratis. Se arranca con la plantilla de Galicia usando el formato real de notificación que provea el usuario; el resto de los bancos queda sin plantilla propia hasta sumarla.
2. **Fallback a IA**: cuando el package está en la whitelist pero ninguna plantilla matchea (banco sin reglas propias todavía, o cambio de formato), se reusa el mismo proveedor que `ocrService.js` (OpenRouter, modelo texto-only en vez de imagen) con un prompt equivalente al de extracción de tickets, pidiendo el mismo JSON normalizado.
3. Antes de intentar cualquier parseo, un filtro por keywords descarta notificaciones que no son de compra (resúmenes de cuenta, vencimientos, rechazos, promociones) — evita gastar la llamada a IA y evita falsos positivos.
4. La promoción de un caso resuelto por IA a plantilla de reglas es manual (a mano por el desarrollador revisando fixtures), no automática — para no incorporar reglas de baja calidad sin revisión.

### Plantilla Galicia (referencia concreta)

Formato real de notificación de compra de la app de Banco Galicia (`com.bancogalicia...`, se confirma el package exacto en el plan de implementación revisando el dispositivo de prueba):

- **Título**: `Pagaste: $12.000`
- **Cuerpo**: `A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35`

Reglas de extracción:
- **Keyword de match/filtro**: título empieza con `Pagaste:` (esto además sirve como filtro positivo — otras notificaciones de Galicia, como "¡Recibiste plata!", quedan afuera sin necesidad de excluirlas una por una).
- **monto**: del título, `Pagaste:\s*\$([\d.,]+)`.
- **comercio_raw**: del cuerpo, `^A (.+?) con tu` → `MANTECA LB-MANTECA LB HE`.
- **medio + tipo**: del cuerpo, `con tu (Visa|Mastercard|American Express) (Débito|Crédito) (\d{4})` → medio `Visa`, tipo `debito`, ultimos4 `2665`.
- **fecha_detectada**: se usa el timestamp de la notificación capturado por el listener nativo, no la hora en texto (`a las 14:35`) — el texto no trae fecha (día/mes), solo hora, y el timestamp del sistema ya es preciso.
- **moneda**: Galicia no la incluye en este tipo de notificación; se asume `ARS` por defecto para este banco (ajustable a futuro si aparece un caso en otra moneda).

Esta es la primera plantilla real cargada en `src/services/__fixtures__/notificaciones/galicia.json` (o `.js`, se define en el plan) y sirve de modelo para las plantillas de los demás bancos a medida que se consigan sus ejemplos.

**Salida normalizada** de cualquiera de las dos capas:
```json
{
  "monto": "2450.00",
  "moneda": "ARS",
  "comercio_raw": "COTO CICSA",
  "ultimos4": "4821",
  "medio": "Visa",
  "tipo": "credito",
  "fecha_detectada": "2026-09-12T14:32:00Z",
  "banco_package": "com.bancogalicia.mobile"
}
```
Campos que no se puedan extraer quedan `null`; el usuario los completa a mano en la bandeja.

## Aprendizaje comercio → categoría

Nueva tabla `comercios_aprendidos (user_id, comercio_raw, etiqueta_id, medio_pago, created_at)`, por usuario (cada uno categoriza distinto el mismo comercio). La primera vez que aparece "COTO CICSA" el usuario confirma etiqueta y medio en la bandeja; las próximas veces la tarjeta de confirmación aparece precargada con esos valores (pero sigue requiriendo el swipe de confirmación — no se salta la bandeja).

## Esquema de datos (Supabase)

```sql
create table notificaciones_pendientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  banco_package text not null,
  texto_raw text not null,
  monto numeric,
  moneda text,
  comercio_raw text,
  ultimos4 text,
  medio text,
  tipo text, -- 'debito' | 'credito'
  fecha_detectada timestamptz not null,
  estado text not null default 'pendiente', -- 'pendiente' | 'confirmado' | 'descartado'
  gasto_id uuid references gastos(id),
  created_at timestamptz not null default now()
);

create table comercios_aprendidos (
  user_id uuid not null references auth.users(id),
  comercio_raw text not null,
  etiqueta_id text,
  medio_pago text,
  created_at timestamptz not null default now(),
  primary key (user_id, comercio_raw)
);
```

RLS en ambas tablas: cada usuario solo lee/escribe sus propias filas (mismo patrón que `gastos`).

**Deduplicación** al insertar en `notificaciones_pendientes`: si ya existe una fila del mismo `user_id` en estado `pendiente` o `confirmado` con el mismo `monto` y `ultimos4`, y `fecha_detectada` dentro de ±5 minutos, se descarta el nuevo insert (cubre el caso de notificación duplicada del propio banco).

## UI — bandeja de pendientes

- Entrada nueva en la navegación (badge en el tab de Gastos, o pantalla dedicada — se decide en el plan de implementación según cómo esté armado hoy el bottom tab) que lista las filas `estado = 'pendiente'` ordenadas por `fecha_detectada` desc.
- Cada fila es una tarjeta al estilo `GastoCard.jsx`, con swipe:
  - Derecha → confirmar: abre un modal precargado con los campos extraídos (mismo modal/flujo de alta que ya existe, pre-rellenado) para que el usuario ajuste categoría, cuotas u otro dato antes de guardar. Al guardar: se llama `gastosService.crear()`, se actualiza la fila a `estado = 'confirmado'` con el `gasto_id` resultante, y se hace upsert en `comercios_aprendidos`.
  - Izquierda → descartar: `estado = 'descartado'`, no crea gasto.
- Si no hay pendientes, la entrada de navegación no muestra badge (no se agrega una pantalla vacía visible si nunca se usó la función).

## Manejo de errores / edge cases

- **Servicio matado por Doze/optimización de batería**: se solicita exclusión de optimización de batería al activar el toggle (ya existe `WAKE_LOCK` en el manifest). Peor caso, la notificación bancaria real la sigue viendo el usuario en la barra de notificaciones y puede cargar el gasto a mano — no es un punto único de falla para el registro del gasto en sí, solo para la automatización.
- **Notificaciones que no son de compra** (resumen, vencimiento, rechazo, promoción del banco): filtradas por keywords antes del parseo, nunca llegan a `notificaciones_pendientes`.
- **Permiso revocado**: se revisa al abrir la app; si estaba activado y ya no hay permiso, el toggle se muestra apagado y se informa al usuario.
- **Banco sin plantilla y fallo del fallback de IA** (respuesta no parseable): la notificación se descarta silenciosamente (se loguea, no se persiste una fila con todos los campos null) — no tiene sentido mostrarle al usuario una tarjeta sin monto ni comercio.
- **App desinstalada y reinstalada / permiso nunca otorgado**: no pasa nada, el toggle queda apagado, cero impacto en el resto de la app.

## Testing

- Unit tests del motor de parseo por banco con fixtures de texto real en `src/services/__fixtures__/notificaciones/` (arranca con Galicia).
- Unit tests de la función de deduplicación y de la máquina de estados `pendiente → confirmado/descartado`.
- Unit tests del filtro de keywords (que notificaciones de resumen/vencimiento no lleguen a parsearse).
- El `NotificationListenerService` nativo en sí no es testeable con Jest — se valida manualmente en un build de desarrollo (`expo run:android`) instalado en un dispositivo/emulador con la app del banco.

## Pendiente antes de implementar

Ya se cuenta con el formato real de Galicia (ver "Plantilla Galicia" arriba). Queda pendiente, para el resto de los bancos del catálogo, ir consiguiendo ejemplos reales a medida que se prioricen — hasta entonces cada uno arranca por el fallback de IA.
