const { withAndroidManifest } = require('@expo/config-plugins');

// react-native-android-notification-listener trae su propio AndroidManifest.xml
// con android:allowBackup="false", lo que choca con nuestro allowBackup="true"
// y hace fallar el manifest merger de Gradle. Forzamos que gane el valor de la
// app agregando tools:replace en el <application>.
//
// También declara su <service> RNAndroidNotificationListener sin
// android:foregroundServiceType. Con targetSdkVersion 36 (Android 14+),
// Service.startForeground() exige que el servicio declare un tipo — sin eso
// tira MissingForegroundServiceTypeException y el servicio crashea en loop
// (visto en logcat: "Unable to create service ... at Service.startForeground").
// Este startForeground() lo agrega withNotificationListenerForegroundFix (ver
// ese plugin) para evitar el ANR "did not then call Service.startForeground()"
// — pero para que no crashee hace falta declarar el tipo acá. Como el
// <service> real vive en el manifest de la librería (se mergea recién en
// tiempo de build de Gradle, no en este mod), lo redeclaramos en el manifest
// de la app con tools:node="merge" apuntando a la misma clase, para que el
// merger le sume foregroundServiceType y la property de subtype que exige
// "specialUse".
function withNotificationListenerManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const app = manifest.application[0];
    const existentes = (app.$['tools:replace'] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!existentes.includes('android:allowBackup')) {
      existentes.push('android:allowBackup');
    }
    app.$['tools:replace'] = existentes.join(',');

    const SERVICE_NAME = 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener';
    app.service = app.service || [];
    const yaDeclarado = app.service.some((s) => s.$?.['android:name'] === SERVICE_NAME);
    if (!yaDeclarado) {
      app.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:foregroundServiceType': 'specialUse',
          'tools:node': 'merge',
        },
        property: [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'notification_listener_sync',
            },
          },
        ],
      });
    }

    return config;
  });
}

module.exports = withNotificationListenerManifestFix;
