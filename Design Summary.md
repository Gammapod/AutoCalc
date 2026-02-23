## Core Identity

AutoCalc is a calculator-first progression game. The calculator itself is the ruleset:

- Key availability is gated by unlocks.
- Arithmetic behavior and display limits drive progression.
- Purchases are executed by entering arithmetic expressions, not by clicking buy buttons.

## Gameplay Loop

1. Player presses currently unlocked calculator keys.
2. Calculator state updates with integer-only arithmetic (`BigInt` internal model).
3. Specific events auto-unlock new controls.
4. Subtraction can execute store purchases when the typed subtraction amount matches a listed item price.
5. Display capacity upgrades increase visible/typeable digit capacity (shared cap across all three displays).

## UI Model

- Main display (total/result).
- Secondary display (operand 2 entry when an operator is pending).
- Remainder display (`r=`) that stores division remainder output.
- Subtraction Store panel (hidden until revealed).
- Remainder Reserve panel (hidden until revealed).
- Debug panel with:
  - `Debug unlock all`
  - `Run number theory analysis`

## Numeric and Error Model

- Arithmetic uses `BigInt`.
- Effective max visible/typeable digits are controlled by `displayUnlocks.displayDigits`, capped at 12.
- Overflow or invalid result behavior:
  - Operand 1 overflow sets `Err` and `operand1Error`.
  - Operand 2 overflow sets `operand2Error`.
  - Negative result sets `Err` and `operand1Error`.
- Division behavior:
  - `/` performs integer division.
  - Divide-by-zero returns `0` with remainder `0` (not an error state).

## Implemented Progression Systems

- Unlock categories:
  - Digits: `0..9`
  - Operators: `-`, `*`, `/`, `=` (`+` is always available)
  - Utilities: `C`, `CE`
- Conditional unlock rules are implemented and event-driven.
- Store purchases are subtraction-driven and price-matched.
- Display-cap upgrade is implemented as a single shared `display_cap` item.

## Persistence

- Save medium: `localStorage`
- Save key: `autocalc.v0_1.save`
- Save version: `1`
- Autosave interval: 5000 ms
- Immediate save triggers include key progression moments (debug unlocks, `C`/`CE`, store purchase, conditional unlock events).

## Scope Notes

- This document now reflects the current prototype behavior, not earlier planned-but-unimplemented phase docs.
- Future features include:
  - Challenges
  - Automation systems
  - Additional calculator functions
  - Offline progress.
