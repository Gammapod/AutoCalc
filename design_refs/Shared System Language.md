# AutoCalc Shared System Language (Design Ref)

Last updated: 2026-03-09
Purpose: Record cross-system color and unlock-language guidelines for future content.

## Guideline Statements

- Binary operator keys are dark grey. Operation keys should unlock when the player accomplishes that operation through more primitive operations. The unlock graph should mostly follow this rule. (example: calculating `2 -> 4 -> 6 -> 8 -> 10 -> ...` up to a certain number of iterations should unlock multiplication)
- Unary operayor keys are dark grey with a white stripe. They should have a similar unlock criteria as binary operations(example: calculating `n -> -n -> n -> -n -> ...` should unlock the `-n` key).
- Digit/constant keys are white. Unlock rule is intentionally unresolved; current direction is to tie digit unlocks to demonstrated number-theory understanding for that digit, but details are hazy.
- Green is the default color of displayed results/visualizations. Green is also the color of execution keys. A single conceptual unlock rule for execution keys and new visualizations is still unresolved.
- Red is the visualizer error color. Red is also the color of utility keys, which represent meta-operation/input-control actions on the calculator. A utility-specific unlock rule has not been decided on.
- Yellow is the visualizer color for remainder, modulo, and cycles more broadly.
- Visualizer keys are blue. Unlock rule is intentionally unresolved; direction is to unlock visualizers when they can reveal deeper insight into upcoming unlock requirements.
- Purple represents meta-progression. Memory keys are purple and upgrade the calculator itself. Anything related to eigenvalues or the control matrix should render purple in visualizers.

## Open Design Questions
- Define a generalizable unlock framework for binary and unary operator keys.
- Define a concrete, testable unlock framework for digit and constant keys.
- Define a single conceptual unlock framework for execution keys.
- Define a single conceptual unlock framework for visualizer keys.
- Define a single conceptual unlock framework for utility keys.
- Define exact boundaries for when red utility signaling and red error signaling should be visually distinguished.
