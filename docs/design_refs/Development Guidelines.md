# AutoCalc Development Guidelines

Last updated: 2026-03-12
Scope: Engineering process and delivery rules that are not runtime behavior specs.

## 1. Migration Philosophy

- Avoid big-bang rewrites.
- Use staged refactors with explicit stop-and-reassess gates.
- Keep rollback paths until parity and quality gates are met.
- Remove legacy paths only after beta-level confidence.

## 2. Engineering Contract

- UI layers emit domain actions; domain layers own behavior.
- Cross-platform changes require parity checks and contract tests.
- Import boundaries must prevent unintended coupling between shell paths.
- Accessibility baselines (keyboard and screen-reader support) are required, not optional polish.

## 3. Quality Gates

- Domain and parity tests pass for affected behavior.
- Shell interaction tests pass for changed flows.
- Module-level UI contract tests pass where applicable.
- Accessibility acceptance checks pass for impacted surfaces.

## 4. Decision Rule

When desktop and mobile priorities conflict:

1. Preserve gameplay parity and domain invariants first.
2. Choose platform-native interaction patterns for the active shell.
3. Add tests to lock behavior and prevent silent drift.
