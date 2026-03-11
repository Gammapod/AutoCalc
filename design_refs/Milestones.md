# Path to v0.8.0

## Milestone 4: Replace Checklist

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

## Milestone 5: Visualizer Fit Contract

Goal: enforce a minimum visualizer window contract so every visualizer layout is guaranteed to render fully inside bounded dimensions.

### Direction

- Introduce global visualizer window constraints (minimum width + fixed/contracted height tokens).
- Define per-visualizer safe-area layout budgets (title/body/footer or equivalent regions).
- Require panel-specific overflow policies:
- text-based visualizers wrap within bounds (no horizontal clipping/scroll),
- plot-based visualizers scale/clip to viewport bounds deterministically.
- Add shared host/module contract hooks so each visualizer declares and follows a fit strategy.

### Test/Validation Strategy

- Add contract-level tests for structure/class/overflow policy enforcement in current CI stack.
- Add optional runtime diagnostics (dev-only) to warn on out-of-bounds rendering.
- Defer strict pixel-fit validation (real browser metrics) until UX-polish phase test harness is introduced.

### Complexity Note

- Estimated complexity: **7.5-8.5 / 10** (higher than Milestone 3 due to cross-visualizer refactor scope).

### Exit Criteria

- Minimum visualizer window tokens are defined and consumed by all visualizer panels.
- Each visualizer module declares a fit strategy and renders within host contract bounds.
- Horizontal clipping/overflow is prevented by design for text panels.
- Contract tests cover all registered visualizers for fit-policy compliance.

## Milestone 6: Unlock Rule Systematization (Design)

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

# Post-v0.8.0

(nothing planned yet)