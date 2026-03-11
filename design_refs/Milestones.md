# Path to v0.7.0

Last updated: 2026-03-11  
Scope: Forward-looking roadmap for the v0.7.0 pivot.  
Note: Existing design refs remain unchanged; this document defines the new direction.

## Pivot Summary

v0.7.0 pivots AutoCalc toward integer-first number theory gameplay.

- Algebraic-expression expansion (and related constants/functions such as `pi`, `e`, `i`, `ln`, trig) is put on hold for this release cycle.
- Progression focus shifts to integer/rational transformations and number-theory insight.
- Roll output should become richer by capturing factorization context for results.
- Unlock UX shifts from a separate checklist panel to in-calculator contextual hints.

## Milestone 1: Function Definition Refactor (Done - 2026-03-10)

Goal: establish a new function model before introducing additional operators.

### Direction

- Relabel existing slot operators (`+`, `-`, `*`, `/`, `#`, `⟡`) as `binary operators`.
- Relabel value-expression transforms (currently `NEG` / `-n`) as `unary operators`.
- Redefine `++` and `--` as unary operators.
- Re-implement unary operator handling so unary inputs are converted into operator-operand slot entries instead of direct execution or direct digit/total mutation.

### Unary Conversion Rules

- `++` enters `[ + 1 ]`.
- `--` enters `[ - 1 ]`.
- `-n` enters `[ * -1 ]`.

### Behavioral Contract

- Unary operators do not alter already-entered digits.
- Unary operators do not execute immediately.
- Unary operators do not append to roll by themselves.
- Unary operators only stage operation-slot input (operator + operand pair), then normal execution flow (`=`) handles evaluation and roll effects.

### Exit Criteria

- Type/key taxonomy updated to represent `binary operators` and `unary operators`.
- `NEG`, `++`, and `--` all follow the new unary staging path.
- Existing binary operators preserve behavior.
- Tests cover unary-to-slot conversion and ensure no direct execution/roll side effects on unary keypress.

### Completion Note

- Implemented with `-n` as the `NEG` equivalent.
- Unary staging rules are active: `++ -> [ + 1 ]`, `-- -> [ - 1 ]`, `-n -> [ * -1 ]`.
- Milestone 1 behavior and test criteria are satisfied.
- Later consolidated by Milestone 2 into true unary slots (`[ ++ ]`, `[ −− ]`, `[ ± ]`) with immediate unary slot commit.

## Milestone 2: New Operators (Done - 2026-03-11)

Goal: introduce a first wave of integer-focused operations and key behaviors.

### Direction

- Add new math actions split across:
- operator-slot keys (participate in drafted operation chains), and
- unary/execution-style keys (apply directly to current total).
- Keep behavior deterministic and compatible with existing overflow/error rules.
- Prioritize integer-domain semantics for values under `10^12` while preserving rational handling where needed.

### Implemented Operation Set

- Binary: `↺` (rotate digits), `⩑` (GCD), `⩒` (LCM).
- Unary: `++`, `--`, `-n`/`±`, `σ`, `φ`, `Ω`.
- Integer-domain policy implemented for number-theory operators with NaN/error behavior on invalid inputs (including zero policy for `σ`, `φ`, `Ω`).

### Exit Criteria

- Key taxonomy updated to support both operator and unary/execution placement for new functions.
- Reducer/engine behavior implemented with test coverage for edge cases (`0`, negatives, boundaries, overflow).
- Unlock predicates/effects updated so new keys integrate into progression without checklist dependency.

### Completion Note

- Implemented true unary slots (`[ op ]`) with immediate unary commit semantics.
- Added integer-focused operators: `↺`, `⩑`, `⩒`, `σ`, `φ`, `Ω`, plus unary display updates for `++`, `−−`, `±`.
- Completed capability/spec analysis tightening (Option 2): unary-aware capability model, `unary_slot_commit`, and concrete specs for all predicate types (no TODO stubs).

## Milestone 3: New Visualizer (Done - 2026-03-10)

Goal: add a number-theory visualizer centered on factorization and integer properties.

### Direction

- Visualizer should surface:
- prime factorization for integer roll outputs,
- numerator/denominator prime factorizations for rational outputs,
- related number-theory properties (as scoped during implementation).
- Treat this as an insight tool that supports future unlock discovery and operator learning.

### Data Model Expectations

- Roll derivation should compute/store factorization metadata for each roll entry where defined.
- Integer `0` handling should be explicit (factorization undefined/special-cased).
- Rational signs and denominator normalization should be consistently represented.

### Exit Criteria

- New visualizer module registered and toggleable like existing visualizers.
- Read model exposes stable factorization payloads.
- Rendering handles normal, error, and non-factorable cases without UI regressions.

### Completion Note

- Added new visualizer key and panel (`𝚷𝑝^𝑒`, displayed as `𝚷𝑝ᵉ`).
- Factorization payload is now persisted on roll entries and backfilled on load for older schema saves.
- Visualizer renders factorization from stored roll payload with explicit non-factorable placeholder handling.
- Current UX variant shows only the most recent roll entry factorization (latest-only view).

# Post-v0.7.0

## Milestone 4: Replace Checklist

Goal: remove checklist-first progression UX and replace it with contextual hints inside the calculator experience.

### Direction

- De-emphasize or remove standalone checklist panel from primary progression flow.
- Show unlock-condition hints on/near relevant calculator surfaces and controls.
- Hint style should vary by predicate type (examples: key press counts, roll sequence targets, total thresholds, error-observation goals).

### Design Constraints

- Preserve existing progression correctness in domain logic; this is a presentation/interaction shift, not a rule simplification.
- Keep hints understandable without requiring external panel scanning.
- Avoid overwhelming players; reveal only actionable or near-term hint context.

### Exit Criteria

- Checklist panel removed from active UX path.
- Predicate-to-hint mapping defined for current unlock catalog.
- UI and behavior tests updated for hint rendering and checklist removal.

## Milestone 5: Visualizer Fit Contract

Goal: enforce a minimum visualizer window contract so every visualizer layout is guaranteed to render fully inside bounded dimensions.

### Direction

- Introduce global visualizer window constraints (minimum width + fixed/contracted height tokens).
- Define per-visualizer safe-area layout budgets (title/body/footer or equivalent regions).
- Require panel-specific overflow policies:
- text-based visualizers wrap within bounds (no horizontal clipping/scroll),
- plot-based visualizers scale/clip to viewport bounds deterministically.
- Add shared host/module contract hooks so each visualizer declares and follows a fit strategy.

### Test/Validation Strategy

- Add contract-level tests for structure/class/overflow policy enforcement in current CI stack.
- Add optional runtime diagnostics (dev-only) to warn on out-of-bounds rendering.
- Defer strict pixel-fit validation (real browser metrics) until UX-polish phase test harness is introduced.

### Complexity Note

- Estimated complexity: **7.5-8.5 / 10** (higher than Milestone 3 due to cross-visualizer refactor scope).

### Exit Criteria

- Minimum visualizer window tokens are defined and consumed by all visualizer panels.
- Each visualizer module declares a fit strategy and renders within host contract bounds.
- Horizontal clipping/overflow is prevented by design for text panels.
- Contract tests cover all registered visualizers for fit-policy compliance.

## Cross-Milestone Guardrails

- Existing docs remain as historical/current-state references until superseded later.
- Prioritize backward-safe changes to persistence and migrations.
- Maintain reducer parity and deterministic execution semantics across shells.
- Keep contract tests current as source of truth during the transition.
