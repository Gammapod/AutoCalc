# Routine Maintenance Runbook

Purpose: execute structured cleanup and refactor passes that improve cohesion, remove clutter, and preserve behavior by enforcing layer invariants and contracts.

## Principles
- Work layer-by-layer, not file-by-file.
- Prefer small, reversible changes.
- Keep behavior stable unless a contract change is explicitly approved.
- Use test-backed checkpoints between steps.

## Workflow

### Pre-Step: Define Architecture Boundaries
1. Read relevant docs for the target scope:
   - `docs/functional-spec.md`
   - `docs/ux-spec.md`
   - `docs/calculator-spec.md`
   - `docs/contracts/*.md`
   - Any active planning/release docs for current scope
2. Map the codebase to high-level layers from those docs.
3. Define/refine layer contracts:
   - Public interfaces and allowed dependencies
   - Data ownership and data-flow boundaries
   - Invariants that must hold during refactor
4. Publish a short layer map to drive the pass.

### Process One Layer at a Time
Complete Steps 1-5 for a layer before moving to the next layer.

### Step 1: Invariants and Safety Harness
1. Review design docs relevant to the current layer.
2. Extract invariants that must not change.
3. Compare invariants to existing tests/contracts for that layer.
4. If coverage is weak, define safety harness additions:
   - Tests to lock invariants
   - Contract/interface updates needed for enforceability
5. Do not start major refactors before harness expectations are clear.

### Step 2: Trash Collection
1. Scan the layer for removals/consolidations:
   - Redundant implementations
   - Unused code paths
   - Legacy compatibility shims no longer required
   - Dead abstractions
2. Produce a deletion/consolidation plan with risk notes.
3. Execute safe removals covered by Step 1 harness.

### Step 3: Sorting and Layer Consolidation
1. Treat the current layer as the target concern.
2. Inspect other layers for concerns that belong in this layer.
3. Flag movable concerns.
4. Execute a refactor plan to consolidate concerns into the target layer.
5. Keep contract boundaries explicit while moving logic.

### Step 4: Internal Quality Refactor
1. Review the layer for code smells and quality issues.
2. Execute focused cleanups:
   - Naming/API clarity
   - Complexity reduction
   - Duplication elimination
   - Error/edge-case hygiene
3. Preserve behavior unless an approved contract change exists.

### Step 5: Design-Doc Reconciliation Check
1. Re-read relevant design docs.
2. Compare final layer state to intended architecture/invariants.
3. Report:
   - What changed
   - What now aligns
   - Remaining gaps and follow-up actions

### Move to Next Layer
Repeat Steps 1-5 until all planned layers are processed.

## Required Outputs Per Pass
1. Layer map and contract summary
2. Per-layer invariant/harness plan
3. Per-layer deletion/consolidation plan
4. Per-layer cross-layer move/refactor plan
5. Per-layer quality cleanup plan
6. Per-layer reconciliation report vs design docs

## Execution Checklist (Repo)
1. Capture planned layer order in `docs/planning/routine-maintenance-log.md`.
2. After each layer step batch, run:
   - `npm run build:web:full`
   - `npm test`
   - `npm run ci:verify:boundaries`
3. Record verification output and decisions in the maintenance log.
