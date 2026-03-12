# Path to v0.8.0 (roll analysis)

## Milestone: Roll Orbit Analysis Foundation

Goal: make the roll a mathematically defined orbit tracker for user-created iterative functions.

### Direction

- Track the full trajectory `x_0, x_1, ..., x_n` of the active user-defined function from its chosen starting seed.
- Track running extrema over the tracked prefix: `min_so_far(k) = min(x_0..x_k)` and `max_so_far(k) = max(x_0..x_k)`.
- In parallel, track peer trajectories at the same step index for seeds `x_0 + 1` and `x_0 - 1` under the same function and rules.
- For each new value `x_k` (`k >= 1`), track first-order delta `d1_k = x_k - x_{k-1}`, second-order delta `d2_k = d1_k - d1_{k-1}` (`k >= 2`), and ratio `r_k = x_k / x_{k-1}` when defined.
- Detect first repeat in the primary trajectory and persist:
- `transient_length = i`, where `i` is the first index of the repeated value.
- `period_length = j - i`, where `j` is the second index (first repeat encounter) of that same value.
- Growth-order/turbulence diagnostics are transient-only. When first repeat is detected at index `j`, diagnostics do not include step `j`.
- Once a cycle is detected in the primary trajectory, stop collecting non-cycle diagnostics (running extrema, peer-seed comparison data, and growth-order metrics) for subsequent steps.
- If no repeat occurs, continue tracking growth-order/turbulence diagnostics using a rolling window of only the most recent 10 primary-roll entries.
- If any step raises an invalid-state error (for example divide-by-zero domain error, overflow, NaN/undefined value), halt all analysis after that step.

### Mathematical/Design Constraints

- Indexing must be explicit and consistent (`x_0` is the initial seed).
- Repeat detection uses exact symbolic/rational equality; float/approximate-real comparison is out of scope by design.
- Ratio handling and arithmetic evaluation must use exact-domain semantics; if a computation leaves the exact domain or produces an invalid state, analysis halts.
- Stop-rule ordering must be deterministic: cycle detection is evaluated on each newly produced `x_k` before deciding whether to record optional diagnostics for step `k`.
- The primary trajectory remains fully tracked even after cycle detection; only optional diagnostics halt.

### Exit Criteria

- Roll state contains an ordered full primary trajectory for the active function run.
- Roll state contains correct running min/max values for all pre-cycle tracked steps.
- Roll state contains aligned peer-seed trajectories (`seed+1`, `seed-1`) for all pre-cycle tracked steps.
- Roll state contains first-order deltas, second-order deltas, and ratios for all eligible transient steps; if no repeat occurs, this analysis is persisted only for the last 10 entries.
- On first detected repeat, transient length and period length are stored using the index definitions above.
- Post-cycle behavior is verified: primary trajectory continues, optional diagnostics stop beginning at repeat index `j`, and outputs are deterministic across runs.
- Error behavior is verified: any invalid-state step terminates all further analysis updates.

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
- The operation slots/function builder display has a documented roll-analysis display decision and rationale.

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
