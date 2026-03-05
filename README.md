# AutoCalc

AutoCalc is a calculator-first progression game. The calculator itself is the ruleset: unlocked keys define what actions are possible, `=` executes operation slots left-to-right, and progression is earned by satisfying behavior-based unlock conditions.

## Project Structure

- `src/`: current v1 runtime (domain, UI, persistence, app bootstrap)
- `tests/`: TypeScript test suite
- `design_refs/`: high-level design, UI spec, and implementation contract
- `dist/`: compiled JavaScript output from TypeScript builds

## Build

```bash
npm install
npm run build
```

Build also generates progression graph reports:

- `dist/reports/unlock-graph-report.md`
- `dist/reports/unlock-graph-report.json`
- `dist/reports/unlock-graph-report.mmd`
- `dist/reports/unlock-graph-report.incoming-unlock-keys.mmd`

### Unlock Graph Sufficiency Contract

Unlock graph function logic is modeled as sufficiency metadata in `src/domain/unlockGraph.ts`.

- `necessary` edge: a key is part of a multi-key sufficient clause (key -> sufficient_set).
- `sufficient` edge: a key or sufficient_set is enough to satisfy a function clause.
- `requires` edge: a condition depends on a function.
- `unlocks` edge: a condition unlocks a key.

For multi-key clauses, the graph emits synthetic `sufficient_set` nodes (`set.{functionId}.{index}`).

When adding or editing function unlock logic:

1. Update the sufficiency clauses in `unlockGraph.ts` (source of truth).
2. Rebuild reports and verify `unlock-graph-report.json` and `unlock-graph-report.mmd`.
3. Run `npm test`.

## Play (Local)

```bash
npm run build
npm run dev:serve
```

Then open: `http://localhost:4173/index.html`

### UI Shell Modes (mobile + desktop)

The app now supports explicit shell targets in parallel:

- Default behavior: uses mobile shell.
- Shell mode resolution order:
  1. Query param override (`?ui=mobile|desktop`)
  2. Build/runtime env target `UI_SHELL_TARGET`
  3. Default fallback (`mobile`)
- Env override:
  - `UI_SHELL_TARGET=mobile|desktop`
- Query param overrides (recommended for local testing):
  - mobile shell: `http://localhost:4173/index.html?ui=mobile`
  - desktop shell: `http://localhost:4173/index.html?ui=desktop`

In browser devtools, verify active shell via body attribute:

- `data-ui-shell="mobile"` for mobile shell
- `data-ui-shell="desktop"` for desktop shell

### Mobile Shell Manual Test Checklist

With `?ui=mobile`:

1. Confirm default snap is middle (display + keypad).
2. Toggle `GRAPH` on and verify top snap becomes available.
3. Unlock/show storage and verify bottom snap becomes available.
4. Swipe vertically and confirm snaps only move to adjacent valid views.
5. In storage view, scroll drawer content and confirm it scrolls first; snap handoff occurs at top/bottom boundaries.
6. Open right menu with right-edge swipe and close via right swipe, `Menu` button, and `Esc`.
7. Switch menu modules (`Allocator`, `Checklist`) and verify calculator state is unchanged.
8. Use fallback `Up/Down/Menu` controls and verify disabled states at boundaries.

## Test

```bash
npm test
```

Includes dedicated shell tests:

- `ui-shell/snap-availability`
- `ui-shell/snap-selection`
- `ui-shell/gesture-arbitration`
- `ui-shell/right-menu`
- `ui-shell/fallback-controls`

## Next Steps

1. Add integration-style DOM tests for pointer gesture edge cases (right-edge open zone, storage boundary handoff).
2. Add a small in-app dev indicator for active snap id to accelerate manual QA.
3. Harden desktop/tablet CSS tuning for wider viewports while keeping current interaction model.
4. Continue mobile-first key-management redesign (replace drag-heavy interactions).
5. Continue desktop/mobile shell refinement while preserving behavior parity.

## Windows Portable EXE

Build a Windows portable executable (no installer):

```bash
npm run build:desktop
```

Portable `.exe` runtime defaults to desktop shell (`?ui=desktop` at Electron entrypoint).
Browser-hosted play defaults to mobile shell unless `?ui=desktop` is explicitly provided.

Release build (verify + package):

```bash
npm run release:win:portable
```

Tag-driven GitHub release pipeline:

- Push a tag in strict semver format: `vX.Y.Z` or `vX.Y.Z-prerelease` (example `v0.1.1` or `v0.1.1-rc.1`)
- Workflow `release-win-portable.yml` runs preflight validation, tests, signing, packaging, artifact assertions, and release publishing
- Canonical outputs:
  - `release/AutoCalc-<version>-win-x64-portable.exe`
  - `release/AutoCalc-<version>-win-x64-portable.exe.sha256`
- Publishing is gated by the GitHub `release` Environment approval policy

Release prerequisites (GitHub Environment `release` secrets):

- `WIN_CSC_LINK` (Base64-encoded PFX or secure certificate link)
- `WIN_CSC_KEY_PASSWORD`
- Optional `WIN_CSC_TSA_URL`

Release command sequence:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

See `docs/release-windows.md` for full operational runbook and troubleshooting.

## Android APK (Sideload First)

Build mobile web assets + sync Capacitor Android + assemble release APK:

```bash
npm run build:android:apk
```

Intermediate commands:

```bash
npm run build:mobile:webassets
npm run mobile:android:sync
```

CI workflow: `.github/workflows/release-android-apk.yml`  
Runbook: `docs/release-android.md`
