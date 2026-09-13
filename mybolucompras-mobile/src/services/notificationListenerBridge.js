import AsyncStorage from '@react-native-async-storage/async-storage';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';

// Key de AsyncStorage donde se persiste la cola de notificaciones bancarias
// capturadas. La escribe la headless task (Task 11, vía `encolarDesdeHeadless`
// que se agrega en este mismo archivo) y la consume Task 10.
const QUEUE_KEY = '@mybolu:colaNotificaciones';

// Cuánto tarda `registrarListener` en volver a chequear la cola mientras la
// app está en foreground. La librería no expone un evento nativo al que
// suscribirse en tiempo real (ver nota de diseño más abajo), así que el
// "listener" es en realidad un polling liviano sobre AsyncStorage.
const INTERVALO_POLLING_MS = 4000;

async function tienePermiso() {
  const status = await RNAndroidNotificationListener.getPermissionStatus();
  return status === 'authorized';
}

function abrirAjustesDePermiso() {
  RNAndroidNotificationListener.requestPermission();
}

async function encolarNotificacion(entrada) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const cola = raw ? JSON.parse(raw) : [];
  cola.push(entrada);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(cola));
}

async function leerYVaciarCola() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const cola = raw ? JSON.parse(raw) : [];
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
// se dispara igual con la app en foreground o en background: no hay dos
// mecanismos distintos como asumía el plan original, hay uno solo.
//
// Por eso `registrarListener` acá no puede ser una suscripción nativa: es un
// polling sobre la cola persistida en AsyncStorage (la misma que llena la
// headless task). Mientras el componente que lo usa está montado, se drena
// la cola cada `INTERVALO_POLLING_MS` y se invoca `onNotificacion` por cada
// entrada encontrada. Esto es intencionalmente el único consumidor que vacía
// la cola en foreground (Task 10 lee notificaciones ya procesadas desde
// `notificaciones_pendientes`, no desde esta cola).
function registrarListener(onNotificacion) {
  let activo = true;

  const drenar = async () => {
    const cola = await leerYVaciarCola();
    if (!activo) return;
    for (const entrada of cola) {
      onNotificacion(entrada);
    }
  };

  drenar();
  const intervalId = setInterval(drenar, INTERVALO_POLLING_MS);

  return () => {
    activo = false;
    clearInterval(intervalId);
  };
}

export const notificationListenerBridge = {
  tienePermiso,
  abrirAjustesDePermiso,
  registrarListener,
  leerYVaciarCola,
  encolarNotificacion,
  QUEUE_KEY,
};
