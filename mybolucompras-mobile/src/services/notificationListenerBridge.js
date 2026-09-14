import AsyncStorage from '@react-native-async-storage/async-storage';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';

// Key de AsyncStorage donde se persiste la cola de notificaciones bancarias
// capturadas. La escribe la headless task (Task 11, vía `encolarDesdeHeadless`
// que se agrega en este mismo archivo) y la consume Task 10.
const QUEUE_KEY = '@mybolu:colaNotificaciones';

async function tienePermiso() {
  const status = await RNAndroidNotificationListener.getPermissionStatus();
  return status === 'authorized';
}

function abrirAjustesDePermiso() {
  RNAndroidNotificationListener.requestPermission();
}

// El valor persistido puede quedar corrupto/parcial si la app se mata en
// medio de un `AsyncStorage.setItem` (ej. la escritura no llegó a terminar).
// Ante eso tratamos la cola como vacía en vez de tirar una excepción no
// atrapada: la siguiente escritura (encolar o vaciar) sobreescribe el valor
// corrupto con JSON válido, así que es autocorrectivo.
function leerColaCruda(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function encolarNotificacion(entrada) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const cola = leerColaCruda(raw);
  cola.push(entrada);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(cola));
}

async function leerYVaciarCola() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const cola = leerColaCruda(raw);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  return cola;
}

// NOTA DE DISEÑO (Task 9):
//
// `react-native-android-notification-listener@5.0.1` (verificado leyendo su
// README, index.d.ts y el código nativo Java bajo node_modules/) NO expone
// ningún NativeEventEmitter ni evento al que suscribirse en JS. Su única vía
// de entrega de notificaciones nuevas es una headless task de React Native
// (`RNAndroidNotificationListenerHeadlessJsName`, registrada con
// `AppRegistry.registerHeadlessTask` en el entry point — eso es Task 11) que
// se dispara igual con la app en foreground o en background, entregando el
// payload como un string JSON (no un objeto ya parseado): no hay dos
// mecanismos distintos como asumía el plan original, hay uno solo.

// `notificacion.time` viene de `sbn.getPostTime()` del lado nativo: un
// epoch en milisegundos, pero serializado como STRING (no number). Postgres
// rechaza ese string tal cual como timestamptz ("date/time field value out
// of range"), así que se normaliza a ISO 8601 acá antes de encolarlo.
function timestampAISO(time) {
  const ms = Number(time);
  if (!time || !Number.isFinite(ms) || ms <= 0) return new Date().toISOString();
  return new Date(ms).toISOString();
}

async function encolarDesdeHeadless(notificacion) {
  await encolarNotificacion({
    packageName: notificacion.app,
    titulo: notificacion.title || '',
    texto: notificacion.text || notificacion.bigText || '',
    timestamp: timestampAISO(notificacion.time),
  });
}

export const notificationListenerBridge = {
  tienePermiso,
  abrirAjustesDePermiso,
  leerYVaciarCola,
  encolarNotificacion,
  encolarDesdeHeadless,
  QUEUE_KEY,
};
