# AutoCalc v1 Implementation Details (Current Runtime Contract)

Last updated: 2026-02-27
Scope: This document describes the behavior implemented in `src/` today.

## Architecture Overview

The app is split into:

1. Domain (`src/domain`): pure state transitions and execution logic
2. Content (`src/content`): unlock catalog data
3. Infrastructure (`src/infra`): persistence and math helpers
4. UI (`src/ui`): DOM rendering and interaction wiring
5. App bootstrap/store (`src/app`)

## Runtime Data Model

Core runtime types (simplified to current behavior):

```ts
type SlotOperator = "+" | "-" | "*" | "/" | "#";
type UtilityKey = "C" | "CE" | "NEG";
type ExecKey = "=";

type RationalValue = { num: bigint; den: bigint };

type Slot = {
  operator: SlotOperator;
  operand: bigint;
};

type EuclidRemainderEntry = {
  rollIndex: number;
  value: RationalValue;
};

type CalculatorState = {
  total: RationalValue;
  pendingNegativeTotal: boolean;
  roll: RationalValue[];
  euclidRemainders: EuclidRemainderEntry[];
  operationSlots: Slot[];
  draftingSlot: null | {
    operator: SlotOperator;
    operandInput: string;
    isNegative: boolean;
  };
};
```

## Execution Semantics

`=` executes operation slots left-to-right:

- `+`, `-`, `*`: integer operand applied to rational total
- `/`: true rational division
- `#`: Euclidean division
  - quotient `q = floor(total / operand)`
  - total becomes `q`
  - remainder `r = total_before - operand * q`
  - only the final `#` remainder in a single `=` run is recorded

Roll behavior:

- no slots: append unchanged total
- first operation-backed `=` when roll empty: append starting total and resulting total
- later operation-backed `=`: append resulting total only

Zero divisors:

- if any `/` or `#` slot has operand `0`, `=` is a no-op (state unchanged).

## Utility Key Behavior

- `CE`: clears roll section state for the current run (`roll`, `euclidRemainders`, `operationSlots`, `draftingSlot`), keeps total.
- `C`: full run reset (`total = 0`, clear roll and remainder annotations, clear operation slots/drafting, clear pending-negative flag).
- `NEG`: toggles sign for total/drafting operand under reducer gating rules.

## Unlock System

Unlock definitions are data-driven in `src/content/unlocks.catalog.ts`.

Current unlock categories:

- digits
- slot operators
- utilities
- execution (`=`)
- capacity (`maxSlots`, `maxTotalDigits`)

`UNLOCK_ALL` exists and unlocks all keys represented in runtime state, including `#`.

## Roll Rendering Contract

The roll view model is derived from:

- `calculator.roll`
- `calculator.euclidRemainders`

Rendering rules:

- total entries render in chronological order
- remainder annotation is displayed on the same row as its target total as `⟡= <value>`
- total and remainder columns are independently right-aligned by CSS

## Persistence Contract

`src/infra/persistence/localStorageRepo.ts` persists:

- rational `total`
- rational `roll`
- `euclidRemainders` (roll-index + rational value)
- operation slots
- unlock state
- layout state

Current schema version: `2`.

Backward compatibility:

- v1 payloads are accepted and normalized
- legacy layout placeholders for `NEG`, `*`, `/`, and `euclid_divmod` are migrated to current keys where needed

## Testing Contract

Test runner: `tests/run-tests.ts`

Key coverage includes:

- engine behavior (`/`, `#`, remainder capture, zero-divisor handling)
- reducer unlock and key behavior
- roll formatting/model behavior
- persistence round-trip and legacy migration
- runtime dependency map generation
- browser import safety guard for Euclidean engine
