## Core Identity

AutoCalc is a calculator-first progression game where the calculator itself is the ruleset:

- Key availability is gated by unlocks.
- Arithmetic behavior and display limits drive progression.
- Progression is earned by *demonstrating structural behaviors* (sequence predicates), not by clicking buy buttons or spending abstract currency.

## Gameplay Loop

1. Player presses currently unlocked calculator keys to:
   - set an initial total, and/or
   - configure a short, **sequential operation pipeline** (operation slots).
2. Pressing `=` applies the operation pipeline to the current total, producing a new total.
3. Each `=` appends the resulting total to a **calculator roll** (a visible history strip).
4. Unlock conditions (sequence predicates) are evaluated against the roll and current calculator configuration.
5. Upgrades expand expressive power (more keys, more operation slots, larger digit cap).

## UI Model

- **Main display**: current total.
- **Calculator roll**: history of totals produced by `=` (a receipt/roll emerging from the top).
- **Operation field**: a fixed number of ordered operation slots, e.g. `[ % 3 ] → [ + 5 ] → [ * 2 ]`.
- **Unlock panel**: a list of sequence-based unlock conditions (and their current progress).
- **Debug panel** (dev only):
  - `Debug unlock all`
  - `Run analyzer`

## Operation Model

- The calculator maintains:
  - `total` (current bigint value)
  - `roll` (list of totals after each `=` press)
  - `operationSlots` (ordered list of `(operator, operand)` pairs)
  - `maxSlots` (upgradeable cap on `operationSlots.length`)
- Pressing `=` applies each slot sequentially to the current total (left-to-right).
- If no operation slots exist, `=` applies the **identity function**:
  - total remains unchanged
  - the unchanged total is appended to the roll

### Utility Key Semantics

- `CE`: clears the current operation (empties `operationSlots`) and **keeps**:
  - current `total`
  - current `roll`
- `C`: clears the entire calculator run (resets):
  - `total` to `0`
  - `roll` to empty
  - `operationSlots` to empty

## Numeric and Error Model

- Arithmetic uses `BigInt` (integer-only).
- A single digit-cap controls maximum visible/typeable digits (`displayUnlocks.displayDigits`, max 12).
- The digit-cap applies uniformly to:
  - the main total display
  - roll entries
  - operands entered into operation slots
- Overflow and invalid result behavior (phase 1, subject to later tuning):
  - overflow of the current total => display `Err` and enter an error state
  - negative result => display `Err` and enter an error state (until negatives are intentionally introduced)
- Division and modulo (inside operation slots):
  - `/` performs integer division
  - `%` performs remainder
  - divide-by-zero and mod-by-zero behavior is intentionally configurable; prototype parity used `0` result (not an error) but may be tightened later as part of the number-theory identity.

## Progression Systems (v1 direction)

- Unlock categories:
  - Digits: `0..9`
  - Slot operators: `+`, `-`, `*`, `/`, `%`
  - Utilities: `C`, `CE`
  - Capacity upgrades:
    - `maxSlots` (operation length)
    - `displayDigits` (digit cap)
- Unlocks are triggered by:
  - **Conditional** events (early onboarding discoveries)
  - **Predicate** completion (sequence/roll behaviors)
  - **Challenge** completions (future phases)

## Persistence

- Save medium: `localStorage`
- Save key and version are v1-specific (save reset is acceptable in rewrite).
- Autosave can remain interval-based (default 5000 ms).

## Scope Notes

- This document reflects the new rewrite direction (slot pipeline + roll + predicate unlocks).
- Future features remain out of scope for phase 1:
  - challenges menu (phase 3)
  - automation / idle currency
  - additional scientific functions (trig, graphing)
  - offline progress
