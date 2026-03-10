# Path to v0.7.0

Last updated: 2026-03-10  
Scope: Forward-looking roadmap for the v0.7.0 pivot.  
Note: Existing design refs remain unchanged; this document defines the new direction.

## Pivot Summary

v0.7.0 pivots AutoCalc toward integer-first number theory gameplay.

- Algebraic-expression expansion (and related constants/functions such as `pi`, `e`, `i`, `ln`, trig) is put on hold for this release cycle.
- Progression focus shifts to integer/rational transformations and number-theory insight.
- Roll output should become richer by capturing factorization context for results.
- Unlock UX shifts from a separate checklist panel to in-calculator contextual hints.

## Milestone 1: Function Definition Refactor

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

## Milestone 2: New Operators

Goal: introduce a first wave of integer-focused operations and key behaviors.

### Direction

- Add new math actions split across:
- operator-slot keys (participate in drafted operation chains), and
- unary/execution-style keys (apply directly to current total).
- Keep behavior deterministic and compatible with existing overflow/error rules.
- Prioritize integer-domain semantics for values under `10^12` while preserving rational handling where needed.

### Candidate Operation Set

- Digit transforms: shift-left, reverse-digits, sort-digits.
- Digit reductions: digit-sum, digit-square-sum.
- Integer dynamics: Collatz step.
- Prime navigation: next-prime, previous-prime.
- Number-theory transform: divisor-count.

### Complexity Notes (from current review)

- Low: shift-left, reverse-digits, sort-digits, digit-sum, digit-square-sum.
- Medium: Collatz, divisor-count.
- Medium-high: next/previous-prime.

### Exit Criteria

- Key taxonomy updated to support both operator and unary/execution placement for new functions.
- Reducer/engine behavior implemented with test coverage for edge cases (`0`, negatives, boundaries, overflow).
- Unlock predicates/effects updated so new keys integrate into progression without checklist dependency.

## Milestone 3: New Visualizer

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

- Checklist panel removed from active UX path for v0.7.0.
- Predicate-to-hint mapping defined for current unlock catalog.
- UI and behavior tests updated for hint rendering and checklist removal.

## Cross-Milestone Guardrails

- Existing docs remain as historical/current-state references until superseded later.
- Prioritize backward-safe changes to persistence and migrations.
- Maintain reducer parity and deterministic execution semantics across shells.
- Keep contract tests current as source of truth during the transition.
