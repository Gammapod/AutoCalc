# Release v0.8.1 (Shipped 2026-03-14)

## Milestone: Independent Display + Keying Changes

Goal: ship independent feature work (visualizer semantics/layout, CE removal, function-slot display rework) without introducing step-through execution state.

### Scope

- Feature set #1 (default visualizer behavior/layout updates).
- Feature set #4 (remove CE and standardize on C paths).
- Feature set #5 (slot display format updates plus marquee overflow behavior).
- Explicitly out of scope: feature sets #2 and #3 (reserved for v0.8.2).

### Deliverables

- Total display updates:
  - NaN shows seven-segment `Err` / `Er` / `E` based on `maxTotalDigits`.
  - Rational-with-numerator-denominator shows seven-segment `FrAC` / `FrC` / `Fr` / `F` based on `maxTotalDigits`.
  - Remainder indicator uses `r=` prefix.
  - Minus glyph moves to just left of the leftmost active digit.
  - Number-domain indicator moves to prior minus position.
  - Memory/lambda row remains visible regardless of active visualizer.
- CE removal updates:
  - `CE` key removed from key catalog/presentation/layout defaults/sandbox preset.
  - CE-specific clear-entry routing removed; clear behavior standardized on `C`.
  - Unlock catalog/effects updated so CE-specific unlock paths no longer exist.
  - Save-load migration support for legacy states that still include CE references.
- Function slot display updates:
  - Arrow separators removed.
  - Seed placeholder introduced (`_ [ _ _ ] [ _ _ ]` style).
  - Seed value replaces leading `_` when entered.
  - Overflow behavior becomes ellipsis + slow bidirectional marquee with edge pauses.

### Exit Criteria

- No runtime references to CE remain in domain keying or default layouts.
- Total panel semantics match required display strings and truncation behavior across digit capacities.
- Slot display format and marquee behavior are stable on both mobile and desktop shells.
- Persistence round-trip succeeds for both fresh v0.8.1 states and legacy pre-v0.8.1 CE-bearing saves.
- Existing reducer parity invariants remain deterministic for non-step execution flows.

### Test Matrix

- Domain:
  - Update `tests/totalDisplay.test.ts` for new NaN/fraction token semantics and indicator placement assumptions.
  - Update/remove CE assertions in:
    - `tests/keyBehavior.contract.test.ts`
    - `tests/reducer.layout.test.ts`
    - `tests/reducer.input.test.ts`
    - `tests/unlocksDisplay.test.ts`
  - Add/adjust migration assertions in `tests/persistence.test.ts` for CE-bearing legacy payload normalization.
- UI contracts:
  - Update `tests/operationSlotDisplay.test.ts` for new seed-first format and no-arrow tokens.
  - Add slot overflow/marquee behavior checks (module or integration-level).
  - Update total-panel integration checks in `tests/uiIntegration.mobileShell.test.ts` for moved minus/domain/remainder conventions.
- Parity:
  - Refresh affected fixtures in `tests/contracts/fixtures/parityGolden.ts` and dependent parity tests.

# Release v0.8.2

## Milestone: Step-Through Execution + Expansion Toggle

Goal: introduce step-wise execution (`step_through`) and per-step expansion view (`[ ??? ]`) as a coordinated execution-state upgrade.

### Scope

- Feature set #2 (new execution key `step_through` with partial execution semantics).
- Feature set #3 (new mutually exclusive settings toggle `[ ??? ]` that alters active slot rendering during step mode).

### Deliverables

- Step-through key (`step_through`) support:
  - New execution key with keyface U+25BB.
  - Press executes exactly one operation slot per invocation.
  - Intermediate substep results render inline on function display in place of executed slot body.
  - Roll is not committed until final slot execution completes.
  - `=` after partial stepping executes only remaining slots (not full restart).
  - If and only if `step_through` is present on keypad, next operation slot is rendered in white.
- Step expansion toggle (`[ ??? ]`) support:
  - New yellow settings toggle keyface `[ ??? ]`.
  - Mutually exclusive with existing settings-toggle keys.
  - Effective only when `step_through` is present and a step target exists.
  - Shows per-operator alternate expansion for current white-highlighted slot.
  - Expansion definitions are function/slot aware and operator-specific.
  - Operator expansion map includes bespoke forms for:
    - `+`, `-`, `×`, `÷`, `#`, `◇`, `↺`, `⋀`, `⋁`, `++`, `--`, `±`, `Ω`, `φ`, `σ`.
  - Symbol policy in expansion rendering:
    - subtraction operation uses `U+2013` en dash;
    - negative sign uses ASCII hyphen-minus (`-`).

### Exit Criteria

- Step execution state is deterministic, resumable, and reset correctly by clear/layout transitions.
- `=` continuation behavior after partial step execution is correct for all supported operator classes.
- White-slot highlight rules are tied to keypad presence of `step_through`, not merely unlock state.
- `[ ??? ]` toggle obeys settings mutual-exclusion rules and does not alter execution results, only rendering.
- v0.8.1 behavior remains unchanged when `step_through` is absent.

### Test Matrix

- Domain:
  - Add reducer tests for:
    - step cursor progression,
    - partial execution state transitions,
    - `=` continuation from partial state,
    - clear/reset/layout actions cancelling or normalizing step state.
  - Add execution-path tests for binary/unary/euclidean/error paths under stepped evaluation.
  - Add unlock/state typing tests for new step key and any new settings flag.
