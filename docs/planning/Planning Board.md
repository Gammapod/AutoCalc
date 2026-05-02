Truth: 2 - Releases

# Planning Board

This file is the canonical active planning board.
Active work is versionless. Semver is assigned only when a shipped train is cut.

## Now

### Slice `slice_headless_lock_state_spec_alignment`
- Estimated Complexity: Low
- User Story: As a designer, I want the functional spec to describe the intended three lock states so headless, UI, and tests are judged against the same progression contract.
- Exit Criteria:
- `FS-UP-07` defines portable, installed-only, and locked/not-pressable states.
- Spec wording no longer says installed locked keys are press-usable when the intended state is locked/not-pressable.
- Relevant headless documentation uses the same lock-state terms.
- No runtime behavior changes are introduced by this slice.
- Owner: TBD
- Status: Completed

### Slice `slice_unlock_digit_1_total_9_id_alignment`
- Estimated Complexity: Low
- User Story: As a player or tester reading unlock output, I want unlock identifiers to match their actual conditions so raw headless output is not misleading.
- Exit Criteria:
- `unlock_digit_1_portable_on_total_equals_9` is used for the total-9 predicate, description, tests, and reports.
- Tests, generated unlock reports, and documentation references are updated to the final identifier.
- Save/completed-unlock compatibility impact is reviewed and handled or explicitly documented as not needed.
- Headless completed-unlock output no longer exposes the stale total-2 identifier.
- Owner: TBD
- Status: Completed

### Slice `slice_headless_unlock_all_terse_default`
- Estimated Complexity: Low
- User Story: As a headless-mode user setting up a scenario, I want `unlockAll` to return a terse success response by default so setup commands do not flood the transcript.
- Exit Criteria:
- Default `unlockAll` response returns a short success message, unlocked count, and layout-changed indicator if applicable.
- Default response omits bulky completed-unlock rows and verbose unlock diffs.
- `unlockAll` with `verbose:true` still exposes detailed state useful for debugging.
- README/headless help documents the terse default and verbose option.
- Owner: TBD
- Status: Completed

### Slice `slice_headless_user_action_acceptance_field`
- Estimated Complexity: Low
- User Story: As a headless-mode user, I want user-action commands to clearly say whether the requested action was accepted so protocol success is not confused with domain success.
- Exit Criteria:
- `press`, `drop`, and any equivalent user-action response include `accepted:boolean`.
- Rejected actions include a stable `reasonCode` at the response level while preserving existing feedback details.
- Invalid/no-op drops return `ok:true`, `accepted:false`, and a specific reason code.
- Headless tests cover accepted and rejected examples.
- Owner: TBD
- Status: Completed

### Slice `slice_headless_single_digit_limit_feedback`
- Estimated Complexity: Low-Medium
- User Story: As a sandbox user, I want one-digit seed and operand limits to be visible from headless output so replacement behavior feels intentional instead of broken.
- Exit Criteria:
- Headless `help` or compact `snapshot` exposes input limits such as seed digit count and operand digit count.
- Digit press feedback indicates when an existing digit was replaced.
- UI-facing follow-up recommendation is documented for representing one active digit cell without changing the gameplay rule.
- Tests cover seed replacement and draft operand replacement metadata.
- Owner: TBD
- Status: Planned

### Slice `slice_headless_operator_metadata_baseline`
- Estimated Complexity: Low-Medium
- User Story: As a sandbox user exploring operators, I want safe baseline metadata for each key so I can tell category, arity, and design maturity without treating unfinished semantics as final documentation.
- Exit Criteria:
- Headless key discovery exposes label, category, arity where known, and experimental/deferred status where applicable.
- No new authoritative descriptions are added for operators whose exact player-facing semantics are still being designed.
- README/headless help explains that deeper operator explanation is intentionally limited for unfinished operators.
- Tests cover representative arithmetic, advanced, and deferred/experimental keys.
- Owner: TBD
- Status: Planned

