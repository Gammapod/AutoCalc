Truth 1: Game Tuning
# AutoCalc Calculator Specification

Last updated: 2026-03-25
Status: Canonical Truth 1 calculator/tuning invariants.
Purpose: Define calculator tuning, execution, and content-balance invariants compatible with `docs/functional-spec.md`.

## 1. Scope and Precedence

This document defines calculator-facing invariant behavior and tuning contracts.

Precedence order for calculator/tuning concerns:

1. `docs/Documentation & Release Policy.md`
2. `docs/functional-spec.md`
3. this calculator specification
4. Truth 2 release docs and runbooks
5. non-authoritative reference docs

If this document conflicts with `docs/functional-spec.md`, the functional spec wins.

## 2. Normative Clauses

### 2.1 Control matrix and tuning invariants

- `CALC-CM-01` (MUST): Control-matrix variables (`alpha`, `beta`, `gamma`, `delta`, `epsilon`, `lambda`) represent calculator capability/tuning axes, not presentation-only metadata.
- `CALC-CM-02` (MUST): Derived values are computed from matrix relationships and are not directly user-settable.
- `CALC-CM-03` (MUST): Player-settable control values are integer-stepped and bounded by calculator-specific min/max ranges.
- `CALC-CM-04` (MUST): `lambda` spending/refunding operates only on non-derived player-settable control variables.
- `CALC-CM-05` (SHALL): Derived outputs remain within declared bounded ranges implied by control constraints.
- `CALC-CM-06` (MUST): Matrix-result values used for runtime control outputs are integer-valued after deterministic rounding.
- `CALC-CM-07` (MUST): Calculator initialization for each unlocked calculator identity is deterministic and stable across save/load parity paths.

### 2.2 Deterministic execution invariants

- `CALC-EX-01` (MUST): Standard operation-slot execution resolves deterministically left-to-right.
- `CALC-EX-02` (MUST): `=` is the auto-step toggle entrypoint and executes under explicit execution-gate constraints.
- `CALC-EX-03` (MUST): Intermediate auto-step progress is preview-only; terminal roll/total commit occurs exactly once on completion/finalization.
- `CALC-EX-04` (MUST): Manual step-through executes one slot per press and preserves terminal equivalence with full execution at equal scope.
- `CALC-EX-05` (MUST): If step-through capability is absent, step-specific behavior remains inert.
- `CALC-EX-06` (MUST): Execution-gated rejected inputs are non-mutating for calculator/progression state unless explicitly modeled as exceptions.

### 2.3 Operator and content invariants

- `CALC-OP-01` (MUST): Operator semantics are capability-gated by unlock state and never changed by layout/storage placement.
- `CALC-OP-02` (MUST): Binary and unary operator families preserve deterministic semantics independent of shell.
- `CALC-OP-03` (MUST): Integer-only operators return deterministic invalid-input outcomes on non-integer inputs.
- `CALC-OP-04` (MUST): Roll/history captures executed terminal outcomes, including error/remainder channels where applicable.
- `CALC-OP-05` (SHALL): Operator presentation tokens (keyface/slot-face/expanded-form notation) remain consistent with canonical semantics where defined.

### 2.4 Multi-calculator tuning invariants

- `CALC-MC-01` (MUST): Sessions support one or more calculator instances with exactly one active selection.
- `CALC-MC-02` (MUST): Each calculator instance owns isolated execution-local state (total, drafting, slots, roll/history, control variables, step progress).
- `CALC-MC-03` (MUST): Progression-owned unlock state remains global/shared unless explicitly defined otherwise.
- `CALC-MC-04` (MUST): Additional calculator creation/removal occurs only through explicit domain actions/effects.
- `CALC-MC-05` (MUST): One-calculator mode preserves baseline semantics.

## 3. Traceability

