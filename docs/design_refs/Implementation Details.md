# AutoCalc Implementation Details (Current Runtime Contract)

Last updated: 2026-03-20
Scope: Runtime behavior implemented in `src/` and active shell rendering in `src/`.

## Architecture Overview

Primary layers:

1. Domain (`src/domain`): reducer logic, execution semantics, unlock logic, layout movement rules, multi-calculator projection.
2. Content (`src/content`): unlock catalog and key behavior/catalog metadata.
3. Infrastructure (`src/infra`): rational/euclidean/symbolic math, persistence codecs/repos.
4. UI (`src/ui`): shell rendering, module renderers, read-model adapters.
5. App bootstrap/store (`src/app`): mode resolution, store wiring, scheduler, debug controls.

Reducer orchestration notes:

- `src/domain/reducer.ts` owns calculator-target projection orchestration (`project -> reduce -> commit`) for dual-calculator actions.
- `src/domain/reducer.input.core.ts` is the single owner of key-action dispatch handler mapping (wrapper `reducer.input.ts` re-exports this core path).

## Runtime Key Types

Canonical key IDs and key-family type definitions are maintained in:

- `src/domain/keyPresentation.ts` (`KEY_ID`, `*KeyId` unions)
- `src/domain/types.ts` (domain key aliases such as `SlotOperator`, `ExecKey`, `UtilityKey`)
- `src/content/keyCatalog.ts` (catalog metadata: category, unlock group, behavior kind, input family)

## Calculator State Model

Key runtime fields:

- `calculator.total: CalculatorValue` (`rational` | `expr` | `nan`)
- `calculator.rollEntries: RollEntry[]` (canonical execution history)
- `calculator.operationSlots: Slot[]`
- `calculator.draftingSlot: DraftingSlot | null`
- `calculator.stepProgress` (step-through cursor + partial results)
- `ui.activeVisualizer`, `ui.keyLayout`, `ui.storageLayout`, `ui.buttonFlags`

Multi-calculator fields:

- `calculators: Partial<Record<CalculatorId, CalculatorInstanceState>>`
- `activeCalculatorId`, `calculatorOrder`
- Global/shared progression state remains in top-level `unlocks`.

## Execution Semantics

### `=` execution

- Finalizes drafting slot (if valid), then executes committed slots left-to-right.
- Appends roll output deterministically.
- Euclidean operators preserve remainder metadata.
- Errors (`overflow`, `division_by_zero`, `nan_input`, `symbolic_result`) are recorded via roll/error channels.

### `▻` step-through execution

- Executes exactly one slot per key press when step-through key is available.
- Maintains `stepProgress` intermediate state.
- Final completion commits terminal roll output once.
- `=` after partial stepping completes remaining slots (does not restart).

### Operator Families

- Binary: arithmetic, Euclidean, rotate/gcd/lcm, comparison-style (`max`, `min`, `greater`).
- Unary: increment/decrement/negation, number-theory transforms, boolean/integer transforms, floor/ceiling, digit transforms.
- Integer-only unary operators return `nan_input` on non-integer totals.

## Unlock and Layout Model

Unlock effects include:

- key unlocks (value atom, slot operator, unary, utility, memory, visualizer, execution)
- total digit cap and allocator max-point growth
- keypad row/column upgrades
- directed key movement and storage visibility gating

Layout model supports:

- separate keypad and storage surfaces
- placeholder cells and key cells
- drag/drop move and swap actions with execution-key constraints
- per-calculator keypad surfaces (`keypad_f`, `keypad_g`) with shared storage policy

## UI Shell Mode

Shell mode resolution order:

1. query param override (`?ui=mobile|desktop`)
2. env/runtime override (`UI_SHELL_TARGET`)
3. runtime fallback
4. safe fallback (`mobile`)

Checklist surfaces are currently implemented in shell modules. Planned replacement with visualizer-driven unlock hints is tracked as a pre-release milestone.

## Persistence Contract

- Save key: `autocalc.v1.save`
- Current schema version: `20`
- v20 serialization uses direct state codec; runtime load normalizer handles session-only and compatibility cleanup.

## Testing Contract

Test suite under `tests/` covers:

- reducer/input/lifecycle/layout behavior
- engine/operator semantics
- unlock graph + capability analysis
- persistence and parity suites
- shell/module/integration contracts (mobile + desktop)

