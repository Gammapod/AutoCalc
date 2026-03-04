# Windows Release Runbook

This runbook covers signed Windows x64 portable releases published via GitHub Releases.

## Scope

- Artifact type: Windows portable `.exe`
- Distribution channel: GitHub Releases
- Workflow: `.github/workflows/release-win-portable.yml`

## One-time setup

### 1. Configure GitHub Environment

Create GitHub Environment named `release` and require manual approvers.

### 2. Add release environment secrets

Add these secrets to Environment `release`:

- `WIN_CSC_LINK`: Base64-encoded PFX content or a certificate link supported by electron-builder
- `WIN_CSC_KEY_PASSWORD`: Password for the certificate
- `WIN_CSC_TSA_URL` (optional): Timestamp authority URL override

### 3. Repository permissions

The workflow requires `contents: write` to publish assets to GitHub Releases.

## Release flow

1. Ensure default branch is green.
2. Tag a release from the desired commit:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

3. Open GitHub Actions and confirm workflow `Release Windows Portable` starts.
4. Approve the `release` environment when prompted.
5. Verify the workflow completes and publishes:
   - `AutoCalc-<version>-win-x64-portable.exe`
   - `AutoCalc-<version>-win-x64-portable.exe.sha256`

## What CI validates

- Tag format: `vMAJOR.MINOR.PATCH` or `vMAJOR.MINOR.PATCH-prerelease`
- Clean checkout before release steps
- Signing secrets present before packaging
- Package version aligned to tag version
- Exactly one `.exe` exists in `release/`
- Artifact filename version matches the tag version
- SHA256 checksum file generated for published artifact

## Verification after publish

1. Download `.exe` and `.sha256` from GitHub Release.
2. Verify checksum locally:

```powershell
Get-FileHash .\AutoCalc-<version>-win-x64-portable.exe -Algorithm SHA256
Get-Content .\AutoCalc-<version>-win-x64-portable.exe.sha256
```

3. Confirm values match.
4. On Windows, check signature status:

```powershell
Get-AuthenticodeSignature .\AutoCalc-<version>-win-x64-portable.exe
```

Expected status: `Valid`.

## Rollback / cancellation

If a release tag was pushed by mistake:

1. Delete the tag remotely:

```bash
git push --delete origin vX.Y.Z
```

2. Delete local tag:

```bash
git tag -d vX.Y.Z
```

3. Remove incorrect GitHub Release entry/assets if created.

## Troubleshooting

### Missing `WIN_CSC_LINK` or `WIN_CSC_KEY_PASSWORD`

- Symptom: workflow fails at signing secret validation step.
- Fix: add the missing secret(s) to Environment `release` and rerun.

### Invalid certificate password

- Symptom: packaging/signing fails during electron-builder signing stage.
- Fix: correct `WIN_CSC_KEY_PASSWORD`; rerun workflow.

### Timestamp/signing endpoint issues

- Symptom: signing fails intermittently with TSA errors.
- Fix: set or replace `WIN_CSC_TSA_URL` in Environment `release`.

### Artifact/version mismatch

- Symptom: assert step fails with version mismatch.
- Fix: use semver tag matching intended release version and rerun from corrected tag.

### Multiple executables in `release/`

- Symptom: assert step fails because count is not exactly one.
- Fix: review build script/workflow changes and ensure only one portable artifact is produced.
