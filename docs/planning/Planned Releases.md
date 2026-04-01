Truth 2: Releases

# Planning Board

This file is the canonical active planning board.
Active work is versionless. Semver is assigned only when a shipped train is cut.

## Now

### Slice `slice_complex_invariant_lock`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want complex-number behavior to be explicit and stable so runtime math and planning docs match.
- Exit Criteria:
- `docs/math-spec.md` and planning docs align on complex-result recording with explicit `im=0`.
- Player input constraints are explicit: initial seed/right operand are digit-only.
- Scope guard is explicit: dormant legacy paths are retained unless needed for invariant enforcement.

### Slice `slice_player_input_gate_real_digit_only`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want seed and right-operand entry to be strictly digit-based so input behavior is predictable.
- Exit Criteria:
- Initial seed entry accepts only `0..9`.
- Binary right operand entry accepts only `0..9`.
- `const_pi` and `const_e` are blocked from direct player seed/right-operand entry.

### Slice `slice_complex_result_representation`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want roll results to preserve exact complex form so seeded follow-up execution is consistent.
- Exit Criteria:
- Successful roll rows record exact complex values with explicit `re/im`, including `im=0`.
- Runtime total remains type-consistent with recorded result.
- Equality helpers treat real and zero-imaginary-complex values as equivalent where required.

### Slice `slice_all_operator_complex_left_operand`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want unary/binary execution to work when the running total is complex so roll continuation does not break.
- Exit Criteria:
- Unary operators accept complex operands with exact behavior or policy-consistent rejection.
- Binary operators accept complex left operands with digit-derived right operands.
- No floating-point fallback is introduced.

### Slice `slice_roll_diagnostics_persistence_parity`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want save/load and diagnostics to remain coherent after complex rollout.
- Exit Criteria:
- Persistence round-trips explicit complex roll rows and totals.
- Roll-analysis invalidation behavior remains stable for non-rational diagnostics paths.
- Read-model/display parity tests cover explicit `im=0` handling without losing complex storage fidelity.

### Slice `slice_complex_operator_invariant_refresh`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want deferred complex-operator policy to be canonical before implementation so runtime behavior stays deterministic.
- Exit Criteria:
- `docs/math-spec.md` and planning docs replace deferred complex-reject rows for remaining operators with accepted policy.
- Comparison fallback policy is explicit: exact-first, approximation fallback only for branch decisions, `epsilon = 1e-12`.
- Tie policy is explicit: `unary_not` boundary/tie => `1`; `op_max/op_min` ties choose left.
- Domain projection union includes `ℤ(𝕀)` for Gaussian integers.

### Slice `slice_remaining_complex_operator_rollout`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want remaining deferred operators to work with complex totals under consistent Gaussian and comparison rules.
- Exit Criteria:
- Gaussian magnitude policy implemented for `op_euclid_div` and `op_mod`; Gaussian norm policy implemented for `op_gcd`, `op_lcm`, `unary_sigma`, `unary_phi`, `unary_omega`.
- Componentwise policy implemented for Gaussian paths of `op_rotate_left`, `unary_collatz`, `unary_sort_asc`, `unary_mirror_digits`.
- `unary_floor` and `unary_ceil` execute componentwise for all complex totals.
- `op_max` / `op_min` use modulus compare for all complex totals with deterministic tie-left behavior.
- `unary_not` supports all complex totals via `re + im <= 0` with exact-first compare and approximation fallback.

### Slice `slice_gaussian_domain_projection_and_regression`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want Gaussian complex values reflected in domain indicators without breaking roll/read-model parity.
- Exit Criteria:
- `getRollYDomain` returns `ℤ(𝕀)` for non-zero-imaginary complex values with integer `re/im`.
- Diagnostics/read-model domain-category logic classifies `ℤ(𝕀)` as complex.
- Regression matrix covers Gaussian accept paths, non-Gaussian rejection parity, and exact-result persistence.

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