| Clause ID | Summary | Primary suites | Coverage type | Gap |
|---|---|---|---|---|
| CALC-CM-01 | Control variables represent runtime capability axes | `domain/sandbox-preset`, `app/analysis-report` | unit | partial: explicit contract ID missing |
| CALC-CM-02 | Derived values are non-user-settable | `domain/sandbox-preset`, `reducer/layout` | unit | partial: no dedicated derived-settable rejection suite |
| CALC-CM-03 | Integer-stepped bounded settable controls | `domain/sandbox-preset`, `contracts/multi-calculator-invariants` | unit + contract | partial: bounds matrix expansion pending |
| CALC-CM-04 | Lambda spend/refund limited to non-derived controls | `domain/sandbox-preset`, `domain/unlock-engine` | unit | partial: explicit lambda-target contract absent |
| CALC-CM-05 | Derived output range safety | `domain/sandbox-preset` | unit | gap: no property suite for full range envelope |
| CALC-CM-06 | Deterministic integer matrix outputs | `domain/sandbox-preset`, `app/analysis-report` | unit | partial: no dedicated rounding-behavior contract |
| CALC-CM-07 | Deterministic calculator initialization | `reducer/lifecycle`, `persistence`, `contracts/multi-calculator-invariants` | unit + contract | partial: migration-triggered fixtures pending |
| CALC-EX-01 | Left-to-right deterministic slot execution | `reducer/input`, `contracts/slot-input-parity`, `v2/parity` | unit + contract + parity | none |
| CALC-EX-02 | Equals-toggle execution-gate semantics | `contracts/execution-gate-parity`, `reducer/input`, `domain/execution-mode-policy` | contract + unit | partial: full action-family matrix pending |
| CALC-EX-03 | Preview-only intermediate progress with single terminal commit | `reducer/input`, `contracts/slot-input-parity`, `v2/parity` | unit + contract + parity | partial: stress suite pending |
| CALC-EX-04 | Manual step-through determinism and equivalence | `reducer/input`, `ui-integration/mobile-shell`, `ui-integration/desktop-shell` | unit + integration | none |
| CALC-EX-05 | Step behavior inert when capability absent | `reducer/input`, `ui-integration/mobile-shell` | unit + integration | none |
| CALC-EX-06 | Non-mutating rejected execution-gated inputs | `contracts/execution-gate-parity`, `reducer/input` | contract + unit | partial: explicit exception fixture set pending |
| CALC-OP-01 | Unlock-gated semantics independent of layout | `domain/key-unlocks`, `domain/key-identity-adapters`, `reducer/layout` | unit + contract | partial: end-to-end semantic invariance suite limited |
| CALC-OP-02 | Deterministic binary/unary semantics | `engine/operator-semantics`, `reducer/input`, `v2/parity` | unit + parity | partial: broader long-trace matrix pending |
| CALC-OP-03 | Integer-only invalid-input outcomes | `engine/operator-semantics`, `reducer/input` | unit | partial: cross-operator matrix not exhaustive |
| CALC-OP-04 | Roll/history terminal outcome correctness | `reducer/input`, `ui/roll-display`, `persistence` | unit + integration | none |
| CALC-OP-05 | Consistent operator presentation tokens | `operation-slot-display`, `ui-module/calculator-keypad-render` | integration + unit | partial: not all operators explicitly asserted |
| CALC-MC-01 | Multi-calculator with single active selection | `reducer/lifecycle`, `contracts/multi-calculator-invariants`, `v2/parity` | unit + contract + parity | partial: invalid-id guard fixture pending |
| CALC-MC-02 | Per-calculator execution-state isolation | `reducer/input`, `contracts/multi-calculator-invariants` | unit + contract | partial: randomized isolation matrix pending |
| CALC-MC-03 | Global/shared unlock ownership | `domain/unlock-engine`, `contracts/content-provider-wiring`, `contracts/multi-calculator-invariants` | unit + contract | partial: reversible exception policy coverage pending |
| CALC-MC-04 | Explicit action/effect lifecycle changes only | `reducer/lifecycle`, `domain/unlock-engine` | unit | gap: no explicit lifecycle-event contract suite |
| CALC-MC-05 | One-calculator baseline compatibility | `v2/parity`, `contracts/parity-long-traces`, `contracts/multi-calculator-invariants` | parity + contract | partial: broader baseline fixture coverage pending |

## 4. Rejected or Deferred Claims (Non-canonical)

The following source categories are not treated as Truth 1 invariants and are deferred to release planning or reference context:

1. Planned but not-yet-implemented matrix sections and placeholder markers in `docs/Calculator_specification.md` (for example: `CHANGE START/END`, `PLANNED`, `DO NOT IMPLEMENT` blocks).
2. Proposal-only operator unlock rewrites and verdict notes in `docs/design_refs/operator audit.md` that are not already reflected in canonical behavior docs.
3. Menu/settings calculator expansion proposals and UX/game mode redesign details currently tracked as planning material.

These items belong in Truth 2 release planning (`docs/planning/Planned Releases.md`) until promoted.

## 5. Legacy Reference Mapping

The following docs remain useful context but are non-authoritative for calculator/tuning invariants:

- `docs/Calculator_specification.md`
- `docs/design_refs/Game Design Guidelines.md`
- `docs/design_refs/Implementation Details.md`
- `docs/design_refs/operator audit.md`

Authoritative source for calculator/tuning invariants is this file plus `docs/functional-spec.md`.
