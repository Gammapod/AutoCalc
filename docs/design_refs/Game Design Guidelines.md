# AutoCalc Game Design Guidelines

Last updated: 2026-03-19
Scope: Current gameplay design constraints and progression model that match implemented behavior.

## 1. Core Identity

AutoCalc is a calculator-first progression game where unlocks expand available input and operation power based on demonstrated play behavior.

## 2. Core Gameplay Loop

1. Use unlocked keys to modify total or draft operation slots.
2. Execute via toggle-driven auto-step with `=` (enters auto step-through and auto-clears at terminal commit) or manual step-through with `▻` (one slot per press).
3. Record outcomes in roll/error/remainder channels where applicable.
4. Evaluate unlock predicates.
5. Apply unlock effects that expand key access, layout, and progression capacity.

## 3. Key Families

- Value atoms: digits `0..9`, constants `π`, `e`.
- Slot operators (binary): `+`, `-`, `×`, `÷`, `#`, `⟡`, `↺`, `⋀`, `⋁`, `╧`, `╤`, `>`.
- Slot operators (unary): `++`, `--`, `±`, `σ`, `φ`, `Ω`, `¬`, `Ctz`, `⇡d`, `⌊n⌋`, `⌈n⌉`, `⇋d`.
- Utilities/settings: `C`, `←`, `UNDO`, `⟡[-𝛿, 𝛿)`, `⟡[0, 𝛿)`, `[ ??? ]`.
- Memory: `α,β,γ`, `M+`, `M–`, `M→`.
- Visualizers: `GRAPH`, `FEED`, `𝚷𝑝ᵉ`, `CIRCLE`, `λ`, `ALG`.
- Execution: `=`, `▻`.

## 4. Progression and Unlock Principles (Current)

- Progression is behavior-driven, not currency-driven.
- Unlock effects include key unlocks, keypad row/column growth, storage visibility, total digit cap increases, allocator budget increases, and directed key placement.
- Layout progression uses keypad/storage surfaces with move/swap constraints (including execution-key placement constraints).
- Multi-calculator runtime is active: calculator-local execution state with global/shared progression unlock state.

## 5. Scope Notes

- This file is current-state guidance only.
- Checklist replacement with visualizer-driven unlock hints is planned; current runtime still includes checklist surfaces.
- Speculative future systems remain tracked in planning/review docs until promoted.
