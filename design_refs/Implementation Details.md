# AutoCalc v1 Implementation Details (Rewrite Strategy)

Note: `legacy/` contains the prototype app, for reference. It should not be edited, copied, or used as an implementation guide.

Last updated: 2026-02-23
Source-of-truth rule: Unlock requirements live in `src/content/unlocks.catalog.ts` (data), and should be treated as self-documenting. This doc describes architecture and semantics, not the specific unlock list.
Scope: This document defines the new TypeScript architecture.

## Goals

- Preserve the *calculator-as-ruleset* identity while pivoting progression toward number-theory constraints.
- Replace the operand1/operator/operand2 model with:
  - **current total**
  - **calculator roll**
  - **sequential operation slots**
- Allow progression/unlock content to change without touching engine code.
- Replace monolithic `legacy/src/app.js` with modular TypeScript domain architecture.
- Keep desktop-first UX while avoiding decisions that block responsive/mobile later.
- Accept save-format reset in the rewrite.

## Non-Goals (Phase 1)

- No feature placeholders for challenges, automation, or offline progress.
- No commitment to full mobile UX in this phase.
- No migration compatibility with `autocalc.v0_1.save`.

## Architecture Overview

The app is split into four layers:

1. Domain (pure, framework-agnostic TypeScript)
2. Application (orchestration, effects, persistence boundaries)
3. Infrastructure (localStorage, DOM adapters)
4. UI (rendering + input mapping only)

Rules:

- Domain modules must be pure and deterministic.
- UI must not contain game rules.
- Progression content is data-driven and validated at startup.

## Proposed Module Layout

```txt
src/
  app/
    bootstrap.ts
    store.ts
    dispatcher.ts
  domain/
    types.ts
    state.ts
    actions.ts
    reducer.ts
    calculator/
      engine.ts
      guards.ts
      slots.ts
    unlocks/
      predicates.ts
      effects.ts
      evaluator.ts
      analyzer.ts
      validation.ts
  content/
    unlocks.catalog.ts
    unlocks.rules.ts
  infra/
    persistence/
      schema.ts
      localStorageRepo.ts
    clock/
      interval.ts
  ui/
    render.ts
    domBindings.ts
    viewModel.ts
tests/
  unit/
    calculator.engine.test.ts
    reducer.unlocks.test.ts
    unlock.evaluator.test.ts
    analyzer.reachability.test.ts
    content.validation.test.ts
```

## Domain Model (TypeScript)

```ts
export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export type SlotOperator = "+" | "-" | "*" | "/" | "%";
export type UtilityKey = "C" | "CE";
export type ExecKey = "=";

export type Slot = {
  operator: SlotOperator;
  operand: bigint;
};

export type CalculatorState = {
  total: bigint;
  roll: bigint[];          // first operation-backed '=' seeds [startingTotal, result], then appends each result
  operationSlots: Slot[];  // length <= unlocks.maxSlots
  error: null | { kind: "Err"; reason: string };
};

export type UnlockState = {
  digits: Record<Digit, boolean>;
  slotOperators: Record<SlotOperator, boolean>; // if you want '+' always-on, omit it here
  utilities: Record<UtilityKey, boolean>;
  maxSlots: number; // operation pipeline length cap
};

export type DisplayState = {
  displayDigits: number; // shared cap, max 12
};

export type GameState = {
  calculator: CalculatorState;
  unlocks: UnlockState;
  display: DisplayState;
  completedUnlockIds: string[];
};
```

Notes:

- `BigInt` remains authoritative numeric type.
- `displayDigits` is a single shared cap and applies to total, roll entries, and slot operands.
- The operand1/operand2/pendingOp model is removed entirely.

## Action Model

Phase-1 actions:

- `PRESS_KEY` (`Digit | SlotOperator | UtilityKey | ExecKey`)
- `RESET_RUN` (new-game reset and save deletion)
- `HYDRATE_SAVE` (load validated v1 save)
- `DEBUG_UNLOCK_ALL` (dev-only, optional build flag)

Action processing:

- `reducer.ts` is the single state transition entrypoint.
- `PRESS_KEY` flow:
  1. gate key by unlock state
  2. update calculator state (digit entry / slot entry / utility handling)
  3. if key is `=`, execute slot pipeline and append to roll
  4. evaluate conditional rules (onboarding) + predicate unlocks (sequence-based)
  5. apply unlock effects and return next state + domain events

## Calculator Semantics (v1)

### Entering digits (initial total and slot operands)

- Digits enter into either:
  - the current total (if no slot is currently being filled), or
  - the operand field of the current slot being filled
- A digit-cap guard rejects values that exceed `display.displayDigits`.

