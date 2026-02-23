# AutoCalc v1 Implementation Details (Rewrite Strategy)

Note: `legacy/` contains the prototype app, for reference. It should not be edited, copied, or used as an implementation guide.

Last updated: 2026-02-23
Precedence rule: When docs conflict, `Upgrade Pricing Plan.md` wins over `Design Summary.md`.
Scope: This document replaces v0.1 implementation details and defines the new TypeScript architecture.

## Goals

- Preserve core calculator and unlock behavior semantics from the prototype.
- Allow progression/pricing to change without touching engine code.
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
- Progression content is data-driven and editable directly.

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
    progression/
      rules.ts
      evaluator.ts
    economy/
      catalog.ts
      purchase.ts
      visibility.ts
      validation.ts
  content/
    progression.catalog.ts
    progression.rules.ts
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
    purchase.execution.test.ts
    content.validation.test.ts
```

## Domain Model (TypeScript)

```ts
export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type Operator = "+" | "-" | "*" | "/" | "=";
export type UtilityKey = "C" | "CE";

export type CalculatorState = {
  display: string;
  entry: string;
  accumulator: bigint | null;
  pendingOp: Operator | null;
  justEvaluated: boolean;
  operand1Error: boolean;
  operand2Error: boolean;
  remainderValue: string;
};

export type UnlockState = {
  digits: Record<Digit, boolean>;
  operators: Record<Exclude<Operator, "+">, boolean>;
  utilities: Record<UtilityKey, boolean>;
};

export type DisplayState = {
  displayDigits: number; // shared cap, max 12
};

export type MetaState = {
  storeRevealed: boolean;
  remainderReserveRevealed: boolean;
};

export type GameState = {
  calculator: CalculatorState;
  unlocks: UnlockState;
  display: DisplayState;
  meta: MetaState;
  purchasedItemIds: string[];
};
```

Notes:

- `+` remains always usable and is not tracked as lockable.
- `BigInt` remains authoritative numeric type.
- Shared display cap remains a single value across all displays.

## Action Model

Phase-1 actions:

- `PRESS_KEY` (`Digit | Operator | UtilityKey`)
- `RESET_RUN` (new-game reset and save deletion)
- `HYDRATE_SAVE` (load validated v1 save)
- `DEBUG_UNLOCK_ALL` (dev-only, optional build flag)

Action processing:

- `reducer.ts` is the single state transition entrypoint.
- `PRESS_KEY` flow:
  1. gate key by unlock state
  2. execute calculator transition
  3. execute conditional unlock/reveal rules
  4. execute subtraction purchase check on `=`
  5. return next state + domain events

## Calculator Semantics (Behavior Parity Required)

Must match prototype behavior for:

- Integer-only arithmetic with `bigint`.
- Pending-op workflow with `accumulator` + `entry`.
- Error behavior:
  - operand1 overflow -> display `Err`, `operand1Error = true`
  - operand2 overflow -> `operand2Error = true`
  - negative result -> display `Err`, `operand1Error = true`
- Division:
  - integer quotient
  - remainder stored in `remainderValue`
  - divide-by-zero -> result `0`, remainder `0`
- `C` and `CE` behavior equivalent to current prototype.

## Progression and Economy (Data-Driven)

Progression is defined in `src/content/*` and validated at startup.

### Catalog shape (editable data)

```ts
export type CatalogItem =
  | { id: string; kind: "digit"; target: Digit; price: bigint }
  | { id: string; kind: "operator"; target: Exclude<Operator, "+">; price: bigint }
  | { id: string; kind: "display_cap"; amount: number; max: number; price: bigint };
```

### Rule shape (editable data)

```ts
export type ConditionalRule = {
  id: string;
  when: RulePredicate;
  effect: RuleEffect;
  once: boolean;
};
```

### Required invariants

- All prices must be positive.
- All item ids must be unique.
- Duplicate prices are disallowed in phase 1 (avoids first-match ambiguity).
- `display_cap` must never exceed max cap (12).
- At least one reachable visible purchase exists after store reveal under configured progression.

### Purchase semantics (retained)

Purchase attempt occurs only when:

1. current action is `PRESS_KEY "="`
2. previous `pendingOp` was `-`
3. no operand errors in reduced state

Then:

1. parse previous `entry` as subtraction amount (`""` => `0`)
2. if amount `<= 0`, no purchase
3. find exact-price matching item
4. if already purchased, no-op
5. apply item effect immediately

## Persistence Strategy (v1)

- New storage key: `autocalc.v1.save`
- New schema version: `1`
- No backward parser for v0.1
- Save payload is a strict typed snapshot of `GameState` plus metadata
- `zod`-style schema validation is recommended before hydrate (or equivalent custom validator)
- Autosave remains interval-based (default 5000 ms) and can be tuned via app config

## UI Strategy

- Desktop-first layout in phase 1.
- Render from a derived view model (`ui/viewModel.ts`) to keep DOM logic simple.
- Keypad/store/remainder panels are presentational; all enable/disable/reveal logic comes from state.
- No architectural assumptions that prevent responsive breakpoints in phase 2.

## Testing Strategy (Minimum Unit Baseline)

Required unit tests:

- `calculator.engine.test.ts`
  - arithmetic semantics
  - divide-by-zero behavior
  - overflow/negative error transitions
- `reducer.unlocks.test.ts`
  - conditional unlock rules and reveal triggers
- `purchase.execution.test.ts`
  - subtraction-equals purchase gating and exact-match behavior
- `content.validation.test.ts`
  - catalog/rule invariant validation

Not required in phase 1:

- integration tests
- property/fuzz tests
- snapshot UI tests

## Known Discrepancies Between Source Docs

No irreconcilable conflicts for the chosen scope. Clarifications applied:

- `Upgrade Pricing Plan.md` says unlock type enum includes `Remainder`, but current execution path still routes purchases through subtraction-equals semantics. In rewrite, unlock source is represented by explicit rule/effect definitions; pricing trigger remains subtraction-based unless a dedicated remainder-purchase mechanic is intentionally added.
- Exact prices/progression order are intentionally treated as editable content, not hard-coded parity requirements.

## Initial Implementation Sequence

1. Set up TypeScript build and strict compiler options.
2. Implement domain types + calculator engine + reducer skeleton.
3. Move progression/pricing into `src/content` data and add validation.
4. Implement purchase evaluator and rule evaluator.
5. Wire persistence (`autocalc.v1.save`) and app dispatcher.
6. Replace UI bindings/rendering to consume new state/store.
7. Add baseline unit tests listed above.

## Success Criteria

- `legacy/src/app.js` is no longer runtime source of truth.
- Core operation and unlock semantics match intended parity.
- Progression/pricing edits can be performed via content files only.
- Unit test suite covers calculator semantics, unlock behavior, and purchase path.
