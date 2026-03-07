# AutoCalc Implementation Details (Current Runtime Contract)

Last updated: 2026-03-03
Scope: Runtime behavior implemented in `src/` and active shell rendering in `src/`.

## Architecture Overview

Primary layers:

1. Domain (`src/domain`): reducer logic, execution semantics, unlock logic, layout movement rules.
2. Content (`src/content`): unlock catalog and key behavior catalog.
3. Infrastructure (`src/infra`): rational/euclidean math, persistence, migrations.
4. UI v1 renderer (`src/ui`): DOM rendering for classic shell.
5. UI v2 shell (`src/ui`): stacked shell, touch rearrangement, modular rendering adapter.
6. App bootstrap/store (`src/app`): mode resolution, store wiring, scheduler, debug controls.

## Runtime Key Types

Current key families:

```ts
type SlotOperator = "+" | "-" | "*" | "/" | "#" | "\u27E1";
type ValueExpressionKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "NEG";
type UtilityKey = "C" | "CE" | "UNDO" | "GRAPH" | "\u23EF";
type ExecKey = "=" | "++";
```

## Calculator State Model

Key fields in current calculator state:

- `total: CalculatorValue` where CalculatorValue is `rational` or `nan`.
- `pendingNegativeTotal: boolean`.
- `singleDigitInitialTotalEntry: boolean`.
- `roll: CalculatorValue[]`.
- `rollErrors: RollErrorEntry[]`.
- `euclidRemainders: EuclidRemainderEntry[]`.
- `operationSlots: Slot[]`.
- `draftingSlot: DraftingSlot | null`.

## Execution Semantics

### `=` execution

`=` finalizes drafting slot (if valid), then executes committed slots left-to-right.

Operator behavior:

- `+`, `-`, `*`: integer operand over rational total.
- `/`: rational division; divisor `0` yields division-by-zero error result.
- `#`: Euclidean division, writes quotient to total, records final remainder annotation.
- `\u27E1`: Euclidean remainder operator, writes remainder to total.

Roll behavior for `=`:

- If operation slots exist and roll is empty: append starting total and resulting total.
- Otherwise append resulting total only.
- Errors and Euclidean remainders are attached to the appended roll index.

### `++` execution

`++` increments total by `1` directly. It does not append to roll.

### Overflow and error policy

- Total magnitude is clamped to boundary derived from `maxTotalDigits`.
- Overflow produces an overflow error code (and marks overflow-seen unlock marker).
- Division by zero or NaN input paths produce NaN total with error codes.

## Utility Key Behavior

- `CE`: clears roll/drafting/slots/remainders/errors while preserving current total.
- `C`: full calculator reset to zero rational total and clean run state.
- `UNDO`: pops one roll entry when available and restores prior roll total.
- `GRAPH`: utility key present in unlocks/layout; actual graph visibility is controlled via toggle behavior.
- `\u23EF`: toggle-style utility tied to execution pause flag.
- `NEG`: toggles sign for total or drafting operand under reducer gating rules.

## Unlock and Layout Model

Unlock effects include:

- key unlocks (digit, slot operator, utility, execution)
- total digit cap increase
- allocator max-point increase
- storage drawer unlock
- keypad row/column upgrades
- directed key movement to keypad coordinates

Layout model supports:

- separate keypad and storage surfaces
- placeholder cells and key cells
- drag/drop move and swap actions with execution-key constraints

## UI Shell Mode

UI shell mode resolves to:

- `mobile` by default
- `desktop` when explicitly requested

mobile shell is currently the default rendering path unless overridden.

Current contract:

1. Query param override has highest precedence:
2. `?ui=mobile` -> mobile path
3. `?ui=desktop` -> desktop path
4. Env fallback when query is absent:
5. `UI_SHELL_TARGET=mobile|desktop` -> selected path
6. Default fallback -> mobile path

Packaging/runtime defaults:

1. Browser-hosted usage defaults to mobile shell.
2. Windows portable Electron entrypoint defaults to desktop shell.

## Persistence Contract

- Save key: `autocalc.v1.save`
- Current schema version: `10`
- Payload includes calculator, ui layout/storage/flags, unlocks, key press counts, allocator, completed unlocks
- Schema handling:
  - versions `< 6`: reset to normalized v10 baseline
  - versions `6..10`: normalized and migrated to v10 with validation

## Testing Contract

Test suite under `tests/` covers:

- reducer input/lifecycle/flags/layout behavior
- engine/operator semantics and roll/remainder/error behavior
- unlock graph and unlock domain analysis behavior
- persistence/migration paths
- v2 shell rendering and touch rearrangement flows

## Unlock Graph Contract

Unlock graph function capability logic in `src/domain/unlockGraph.ts` is sufficiency-clause driven (OR-of-AND key sets).
This metadata is the source of truth for:

- function satisfiability checks
- graph report generation (JSON + Mermaid)
- condition reachability analysis

Maintenance rule:

- Update sufficiency clauses when function capability assumptions change.
- Avoid ad-hoc manual predicates that bypass sufficiency metadata.
