Truth 2: Releases

## Release v1.0.0: Content Completion Pass

### User Story
As a player, I want all currently planned-but-not-yet-implemented keys to exist in-game with complete behavior and display metadata so progression and experimentation are not blocked by placeholder content.

### User Story Exit Criteria
- Every planned backlog key has full implementation in runtime/content catalogs.
- Every implemented key defines:
- Functionality/behavior
- Key face label
- Operator slot face label (if applicable)
- Expanded form text (if applicable)
- Missing placeholder fields in key metadata are removed from this release scope.
- Unlock/content provider boundaries still pass contract tests after key additions.

### Release Notes
Release Note ID: `release_v1_0_0`

Planned player-facing summary:
- Planned key content is now fully represented in gameplay.
- Newly added keys include complete labels and behavior definitions.
- Content catalogs are aligned so unlocks and key availability are consistent.

### Scope Inventory (Planned Keys to Include)

Unary operators:
- Distinct prime factors
- Floor
- Ceiling
- Not
- Collatz (integer-only)
- Sort asc (integer-only)
- Digit count (integer-only)
- Digit sum (integer-only)
- Digit^2 sum (integer-only)
- Mirror digits (integer-only)

Binary operators:
- Max
- Min
- Greater
- Digit number (integer-only)
- Keep leftmost n digits (integer-only)
- Previous roll item f(x-k) (integer-only)

Settings keys:
- Base-2 display behavior key

Digits/values:
- Previous result f(x-1)
- Roll index X

Visualizer/content:
- Function display expanded-form rendering improvements

## Release v1.0.1: Function Builder Bar Standardization

### Pre-work
Audit all function-builder bar render paths and interaction handlers to remove duplicated styling and layout rules.

### Pre-work Exit Criteria
- Single source of truth exists for builder bar spacing, slot framing, text sizing, and interaction states.
- Existing tests that cover builder bar behavior still pass after consolidation.

### User Story
As a player, I want the function builder bar to look and behave consistently across states so editing functions feels predictable.

### User Story Exit Criteria
- Builder bar visuals are consistent across calculator shells and interaction modes.
- Slot states (empty, filled, selected, invalid target) use standardized styling language.
- Drag/drop and tap insertion feedback is consistent in builder bar contexts.
- Regressions are covered by targeted UI module tests.

### Release Notes
Release Note ID: `release_v1_0_1`

Planned player-facing summary:
- The function builder bar now uses a standardized visual and interaction pattern.
- Function editing states are clearer and more consistent across the UI.

## Release v1.0.2: Replace Goal/Reward Text with Signal Bars

### Pre-work
Define progress/signal bar component contract and map existing goal/reward text states to visual states.

### Pre-work Exit Criteria
- Visual bar state model is documented (locked, partial, near, complete, blocked).
- Existing text-driven progression states are mapped to bar semantics one-to-one.

### User Story
As a player, I want progression and reward status to be shown visually so I can scan my status faster than reading verbose text blocks.

### User Story Exit Criteria
- Goal/reward text blocks are replaced by visual progress/signal bars in primary progression surfaces.
- Bars are legible on desktop and mobile form factors.
- Visual states remain non-spoiler and preserve current hint fidelity.
- Accessibility baseline is preserved (contrast and non-color cue support).

### Release Notes
Release Note ID: `release_v1_0_2`

Planned player-facing summary:
- Progression status now appears as visual signal bars instead of text-heavy goal/reward blocks.
- Unlock progress is faster to read at a glance while keeping spoiler-safe guidance.

## Release v1.1.0: UX Feedback Standardization

### Pre-work
Create a centralized UX feedback contract for rejection cues and transition cues, then inventory all input/state transition flows against it.

### Pre-work Exit Criteria
- Rejection feedback contract is defined and reusable across modules.
- Transition feedback contract is defined for major state changes.
- Missing-coverage inventory is complete before implementation starts.

### User Story
As a player, I want every rejected input and every state transition to provide clear feedback so I always understand what happened and why.

### User Story Exit Criteria
- Every rejected input path provides explicit, user-visible feedback.
- Every state transition path provides explicit transition feedback.
- Feedback is consistent in wording, motion timing, and visual treatment.
- Critical paths are covered by tests (input rejection and transition feedback contracts).

### Release Notes
Release Note ID: `release_v1_1_0`

Planned player-facing summary:
- Rejected actions now always explain themselves clearly.
- State changes now consistently surface transition feedback.
- Interaction clarity is standardized across the app.

