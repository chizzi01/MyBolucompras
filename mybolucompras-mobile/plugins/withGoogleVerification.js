const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withGoogleVerification = (config, { code }) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const assetsDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/assets');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const filePath = path.join(assetsDir, 'adi-registration.properties');
      fs.writeFileSync(filePath, code);
      return config;
    },
  ]);
};

module.exports = withGoogleVerification;
