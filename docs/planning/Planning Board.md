Truth 2: Releases

# Planning Board

This file is the canonical active planning board.
Active work is versionless. Semver is assigned only when a shipped train is cut.

## Now

- No active slices.

## Next

### Slice `n-ary_operators`
- User Story: As a player, I want the calculator to contain N-ary operations, so that advanced results related to `e` and prime numbers can be reached.
- Delivery Plan: Implement as ordered dependent slices below.
- Critical Path: `slice_nary_operator_contract_v1` -> `slice_nary_operand_model_v1` + `slice_nary_key_catalog_scaffold` -> `slice_nary_builder_draft_state_v1` -> `slice_nary_builder_display_tokens_v1` + `slice_nary_execution_symbolic_bridge` -> `slice_nary_execution_exact_prod_n` -> `slice_nary_policy_registry_integration` -> `slice_nary_unlock_capability_integration` -> `slice_nary_contract_tests_and_parity`.

### Slice `slice_nary_operator_contract_v1`
- User Story: As a developer, I want a single canonical contract for the first N-ary operator so implementation and tests align.
- Exit Criteria:
- First operator and domain contract is explicit (example: `ℿℕ{1..n}`).
- Seed behavior, binary-operand behavior, and error semantics are specified.
- Dependencies: none.

### Slice `slice_nary_key_catalog_scaffold`
- User Story: As a developer, I want N-ary keys represented in the key catalog and presentation layers so input plumbing can be routed.
- Exit Criteria:
- Key IDs, faces, and catalog entries exist for N-ary keys.
- Handler routing recognizes N-ary inputs.
- Runtime layout/state invariants accept N-ary keys.
- Dependencies: `slice_nary_operator_contract_v1`.

### Slice `slice_nary_operand_model_v1`
- User Story: As a developer, I want an explicit operand model for N-ary bounds so runtime does not rely on ad-hoc text.
- Exit Criteria:
- Slot operand model supports N-ary bound data.
- Persistence/serialization handles the new operand shape.
- Dependencies: `slice_nary_operator_contract_v1`.

### Slice `slice_nary_builder_draft_state_v1`
- User Story: As a player, I want to stage `∏ℕ{1.._}` inside binary slot drafting and then enter the bound digit.
- Exit Criteria:
- Drafting supports incomplete N-ary bound state.
- Digit input fills N-ary bound in draft state.
- Dependencies: `slice_nary_key_catalog_scaffold`, `slice_nary_operand_model_v1`.

### Slice `slice_nary_builder_toggle_unset`
- User Story: As a player, I want pressing the same N-ary key again to unset it while drafting.
- Exit Criteria:
- Repeat N-ary press toggles draft operand between set/unset states.
- Dependencies: `slice_nary_builder_draft_state_v1`.

### Slice `slice_nary_seed_entry_path_v1`
- User Story: As a player, I want to set the seed as N-ary (`∏ℕ{1..n}`) before adding slots.
- Exit Criteria:
- Seed entry path accepts and renders N-ary.
- Dependencies: `slice_nary_builder_draft_state_v1`.

### Slice `slice_nary_operand_retrofit_previous_slot`
- User Story: As a player, I want to convert an already-entered binary operand into N-ary if the next slot has not started.
- Exit Criteria:
- Workflow `2 [ + 4 ]` -> `2 [ + ∏ℕ{1..4} ]` is supported.
- Dependencies: `slice_nary_builder_draft_state_v1`.

### Slice `slice_nary_backspace_undo_semantics`
- User Story: As a player, I want backspace/undo to traverse N-ary draft and committed states predictably.
- Exit Criteria:
- Backspace/undo behavior for incomplete and complete N-ary states is deterministic and tested.
- Dependencies: `slice_nary_builder_toggle_unset`, `slice_nary_seed_entry_path_v1`, `slice_nary_operand_retrofit_previous_slot`.

### Slice `slice_nary_builder_display_tokens_v1`
- User Story: As a player, I want slot and algebraic displays to show N-ary forms clearly (`{1.._}`, `{1..n}`).
- Exit Criteria:
- Operation slot display and algebraic recurrence render N-ary draft/committed tokens.
- Dependencies: `slice_nary_builder_draft_state_v1`.

### Slice `slice_nary_execution_symbolic_bridge`
- User Story: As a developer, I want N-ary operands to pass through execution safely before exact evaluator rollout.
- Exit Criteria:
- Execution pipeline accepts N-ary operand kind without contract violations.
- Dependencies: `slice_nary_operand_model_v1`, `slice_nary_builder_display_tokens_v1`.

### Slice `slice_nary_execution_exact_prod_n`
- User Story: As a player, I want the first N-ary operator to evaluate with exact deterministic math.
- Exit Criteria:
- Exact evaluator for first N-ary operator is implemented.
- Domain invalid cases produce deterministic error outcomes.
- Dependencies: `slice_nary_execution_symbolic_bridge`.

### Slice `slice_nary_policy_registry_integration`
- User Story: As a developer, I want N-ary behavior integrated into execution policy and diagnostics contracts.
- Exit Criteria:
- Operator policy tables and diagnostics include N-ary behavior.
- Dependencies: `slice_nary_execution_exact_prod_n`.

### Slice `slice_nary_unlock_capability_integration`
- User Story: As a designer, I want unlock/capability systems to reason about N-ary keys and behaviors.
- Exit Criteria:
- Unlock and capability semantics include N-ary actions.
- Dependencies: `slice_nary_key_catalog_scaffold`, `slice_nary_policy_registry_integration`.

### Slice `slice_nary_contract_tests_and_parity`
- User Story: As a maintainer, I want N-ary behavior covered by contracts and parity fixtures to prevent regressions.
- Exit Criteria:
- Key behavior, reducer, display, and parity tests cover all agreed workflows.
- Dependencies: all previous N-ary slices.

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

### Slice `function_navigation_utility_keys` (unrefined, do not implement)
- key 1: select previous operation slot. Highlights previous slot for editing.
- key 2: select next operation slot. Highlights next slot for editing (cannot go beyond a not-fully-defined slot).

## Eventually

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
