Truth 2: Releases

# Planning Board

This file is the canonical active planning board.
Active work is versionless. Semver is assigned only when a shipped train is cut.

## Recently Archived (Unreleased)

### Slice `slice_error_state_regularization_for_visualizers` (Archived 2026-04-02)
- Status: Completed and archived from active planning.
- Delivered scope:
- Canonicalized error codes for overflow/NaN paths.
- Implemented terminal-NaN lock semantics in execution policy.
- Extended NaN lock to reject execution and operator key categories.

### Slice `slice_visualizer_cartesian_v1_real_axis` (Archived 2026-04-03)
- Status: Completed and archived from active planning.
- Delivered scope:
- Implemented visualizer id/key/panel wiring as `number_line` with standard host behavior (single active panel, inactive-panel clear).
- Rendered horizontal axis with 19 ticks (`-9..9`) and emphasized center tick in real mode.
- Rendered real-mode vector from origin to current real position.
- Kept axis and vector presentation within host visualizer bounds.

### Slice `slice_visualizer_cartesian_v1_complex_grid` (Archived 2026-04-03)
- Status: Completed and archived from active planning.
- Delivered scope:
- Complex plane mode is activated only when current value has non-zero imaginary component.
- Complex mode adds vertical axis and projected grid subdivisions matching horizontal subdivision count.
- Complex vector renders from origin to `(Re, Im)` coordinates.
- Vertical-axis/grid clipping is accepted in v1 and covered by current fit-contract behavior.
- Viewport remains fixed to the shipped v1 `number_line` panel geometry.

### Slice `slice_visualizer_cartesian_v1_range_and_error_semantics` (Archived 2026-04-03)
- Status: Completed and archived from active planning.
- Delivered scope:
- Dynamic max magnitude uses graph-aligned radix tier semantics (`radix^digits - 1` progression by tier).
- Endpoint scale labels are rendered in v1 to expose active range bounds.
- Current-roll error state applies explicit red treatment to plane/axis/grid styling.
- Error signaling remains style-driven in v1 (no in-panel null-set overlay in this slice).
- Symbolic-result handling remains out of scope for this slice.

## Now

- No active slices.

### Slice `slice_perf_hidden_instance_render_elimination`
- User Story: As a player, I want mode and runtime updates to avoid wasted hidden-instance work so interactions stay responsive.
- Goal: Stop rendering hidden calculator instances.
- Dependencies: none.
- Complexity: S (0.5-1 day).
- Expected Return: Medium-High runtime win in multi-instance DOM contexts.
- Maps to concern: hidden instance rendering.
- Exit Criteria:
- Hidden calculator instances are not passed through full module render paths.
- Active instance behavior and visual output remain unchanged.
- Runtime tests prove hidden instances are not rendered.

### Slice `slice_perf_game_state_persistence_scheduling`
- User Story: As a player, I want game progress persistence to feel immediate but non-blocking so gameplay remains smooth.
- Goal: Replace per-update synchronous save with debounced/coalesced persistence scheduling.
- Dependencies: none.
- Complexity: M (1-2 days).
- Expected Return: High interaction smoothness; Medium-High pre-transition responsiveness.
- Maps to concern: synchronous `localStorage` write path.
- Planned Interface / Contract: `PersistenceSaveScheduler` with debounced save, coalescing, and explicit `save_now` for critical transitions.
- Exit Criteria:
- Save scheduling coalesces frequent updates while preserving durability guarantees.
- Critical transitions can force immediate persistence via `save_now`.
- Performance guard checks enforce bounded save frequency.

### Slice `slice_perf_visualizer_lifecycle_stabilization`
- User Story: As a player, I want visualizer switching to be smooth and stable so changing views does not hitch.
- Goal: Keep inactive visualizers dormant without unnecessary teardown/recreate churn; preserve graph instance where safe.
- Dependencies: none (benefits from slice 1 already landed).
- Complexity: M (1-3 days).
- Expected Return: Medium-High visualizer switch responsiveness.
- Maps to concern: visualizer host clear/destroy loop.
- Planned Interface / Contract: `VisualizerLifecyclePolicy` defining active/inactive/teardown behavior by panel type.
- Exit Criteria:
- Inactive visualizers are not fully destroyed unless policy requires teardown.
- Graph visualizer avoids unnecessary destroy/recreate cycles across panel switches.
- Visualizer-switch tests verify no avoidable graph teardown churn.

### Slice `slice_perf_boot_dependency_lazy_loading`
- User Story: As a player, I want faster app startup and mode-entry so I can get into gameplay quickly.
- Goal: Defer heavy libraries (`katex`, `chart`, `algebrite`) behind feature usage.
- Dependencies: none.
- Complexity: M (1-3 days).
- Expected Return: High cold-boot win; Medium warm-reload win.
- Maps to concern: eager third-party boot load.
- Exit Criteria:
- Heavy third-party libraries are loaded on-demand by feature path.
- Boot-path checks confirm dependency deferral in CI-friendly guard tests.
- Feature behavior remains parity-correct after lazy loading.

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

### Slice `slice_perf_calculator_incremental_rendering`
- User Story: As a player, I want calculator updates to remain fluid under frequent actions so sustained runtime performance stays high.
- Goal: Replace full calculator DOM rebuild with patch-based updates for slot/roll/keypad regions.
- Dependencies: recommended after `slice_perf_hidden_instance_render_elimination` and `slice_mode_transition_in_app_runtime_v1`.
- Complexity: L (4-6 days).
- Expected Return: High sustained runtime responsiveness and FPS improvements.
- Maps to concern: full calculator rebuild every render.
- Planned Interface / Contract: calculator render-module incremental patch invariants.
- Exit Criteria:
- Calculator rendering updates changed regions without full-root rebuild.
- Behavior parity is preserved for input, animation hooks, and interaction bindings.
- Performance guard checks show bounded render work for no-op/minor actions.

### Slice `slice_perf_storage_incremental_rendering`
- User Story: As a player, I want storage interactions and sort/filter updates to remain snappy even during frequent changes.
- Goal: Replace full storage list/sort rebuild with keyed incremental updates.
- Dependencies: recommended after `slice_perf_calculator_incremental_rendering` patterns are established.
- Complexity: L (2-4 days).
- Expected Return: Medium-High for frequent storage update/sort scenarios.
- Maps to concern: full storage rebuild every render.
- Planned Interface / Contract: storage render-module incremental patch invariants.
- Exit Criteria:
- Storage rendering updates keyed elements incrementally instead of full container rebuild.
- Sort/filter interactions preserve correctness and visual parity.
- Regression tests cover desktop/mobile shell behavior for storage interactions.

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
