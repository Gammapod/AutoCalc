## Isolated Feature Backlog (Non-Milestone)

Purpose: track implementable, self-contained features that do not require milestone framing.
When implementing, every operator key MUST have all of the following defined:
- functionality
- key face
- operator slot face
- expanded form

### Unary Operators

- `Collatz (Ctz)`: `n -> n / 2` when `n` is even; `n -> 3n + 1` when `n` is odd.
- `Sort asc (▂▅▇d)`: reorder decimal digits of `n` in ascending order.
- `Digit count (#d)`: return the count of decimal digits in `n`.
- `Digit sum (∑d)`: return the sum of decimal digits in `n`.
- `Digit^2 sum (∑d^2)`: return the sum of squared decimal digits in `n`.
- `Mirror digits (⇋d)`: reverse decimal digit order of `n`.
- `Distinct prime factors (ω)`: return the number of distinct prime factors of `n`.
- `Previous roll item (f_x-1)`: for current roll index `x`, return the previous item value `f_x-1`.
- `Floor (⌊ _ ⌋)`: return greatest integer less than or equal to `n`.
- `Ceiling (⌈ _ ⌉)`: return least integer greater than or equal to `n`.
- `ℙ(n)`: return the nth prime number. NaN if n is not a natural number.
- `ℙ⁻¹(p)`: return the index of prime p. NaN if p is not a prime.

### Binary Operators

- `Max (╧)`: return the larger of two operands.
- `Min (╤)`: return the smaller of two operands.
- `Specific digit (d_)`: return the digit at a specified position/index.
- `Keep leftmost n`: keep only the leftmost `n` digits; discard the rest.
- `Previous roll item (f(x-_))`: for current roll index `x`, return item value at relative offset `x-k` using second operand `k`.

### Binary Predicate Operators

- `Divides (|)`: returns 1 if left operand divides into right operand. Otherwise, 0.
- `Equals (==)`: returns 1 if two operands are equal, else 0.

### Unary Predicate Operators

- `Not (¬)` returns 1 if operand is <= 0, else 0.

# Release v0.8.5

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

# Release v1.0.0

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
