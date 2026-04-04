Truth 2: Releases

# Planning Board

This file is the canonical active planning board.
Active work is versionless. Semver is assigned only when a shipped train is cut.

## Now

- No active slices.

## Next

### Slice `slice_ux_feedback_standardization`
- User Story: As a player, I want every rejected input and every state transition to provide clear feedback so I always understand what happened and why.
- Exit Criteria:
- Every rejected input path provides explicit, user-visible feedback.
- Every state transition path provides explicit transition feedback.
- Feedback is consistent in wording, motion timing, and visual treatment.
- Critical paths are covered by tests for rejection and transition feedback contracts.

### Slice `slice_function_builder_bar_standardization`
- User Story: As a player, I want the function builder bar to look and behave consistently across states so editing functions feels predictable.
- Exit Criteria:
- Builder bar visuals are consistent across calculator shells and interaction modes.
- Slot states (empty, filled, selected, invalid target) use standardized styling language.
- Drag/drop and tap insertion feedback is consistent in builder bar contexts.
- Targeted builder-bar regressions are covered by UI module tests.

## Later

### Slice `slice_mode_transition_in_app_runtime_v1`
- User Story: As a player, I want mode switching to be immediate and seamless so context changes do not reload the app shell.
- Goal: Replace URL-reload mode switching with an in-runtime mode transition coordinator.
- Dependencies: requires `slice_perf_game_state_persistence_scheduling`; recommended after `slice_perf_boot_dependency_lazy_loading`.
- Complexity: L (3-6 days).
- Expected Return: Very High mode-switch latency and UX continuity gains.
- Maps to concern: full page reload on mode switch.
- Planned Interface / Contract: `ModeTransitionCoordinator` for in-app mode transitions.
- Exit Criteria:
- Mode transitions (`game`, `sandbox`, `main_menu`) run without full page reload.
- Transition behavior preserves mode-specific save/clear policies.
- Mobile/desktop shell parity remains intact across mode transitions.
- Promotion Rule: Move this slice to `Next` after slices 1-4 are complete and stable.

### Slice `slice_mode_transition_policy_contracts`
- User Story: As a player, I want mode transitions to be reliable so save and reset outcomes are always correct.
- Goal: Formalize mode transition save/clear/hydrate policy contracts and tests.
- Dependencies: depends on `slice_mode_transition_in_app_runtime_v1` design; can proceed in parallel once interfaces are drafted.
- Complexity: M (1-2 days).
- Expected Return: Indirect High through risk and regression reduction.
- Maps to concern: transition correctness under new architecture.
- Exit Criteria:
- Contract tests cover `save_current`, `clear_save`, and `none` outcomes.
- Hydration-equivalence checks pass for all mode transition entry points.
- Policy behavior is explicit and documented at app-domain boundary.

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

### Train v0.10.1 (2026-04-04)
- Included Slice IDs:
- `slice_perf_hidden_instance_render_elimination`
- `slice_perf_game_state_persistence_scheduling`
- `slice_perf_visualizer_lifecycle_stabilization`
- `slice_perf_boot_dependency_lazy_loading`
- `slice_perf_calculator_incremental_rendering`
- `slice_perf_storage_incremental_rendering`
- `slice_error_state_regularization_for_visualizers`
- `slice_visualizer_cartesian_v1_real_axis`
- `slice_visualizer_cartesian_v1_complex_grid`
- `slice_visualizer_cartesian_v1_range_and_error_semantics`
- Release Note IDs:
- `release_v0_10_1`
- Player-facing highlights:
- Performance stabilization slices are shipped across render, persistence, visualizer lifecycle, and boot dependency paths.
- Cartesian visualizer v1 (real and complex modes) plus canonicalized error-state semantics are now included in released scope.

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