- UI contracts:
  - Add slot display tests for inline substep replacement rendering.
  - Add visual state tests for white next-slot highlighting conditioned on keypad presence of `step_through`.
  - Add toggle-render tests for `[ ??? ]` expansion switching on active step target.
- Integration/parity:
  - Add mobile/desktop interaction tests for repeated `step_through` presses and mixed `step_through` + `=` workflow.
  - Update parity fixtures and round-trip tests to include new step state and toggle flags.

# Release v0.8.5

## Milestone: Multiple Calculators

Goal: scope multi-calculator progression into implementable phases.

### Direction

- Define v1 domain model and persistence impact for more than one calculator.
- Stage rollout from read-only surfaces to one unlockable second calculator.
- Defer specialist variants until onboarding and complexity targets are validated.

### Exit Criteria

- Phase plan exists with clear boundaries and prerequisite contracts.
- v1 success metrics and risks are documented.
- Review-flag multi-calculator items are no longer undecided.

## Isolated Feature Backlog (Non-Milestone)

Purpose: track implementable, self-contained features that do not require milestone framing.

### Unary Operators

- `Collatz (Ctz)`: `n -> n / 2` when `n` is even; `n -> 3n + 1` when `n` is odd.
- `Sort asc (▂▅▇d)`: reorder decimal digits of `n` in ascending order.
- `Digit count (#d)`: return the count of decimal digits in `n`.
- `Digit sum (∑d)`: return the sum of decimal digits in `n`.
- `Digit^2 sum (∑d^2)`: return the sum of squared decimal digits in `n`.
- `Mirror digits (⇋d)`: reverse decimal digit order of `n`.
- `Distinct prime factors (ω)`: return the number of distinct prime factors of `n`.
- `Previous roll item (f_x-1)`: for current roll index `x`, return the previous item value `f_x-1`.
- `Floor (⌊ _ ⌋)`: return greatest integer less than or equal to `n`.
- `Ceiling (⌈ _ ⌉)`: return least integer greater than or equal to `n`.

### Binary Operators

- `Max (╧)`: return the larger of two operands.
- `Min (╤)`: return the smaller of two operands.
- `Specific digit (d_)`: return the digit at a specified position/index.
- `Keep leftmost n`: keep only the leftmost `n` digits; discard the rest.
- `Previous roll item (f(x-_))`: for current roll index `x`, return item value at relative offset `x-k` using second operand `k`.

### Binary Predicate Operators

- `Divides (|)`: returns 1 if left operand divides into right operand. Otherwise, 0.
- `Equals (==)`: returns 1 if two operands are equal, else 0.

### Unary Predicate Operators

- `Not (¬)` returns 1 if operand is 0, else 1.

# Release v1.0.0

## Milestone: Unlock Rule Systematization (Design)

Goal: define a regular, generalizable unlock-criteria framework for each key type so progression authoring is consistent and scalable.

### Direction

- Define per-key-type unlock rule templates (for example: value atoms, binary operators, unary operators, utilities, execution keys, visualizers, memory/allocator controls).
- Standardize criterion dimensions (difficulty bands, target shape, proof-of-understanding signals, anti-grind constraints).
- Formalize reusable predicate patterns and mapping rules from key type to allowable predicate families.
- Document exception handling policy (when custom one-off criteria are allowed and how they are justified).

### Deliverables

- A design spec that enumerates key types and their canonical unlock-rule templates.
- A predicate-template matrix showing allowed/recommended criteria patterns by key type.
- Authoring guidelines with worked examples for at least one key from each key type.
- A review checklist used to validate new unlock definitions against the framework.

### Exit Criteria

- Every current key type has documented, regular unlock-rule guidance.
- New unlock authoring can be done by applying templates rather than inventing bespoke rules.
- At least one full pass over current unlock catalog confirms criteria can be classified against the new framework.
- Milestone is considered Done when regular, generalizable rules for unlock criteria exist for each key type.

## Milestone: Consolidated UX Policy

Goal: unify color/interaction language into a current-state plus target-state UX policy.

### Direction

- Capture currently implemented visual semantics separately from proposed language.
- Remove unresolved placeholders from active guidelines and track as planned work.
- Ensure policy terms are consistent across UX and game design docs.

### Exit Criteria

- UX policy distinguishes implemented vs planned semantics clearly.
- Conflicting or duplicate color/meaning rules are removed.
- Review-flag UX-language items are resolved or retired.

## Milestone: Replace Checklist

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

## Milestone: Consolidated Mobile/Desktop Parity UI Policy

Goal: convert directional shell sizing guidance into one testable policy for mobile and desktop behavior.

### Direction

- Define a single policy doc for cross-shell sizing rules and constraints.
- Separate "current implementation" statements from "target state" statements.
- Convert accepted target rules into measurable UI acceptance criteria.

### Exit Criteria

- A single mobile/desktop policy exists with unambiguous current vs target labels.
- All accepted target rules have corresponding test or verification criteria.
- Superseded policy fragments are removed from archived docs and review backlog.

## Milestone: Consolidated Visualizer Policy

Goal: define a concrete visualizer policy with current behavior and staged future contracts.

### Direction

- Document current visualizer behavior and host constraints as implemented.
- Define staged additions for future visualizer-host capabilities.
- Tie each staged capability to parity and test expectations.

### Exit Criteria

- Current visualizer contract is documented and testable.
- Future contract items are split into explicit phases with ownership.
- Review-flag visualizer items are resolved or retired.
