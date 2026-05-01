Truth: 2 - Runbook
# CI/CD Pipeline Contract

This is the canonical source of truth for AutoCalc GitHub Actions release pipeline behavior.

## Workflow matrix

| Workflow | File | Triggers | Runner | Environment gate | Primary outputs | Publication target |
| --- | --- | --- | --- | --- | --- | --- |
| Release Windows + Itch | `.github/workflows/release-win-portable.yml` | `push` tags `v*` | `windows-latest` | `release` | `release/*.exe`, `release/*.exe.sha256`, `release/AutoCalc_itch_v*.zip` | GitHub Releases + Itch channels via Butler |
| Release Android APK | `.github/workflows/release-android-apk.yml` | `push` tags `v*`, `workflow_dispatch` | `ubuntu-latest` | `release` | `app-release.apk`, `app-release.apk.sha256` | GitHub Actions artifacts |

## Cross-workflow invariants

- Tags intended for release should be `vMAJOR.MINOR.PATCH` or `vMAJOR.MINOR.PATCH-prerelease`.
- All release jobs are gated by GitHub Environment `release` and may require manual approval based on environment rules.
- `Release Windows + Itch` publishes GitHub Release assets and pushes Itch channels in the same workflow run.
- `Release Android APK` does not publish a GitHub Release; it uploads artifacts to the workflow run.
- Android release job execution is feature-gated via variable `ENABLE_ANDROID_RELEASE`.
- Release workflows align package versioning from tag/version metadata before packaging.

## Standard release flow

1. Confirm enough `Now` slices are complete and target commit on `main` is release-ready.
2. Cut a ready train by creating and pushing a semver tag:

```bash
git tag vX.Y.Z
git push <remote> vX.Y.Z
```

3. Confirm expected workflows start in GitHub Actions.
4. Approve `release` environment jobs when prompted.
5. Validate final artifacts in GitHub Releases, Itch channels, or workflow artifacts (depends on workflow).

## Known gotchas

### Tag exists remotely but no workflow run created

- Symptom: the tag is visible on GitHub but no `push`-event run appears.
- Common cause: the ref was created by a path that did not emit a qualifying tag push event.
- Remediation: recreate and push the tag through git transport:

```bash
git push <remote> :refs/tags/vX.Y.Z
git push <remote> vX.Y.Z
```

### Trigger glob is broader than semver validation

- All workflows listen to `v*`.
- Windows and Itch jobs enforce semver regex checks at runtime.
- Result: non-semver tags starting with `v` can start runs and then fail preflight.

### Manual dispatch is not uniform

- `Release Android APK` supports `workflow_dispatch`.
- `Release Windows + Itch` currently does not.

## Drift guard for PRs

When changing workflow files, update this doc and affected runbooks in the same PR if any of these changed:

- Trigger events or tag filters
- Runner OS or major toolchain versions
- Environment gates or required approval flow
- Required secrets/variables
- Artifact names, output locations, or publication targets
