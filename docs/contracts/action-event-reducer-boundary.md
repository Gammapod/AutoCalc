# Action Event Reducer Boundary

This document defines the active contract boundary for action events entering reducer execution.

## Canonical Sources

- `src/domain/events.ts`
- `src/domain/commands.ts`
- `src/domain/engine.ts`
- `docs/functional-spec.md`
- `docs/ux-spec.md`

## Boundary Rules

1. UI modules emit domain-intent actions through typed event surfaces only.
2. Reducer execution remains deterministic for identical action streams and starting state.
3. Domain effects that influence UI are exposed through typed read-model/state surfaces.
4. Action event compatibility updates must be reflected in both functional and UX specs.

## Change Policy

When event shapes, routing, or reducer boundary semantics change:

1. Update the canonical domain types first.
2. Update `docs/functional-spec.md` and `docs/ux-spec.md` in the same change set.
3. Ensure contract and parity tests continue to pass.
