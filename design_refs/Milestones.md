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
