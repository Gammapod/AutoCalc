Truth: 1 - Calculator Integration Runbook
# Calculator Integration Runbook

Last updated: 2026-05-01  
Status: Active runbook  
Scope: Adding or changing calculator ids and lifecycle behavior.

Authoritative references:
1. `docs/functional-spec.md` (`FS-MC-*`, `FS-BND-05`)
2. `docs/ux-spec.md` (`UX-KS-*`, `UX-PAR-*`)

## Policy

Calculator integration is id-agnostic. Runtime behavior must be driven by calculator order/coherence and shared policy helpers, not by hardcoded id pairs.

Configured bootstrap materialization is allowed. Current configured bootstrap materialization includes `menu`.

## Required Integration Checklist

1. Register the calculator id in type/system registries.
2. Provide deterministic initializer/materializer logic for the calculator.
3. Add a direct-start control profile entry for the calculator id. Do not add derived equation-matrix policy unless the runtime contract is explicitly reintroduced in Truth 1 docs first.
4. Add keypad surface mapping and round-trip mapping for drag/drop and layout actions.
5. Ensure reducer routing uses the shared multi-calculator session gate helper (no local id-pair gates).
6. Ensure layout/drag/drop/gesture surfaces include the calculator surface id.
7. Define lifecycle entrypoint explicitly: bootstrap-materialized vs action-unlocked.
8. Ensure formula-symbol routing covers the function builder, algebraic view, diagnostics, and symbolic roll signatures.
9. Add/extend contract tests and regression tests listed in this runbook.

## Definition Of Done

All items below must pass before merge:

1. `contracts/multi-calculator-invariants`
2. `reducer/layout`
3. `domain/execution-mode-policy`
4. `ui-shell/touch-rearrange-drop-resolution`
5. `ui-module/calculator-storage-v2`
6. `ui-integration/mobile-shell`
7. `ui-integration/desktop-shell`
8. `persistence` and `v2/persistence-parity` if lifecycle/materialization changed
9. `calculator-seed-manifest`
10. `sandbox-preset`
11. `ui/module-calculator-slot-display`
12. `ui/module-algebraic-renderer-v2`

Required behavioral assertions:

1. Calculator-local keyslot mutations do not leak to other calculators.
2. Explicit cross-surface moves mutate only the source/destination calculators involved.
3. Every calculator in `calculatorOrder` has:
   - an instance entry
   - a control profile
   - a valid surface round-trip mapping
   - deterministic materialization from baseline state

## Anti-Patterns (Disallowed)

1. Hardcoded multi-session gates based on specific calculator ids (for example `f && g` checks).
2. Calculator-specific routing branches outside shared policy helpers when generic behavior is sufficient.
3. Adding a calculator without extending surface mapping/round-trip behavior.
4. Adding lifecycle creation paths without deterministic initialization tests.
5. Preserving f/g-family routing or other calculator-family behavior unless it is explicitly part of the current Truth 1 runtime contract.
