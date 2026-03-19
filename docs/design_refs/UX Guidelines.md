# AutoCalc UX Guidelines

Last updated: 2026-03-19
Scope: Current UX behavior that matches implemented runtime/UI behavior.

## 1. UX Invariants

- Gameplay semantics are determined by domain/reducer behavior, not by shell visuals.
- Desktop and mobile shells may differ in layout and interaction patterns while preserving the same reducer outcomes.
- Persistence, unlock logic, and execution semantics remain platform-invariant.

## 2. Active Shell Model

- UI runs as a multi-surface shell rather than a single fixed calculator body.
- Active surfaces are allocator, grapher, calculator, storage drawer, and unlock checklist panel.
- v2 shell is default and uses a vertical, touch-friendly stacked layout with drawer navigation.

## 3. Keypad and Device Behavior

- Keypad dimensions are runtime-driven (`keypadColumns` x `keypadRows`) within `1..8` for each axis.
- Keypad cells are data-driven by layout state and may contain key or placeholder cells.
- Storage drawer is separate from keypad, uses base 8 columns, and is unlock-gated.
- Key movement between keypad and storage is supported through drag/drop rules.

## 4. Interaction and Accessibility Baseline

- Pointer interactions include press feedback and explicit valid/invalid drop-target states.
- v2 shell provides touch rearrangement and drawer/track gesture handling.
- Mobile responsiveness preserves minimum key row height at 48px.
- Keyboard and screen-reader expectations are part of the UI quality contract.

## 5. Scope Notes

- This document reflects current behavior only.
- Future-direction UX ideas that are not implemented belong in milestone planning or review flags, not here.
- Checklist surfaces are currently active in both shells; replacement with contextual visualizer hints is tracked as pre-release planned work.

## 6. Symbol Conventions

- Use `U+2013` (en dash) for subtraction operation notation.
- Use `-` (hyphen-minus) for negative sign notation.

## 7. Semantic Visual Families

These are semantic grouping rules for visualizers and function displays. They define meaning channels, not fixed hex values.

- Modular arithmetic family: modulo, cycle analysis, and congruence visuals share one semantic channel (default hue direction: yellow/amber).
- Control/resource family: memory, control matrix, and lambda visuals share one semantic channel.
- Error family: errors use a dedicated semantic channel distinct from all non-error families.
- Do not use color alone for family meaning; pair each family with at least one additional cue (label, icon, pattern, or motion/state treatment).
