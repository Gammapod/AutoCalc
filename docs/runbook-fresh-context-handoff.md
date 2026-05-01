Truth: 2 - Releases

# Fresh-Context Handoff Runbook

Last updated: 2026-03-30  
Status: Active runbook  
Scope: Delegating review/planning/execution tasks to a fresh-context agent.

## Purpose

Standardize handoff quality and make delegation outputs auditable and repeatable.

This runbook defines the required delegation sequence, guardrails, and acceptance checks.

## Phase Definitions

1. `Planning Phase`
   - understand constraints
   - modify Truth 1 / invariant files as needed
   - write user story slices on planning board
   - leave signoff brief
2. `Implementation Phase`
   - fresh context receives signoff brief
   - reviews brief + relevant code
   - plans implementation before coding

## Required Delegation Sequence

1. Create a handoff brief from:
   - `docs/planning/templates/fresh-context-handoff-template.md`
   - ensure phase is set to `Implementation Phase` for delegated planner handoff
2. Confirm all sender checklist items in the brief are complete.
3. Spawn a fresh-context agent with:
   - `fork_context: false`
4. Pass only:
   - the filled handoff brief
   - explicitly listed target file mentions
5. Enforce mode in the spawn prompt:
   - read-only review by default
   - no repo mutations unless mode is explicitly `implementation`
   - require an implementation planning step before coding in delegated context
6. Require output schema exactly as specified in the brief.
7. Validate response against handoff acceptance checklist before using results.

## Guardrails

1. Fresh context is mandatory for this workflow (`fork_context: false`).
2. Delegation remains human-triggered; no autonomous spawn loops.
3. Brief must include locked decisions and explicit out-of-scope boundaries.
4. Receiving agent must not assume unstated prior-thread context.
5. If mode is `review`, the receiving agent must remain read-only.
6. Implementation-phase handoff must include:
   - user story slice list
   - Truth 1 / invariant-change summary
   - explicit relevancy check criteria

## Standard Spawn Prompt Contract

Use this contract text when creating the receiving agent:

```text
You are a fresh reviewer. Do not assume prior thread context.
Treat the handoff brief as authoritative.
Read only the provided files.
Follow locked decisions exactly.
Respect explicit out-of-scope boundaries.
Before coding, produce an implementation plan.
If mode is review: do not modify files.
Return sections in exact order:
1. Findings
2. Gaps
3. Risks (blocking / non-blocking)
4. Implementation Plan
5. Test Plan
6. Open Questions
```

## Handoff Readiness Checklist

- [ ] Brief metadata is complete.
- [ ] Objective and success criteria are implementation-grade.
- [ ] Locked decisions are exhaustive.
- [ ] Files-to-review list is explicit.
- [ ] Out-of-scope list is explicit.
- [ ] Required output schema is present.
- [ ] Spawn configuration includes `fork_context: false`.
- [ ] Brief includes user story slices and Truth 1 / invariant summary.

## Handoff Acceptance Checklist

- [ ] Output includes all required sections in exact order.
- [ ] Findings map to provided files/constraints.
- [ ] Risks are separated into blocking/non-blocking.
- [ ] Implementation plan is decision-complete.
- [ ] Test plan is concrete and verifiable.
- [ ] Open questions are explicit and minimal.
- [ ] Relevancy check maps plan stages back to reasons for change.

## Minimal Dry-Run Procedure

1. Create a brief for invariant review.
2. Spawn fresh-context reviewer with `fork_context: false`.
3. Verify output schema and checklist pass.
4. Archive accepted brief + reviewer output in planning notes if needed.
