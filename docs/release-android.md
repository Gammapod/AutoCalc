Truth: 2 - Runbook
# Android APK Release Runbook

This runbook covers Android APK build and artifact release for AutoCalc.
For shared pipeline rules (triggers, tag semantics, approvals, and drift policy), see `docs/ci-cd-pipeline.md`.

## Scope

1. Artifact type: Android release APK
2. Distribution channel: workflow artifact (sideload-first)
3. Workflow: `.github/workflows/release-android-apk.yml`

## Prerequisites (local parity with CI)

1. Node 22
2. Java 21 (Temurin), matching CI `actions/setup-java@v4` configuration

On Windows (PowerShell), install and set Java 21:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

If `java -version` reports Java 8, Android Gradle plugin resolution will fail.

## Local build

1. Install dependencies:

```bash
npm install
```

2. Build/sync Android project and produce release APK:

```bash
npm run build:android:apk
```

Equivalent no-rebuild sequence (matches release workflow execution order):

```bash
npm run build:mobile:webassets:only
npm run mobile:android:sync:only
npm run build:android:apk:only
```

Expected output:

1. `android/app/build/outputs/apk/release/app-release.apk`

## CI build

Run workflow `Release Android APK` via:

1. Manual dispatch, or
2. Ready-train semver tag push matching `v*`

Execution is feature-gated. The job only runs when repository/environment variable `ENABLE_ANDROID_RELEASE` is set to `true`.

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
3. This workflow uploads artifacts to the workflow run and does not publish a GitHub Release entry.
