Truth 2: Releases

# Fresh-Context Handoff Brief

## Phase Model (required)

This workflow is two-phase:

1. `Planning Phase`
   - understand constraints
   - modify Truth 1 / invariant files as needed
   - write user story slices
   - leave signoff brief
2. `Implementation Phase`
   - fresh context receives signoff brief
   - reviews brief + relevant code
   - creates implementation plan before coding

## Brief Metadata
- Handoff ID: `handoff_complex_numbers_20260329`
- Created by: `Marie` (planning-phase agent)
- Date: `2026-03-29`
- Phase: `Planning Phase`
- Mode: `review`
- Fresh context required: `true`
- Implementation-phase agent name: `Curie`

## Objective
- One-sentence objective: Define the canonical architectural model for representing and persisting complex roll values with a vertical slice for unary `⦝` (`× i`) while preserving pure-real behavior.
- Success criteria (clear completion conditions):
1. Complex value storage model is decision-complete and compatible with current roll/persistence seams.
2. Vertical slice scope is explicit (`⦝` key, slot face, expanded form, and sample execution).
3. Sender readiness checklist is complete for fresh-context implementation handoff.

## User Story Slices
- Planned slice IDs and user stories:
1. `slice_complex_roll_value_model`: As a player, I want roll values to support `a + i × b` so complex behavior can be introduced without breaking real-only play.
2. `slice_unary_i_operator_vertical`: As a player, I want unary `⦝` (`× i`) so `34` can become `0 + 34i`.
3. `slice_complex_domain_visualizer_bootstrap`: As a player, I want the default visualizer to show current domain symbol while total display remains integer-only in this phase.

## Invariant/Truth 1 Updates
- Files changed/validated:
1. `docs/planning/Planning Board.md` (new `Now` complex slices)
2. `docs/planning/handoffs/handoff_complex_numbers_20260329.md` (planning signoff brief)
- Summary of invariant deltas:
1. `CalculatorValue` must gain a `complex` variant with component-level scalar support (`rational` or `expr`) for `re` and `im`.
2. Pure-real compatibility is a hard invariant: values with `im = 0` must follow existing behavior paths for operations currently supported on reals.
3. Persistence shape must remain backward compatible; legacy payloads remain valid and new complex payloads must be schema-safe.

## Locked Decisions
- List decisions that must not be changed:
1. Canonical runtime storage for complex numbers is structured, not string-parsed: `{ kind: "complex", value: { re: ScalarValue, im: ScalarValue } }`.
2. Scalar components support exact rational and expression/radical forms; `NaN` is not allowed inside components and remains top-level `CalculatorValue.kind = "nan"` only.
3. Vertical slice unary `⦝` semantics are fixed as multiply-by-`i`; sample contract is `34 [ ⦝ ] -> 0 + 34i`.
4. This planning phase keeps total display integer-only; domain symbol appears in the default visualizer for complex outcomes.

## Required Inputs
- Primary files/resources to read:
1. `src/domain/types.ts`
2. `src/domain/engine.ts`
3. `src/infra/persistence/saveCodecV20.ts`
- Optional context files:
1. `src/domain/currentTotalDomain.ts`
2. `docs/planning/Planning Board.md`

## Explicit Out Of Scope
- Items the receiving agent must not change:
1. Modulus and angle operator/function implementation.
2. Full complex-capable behavior for every existing unary/binary operator.
3. Non-domain total-display redesign for non-integer complex values.

## Constraints and Risk Notes
- Technical constraints:
1. Existing tests and behavior for pure rational/integer paths must remain stable.
2. Save payloads must deserialize existing user states without migration loss.
- Known risks to validate:
1. Domain and diagnostics logic currently assumes rational totals; adding complex may produce implicit regressions.
2. Operator execution path has many integer-only unary branches; non-real complex inputs must be explicitly gated to avoid silent invalid math.

## Required Output Schema
The receiving agent must return sections in this exact order:
1. Findings
2. Gaps
3. Risks (blocking / non-blocking)
4. Implementation Plan
5. Test Plan
6. Open Questions

## Acceptance Checklist (for sender)
- [x] Objective and success criteria are concrete.
- [x] Phase is explicitly declared.
- [x] User story slices are listed.
- [x] Truth 1 / invariant updates are listed with summary.
- [x] Locked decisions are complete and explicit.
- [x] Input file list is sufficient and minimal.
- [x] Out-of-scope boundaries are explicit.
- [x] Required output schema is included verbatim.
