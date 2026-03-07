# UI Parity Checklist (Phase 1 Baseline)

Purpose: functional parity gate before and after removing `src -> src/ui` runtime dependencies.

## Environment

1. Build: `npm run build:web`
2. Serve: `npm run dev:serve`
3. Test URLs:
4. `http://localhost:4173/index.html?ui=legacy`
5. `http://localhost:4173/index.html?ui=mobile`

## Pass/Fail Matrix

1. Calculator execution parity:
2. Press digits/operators/`=` and verify same totals and slot display.
3. `C`, `CE`, `UNDO`, `NEG`, `++` behavior matches.
4. Roll rendering parity:
5. Roll rows, prefixes, remainder rows, and error rows match by scenario.
6. Keypad/storage layout parity:
7. Move/swap keys between keypad and storage; valid/invalid targets match behavior.
8. Storage unlock gating parity:
9. Storage visibility follows unlock state with no runtime errors.
10. Visualizer parity:
11. `GRAPH` and `FEED` toggles show/hide the expected v2 host panels.
12. Checklist parity:
13. Attemptable/completed unlock rows match expected visibility ordering.
14. Allocator mode transition parity:
15. Calculator/modify mode transitions still gate input as expected.

## Automated Gate

1. `npm test` must pass.
2. `v2/import-boundary` test must pass.
3. No `src` file imports `src/ui/*`.

## Signoff

1. Date:
2. Build SHA:
3. Reviewer:
4. Result: Pass / Fail
