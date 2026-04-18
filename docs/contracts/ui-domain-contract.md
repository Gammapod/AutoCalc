# UI Domain Contract

This document defines the active contract between UI shell/module surfaces and domain state/effect surfaces.

## Canonical Sources

- `src/domain/engine.ts`
- `src/domain/events.ts`
- `src/ui/shared/readModel.ts`
- `src/ui/modules/*`
- `docs/functional-spec.md`
- `docs/ux-spec.md`

## Contract Rules

1. UI behavior may diverge by shell/layout, but domain intent and outcomes must remain semantically equivalent.
2. UI reads domain-derived state through shared read-model surfaces, not ad hoc domain mutation.
3. Domain modules do not depend on UI modules.
4. Contract changes must preserve parity guarantees documented in current specs.

## Change Policy

When UI-to-domain interaction contracts change:

1. Update contract types and adapters first.
2. Update `docs/functional-spec.md` and `docs/ux-spec.md`.
3. Validate parity and contract suites in CI.