### Slice `slice_headless_settings_visualizer_snapshot`
- Estimated Complexity: Medium
- User Story: As a headless-mode user pressing visualizer and toggle keys, I want compact snapshots to show relevant settings changes so I can verify what changed without dumping full state.
- Exit Criteria:
- Compact snapshots include active visualizer and relevant wrapper/base/step/history/forecast/cycle settings.
- Visualizer/toggle button flags that affect current behavior are included or explicitly scoped out with rationale.
- Pressing representative visualizer/toggle keys produces observable compact snapshot differences.
- Headless tests cover at least one visualizer switch and one settings toggle.
- Owner: TBD
- Status: Planned

### Slice `slice_headless_progress_hint_command`
- Estimated Complexity: Medium
- User Story: As a game-mode headless user, I want a compact progression/hints command so I can understand eligible unlock goals without reading code or raw unlock IDs.
- Exit Criteria:
- A `progress` or `hints` command returns eligible unlock hint rows using canonical hint/progress projection data.
- Rows include human-facing description, target/effect summary, predicate category, and current/target progress where available.
- Completed unlock IDs remain available for debugging but are not the only progression signal.
- Tests cover fresh-game hints and a post-unlock hint/progress transition.
- Owner: TBD
- Status: Planned

### Slice `slice_headless_growth_progress_diagnostics`
- Estimated Complexity: Medium
- User Story: As a headless user testing growth-order unlocks, I want terse progress diagnostics so repeated operations show that evidence is accumulating even before the unlock completes.
- Exit Criteria:
- Headless progress output includes a limited growth-order diagnostic for relevant eligible unlocks.
- Diagnostic avoids over-explaining final puzzle semantics while exposing candidate trend, window size, and progress fraction where available.
- Total-7 `unary_inc` exploration produces an understandable "not enough evidence yet" style signal.
- Growth-order unlock tests cover incomplete and completed evidence windows.
- Owner: TBD
- Status: Planned

### Slice `slice_headless_key_id_install_command`
- Estimated Complexity: Medium-High
- User Story: As a sandbox headless user, I want to install portable unlocked keys by key ID so I do not have to discover raw storage layout slots that may not mirror the UI palette.
- Exit Criteria:
- New `install` command accepts a key ID, destination surface/index, and optional calculator ID.
- `drop` remains available for layout-parity testing.
- `listKeys` distinguishes portable, installable, installed, and intentionally unavailable constants.
- Ordinary portable keys such as division can be installed without a storage source cell.
- Tests cover successful install, unavailable constant handling, and invalid destination handling.
- Owner: TBD
- Status: Planned

### Slice `slice_headless_multi_calculator_discovery`
- Estimated Complexity: Medium-High
- User Story: As a sandbox headless user, I want to discover and inspect each calculator independently so multi-calculator state is understandable from the text protocol.
- Exit Criteria:
- `listCalculators` returns calculator ID, symbol, active flag, keypad dimensions, and terse state summary.
- `setActiveCalculator` switches active calculator through a discoverable command.
- `snapshot` accepts `calculatorId` and can project a non-active calculator without switching.
- Existing `layout`, `listKeys`, `press`, and `tick` calculator scoping remains compatible.
- Tests cover calculator listing, active switch, and scoped snapshot behavior.
- Owner: TBD
- Status: Planned

### Slice `slice_unlock_completion_effect_channel`
- Estimated Complexity: High
- User Story: As a player and headless-mode user, I want newly completed unlocks to emit a clear effect payload so both frontend feedback and headless summaries can explain what changed.
- Exit Criteria:
- Unlock completion produces a domain/UI effect with unlock ID, description, target label, effect type, and affected key/calculator where applicable.
- Frontend can consume the effect for unlock feedback without inferring solely from state snapshots.
- Headless command responses expose newly completed unlock effects in a human-readable summary.
- Existing unlock state evaluation remains deterministic and shell-invariant.
- Contract tests cover key unlock, calculator unlock if available, and no-duplicate effect emission.
- Owner: TBD
- Status: Planned

