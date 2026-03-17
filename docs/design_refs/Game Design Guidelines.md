# AutoCalc Game Design Guidelines

Last updated: 2026-03-12
Scope: Current gameplay design constraints and progression model that match implemented behavior.

## 1. Core Identity

AutoCalc is a calculator-first progression game where unlocks expand available input and operation power based on demonstrated play behavior.

## 2. Core Gameplay Loop

1. Use unlocked keys to modify total or draft operation slots.
2. Execute with `++` (increment total) or `=` (execute committed slots left-to-right).
3. Record outcomes in roll/error/remainder channels where applicable.
4. Evaluate unlock predicates.
5. Apply unlock effects that expand key access, layout, and progression capacity.

## 3. Key Families

- Value-expression: `0..9`, `NEG`
- Slot operators: `+`, `-`, `*`, `/`, `#`, `\u27E1`
- Utilities: `C`, `CE`, `UNDO`, `GRAPH`, `\u23EF`
- Execution: `=`, `++`

## 4. Progression and Unlock Principles (Current)

- Progression is behavior-driven, not currency-driven.
- Unlock effects include key unlocks, keypad row/column growth, storage visibility, total digit cap increases, allocator budget increases, and directed key placement.
- Layout progression uses keypad/storage surfaces with move/swap constraints (including execution-key placement constraints).

## 5. Design Boundaries

- This file is current-state guidance only.
- Speculative systems (for example multi-calculator progression models or unresolved unlock-language frameworks) are tracked in planning or review docs until promoted.
