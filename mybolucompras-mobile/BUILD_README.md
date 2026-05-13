# Build Commands

## Local Builds

### Configure release signing
Create `android/keystore.properties` with your release keystore credentials for local builds:
```properties
storeFile=@chizzi__mybolucompras-mobile.jks
storePassword=your_store_password
keyAlias=your_key_alias
keyPassword=your_key_password
```

Then build the signed release artifact:
```bash
npm run build:aab
# or on Windows PowerShell
cd android; .\gradlew bundleRelease
```

The AAB file will be generated at:
`android/app/build/outputs/bundle/release/app-release.aab`

### Generate APK (for testing/sideloading)
```bash
npm run build:apk
# or on Windows PowerShell
cd android; .\gradlew assembleRelease
```

The APK file will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`

## EAS Builds

### Preview Build (generates AAB)
```bash
eas build --platform android --profile preview
```

### Production Build (generates AAB)
```bash
eas build --platform android --profile production
```

> Note: EAS remote builds often download the artifact as a `.tar.gz` package. If you want a direct `app-release.aab`, use the local build command above.
>
> Remote EAS builds can use the stored EAS Android keystore when `credentialsSource: "remote"` is enabled, so a local `android/keystore.properties` file is not required for EAS release builds.

## Notes
- AAB files are smaller and optimized for the Play Store
- APK files are larger but can be installed directly on devices
- Both builds require signing configuration for release