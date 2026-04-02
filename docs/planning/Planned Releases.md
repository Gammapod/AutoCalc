Truth 2: Releases

# Planning Board

This file is the canonical active planning board.
Active work is versionless. Semver is assigned only when a shipped train is cut.

## Now

### Slice `slice_error_state_regularization_for_visualizers`
- User Story: As a player, I want overflow and NaN/error states to be canonical and mutually exclusive so visualizer behavior is deterministic.
- Exit Criteria:
- Canonical visualizer-facing error taxonomy is documented in one source of truth (`overflow`, `nan_or_error`, and non-error).
- Overflow and NaN/error are explicitly defined as mutually exclusive runtime states; impossible combinations are prevented or normalized at projection boundaries.
- Existing error signals used by visualizers are audited; ambiguous or duplicate flags are removed or mapped to canonical states.
- A precondition contract exists for visualizers: each render pass receives exactly one error-state classification.

## Next

### Slice `slice_visualizer_cartesian_v1_real_axis`
- User Story: As a player, I want a Cartesian visualizer that always shows a horizontal number line and the current-value vector from origin so value position is immediately readable.
- Exit Criteria:
- New visualizer id/key/panel wiring exists for `cartesian` with standard host behavior (single active panel, inactive-panel clear).
- Horizontal axis is always rendered with 19 ticks total (`-9..9`), with end ticks treated as unlabeled semantic bounds.
- Center tick is visually emphasized (same thickness as axis stroke), with no numeric labels on ticks.
- Real-mode vector renders from origin to current real position and is unlabeled.
- Horizontal axis remains within normal visualizer window bounds in host layouts.

### Slice `slice_visualizer_cartesian_v1_complex_grid`
- User Story: As a player, I want complex totals to render on a Cartesian plane so both real and imaginary components are visible in one view.
- Exit Criteria:
- Complex plane mode is triggered only when current value is complex with `im != 0`; values with `im = 0` render as real-only mode.
- In complex mode, a vertical axis of equal length/subdivision to horizontal is shown and axis ticks project to a full grid.
- Complex vector renders from origin to `(Re, Im)` coordinates and is unlabeled.
- Vertical axis tips and grid are allowed to clip in v1; clipping behavior is explicit and accepted by contract.
- The Cartesian viewport is square in complex mode, even when the square exceeds current host fit window.

### Slice `slice_visualizer_cartesian_v1_range_and_error_semantics`
- User Story: As a player, I want Cartesian scaling and error cues to match existing graph semantics so behavior is consistent across visualizers.
- Exit Criteria:
- Cartesian max magnitude uses the same computation as graph visualizer window policy (`radix^digits - 1` semantics).
- End ticks represent semantic bounds only; no endpoint labels are shown.
- On overflow state, rendered vector switches to explicit red treatment.
- On NaN/error state, a prominent red null-set symbol (`∅`) is centered at origin and visually overlays axis content.
- Symbolic-result handling is not expanded in this slice; symbolic cleanup remains scoped to a separate dedicated slice.

### Slice `slice_ux_feedback_standardization`
- User Story: As a player, I want every rejected input and every state transition to provide clear feedback so I always understand what happened and why.
- Exit Criteria:
- Every rejected input path provides explicit, user-visible feedback.
- Every state transition path provides explicit transition feedback.
- Feedback is consistent in wording, motion timing, and visual treatment.
- Critical paths are covered by tests for rejection and transition feedback contracts.

## Next

### Slice `slice_function_builder_bar_standardization`
- User Story: As a player, I want the function builder bar to look and behave consistently across states so editing functions feels predictable.
- Exit Criteria:
- Builder bar visuals are consistent across calculator shells and interaction modes.
- Slot states (empty, filled, selected, invalid target) use standardized styling language.
- Drag/drop and tap insertion feedback is consistent in builder bar contexts.
- Targeted builder-bar regressions are covered by UI module tests.

## Later

### Slice `slice_content_completion_pass`
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
- User Story: As a player, I want progression and reward status to be shown visually so I can scan my status faster than reading verbose text blocks.
- Exit Criteria:
- Goal/reward text blocks are replaced by visual progress/signal bars in primary progression surfaces.
- Bars are legible on desktop and mobile form factors.
- Visual states remain non-spoiler and preserve current hint fidelity.
- Accessibility baseline is preserved (contrast and non-color cue support).

## Shipped Trains

Record shipped trains here using this format:

### Train v0.9.31 (2026-03-31)
- Included Slice IDs:
- `slice_complex_invariant_lock`
- `slice_player_input_gate_real_digit_only`
- `slice_complex_result_representation`
- `slice_all_operator_complex_left_operand`
- `slice_roll_diagnostics_persistence_parity`
- `slice_complex_operator_invariant_refresh`
- `slice_remaining_complex_operator_rollout`
- `slice_gaussian_domain_projection_and_regression`
- Release Note IDs:
- `release_v0_9_31`
- Player-facing highlights:
- Complex value handling is now exact end-to-end in runtime, roll records, persistence, and diagnostics.
- Complex-left operator behavior and Gaussian domain projection paths were implemented with parity coverage.

### Train v0.9.32 (2026-03-31)
- Included Slice IDs:
- `slice_cleanup_layer1_step1_harness_hardening`
- `slice_operator_execution_policy_registry`
- `slice_execution_cluster_stabilization_pre_ir`
- `slice_runtime_invariants_strict_v1_relock`
- `slice_typed_execution_ir_strangler`
- `slice_ir_first_reducer_consolidation`
- Release Note IDs:
- `release_v0_9_32`
- Player-facing highlights:
- Execution flow is now IR-first across reducer and engine runtime paths, with behavior parity preserved.
- Auto-step/step-through/wrap-tail and multi-calculator execution-isolation contracts were expanded and stabilized.

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