### Operation slots (sequential pipeline)

- The operation field is a fixed-length slot list, filled left-to-right.
- A slot is created by pressing an operator, then typing its operand digits.
- No mid-chain editing in phase 1.

### `=` execution

- If `operationSlots` is empty, `=` applies the identity function:
  - total remains unchanged
  - append total to roll
- Otherwise, `=` applies each slot left-to-right:
  - `total = op(total, operand)`
  - if roll is empty, append starting total and resulting total
  - otherwise append resulting total

### Utility keys

- `CE`: clears `operationSlots` only; keeps `total` and `roll`.
- `C`: clears `total` (to 0), clears `roll`, clears `operationSlots`.

### Error behavior (phase 1)

- Overflow / invalid transitions set `calculator.error` to `{ kind: "Err", reason }`.
- While in error, input gating rules are content-driven (e.g., allow `C` always, allow `CE` optionally).
- Negative totals can remain invalid until negatives are intentionally introduced later.

### Division/modulo by zero

- Semantics are intentionally configurable and should be enforced consistently in the engine.
- Prototype parity returned `0` (non-error), but a stricter error may better serve number-theory identity.

## Unlock System (Data-Driven)

Unlocks are defined in `src/content/*` and validated at startup.

### Unlock definition shape (editable data)

```ts
export type UnlockPredicate =
  | { type: "roll_length_at_least"; length: number }
  | { type: "ends_with_exact"; sequence: bigint[] }
  | { type: "all_even_tail"; count: number }
  | { type: "cycle_length_tail"; length: number; maxSteps: number }
  | { type: "hits_all_residues"; modulus: number; window: number }
  | { type: "custom"; id: string }; // domain-registered predicate

export type UnlockEffect =
  | { type: "unlock_digit"; digit: Digit }
  | { type: "unlock_operator"; operator: SlotOperator }
  | { type: "unlock_utility"; key: UtilityKey }
  | { type: "increase_max_slots"; amount: number; max: number }
  | { type: "increase_display_digits"; amount: number; max: number };

export type UnlockDefinition = {
  id: string;
  description: string;
  predicate: UnlockPredicate;
  effect: UnlockEffect;
  once: boolean;
};
```

### Required invariants (phase 1)

- All unlock ids are unique.
- All predicates are analyzable or explicitly marked as custom.
- All unlock effects are valid and bounded (`maxSlots` and `displayDigits` must not exceed configured maxima).
- Content validation must confirm that at least one unlock is reachable after onboarding under the configured initial unlock set.

### Analyzer (designer tool)

- Enumerates reachable behaviors under the current unlock grammar (digits, operators, maxSlots, displayDigits).
- Can answer:
  - reachability of a predicate (possible / impossible)
  - rarity estimates (optional; bounded sampling)
- Used for content validation, not player-facing logic.

## Persistence Strategy (v1)

- Storage key: `autocalc.v1.save`
- Schema version: `1`
- Save payload is a strict typed snapshot of `GameState` plus metadata
- Schema validation is required before hydrate
- Autosave remains interval-based (default 5000 ms) and can be tuned via app config

## UI Strategy

- Desktop-first layout in phase 1.
- Render from a derived view model (`ui/viewModel.ts`) to keep DOM logic simple.
- Operation slots and roll are presentational; all gating/execution rules come from domain state.

## Testing Strategy (Minimum Unit Baseline)

Required unit tests:

- `calculator.engine.test.ts`
  - slot execution order
  - identity behavior when no slots exist
  - CE/C semantics
  - digit-cap enforcement
  - division/modulo semantics
- `reducer.unlocks.test.ts`
  - conditional onboarding rules
  - predicate evaluation integration
- `unlock.evaluator.test.ts`
  - predicate truth tables
- `analyzer.reachability.test.ts`
  - reachability checks for representative predicates
- `content.validation.test.ts`
  - unlock catalog invariants

Not required in phase 1:

- integration tests
- property/fuzz tests
- snapshot UI tests

## Initial Implementation Sequence

1. Set up TypeScript build and strict compiler options.
2. Implement domain types + slot calculator engine + reducer skeleton.
3. Move unlock definitions into `src/content` and add validation.
4. Implement unlock predicate evaluator and minimal analyzer.
5. Wire persistence (`autocalc.v1.save`) and app dispatcher.
6. Implement UI bindings/rendering for total, roll, and slot entry.
7. Add baseline unit tests listed above.

## Success Criteria

- `legacy/src/app.js` is no longer runtime source of truth.
- Slot pipeline + roll iteration works deterministically with BigInt.
- Unlock content can be edited without changing engine code.
- Unit test suite covers calculator semantics, unlock evaluation, and analyzer validation.