### Slice `slice_cleanup_persistence_and_runtime_boundaries`
- Estimated Complexity: High
- User Story: As an engineer, I want save migration and runtime wiring boundaries to be explicit and deterministic so cleanup work does not introduce silent regressions.
- Exit Criteria:
- Persistence load accepts the current save schema only, with explicit failure reasons for unsupported and malformed payloads.
- Older save schemas are rejected instead of migrated.
- Domain command dispatch emits UI feedback through one consolidated pipeline path.
- Visualizer host panel visibility and transition state updates avoid duplicate/stale DOM mutations.
- Legacy allocator/memory/eigen test assumptions are non-authoritative for current runtime and are rebaselined or retired from active CI scope.
- Owner: TBD
- Status: Planned

## Next

### Slice `slice_visualizer_hint_domain_chip_post_success_signal`
- User Story: As a player, I want domain-family feedback to appear only after I satisfy its unlock condition so the UI celebrates success without pre-solving progression.
- Exit Criteria:
- `total.domain_chip` does not render any pre-success indicator while unresolved.
- A post-success-only signal is defined and implemented for `roll_contains_domain_type` completion (timing, duration, and visual channel).
- Post-success behavior does not alter unlock state, key loadout, or predicate evaluation semantics.
- Regression coverage verifies no pre-success leak and validates post-success display trigger.

### Slice `slice_visualizer_hint_surface_rollout_remaining_v1`
- User Story: As a player, I want each play-facing visualizer to provide consistent near-miss hint surfaces so progression cues are readable across contexts.
- Exit Criteria:
- Remaining unimplemented matrix hint surfaces are either implemented or explicitly deferred with rationale:
- `number_line.sequence_window`
- `number_line.quadrant_highlights`
- `circle.angle_measure`
- `circle.polygon_inscription`
- `circle.quadrant_highlights`
- `ratios.denominator_threshold_marker`
- `ratios.constant_denominator`
- Each implemented hint follows unresolved-only near-miss policy unless explicitly documented otherwise.
- Visual coexistence contracts are maintained (cycle/history/forecast overlays remain additive and non-destructive).
- Matrix status column is updated to reflect final disposition per hint type.

### Slice `slice_visualizer_hint_predicate_plumbing_phase2`
- User Story: As a systems engineer, I want proposed hint predicates promoted into canonical runtime plumbing so future hint surfaces are driven by evaluable contracts instead of placeholders.
- Exit Criteria:
- Proposed predicates required by remaining hint surfaces are added to canonical predicate types and evaluator plumbing with deterministic behavior and tests.
- Predicate capability documentation is updated to match new runtime support.
- Unlock catalog usage is validated for new predicate types (including unresolved/satisfied/completed handling paths).
- No unplanned persistence schema break is introduced; any compatibility cutoff is documented in release notes.

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

### Train v1.1.1 (2026-04-18)
- Included Slice IDs:
- `slice_analytics_settings_split_history_forecast_cycle`
- `slice_analytics_toggle_non_interrupting_execution_policy`
- `slice_visualizer_forecast_history_cycle_gating_split`
- `slice_graph_forecast_step_overlay_points`
- `slice_graph_fixed_31_value_x_window`
- Release Note IDs:
- `release_v1_1_1`
- Player-facing highlights:
- Analytics toggles are now split and explicit: `History`, `Fcast`, `Cycle`, and `[ ??? ]` each control distinct visual behavior.
- Forecast and step projections are now clearly separated across visualizers, with graph-specific forecast and step points at `x = current + 1`.

### Train v1.0.0 (2026-04-08)
- Included Slice IDs:
- `slice_algebraic_rotation_runtime_exactness`
- `slice_unary_rotate_15_execution_and_inverse`
- `slice_circle_visualizer_algebraic_projection`
- `slice_release_docs_math_model_guardrail`
- Release Note IDs:
- `release_v1_0_0`
- Player-facing highlights:
- 15-degree rotation (`? ?/6`) now executes with exact algebraic scalar runtime behavior.
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
