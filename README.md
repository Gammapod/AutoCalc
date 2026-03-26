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

`npm run build` is the fast/safe local build (app runtime only; no Itch zip).
`npm run build:web:incremental` is the fastest local rebuild path (no clean; may leave stale files after renames/deletes).

Build generates progression graph reports:

- `dist/reports/unlock-graph-report.md`
- `dist/reports/unlock-graph-report.json`
- `dist/reports/unlock-graph-report.mmd`

### Unlock Graph Sufficiency Contract

Unlock graph reporting uses author-declared sufficiency metadata in `src/domain/unlockGraph.ts`.

- Each unlock definition declares `sufficientKeySets`, where the first set is canonical for graphing/reporting.
- `sufficientKeySets` supports sufficiency tokens (currently: `digit_nonzero` => any of `digit_1..digit_9`).
- Execution keys (for example `exec_equals`) are not listed in `sufficientKeySets`; execution availability is implicit.
- Graph nodes include `key` nodes and unlock target nodes.
- Graph edges are direct `unlocks` edges (`sourceKey -> targetNode`) emitted from canonical sufficiency sets.
- Structural validation is strict (non-empty sufficiency, known keys, valid target ids); invalid rows are listed in diagnostics.

When adding or editing function unlock logic:

1. Update unlock definition sufficiency sets (`sufficientKeySets`) and any related unlock metadata.
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

- Default behavior: auto-detects runtime (desktop shell on desktop-like browsers, mobile shell on mobile-like browsers).
- Shell mode resolution order:
  1. Query param override (`?ui=mobile|desktop`)
  2. Build/runtime env target `UI_SHELL_TARGET`
  3. Runtime auto-detection fallback (desktop/mobile)
  4. Safe fallback (`mobile`)
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

Code health scorecard (0-100) with CI enforcement:

```bash
npm run ci:health
```

Standards:

- `perfection`: `>=95` and all hard gates pass
- `good-enough`: `>=80` and all hard gates pass (default CI gate)
- `hackathon`: `>=60`

Current weighted dimensions:

- build success (15)
- test pass rate (25)
- dependency boundaries (15)
- UI complexity gate (10)
- test density proxy (10)
- type discipline via `@ts-nocheck` usage (10)
- documentation coverage (10)
- debt marker density (`TODO`/`FIXME`/`HACK`) (5)

The score report is written to `dist/reports/code-health-score.json`.

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
Browser-hosted play auto-selects desktop/mobile shell unless explicitly overridden with `?ui=desktop` or `?ui=mobile`.

Release build (verify + package):

```bash
npm run release:win:portable
```

Optional explicit release packaging commands:

```bash
npm run build:release
npm run build:desktop:release
```

Type-checking modes:

- Daily local compile: `npm run build` (`src/**` only)
- Full compile (includes tests): `npm run build:web:full`
- Fast incremental app rebuild (no clean): `npm run build:web:incremental`

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

## Itch Auto-Publish (Web + Download)

Tag-driven Itch pipeline:

- Push a tag in strict semver format: `vX.Y.Z` or `vX.Y.Z-prerelease`
- Workflow `release-itch.yml` runs verification, builds:
  - web-playable Itch zip (`release/AutoCalc_itch_v<major>_<minor>_<patch>.zip`)
  - downloadable Windows portable exe (`release/AutoCalc-<version>-win-x64-portable.exe`)
- Workflow installs Butler and pushes both artifacts to Itch channels
- Execution is gated by GitHub `release` Environment approval policy

Required `release` Environment secrets:

- `ITCH_BUTLER_API_KEY`
- `ITCH_TARGET` (`username/game-name`)

Optional channel variables (defaults shown):

- `ITCH_CHANNEL_WEB` (`html5`)
- `ITCH_CHANNEL_WINDOWS` (`windows`)

See `docs/release-itch.md` for full setup and operational runbook.

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
