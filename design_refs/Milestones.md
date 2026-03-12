# Path to v0.8.0 (roll analysis)

## Milestone: Roll Analysis Pre-Refactor

Goal: land prerequisite plumbing so orbit-analysis can be implemented without cross-cutting churn.

### Direction

- Normalize roll indexing semantics so `x_0` is the seed everywhere.
- Add a dedicated roll-analysis container in calculator state (separate from raw roll rows).
- Centralize roll-analysis update sequencing so cycle/error stop rules are deterministic and tested.
- Refactor reducer/persistence touchpoints needed to support analysis without changing core progression semantics.
- Update `design_refs/Implementation Details.md` to match the post-refactor runtime contract.

### Exit Criteria

- A single canonical index mapping exists and is used by feed/graph/debug/read-model paths:
- `x_0 = seedSnapshot`
- `x_k (k >= 1) = rollEntries[k-1].y`
- Calculator state includes an explicit analysis container for roll diagnostics and cycle metadata.
- Persistence schema and migrations support the analysis container with backward-safe defaults.
- Contract tests cover index mapping and deterministic analysis update ordering.
- `design_refs/Implementation Details.md` reflects the current implementation after refactor.

## Milestone: Roll Orbit Analysis Foundation

Dependency: `Roll Analysis Pre-Refactor` must be completed first.

Goal: make the roll a mathematically defined orbit tracker for user-created iterative functions.

### Definitions

- Primary trajectory:
- `x_0` is the captured seed for the active run.
- `x_k` for `k >= 1` is the `k`th post-seed execution result under the active function.
- Per-step transient diagnostics row (`k >= 1`) includes:
- `y_k = x_k` (row result / total / Y value)
- `d1_k = x_k - x_{k-1}`
- `d2_k = d1_k - d1_{k-1}` for `k >= 2`
- `r1_k = x_k / x_{k-1}` (exact rational only)
- `seed_minus_1_k` and `seed_plus_1_k` as peer results at step index `k` from seeds `x_0-1` and `x_0+1`
- Cycle metadata:
- first repeat indices `(i, j)` where `i < j`, `x_i = x_j`, `j` is the first repeat encounter
- `transient_length = i`
- `period_length = j - i`

### Direction

- Track the full primary trajectory `x_0, x_1, ..., x_n` for the active function run.
- Detect first repeat in the primary trajectory using exact equality and persist `(transient_length, period_length)`.
- Track transient diagnostics (`y`, `d1`, `d2`, `r1`, `seed-1`, `seed+1`) as a rolling window of the most recent 10 transient diagnostic rows.
- Treat all diagnostics as transient-only:
- when first repeat is detected at `x_j`, diagnostics do not include step `j`
- diagnostics stop permanently for later steps
- On any invalid-state error in primary or peer analysis (for example divide-by-zero, overflow, NaN/undefined, exact-domain escape), invalidate diagnostics and stop all further diagnostic tracking.
- Primary trajectory tracking continues after cycle detection; diagnostics remain frozen.

### Deterministic Stop-Rule Order

For each newly produced `x_k`:

1. Append/track `x_k` in the primary trajectory.
2. Evaluate invalid-state conditions for this step; if invalid, mark diagnostics invalid and stop diagnostics (step `k` diagnostics are not recorded).
3. Evaluate first-repeat on primary trajectory; if `x_k` is first repeat index `j`, persist cycle metadata and stop diagnostics (step `k` diagnostics are not recorded).
4. If diagnostics are still active, compute and persist transient diagnostics for step `k` and evict oldest rows beyond the latest 10.

### Mathematical/Design Constraints

- Indexing is explicit and consistent:
- `x_0` is seed, `x_k` (`k >= 1`) is the `k`th roll result.
- Equality and arithmetic use exact rational semantics only.
- Symbolic/algebraic equality and approximate-real comparisons are out of scope.
- `r1_k` requires exact rational division; undefined/invalid ratio is an invalid-state event for diagnostics.
- Memory cap policy applies only to transient diagnostics (rolling window of 10), not to primary trajectory.

### Exit Criteria

- Roll state contains full ordered primary trajectory for the active function run.
- Roll analysis state contains transient diagnostic rows with fields:
- `x index`, `y`, `d1`, `d2`, `r1`, `seed_minus_1`, `seed_plus_1`
- Diagnostic rows follow exemption rules:
- `d1` exempt at `k=0`
- `d2` exempt at `k=0,1`
- `r1` exempt at `k=0`
- Diagnostic rows exclude repeat encounter index `j` and all post-cycle steps.
- On first repeat, `transient_length` and `period_length` are persisted with the index definitions above.
- On any invalid-state step, diagnostics are invalidated/stopped and no further diagnostic rows are recorded.
- Rolling-window behavior is verified: on trajectories longer than 10 transient rows, only the latest 10 diagnostic rows are retained.
- Determinism is verified across repeated runs and shell parity tests.

## Milestone: Roll Analysis Display Re-examination

Dependency: `Roll Orbit Analysis Foundation` must be completed first.

Goal: re-evaluate how roll analysis is surfaced across visualizers and operation-building surfaces.

