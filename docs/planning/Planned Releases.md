Truth 2: Releases

# Planning Board

This file is the canonical active planning board.
Active work is versionless. Semver is assigned only when a shipped train is cut.

## Now

### Slice `slice_complex_roll_value_model`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want roll values to support `a + i × b` so real-only behavior remains stable while complex behavior can be introduced incrementally.
- Exit Criteria:
- Canonical value model for roll storage is defined and documented, including `re` and `im` components.
- Constraint contract is explicit: `b = 0` preserves existing pure-real behavior.
- Constraint contract is explicit: `a` and `b` support rational and radical/expression forms.
- Persistence compatibility strategy is defined (legacy saves remain loadable).

### Slice `slice_unary_i_operator_vertical`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want a unary key `⦝` that multiplies by `i` so I can generate pure imaginary roll results.
- Exit Criteria:
- New unary key exists with button face `⦝`, slot face `⦝`, and expanded form `[ × i ]`.
- Execution behavior is implemented for the vertical test path (`34 [ ⦝ ] -> 0 + 34i`).
- Roll entry persistence and rendering include the resulting complex value.
- Targeted domain/reducer/UI tests pass for the new unary behavior.

### Slice `slice_complex_domain_visualizer_bootstrap`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want the default visualizer to show the active number domain so I can tell when a result is real, imaginary, or combined.
- Exit Criteria:
- Domain classifier emits the complex-domain symbol set for the current total/result path.
- Default visualizer displays domain symbol for complex-related outcomes.
- Total display remains integer-only for this slice and does not regress existing integer behavior.
- Domain text/symbol behavior is covered by tests.

## Next

### Slice `slice_ux_feedback_standardization`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want every rejected input and every state transition to provide clear feedback so I always understand what happened and why.
- Exit Criteria:
- Every rejected input path provides explicit, user-visible feedback.
- Every state transition path provides explicit transition feedback.
- Feedback is consistent in wording, motion timing, and visual treatment.
- Critical paths are covered by tests for rejection and transition feedback contracts.

### Slice `slice_function_builder_bar_standardization`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want the function builder bar to look and behave consistently across states so editing functions feels predictable.
- Exit Criteria:
- Builder bar visuals are consistent across calculator shells and interaction modes.
- Slot states (empty, filled, selected, invalid target) use standardized styling language.
- Drag/drop and tap insertion feedback is consistent in builder bar contexts.
- Targeted builder-bar regressions are covered by UI module tests.

## Later

### Slice `slice_content_completion_pass`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want all currently planned-but-not-yet-implemented keys to exist in-game with complete behavior and display metadata so progression and experimentation are not blocked by placeholder content.
- Exit Criteria:
- Every planned backlog key has full implementation in runtime/content catalogs.
- Every implemented key defines functionality/behavior, key face label, operator slot face label (if applicable), and expanded form text (if applicable).
- Missing placeholder fields in key metadata are removed from scope.
- Unlock/content provider boundary tests still pass after key additions.
- Scope Inventory:
- Unary operators: Distinct prime factors, Floor, Ceiling, Not, Collatz (integer-only), Sort asc (integer-only), Digit count (integer-only), Digit sum (integer-only), Digit^2 sum (integer-only), Mirror digits (integer-only).
- Binary operators: Max, Min, Greater, Digit number (integer-only), Keep leftmost n digits (integer-only), Previous roll item f(x-k) (integer-only).
- Settings keys: Base-2 display behavior key.
- Digits/values: Previous result f(x-1), Roll index X.
- Visualizer/content: Function display expanded-form rendering improvements.

### Slice `slice_progress_signal_bars`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want progression and reward status to be shown visually so I can scan my status faster than reading verbose text blocks.
- Exit Criteria:
- Goal/reward text blocks are replaced by visual progress/signal bars in primary progression surfaces.
- Bars are legible on desktop and mobile form factors.
- Visual states remain non-spoiler and preserve current hint fidelity.
- Accessibility baseline is preserved (contrast and non-color cue support).

## Shipped Trains

Record shipped trains here using this format:

### Shipped train record
- Train: `v0.9.30` (`2026-03-28`)
- Included Slice IDs:
- `slice_architecture_orphan_cleanup`
- `slice_planning_invariant_id_consistency`
- `slice_control_selection_model_unification`
- `slice_boundary_direct_mutation_contract`
- `slice_control_matrix_locality_contracts`
- `slice_app_ui_motion_bridge_decoupling`
- Release Note IDs:
- `release_v0_9_30`
- Player-facing highlights:
- Stronger invariant enforcement via new control-locality and boundary-mutation contracts.
- Cue workflows now depend on a replaceable motion-settlement service contract.

### Template: shipped train record
- Train: `vX.Y.Z` (`YYYY-MM-DD`)
- Included Slice IDs:
- `slice_example_a`
- `slice_example_b`
- Release Note IDs:
- `release_vX_Y_Z`
- Player-facing highlights:
- Short summary bullet 1.
- Short summary bullet 2.

