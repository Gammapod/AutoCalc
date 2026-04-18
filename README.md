# AutoCalc

AutoCalc is a calculator-first progression game. The calculator itself is the ruleset: unlocked keys define what actions are possible, `=` executes operation slots left-to-right, and progression is earned by satisfying behavior-based unlock conditions.

For implementation and documentation touchpoints, see `docs/code-map.md`.

## Local Play

Run the local build and serve commands from the `NPM Commands` section, then open:

`http://localhost:4173/index.html`

## UI Shell Modes (mobile + desktop)

The app supports explicit shell targets in parallel:

- Default behavior auto-detects runtime (desktop shell on desktop-like browsers, mobile shell on mobile-like browsers).
- Shell mode resolution order:
  1. Query param override (`?ui=mobile|desktop`)
  2. Build/runtime environment target (`UI_SHELL_TARGET`)
  3. Runtime auto-detection fallback (desktop/mobile)
  4. Safe fallback (`mobile`)
- Query param overrides (recommended for local testing):
  - mobile shell: `http://localhost:4173/index.html?ui=mobile`
  - desktop shell: `http://localhost:4173/index.html?ui=desktop`

In browser devtools, verify active shell via body attribute:

- `data-ui-shell="mobile"` for mobile shell
- `data-ui-shell="desktop"` for desktop shell

## Mobile Shell Manual Checklist

With `?ui=mobile`:

1. Confirm default snap is middle (display + keypad).
2. Toggle `GRAPH` on and verify top snap becomes available.
3. Unlock/show storage and verify bottom snap becomes available.
4. Swipe vertically and confirm snaps only move to adjacent valid views.
5. In storage view, scroll drawer content and confirm it scrolls first; snap handoff occurs at top/bottom boundaries.
6. Open right menu with right-edge swipe and close via right swipe, `Menu` button, and `Esc`.
7. Switch menu modules (`Allocator`, `Checklist`) and verify calculator state is unchanged.
8. Use fallback `Up/Down/Menu` controls and verify disabled states at boundaries.

## Release Summary

- Windows portable releases and Itch publishing are tag-driven and environment-gated.
- Android APK release is sideload-first and can be run by tag or manual dispatch when enabled.
- Operational runbooks and workflow paths are indexed in the code map.

## Next Steps

1. Add integration-style DOM tests for pointer gesture edge cases (right-edge open zone, storage boundary handoff).
2. Add a small in-app dev indicator for active snap id to accelerate manual QA.
3. Harden desktop/tablet CSS tuning for wider viewports while keeping current interaction model.
4. Continue mobile-first key-management redesign (replace drag-heavy interactions).
5. Continue desktop/mobile shell refinement while preserving behavior parity.

## NPM Commands

### Core Build

```bash
npm install
npm run build
npm run build:web:incremental
npm run build:web:full
```

Notes:

- `npm run build` is the fast/safe local build (app runtime only; no Itch zip).
- `npm run build:web:incremental` is the fastest rebuild path (no clean; may leave stale files after renames/deletes).
- `npm run build:web:full` includes full compile coverage (including tests).

### Local Serve

```bash
npm run dev:serve
```

### Test and CI Checks

```bash
npm test
npm run ci:health
npm run ci:verify:ux-semantics
npm run ci:verify:release-notes
```

Code health scorecard standards:

- `perfection`: `>=95` and all hard gates pass
- `good-enough`: `>=80` and all hard gates pass (default CI gate)
- `hackathon`: `>=60`

### Desktop Build and Packaging

```bash
npm run build:desktop
npm run release:win:portable
npm run build:release
npm run build:desktop:release
```

### Android Build

```bash
npm run build:mobile:webassets
npm run mobile:android:sync
npm run build:android:apk
```
