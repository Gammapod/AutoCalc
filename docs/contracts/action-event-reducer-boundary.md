# Action -> Event -> Reducer Boundary (v0.8.4)

Last updated: 2026-03-17

## Canonical mutation path

All dispatch-driven domain mutations MUST flow through:

1. `executeCommand(state, { type: "DispatchAction", action }, { services })`
2. `eventFromAction(action)` (Action -> DomainEvent)
3. `applyEvent(state, event, { services })`
4. `reducer(state, actionFromEvent(event), { services })`

This boundary is the authoritative path for app/runtime dispatch.

## Allowed entrypoints

- App/store dispatch: `src/app/store.ts` using `executeCommand(...)`
- Domain command tests/parity tests that explicitly call `executeCommand(...)`
- Stateless adapter checks that validate action/event round-trip behavior

## Forbidden bypasses

- Writing app runtime dispatch paths that call `reducer(...)` directly.
- Adding production `contentRegistry` reads (`getContentProvider(...)`) in app/domain/ui runtime code.
- Introducing side paths that mutate state outside Action/Event/Reducer flow.

## Test enforcement

- `contracts/action-event-round-trip`: action/event payload symmetry.
- `v2/parity`, `contracts/parity-long-traces`, `contracts/parity-seeded-fuzz`: reducer-vs-command equivalence.
- `contracts/content-registry-boundary`: bans production `getContentProvider(...)` reads.
