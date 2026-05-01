Truth: 2 - Releases

# Fresh-Context Handoff Brief Template

Use this template when delegating to a fresh-context agent (`fork_context: false`).

Fill every section before delegation.

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
- Handoff ID: `handoff_<topic>_<YYYYMMDD>`
- Created by: `<name>`
- Date: `<YYYY-MM-DD>`
- Phase: `Planning Phase` | `Implementation Phase`
- Mode: `review` | `implementation`
- Fresh context required: `true`

## Objective
- One-sentence objective:
- Success criteria (clear completion conditions):
1.
2.
3.

## User Story Slices
- Planned slice IDs and user stories:
1.
2.
3.

## Invariant/Truth 1 Updates
- Files changed/validated:
1.
2.
- Summary of invariant deltas:
1.
2.
3.

## Locked Decisions
- List decisions that must not be changed:
1.
2.
3.

## Required Inputs
- Primary files/resources to read:
1.
2.
3.
- Optional context files:
1.
2.

## Explicit Out Of Scope
- Items the receiving agent must not change:
1.
2.
3.

## Constraints and Risk Notes
- Technical constraints:
1.
2.
- Known risks to validate:
1.
2.

## Required Output Schema
The receiving agent must return sections in this exact order:
1. Findings
2. Gaps
3. Risks (blocking / non-blocking)
4. Implementation Plan
5. Test Plan
6. Open Questions

## Acceptance Checklist (for sender)
- [ ] Objective and success criteria are concrete.
- [ ] Phase is explicitly declared.
- [ ] User story slices are listed.
- [ ] Truth 1 / invariant updates are listed with summary.
- [ ] Locked decisions are complete and explicit.
- [ ] Input file list is sufficient and minimal.
- [ ] Out-of-scope boundaries are explicit.
- [ ] Required output schema is included verbatim.
