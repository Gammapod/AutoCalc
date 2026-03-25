Truth 2: Runbook
# Android APK Release Runbook

This runbook covers Android APK build and artifact release for AutoCalc.

## Scope

1. Artifact type: Android release APK
2. Distribution channel: workflow artifact (sideload-first)
3. Workflow: `.github/workflows/release-android-apk.yml`

## Local build

1. Install dependencies:

```bash
npm install
```

2. Build/sync Android project and produce release APK:

```bash
npm run build:android:apk
```

Expected output:

1. `android/app/build/outputs/apk/release/app-release.apk`

## CI build

Run workflow `Release Android APK` via:

1. Manual dispatch, or
2. Tag push matching `v*`

The workflow will:

1. Install Node dependencies
2. Build mobile web assets
3. Ensure/sync Capacitor Android project
4. Build release APK
5. Generate SHA256 checksum
6. Upload APK + checksum as workflow artifacts

## Verification

1. Confirm artifact names:
2. `app-release.apk`
3. `app-release.apk.sha256`
4. Verify checksum locally:

```bash
sha256sum app-release.apk
cat app-release.apk.sha256
```

## Notes

1. This is APK sideload-first. Play Store AAB publishing is intentionally deferred.
2. If Android project has not been generated yet, sync script runs `npx cap add android` once.
