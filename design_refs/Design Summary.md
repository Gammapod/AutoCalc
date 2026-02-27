## Core Identity

AutoCalc is a calculator-first progression game where the calculator itself is the ruleset:

- Key availability is gated by unlocks.
- Arithmetic behavior and display limits drive progression.
- Progression is earned by demonstrating structural behaviors (sequence predicates), not by spending currency.

## Gameplay Loop

1. Player presses currently unlocked calculator keys to:
   - set an initial total, and/or
   - configure a short sequential operation pipeline (operation slots).
2. Pressing `=` applies the operation pipeline to the current total, producing a new total.
3. Each `=` appends to the calculator roll:
   - if operations exist and roll is empty, append starting total and first result
   - otherwise append only the resulting total
4. Unlock conditions are evaluated against the roll and current calculator configuration.
5. Upgrades expand expressive power (more keys, more slots, larger digit cap).

## UI Model

- Main display: current total.
- Calculator roll: history of totals produced by `=`.
- Euclidean remainder annotation: when `#` executes, the final remainder appears as `⟡= <value>` on the same printed line as its target total.
- Operation field: ordered operation slots, e.g. `[ # 3 ] -> [ + 5 ] -> [ * 2 ]`.
- Unlock panel: list of unlock conditions and progress.
- Debug panel (dev only):
  - `Clear Save`
  - `Unlock All`

## Operation Model

The calculator maintains:

- `total` (current rational value)
- `roll` (list of totals after each `=` press)
- `euclidRemainders` (line annotations keyed to roll index)
- `operationSlots` (ordered list of `(operator, operand)` pairs)
- `maxSlots` (upgradeable cap on `operationSlots.length`)

Pressing `=` applies each slot left-to-right.

- If no operation slots exist, `=` is identity and appends unchanged total to roll.
- If operation slots exist and roll is empty, append current total then resulting total.
- On later operation-backed `=` presses, append resulting total only.

## Utility Key Semantics

- `CE`: clears operation entry state for a fresh run section (clears `operationSlots`, roll, and Euclidean remainder annotations; keeps total).
- `C`: full reset of calculator state (`total = 0`, clear roll, clear Euclidean remainder annotations, clear operation slots, clear drafting state).
- `NEG`: toggles sign for total/drafting operand under current gating rules.

## Numeric and Division Model

- Arithmetic is rational (`num/den`), not integer-only.
- `/` performs true division and may produce fractions.
- `#` performs Euclidean division:
  - quotient is `floor(total / operand)`
  - total becomes quotient
  - remainder is recorded as `total_before - operand * quotient`
- For `/` and `#`, divisor `0` makes `=` a no-op (state unchanged).

## Progression Systems

Unlock categories:

- Digits: `0..9`
- Slot operators: `+`, `-`, `*`, `/`, `#`
- Utilities: `C`, `CE`, `NEG`
- Execution: `=`
- Capacity upgrades:
  - `maxSlots`
  - `maxTotalDigits`

## Persistence

- Save medium: `localStorage`
- Save key/version are `autocalc.v1.save` / schema v2.
- Saved state includes rational totals, roll, operation slots, and Euclidean remainder annotations.

## Scope Notes

- This document reflects current runtime behavior in `src/`.
- Legacy prototype behavior in `legacy/` is not authoritative.
