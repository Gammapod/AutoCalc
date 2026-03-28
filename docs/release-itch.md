Truth 2: Runbook
# Itch Release Runbook

This runbook covers automatic Itch uploads for web-playable and downloadable artifacts.
For shared pipeline rules (triggers, tag semantics, approvals, and drift policy), see `docs/ci-cd-pipeline.md`.

## Scope

- Artifact type (web): Itch-compatible zip (`AutoCalc_itch_v*.zip`)
- Artifact type (downloadable): Windows portable `.exe`
- Distribution channel: Itch via Butler
- Workflow: `.github/workflows/release-win-portable.yml` (job: `release-itch`)

## One-time setup (Itch-specific)

### 1. Create/confirm Itch channels

Recommended default channel names:

- `html5` for web-playable archive
- `windows` for downloadable Windows build

### 2. Configure GitHub `release` Environment secrets

Add these secrets in Environment `release`:

- `ITCH_BUTLER_API_KEY`: Butler API key from Itch account settings
- `ITCH_TARGET`: Itch target in `username/game-name` format

### 3. Optional GitHub repository variables

Set these repository/environment vars only if you want non-default channels:

- `ITCH_CHANNEL_WEB` (default: `html5`)
- `ITCH_CHANNEL_WINDOWS` (default: `windows`)

## Release flow

1. Ensure enough `Now` slices are complete and target commit is ready.
2. Cut a ready train by pushing a semver tag:

```bash
git tag vX.Y.Z
git push <remote> vX.Y.Z
```

3. Approve the `release` environment when prompted.
4. Workflow builds and pushes:
   - `release/AutoCalc_itch_v<major>_<minor>_<patch>.zip` to `$ITCH_TARGET:$ITCH_CHANNEL_WEB`
   - `release/AutoCalc-<version>-win-x64-portable.exe` to `$ITCH_TARGET:$ITCH_CHANNEL_WINDOWS` (reused from the Windows release job artifact)

## Notes

- Butler setup is prepared in a parallel job (`prepare-butler`) and consumed by the Itch publish job.
- The Itch job does not rebuild the Windows executable; it consumes the artifact produced by `release-win-portable`.
- `package.json` version is aligned to tag version in-workflow.
