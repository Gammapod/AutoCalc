# UI Domain Contract

Status: Reference only (non-authoritative).
Authoritative sources: `docs/ux-spec.md`, `docs/functional-spec.md`.

## Shared Invariants

The following must remain equivalent across mobile and desktop shells:

1. Reducer outcomes for the same `Action` sequence.
2. Unlock progression behavior and completion state transitions.
3. Layout movement/swap validity constraints.
4. Persistence schema behavior (save/load/migration outcomes).
5. Execution-gated rejected inputs are non-mutating and parity-equivalent across dispatch paths.

## Allowed Divergence

The following may diverge by platform:

1. Layout composition and panel hierarchy.
2. Input modality and gestures.
3. Visual design and density.

Platform divergence is allowed only if shared invariants stay intact.

## Parity Acceptance Rules

1. New shell interaction code must emit domain `Action` sequences that produce equivalent state outcomes.
2. Command/state parity tests are release-blocking.
3. Contract tests should assert emitted actions and reducer state outcomes, not pixel parity.

## Visualizer Contract

The visualizer surface is governed by these invariants:

1. UI key interactions for `GRAPH`, `FEED`, and `CIRCLE` emit `TOGGLE_VISUALIZER` actions only.
2. Visualizer selection is enforced in domain state via `ui.activeVisualizer`.
3. Visualizer host resolves exactly one active panel from `ui.activeVisualizer`, defaulting to `total` if unsupported.
4. Inactive visualizer modules must clear their DOM state during host render to avoid stale panel artifacts.
5. Mobile and desktop shells may vary in layout framing, but must share visualizer action/state outcomes.

## Key Visual Affordance Contract

These UX-owned visual invariants are cross-shell parity constraints and are not optional style variants:

1. Visualizer keys render in the unified `settings` key visual family on keypad and storage surfaces.
2. Settings subgroup stripe accents are bottom-aligned and use LED semantics: darkened when untoggled, bright when toggled.
3. Binary operator accent treatment applies only to binary operators and excludes unary operators.
4. Binary operator accent geometry is a bottom-right corner triangle with width-independent 45-degree diagonal.
5. Binary corner accent should track default keycap white gradient treatment, including active-state inversion.

Platform-specific visual divergence is allowed only outside these constraints.

## Test Contract Categories

1. `contracts/ui-domain`: contract definition sanity checks.
2. `contracts/action-event-current`: current action/event contract symmetry.
3. `contracts/domain-ui-effects-current`: domain dispatch to UI effect intent contracts.
4. `contracts/catalog-canonical-guard`: canonical key/catalog/unlock contract guard.
5. `contracts/no-legacy-symbols-guard`: guard against reintroduction of retired legacy symbols in active surfaces.

## Visualizer-Specific Test Coverage

1. Graph/feed key action emission remains covered by `contracts/ui-action-emission`.
2. Visualizer host active-panel selection and precedence is covered in `uiModule.visualizerHost.v2`.
3. Graph model helpers (`points`, `x-window`, `y-window`, renderability) are covered by `graphDisplay`.
4. Feed roll view-model behavior and graph/feed precedence is covered by `rollDisplay`.

## Key Visual Affordance Test Coverage

1. Unified settings-family class behavior for visualizer keys is covered by `ui-module/calculator-keypad-render` and `ui-module/storage-v2`.
2. Settings stripe LED-state and placement constraints are covered by `ui/visualizer-fit-contract`.
3. Binary-only corner accent scope and geometry constraints are covered by `ui/visualizer-fit-contract` with selector and token contract assertions.

## Layer Boundary Hardening

These import boundaries are CI-enforced by dependency-cruiser:

1. `src/domain` must not import `src/ui`, `src/app`, or `src/content`.
2. `src/ui` must not import `src/app`.
3. `src/contracts` must not import `src/content`, `src/app`, `src/ui`, or `src/infra`.
4. `src/content` must not import `src/ui`, `src/app`, or `src/infra`.

Violation snapshots are written to `dist/reports/boundary-violations.json` during `ci:verify:boundaries`.
