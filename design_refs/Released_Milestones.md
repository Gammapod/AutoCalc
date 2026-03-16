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

# Release v0.8.2 (Shipped 2026-03-14)

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