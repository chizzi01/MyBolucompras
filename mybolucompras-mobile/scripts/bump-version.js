#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const BUILD_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');

// Read and increment versionCode from app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
const current = appJson.expo.android.versionCode;
const next = current + 1;

appJson.expo.android.versionCode = next;
fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2) + '\n');

// Update build.gradle
let gradle = fs.readFileSync(BUILD_GRADLE, 'utf8');
gradle = gradle.replace(
  /versionCode\s+\d+/,
  `versionCode ${next}`
);
fs.writeFileSync(BUILD_GRADLE, gradle);

console.log(`versionCode: ${current} → ${next}`);
