const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

// react-native-android-notification-listener@5.0.1 arranca su servicio
// (RNAndroidNotificationListener, un NotificationListenerService) sin nunca
// llamar a Service.startForeground(). En Android 8+ el sistema (y, en este
// dispositivo, la propia One UI) a veces lo levanta vía
// Context.startForegroundService() — ya sea desde BootUpReceiver.java (al
// bootear) o al reconectar el listener tras matarlo — lo que exige que el
// servicio llame a startForeground() dentro de un plazo corto. Como nunca lo
// hace, el sistema termina generando un ANR real:
//   "Context.startForegroundService() did not then call Service.startForeground()"
// (confirmado en logcat/dumpsys en este dispositivo), que es la causa de los
// mensajes de "la app no responde" — no depende del volumen de notificaciones
// ni del pipeline JS, sino de este contrato de servicio nunca cumplido.
//
// El fix: en onCreate() del servicio, promoverlo a foreground con una
// notificación silenciosa de mínima prioridad y bajarlo inmediatamente. Eso
// satisface el contrato de Android sin dejar una notificación persistente
// visible para el usuario, sin importar por qué vía el sistema lo arrancó.
const MARKER = '// mybolucompras: foreground-fix';

const ON_CREATE_INJECTION = `
    ${MARKER}
    @Override
    public void onCreate() {
        super.onCreate();
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            String channelId = "mybolu_notification_listener";
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                channelId, "Escucha de notificaciones", android.app.NotificationManager.IMPORTANCE_MIN);
            channel.setShowBadge(false);
            android.app.NotificationManager manager = getSystemService(android.app.NotificationManager.class);
            manager.createNotificationChannel(channel);
            android.app.Notification notification = new android.app.Notification.Builder(this, channelId)
                .setContentTitle("")
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .build();
            try {
                startForeground(9412, notification);
            } finally {
                stopForeground(true);
            }
        }
    }
`;

function patchFile(filePath) {
  let contents = fs.readFileSync(filePath, 'utf8');
  if (contents.includes(MARKER)) return;

  const classAnchor = 'public class RNAndroidNotificationListener extends NotificationListenerService {';
  const idx = contents.indexOf(classAnchor);
  if (idx === -1) {
    throw new Error('withNotificationListenerForegroundFix: no se encontró la declaración de la clase a parchear');
  }
  const insertAt = idx + classAnchor.length;
  contents = contents.slice(0, insertAt) + ON_CREATE_INJECTION + contents.slice(insertAt);
  fs.writeFileSync(filePath, contents, 'utf8');
}

function withNotificationListenerForegroundFix(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const filePath = path.join(
        config.modRequest.projectRoot,
        'node_modules/react-native-android-notification-listener/android/src/main/java/com/lesimoes/androidnotificationlistener/RNAndroidNotificationListener.java',
      );
      patchFile(filePath);
      return config;
    },
  ]);
}

module.exports = withNotificationListenerForegroundFix;
