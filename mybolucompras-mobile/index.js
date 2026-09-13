import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';

import App from './App';

// Notificaciones recibidas con la app en background/cerrada (y también en
// foreground: la librería dispara esta misma tarea en ambos casos, no hay un
// canal separado — ver notificationListenerBridge.js). El payload trae
// `notification` como STRING JSON, no como objeto — hay que parsearlo antes
// de encolar. Si el parseo falla (payload corrupto/inesperado), se descarta
// esa notificación en vez de romper la tarea headless.
AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => async (data) => {
    const { notificationListenerBridge } = require('./src/services/notificationListenerBridge');
    let notificacion;
    try {
      notificacion = JSON.parse(data.notification);
    } catch {
      return;
    }
    await notificationListenerBridge.encolarDesdeHeadless(notificacion);
  },
);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
