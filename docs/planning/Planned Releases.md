Truth 2: Releases

# Planning Board

This file is the canonical active planning board.
Active work is versionless. Semver is assigned only when a shipped train is cut.

## Now

### Slice `slice_architecture_orphan_cleanup`
- Owner: `TBD`
- Status: `ready`
- User Story: As a developer, I want architecture boundary checks to pass cleanly so the codebase stays maintainable and layering regressions are caught early.
- Exit Criteria:
- `node scripts/check-boundaries.mjs` exits successfully.
- `dist/reports/orphan-modules.json` reports no actionable orphans.
- `src/domain/memorySelection.ts` is either removed as dead code or intentionally integrated with clear ownership.

### Slice `slice_planning_invariant_id_consistency`
- Owner: `TBD`
- Status: `ready`
- User Story: As a developer, I want invariant IDs to remain internally consistent so planning, traceability, and implementation review use the same contract vocabulary.
- Exit Criteria:
- `docs/functional-spec.md` gap report references `FS-BND-05` consistently where boundary lifecycle explicitness is discussed.
- No stale `FS-BND-06` reference remains unless a real clause with that ID exists.

### Slice `slice_control_selection_model_unification`
- Owner: `TBD`
- Status: `ready`
- User Story: As a developer, I want control selection normalization to use one canonical model so future control-profile expansion does not break settings semantics.
- Exit Criteria:
- Canonical selection logic is based on `ControlField` (`alpha..epsilon`) without hidden narrowing to legacy subsets.
- Legacy memory-variable mapping remains adapter-only at compatibility boundaries.
- Coverage includes fixtures that prove valid non-`alpha` selections are preserved when settable by profile policy.

### Slice `slice_boundary_direct_mutation_contract`
- Owner: `TBD`
- Status: `ready`
- User Story: As a developer, I want direct mutation-bypass behavior tests so cross-interface boundary violations are detected even if import boundaries still pass.
- Exit Criteria:
- Dedicated executable contract tests assert `FS-BND-01` behavior: global/progression state cannot directly mutate calculator-owned runtime/execution state outside explicit domain action flow.
- Traceability references are updated to include the new direct boundary mutation suite.

### Slice `slice_control_matrix_locality_contracts`
- Owner: `TBD`
- Status: `ready`
- User Story: As a developer, I want explicit control-matrix locality contracts so calculator capability envelopes are validated as local and deterministic.
- Exit Criteria:
- Dedicated contracts assert `FS-CS-02` envelope behavior (keypad dimensions, slot count, range, cadence semantics) under per-calculator settable/derived policies.
- Tests assert no cross-calculator leakage when control variables mutate on a targeted calculator.
- Traceability gaps for `FS-CS-02` are updated based on resulting coverage.

### Slice `slice_app_ui_motion_bridge_decoupling`
- Owner: `TBD`
- Status: `ready`
- User Story: As a developer, I want app-level cue workflows decoupled from concrete UI motion modules so subsystem seams remain replaceable and easier to reason about.
- Exit Criteria:
- Cue coordinators in `src/app` consume a contract/service boundary for motion settlement instead of importing concrete `src/ui` motion modules directly.
- Existing cue behavior parity is preserved through tests.
- Import/dependency boundaries remain green after refactor.

## Next

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

### Slice `slice_ux_feedback_standardization`
- Owner: `TBD`
- Status: `ready`
- User Story: As a player, I want every rejected input and every state transition to provide clear feedback so I always understand what happened and why.
- Exit Criteria:
- Every rejected input path provides explicit, user-visible feedback.
- Every state transition path provides explicit transition feedback.
- Feedback is consistent in wording, motion timing, and visual treatment.
- Critical paths are covered by tests for rejection and transition feedback contracts.

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