### Direction

- Re-examine each visualizer to determine whether and how it displays roll analysis.
- Define display policy differences for transient-phase displays vs cycle-phase displays.
- Re-examine the operation slots/function builder display for roll-analysis visibility and behavior.

### Exit Criteria

- Every visualizer has an explicit decision recorded: no roll-analysis display, transient-only display, cycle-only display, or both.
- A concrete policy exists for transient vs cycle display behavior and is applied consistently across applicable visualizers.

### Side-goals (implement if trivial, defer to new milestone if not)
- The operation slots/function builder display has a documented roll-analysis display decision and rationale.
- The default total visualizer shows 7-segment versions of null, NaN, rationals, and r= (for remainder display).

# Post-v0.8.0

## Milestone: Multiple Calculators

Goal: scope multi-calculator progression into implementable phases.

### Direction

- Define v1 domain model and persistence impact for more than one calculator.
- Stage rollout from read-only surfaces to one unlockable second calculator.
- Defer specialist variants until onboarding and complexity targets are validated.

### Exit Criteria

- Phase plan exists with clear boundaries and prerequisite contracts.
- v1 success metrics and risks are documented.
- Review-flag multi-calculator items are no longer undecided.

# Pre-launch (Path to v1.0.0)

## Milestone: Unlock Rule Systematization (Design)

Goal: define a regular, generalizable unlock-criteria framework for each key type so progression authoring is consistent and scalable.

### Direction

- Define per-key-type unlock rule templates (for example: value atoms, binary operators, unary operators, utilities, execution keys, visualizers, memory/allocator controls).
- Standardize criterion dimensions (difficulty bands, target shape, proof-of-understanding signals, anti-grind constraints).
- Formalize reusable predicate patterns and mapping rules from key type to allowable predicate families.
- Document exception handling policy (when custom one-off criteria are allowed and how they are justified).

### Deliverables

- A design spec that enumerates key types and their canonical unlock-rule templates.
- A predicate-template matrix showing allowed/recommended criteria patterns by key type.
- Authoring guidelines with worked examples for at least one key from each key type.
- A review checklist used to validate new unlock definitions against the framework.

### Exit Criteria

- Every current key type has documented, regular unlock-rule guidance.
- New unlock authoring can be done by applying templates rather than inventing bespoke rules.
- At least one full pass over current unlock catalog confirms criteria can be classified against the new framework.
- Milestone is considered Done when regular, generalizable rules for unlock criteria exist for each key type.

## Cross-Milestone Guardrails

- Existing docs remain as historical/current-state references until superseded later.
- Prioritize backward-safe changes to persistence and migrations.
- Maintain reducer parity and deterministic execution semantics across shells.
- Keep contract tests current as source of truth during the transition.

## Milestone: Consolidated UX Policy

Goal: unify color/interaction language into a current-state plus target-state UX policy.

### Direction

- Capture currently implemented visual semantics separately from proposed language.
- Remove unresolved placeholders from active guidelines and track as planned work.
- Ensure policy terms are consistent across UX and game design docs.

### Exit Criteria

- UX policy distinguishes implemented vs planned semantics clearly.
- Conflicting or duplicate color/meaning rules are removed.
- Review-flag UX-language items are resolved or retired.

## Milestone: Replace Checklist

Goal: remove checklist-first progression UX and replace it with contextual hints inside the calculator experience.

### Direction

- De-emphasize or remove standalone checklist panel from primary progression flow.
- Show unlock-condition hints on/near relevant calculator surfaces and controls.
- Hint style should vary by predicate type (examples: key press counts, roll sequence targets, total thresholds, error-observation goals).

### Design Constraints

- Preserve existing progression correctness in domain logic; this is a presentation/interaction shift, not a rule simplification.
- Keep hints understandable without requiring external panel scanning.
- Avoid overwhelming players; reveal only actionable or near-term hint context.

### Exit Criteria

- Checklist panel removed from active UX path.
- Predicate-to-hint mapping defined for current unlock catalog.
- UI and behavior tests updated for hint rendering and checklist removal.

## Milestone: Consolidated Mobile/Desktop Parity UI Policy

Goal: convert directional shell sizing guidance into one testable policy for mobile and desktop behavior.

### Direction

- Define a single policy doc for cross-shell sizing rules and constraints.
- Separate "current implementation" statements from "target state" statements.
- Convert accepted target rules into measurable UI acceptance criteria.

### Exit Criteria

- A single mobile/desktop policy exists with unambiguous current vs target labels.
- All accepted target rules have corresponding test or verification criteria.
- Superseded policy fragments are removed from archived docs and review backlog.

## Milestone: Consolidated Visualizer Policy

Goal: define a concrete visualizer policy with current behavior and staged future contracts.

### Direction

- Document current visualizer behavior and host constraints as implemented.
- Define staged additions for future visualizer-host capabilities.
- Tie each staged capability to parity and test expectations.

### Exit Criteria

- Current visualizer contract is documented and testable.
- Future contract items are split into explicit phases with ownership.
- Review-flag visualizer items are resolved or retired.
