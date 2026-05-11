// Eagerly resolve the FormData lazy getter set by setUpXHR in InitializeCore.
// In Expo SDK 54 + RN 0.81 + New Architecture, expo/src/winter/runtime.native.ts
// calls installFormDataPatch(FormData) at pre-module init time. If the lazy getter
// set by polyfillGlobal('FormData', ...) is not yet resolved, this throws
// ReferenceError: Property 'FormData' doesn't exist in Hermes.
// By eagerly loading FormData here (between InitializeCore and winter/index.ts),
// the global is a concrete class reference before installFormDataPatch runs.
try {
  if (typeof global.FormData !== 'function') {
    global.FormData = require('react-native/Libraries/Network/FormData').default;
  }
} catch (_) {
  global.FormData = require('react-native/Libraries/Network/FormData').default;
}
