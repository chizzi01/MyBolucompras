const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Excluir carpetas de build para evitar errores de lstat en Windows
config.resolver.blockList = [
  /.*\/android\/build\/.*/,
  /.*\/ios\/build\/.*/,
  /.*\/node_modules\/.*\/android\/build\/.*/,
];

// Insert a FormData pre-polyfill between InitializeCore and expo/src/winter/index.ts.
// In Expo SDK 54 + RN 0.81 + New Architecture, expo/winter/runtime.native.ts calls
// installFormDataPatch(FormData) at pre-module time. If FormData's lazy getter from
// setUpXHR hasn't been triggered yet, Hermes throws ReferenceError: Property 'FormData'
// doesn't exist. This prepolyfill eagerly resolves FormData before winter runs.
const originalGetModules = config.serializer.getModulesRunBeforeMainModule;
config.serializer.getModulesRunBeforeMainModule = (entryFilePath) => {
  const defaultModules = originalGetModules ? originalGetModules(entryFilePath) : [];
  const prepolyfill = path.resolve(__dirname, 'src/prepolyfill.js');

  // Insert after InitializeCore (first module), before everything else
  const [first, ...rest] = defaultModules;
  if (first) {
    return [first, prepolyfill, ...rest];
  }
  return [prepolyfill, ...defaultModules];
};

module.exports = config;
