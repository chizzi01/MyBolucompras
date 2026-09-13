const { withAndroidManifest } = require('@expo/config-plugins');

// react-native-android-notification-listener trae su propio AndroidManifest.xml
// con android:allowBackup="false", lo que choca con nuestro allowBackup="true"
// y hace fallar el manifest merger de Gradle. Forzamos que gane el valor de la
// app agregando tools:replace en el <application>.
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

    return config;
  });
}

module.exports = withNotificationListenerManifestFix;
