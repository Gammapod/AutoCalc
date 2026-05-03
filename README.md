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

### Headless Runtime

```bash
npm run build:web:full
npm run headless:run -- --unlock-all --press=digit_1,op_add
npm --silent run headless:run -- --interactive --mode=game
```

The headless runner executes real runtime actions in Node and prints read-model/UI-effect snapshots for agent-driven smoke tests.
Interactive mode reads one JSON command per stdin line and writes one JSON response per stdout line. Use `cmd` as the command field, for example:

```jsonl
{"cmd":"help"}
{"cmd":"listKeys"}
{"cmd":"listKeys","all":true,"filter":"digit"}
{"cmd":"hints"}
{"cmd":"unlockAll"}
{"cmd":"listKeys","filter":"op_add"}
{"cmd":"listCalculators"}
{"cmd":"setActiveCalculator","calculatorId":"g_prime"}
{"cmd":"layout","surface":"storage","filter":"op_add"}
{"cmd":"layout","surface":"keypad","includeEmpty":true}
{"cmd":"install","key":"op_div","destination":{"surface":"keypad","index":2}}
{"cmd":"drop","source":{"surface":"storage","index":14},"destination":{"surface":"keypad","index":2}}
{"cmd":"press","key":"digit_1"}
{"cmd":"press","key":"exec_equals"}
{"cmd":"run","maxTicks":100,"stopWhenIdle":true}
{"cmd":"tick"}
{"cmd":"snapshot","includeState":true,"calculatorId":"f_prime"}
{"cmd":"exit"}
```

`press` follows installed keypad button semantics; a locked installed key reports `accepted:false` and `reasonCode:"locked"`, while an unlocked key that is only in storage reports `accepted:false` and `reasonCode:"not_installed"`. `listKeys` returns currently usable keys by default; pass `all:true` to include locked catalog keys with capability, catalog metadata, conservative `maturity`, `installable`, location, drop-ready `positions`, `installedOnKeypad`, and `pressable` metadata. Maturity is intentionally conservative: keys installed on at least one initial sandbox calculator are `fully_implemented`, initial sandbox storage-only keys are `experimental`, non-storage/non-installed keys are `deferred`, and unavailable constants are `unavailable`.

Use `hints` to inspect eligible progression rows from canonical unlock hint/progress projection plus human-facing unlock description and effect metadata. Use `listCalculators` and `setActiveCalculator` for sandbox multi-calculator discovery; `snapshot` accepts `calculatorId` to project a non-active calculator without switching and includes `projectedCalculatorId` when scoped. Compact snapshots expose public `settings` (`visualizer`, `wrapper`, `base`, `stepExpansion`, `history`, `forecast`, `cycle`) and `inputLimits:{seedDigitCount:1,operandDigitCount:1}`. Single-digit seed and operand replacement feedback is reported on accepted digit presses with `replacement` metadata.

Use `layout` to inspect compact indexed keypad/storage cells before issuing `drop`; pass `includeEmpty:true` to find open keypad destinations. `drop` reports whether the user action was accepted; invalid/no-op drops return `ok:true`, `accepted:false`, and `reasonCode:"layout_invalid_or_noop"`. `install` directly installs a portable unlocked key onto a keypad destination without requiring a storage source and can reject with `key_unavailable`, `not_portable`, `destination_invalid`, or `duplicate_installed`. `unlockAll` returns a terse "all keys unlocked" result by default while suppressing verbose diffs and unlock snapshots; pass `verbose:true` to include full unlock details. Debug/setup commands such as `unlockAll` and state hydration mutate unlock state without emitting player-facing `unlock_completed` feedback. Use `drop` to mirror frontend drag/drop key movement, `run` for deterministic execution ticks, and `action` to dispatch a raw runtime action. Undo pops roll rows but intentionally preserves the current function draft; use backspace or `C` to clear builder input.
Use `npm --silent` or call `node ./dist/src/app/headlessCli.js --interactive` directly when a caller needs JSON-only stdout.

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
