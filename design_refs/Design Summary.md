# AutoCalc Design Summary

Last updated: 2026-03-03
Scope: Current runtime behavior across `src/` (domain/app/ui) and `src/` (shell rendering).

## Core Identity

AutoCalc is a calculator-first progression game where unlocks change both input surface and expressive math power:

- Keys start highly constrained and are expanded by predicates tied to play history.
- Arithmetic execution is deterministic and stateful (total, roll, drafting, slots).
- Progression is earned by demonstrating calculator behavior, not by spending currency.

## Core Gameplay Loop

1. Use unlocked keys to set/modify total or draft operation slots.
2. Execute with:
   - `++` for direct +1 stepping of total.
   - `=` to execute drafted operation slots left-to-right.
3. Record outcomes:
   - `=` writes to roll.
   - Euclidean remainder annotations and execution errors attach to roll entries when relevant.
4. Evaluate unlock predicates and apply unlock effects.
5. Expanded key access, slot/digit caps, storage visibility, and allocator budget open additional paths.

## Runtime Model (At A Glance)

Calculator state tracks:

- `total` as calculator value (`rational` or `nan`).
- `pendingNegativeTotal` and `singleDigitInitialTotalEntry`.
- `roll`, `rollErrors`, and `euclidRemainders`.
- `operationSlots` and optional `draftingSlot`.

UI state tracks:

- Dynamic keypad dimensions (`1..8` columns, `1..8` rows).
- Keypad layout cells, storage drawer layout, and button flags.

## Key Families

- Value-expression: digits `0..9`, `NEG`.
- Slot operators: `+`, `-`, `*`, `/`, `#`, and `\u27E1` (diamond remainder operator).
- Utilities: `C`, `CE`, `UNDO`, `GRAPH`, `\u23EF` (execution pause toggle).
- Execution: `=`, `++`.

## UI Summary

Current UI is multi-device:

- Allocator device (budget controls).
- Grapher device (toggleable graph panel).
- Calculator device (roll, total display, slot display, keypad).
- Storage drawer (unlock-gated).
- Unlock checklist panel.

Default shell mode is v2, with a vertically stacked touch-aware layout and drawer navigation.

## Persistence Summary

- Medium: `localStorage`.
- Save key: `autocalc.v1.save`.
- Current schema: `10`.
- Versions `< 6` normalize to fresh v10 baseline.
- Versions `6..10` are normalized/migrated to v10 with validation.

## Scope Notes

- Source of truth for behavior is code under `src/` and `src/`.
- Design refs are descriptive documentation and should be updated alongside behavior changes.