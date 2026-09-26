import AsyncStorage from '@react-native-async-storage/async-storage';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { esNotificacionDeCompra } from './notificaciones/filtro';

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

// La librería lanza una headless task por notificación y varias pueden correr
// a la vez en el mismo runtime JS; sin serializar, los read-modify-write se
// intercalan y se pierden entradas cuando llegan varias notificaciones juntas.
let colaLock = Promise.resolve();

function conLock(fn) {
  const resultado = colaLock.then(fn);
  colaLock = resultado.catch(() => {});
  return resultado;
}

function encolarNotificacion(entrada) {
  return conLock(async () => {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const cola = leerColaCruda(raw);
    cola.push(entrada);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(cola));
  });
}

function leerYVaciarCola() {
  return conLock(async () => {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const cola = leerColaCruda(raw);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
    return cola;
  });
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

// El listener nativo recibe TODAS las notificaciones del teléfono (WhatsApp,
// redes, sistema, etc.), no solo las de bancos — la librería no filtra por
// package. Sin este filtro acá, cada notificación del dispositivo dispara
// una escritura completa a AsyncStorage (read-modify-write) compitiendo por
// el mismo hilo JS que usa la app en foreground, lo que en dispositivos con
// notificaciones frecuentes produce ANRs periódicos ("la app no responde")
// aunque la app siga usable. Descartar acá, antes de tocar disco, es lo que
// evita eso.
async function encolarDesdeHeadless(notificacion) {
  const titulo = notificacion.title || '';
  const texto = notificacion.text || notificacion.bigText || '';
  if (!esNotificacionDeCompra({ titulo, texto })) return;

  await encolarNotificacion({
    packageName: notificacion.app,
    titulo,
    texto,
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
