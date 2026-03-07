# AutoCalc UI Manifesto

Last updated: 2026-03-05
Scope: Product and engineering principles for desktop/mobile UI evolution.

## 1. Product Direction

AutoCalc will maintain two first-class UI experiences:

1. A mobile-native experience.
2. A desktop-native experience.

These experiences are allowed to diverge in layout, navigation, and interaction patterns when that improves platform craftsmanship.

## 2. Non-Negotiable Invariants

The following must remain equivalent across mobile and desktop:

1. Gameplay semantics.
2. Domain command handling and reducer outcomes.
3. Unlock logic and progression behavior.
4. Persistence and migration behavior.

Parity is enforced at behavior/state layers, not by pixel parity.

## 3. What May Diverge

The following are intentionally platform-specific:

1. Information architecture and panel composition.
2. Interaction model (touch-first vs mouse/keyboard-first).
3. Visual styling details and density.
4. Affordances and controls for key management.

Shared components are optional and decided case-by-case.

## 4. What We Optimize For

1. Platform-native usability over visual sameness.
2. Deterministic parity over UI implementation reuse.
3. Clarity and maintainability of architectural boundaries.
4. Incremental delivery with explicit phase gates.

## 5. Migration Philosophy

1. No big-bang rewrites.
2. Use staged refactors with stop-and-reassess gates.
3. Preserve rollback paths until parity and quality gates are met.
4. Remove legacy paths only after beta confidence is demonstrated.

## 6. Engineering Contract

1. UI layers emit domain actions; domain layers own behavior.
2. Parity checks and contract tests are required for cross-platform changes.
3. Import boundaries must prevent unintended coupling (e.g., `src` importing legacy UI paths).
4. Accessibility is part of the contract (keyboard and screen-reader baseline), not post-hoc polish.

## 7. Quality Gates for UI Work

Every significant UI change should pass:

1. Domain and parity test suites.
2. Shell interaction tests.
3. Module-level UI contract tests.
4. Accessibility acceptance checks for affected flows.

## 8. Visualizer Principle

Visualizer presentation should converge on a shared conceptual window contract:

1. One visualizer host surface.
2. Swappable visualizer modules via an ordered registry contract.
3. Single active visualizer panel at runtime (`graph`, `feed`, or `none`).
4. Platform-specific host sizing policy is allowed, but visualizer action/state outcomes must remain equivalent.

## 9. Decision Rule

When desktop and mobile priorities conflict:

1. Preserve gameplay parity and domain invariants first.
2. Choose the platform-native interaction that best serves the active shell.
3. Add tests to encode the decision so behavior cannot drift silently.

## 10. Desktop Craft Guidelines (Directional)

These are guidance principles for desktop UX design, not hard requirements:

1. Preserve the core fantasy of operating an old calculator that is not fully understood at first.
2. Treat desktop as a physical workbench scene: a heavy adding-machine-like calculator centered on a desktop surface.
3. Prefer fixed key slot geometry in desktop shell:
   key slots keep consistent width/height and shape across keypad/storage surfaces; machine footprint grows with unlock-driven layout.
4. Keep calculator as the visual and interaction anchor:
   avoid viewport context switching; secondary devices should slide in/out around the calculator when relevant.
5. Favor tactile/mechanical presentation cues (motion weight, panel travel, press feedback) over generic app-style transitions when tradeoffs allow.
