Truth 2: Releases

# Planning Board

This file is the canonical active planning board.
Active work is versionless. Semver is assigned only when a shipped train is cut.

## Now

### Slice `slice_cleanup_persistence_and_runtime_boundaries`
- User Story: As an engineer, I want save migration and runtime wiring boundaries to be explicit and deterministic so cleanup work does not introduce silent regressions.
- Exit Criteria:
- Persistence load uses one authoritative migration flow (`current` or `current-1` only) with explicit failure reasons for unsupported and malformed payloads.
- Legacy schema migration resets deprecated settings and removes obsolete UI flags.
- Domain command dispatch emits UI feedback through one consolidated pipeline path.
- Visualizer host panel visibility and transition state updates avoid duplicate/stale DOM mutations.
- Legacy allocator/memory/eigen test assumptions are non-authoritative for current runtime and are rebaselined or retired from active CI scope.

## Next

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

### Slice `function_navigation_utility_keys` (unrefined, do not implement)
- key 1: select previous operation slot. Highlights previous slot for editing.
- key 2: select next operation slot. Highlights next slot for editing (cannot go beyond a not-fully-defined slot).

## Eventually

### Slice `values_from_index`

### Slice `values_from_other_calcs`

### Slice `slice_function_builder_bar_standardization`
- User Story: As a player, I want the function builder bar to look and behave consistently across states so editing functions feels predictable.
- Exit Criteria:
- Builder bar visuals are consistent across calculator shells and interaction modes.
- Slot states (empty, filled, selected, invalid target) use standardized styling language.
- Drag/drop and tap insertion feedback is consistent in builder bar contexts.
- Targeted builder-bar regressions are covered by UI module tests.

## Shipped Trains

Record shipped trains here using this format:

### Train v1.0.0 (2026-04-08)
- Included Slice IDs:
- `slice_algebraic_rotation_runtime_exactness`
- `slice_unary_rotate_15_execution_and_inverse`
- `slice_circle_visualizer_algebraic_projection`
- `slice_release_docs_math_model_guardrail`
- Release Note IDs:
- `release_v1_0_0`
- Player-facing highlights:
- 15-degree rotation (`↶ ⦜/6`) now executes with exact algebraic scalar runtime behavior.
- Circle, graph, and number-line visualizer projections now handle algebraic results consistently.

### Train v0.10.2 (2026-04-04)
- Included Slice IDs:
- `slice_mode_transition_in_app_runtime_v1`
- `slice_mode_transition_policy_contracts`
- Release Note IDs:
- `release_v0_10_2`
- Player-facing highlights:
- Mode transitions (`game`, `sandbox`, `main_menu`) now run in runtime with no URL reload path.
- Transition save policies (`none`, `save_current`, `clear_save`) are contract-tested with hydration-equivalence matrix coverage.

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
