const { withAppBuildGradle } = require('@expo/config-plugins');

// android/ se borra y regenera en cada `expo prebuild --clean`, así que el
// signingConfig de release no puede vivir a mano en build.gradle: se pierde.
// Este plugin lo reinyecta cada vez. Las credenciales reales NUNCA están acá
// ni en el repo: se leen de gradle.properties (global del usuario, fuera del
// proyecto). Si no están definidas (ej. otra persona clona el repo), cae en
// el mismo debug.keystore que usaba antes — no rompe el build de nadie más.

const OLD_SIGNING_CONFIGS = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const NEW_SIGNING_CONFIGS = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYBOLU_RELEASE_STORE_FILE')) {
                storeFile file(MYBOLU_RELEASE_STORE_FILE)
                storePassword MYBOLU_RELEASE_STORE_PASSWORD
                keyAlias MYBOLU_RELEASE_KEY_ALIAS
                keyPassword MYBOLU_RELEASE_KEY_PASSWORD
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
    }`;

const OLD_RELEASE_BUILD_TYPE_SIGNING = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const NEW_RELEASE_BUILD_TYPE_SIGNING = `        release {
            signingConfig signingConfigs.release`;

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes(OLD_SIGNING_CONFIGS)) {
      throw new Error(
        'withReleaseSigning: no se encontró el bloque signingConfigs esperado en android/app/build.gradle. ' +
          'El template de Expo debe haber cambiado — revisar y actualizar este plugin.',
      );
    }
    contents = contents.replace(OLD_SIGNING_CONFIGS, NEW_SIGNING_CONFIGS);

    if (!contents.includes(OLD_RELEASE_BUILD_TYPE_SIGNING)) {
      throw new Error(
        'withReleaseSigning: no se encontró el bloque release del buildType esperado en android/app/build.gradle. ' +
          'El template de Expo debe haber cambiado — revisar y actualizar este plugin.',
      );
    }
    contents = contents.replace(OLD_RELEASE_BUILD_TYPE_SIGNING, NEW_RELEASE_BUILD_TYPE_SIGNING);

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withReleaseSigning;
