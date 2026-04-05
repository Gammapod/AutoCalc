Truth 2: Releases

# Release v0.10.2: Runtime Mode Transition Canonicalization (Shipped 2026-04-04)

### Included Slice IDs
- `slice_mode_transition_in_app_runtime_v1`
- `slice_mode_transition_policy_contracts`

### Delivered Behavior
- Mode transitions are now canonical runtime transitions with no URL-reload fallback path in app bootstrap.
- Transition policy handling remains behavior-preserving and explicit:
  - `none`: no persistence side effects before hydrate.
  - `save_current`: schedule + flush current state before hydrate.
  - `clear_save`: cancel pending schedule + clear persisted state before hydrate.
- Hydration path is canonical for all transition targets (`game`, `sandbox`, `main_menu`) via `HYDRATE_SAVE` + active mode synchronization.

### App-Domain Boundary Mapping
- `system_*` key press -> `resolveSystemKeyIntent` (domain registry) -> `request_mode_transition` UI effect (`targetMode`, `savePolicy`) ->
  app subscription coordinator `onRequestModeTransition` -> `ModeTransitionCoordinator.requestModeTransition` ->
  policy side effects + `HYDRATE_SAVE` + `setCurrentMode`.

### Verification Snapshot
- Focused transition suites green at release cut:
  - `app/mode-transition-coordinator`
  - `contracts/system-key-intent-registry`
  - `domain/system-keys-mode-switch-effects`
  - `app/bootstrap-mode-transition-runtime-contract`
  - `app/bootstrap-persistence-scheduling`
  - `ui-integration/mobile-shell`
  - `ui-integration/desktop-shell`

### Release Notes
- Release Note ID: `release_v0_10_2`
- Player-facing summary: Mode switching now stays in runtime with explicit, contract-tested transition-policy behavior.

# Release v0.10.1: Performance Stabilization and Cartesian Visualizer v1 (Shipped 2026-04-04)

### Included Slice IDs
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
- `slice_ux_feedback_standardization`

### Delivered Behavior
- Runtime now avoids hidden-instance render work and introduces incremental-rendering guardrails for calculator and storage surfaces.
- Persistence scheduling now coalesces frequent updates while preserving explicit force-save behavior for critical transitions.
- Startup path now defers heavy dependencies and stabilizes visualizer lifecycle switching to reduce boot/switch overhead.
- Cartesian visualizer v1 shipped real-axis and complex-grid rendering with dynamic range labels and explicit error-state styling.
- Error-state regularization is canonicalized (overflow + NaN semantics) with terminal NaN lock enforcement across operator/execution inputs.

### Release Notes
- Release Note ID: `release_v0_10_1`
- Player-facing summary: Performance-focused runtime slices and cartesian visualizer v1 semantics are now shipped together in the 0.10.1 train.

# Release v0.9.32: IR-First Execution Consolidation (Shipped 2026-03-31)

### User Story
As a player, I want execution behavior to remain deterministic while the runtime architecture is consolidated, so cleanup/refactor work does not change outcomes.

### Delivered Behavior
- Consolidated reducer execution progression onto typed execution IR helpers across:
  - equals terminal execution
  - step-through progression
  - equals-toggle auto-step progression
  - wrap-tail terminal handling.
- Kept engine runtime IR-first and reduced legacy surface to a single internal parity comparator path.
- Unified plan-model ownership so wrap-stage semantics resolve from IR authority and compatibility adapters.
- Expanded deterministic parity harness coverage for:
  - IR builder/execution equivalence
  - reducer execution routing behavior
  - targeted multi-calculator execution isolation traces.

### Exit Criteria Snapshot
- Focused IR/parity and guard suites passed.
- Full release checkpoints passed at cut:
  - `npm run build:web:full`
  - `npm test` (`124/124` test groups)
  - `npm run ci:verify:boundaries`

### Release Notes
- Release Note ID: `release_v0_9_32`
- Player-facing summary: Execution architecture is now IR-first with parity-locked behavior and expanded regression harness coverage.
- Highlights:
- IR-first reducer/engine execution paths now provide a unified, deterministic evaluation flow.
- Cleanup-wave hardening gates are fully green and documentation is synchronized.

# Release v0.9.30: Boundary Contracts and Cue Decoupling (Shipped 2026-03-28)

### User Story
As a developer, I want architecture seams to be explicit and test-enforced so multi-calculator behavior stays deterministic while app/UI boundaries remain replaceable.

### Delivered Behavior
- Added explicit contract coverage for `FS-CS-02` control matrix locality (`contracts/control-matrix-locality`).
- Added explicit contract coverage for `FS-BND-01` direct mutation-bypass prevention (`contracts/boundary-direct-mutation`).
- Added domain coverage for canonical control-selection normalization and legacy adapter fallback behavior (`domain/control-selection`).
- Decoupled app cue workflows from direct UI motion imports by injecting a `MotionSettlementService` contract into cue coordinators.
- Removed dead orphan module `src/domain/memorySelection.ts`.
- Updated traceability docs and runbook references to align with completed invariant coverage.

### Exit Criteria Snapshot
- Full suite passed at release cut: `119/119` test groups.
- Full build passed at release cut: `npm run build:web:full`.

### Release Notes
- Release Note ID: `release_v0_9_30`
- Player-facing summary: Architecture seams are now explicit and contract-tested, with cue-motion behavior wired through replaceable service boundaries.
- Highlights:
- Added dedicated control-locality and direct-mutation boundary contract suites.
- App cue coordinators now depend on an injected motion-settlement contract instead of concrete UI module imports.

# Release v0.9.19: Unlock Hints in Visualizer (Shipped 2026-03-27)

Goal: replace checklist-first progression with contextual in-visualizer unlock guidance backed by deterministic, redacted progress projection contracts.

### Deliverables

- Canonical unlock hint-progress projection contract added and kept separate from boolean unlock truth evaluation.
- Predicate progress classification finalized for all predicate types used in the unlock catalog:
  - `partial` for progress-capable predicates
  - `binary` for explicit cycle-family exemptions.
- Cycle-family predicates set to binary-only (`roll_cycle_period_at_least`, `roll_cycle_transient_at_least`, `roll_cycle_diameter_at_least`, `roll_cycle_is_opposite_pair`).
- Deterministic normalized partial progress (`0..1`) with stable `current`/`target` fields for all catalog partial predicates.
- Full redacted hint-template mapping for current unlock catalog with spoiler-safe payload boundaries.
- Checklist UX surface retired; default visualizer now hosts numerical near-unlock hint slots for operator key, non-operator key, lambda point, and calculator unlock progress.

### Exit Criteria Snapshot

- Unlock outcomes unchanged by projection layer changes (parity preserved).
- Catalog predicate coverage complete with fail-fast regression protection for unclassified future predicate types.
- Hint output scope limited to eligibility + redacted progress payloads (no ranking policy in pre-work).
- Full suite passed at release cut: `115/115` test groups.

# Release v0.9.28: Storage Drawer Replacement (Shipped 2026-03-28)

### User Story
As a player, I can quickly find and deploy unlocked keys from storage without searching or deep menu traversal.

### Delivered Behavior
- Storage drawer now renders as a derived unlocked-key palette (all-and-only unlocked keys).
- Storage membership is non-mutable by drag: dragging to/from storage does not add/remove storage entries.
- Install semantics from storage use per-calculator key-ID uniqueness (duplicate installs are rejected on the same calculator).
- Dropping a storage key on an occupied keypad slot installs and replaces the destination key.
- Keys can be uninstalled by dragging off calculator surfaces, including executor keys such as `exec_equals`.
- Drawer filtering shipped with family controls and an explicit all-filter option.
- Drawer supports two modes:
  - `standard`: compact one-row viewport with calculator workspace kept clear above the drawer.
  - `browse`: expanded four-row viewport where drawer overlap with calculators is allowed.

### Exit Criteria Snapshot
- Palette lock/unlock correctness preserved with unlock-derived membership.
- Install/uninstall drag interactions are deterministic across desktop drag and touch rearrange flows.
- Full suite passed at release cut: `116/116` test groups.

### Release Notes
- Release Note ID: `release_v0_9_28`
- Player-facing summary: Storage is now a palette-style drawer for unlocked keys with fast filter browsing and direct install/uninstall drag actions.
- Highlights:
- Storage shows unlocked keys as a derived palette; drag operations do not mutate storage membership.
- Install is unique per calculator key ID, and occupied-slot installs replace the destination key.
- Standard and browse drawer modes support compact play and expanded scanning workflows.

# Release v0.9.10: Per-Calculator Memory & Matrix Isolation (Shipped 2026-03-26)

### User Story
As a player, each installed calculator keeps its own matrix-variable settings and memory-variable selection, so memory keys only affect the calculator I am actively using and the highlighted/Bracketed variable always matches what is actually changed.

### Dependencies
- Must be completed before additional UX work on memory/visualizer surfaces so UI work is built on stable calculator-local state contracts.
- Builds on v0.9.7 calculator-centric settings-state model and keeps `calculatorId`-scoped reducer routing as the source of targeting.

### Pre-work
Replace mixed global/per-calculator memory-selection behavior with a single calculator-local contract: settable variables and selected variable are derived per calculator profile, normalized through one invariant path, and consumed directly by memory handlers and display projections.

### Pre-work Exit Criteria
- Canonical runtime invariant exists for per-calculator memory selection validity using deterministic order `alpha -> beta -> gamma -> delta -> epsilon`.
- Calculator instances own matrix/lambda-related mutable values; no global fallback path mutates another calculator.
- Memory handlers (`cycle`, `adjust+/-`, `recall`) consume normalized selection only and do not perform hidden remapping/cross-axis fallback.
- Display projection reads the same normalized selected variable used by handlers (single source of truth).
- Reducer tests include explicit cross-calculator isolation guards for matrix, operation-slot, and max-digit related state.

### User Story Exit Criteria
- Each calculator can have a different settable-variable set and an independent current memory selection.
- If a calculator has no settable variables, it has no selection and no highlight; memory keys are explicit no-ops for that calculator.
- `memory_cycle_variable` advances only the installed calculator's selection within that calculator's settable variables.
- `memory_adjust_plus/minus` change only the installed calculator's currently selected variable.
- `memory_recall` reads only the installed calculator's currently selected variable.
- Actions on calculator `g` never mutate calculator `f` matrix values, operation slot counts, or digit limits (and vice versa).
- Highlight/bracketed selected variable in total/footer/visualizer always matches the variable actually read or adjusted by memory keys.
- Single-calculator behavior remains consistent with current expectations for `f` (`alpha/beta/gamma` cycle and adjust).

### Release Notes
- Release Note ID: `release_v0_9_10`
- Player-facing summary: Each calculator now keeps an isolated settable-variable selection and memory-key targeting.
- Highlights:
- Memory cycle/adjust/recall operate only on the active calculator's normalized settable selection.
- Selected variable highlight in footer/visualizer is synchronized with memory-key behavior.

# Release v0.9.7: Unified Settings State Model (Shipped 2026-03-26)

Goal: make calculator settings canonical and typed, with settings-key visuals derived from calculator state instead of settings button flags.

### Deliverables

- Calculator-centric settings model:
  - Added typed per-calculator settings families for `visualizer`, `wrapper`, `base`, and `stepExpansion`.
  - Settings family state no longer depends on settings-related `buttonFlags` entries.
- Family behavior + defaults:
  - Introduced central key-to-settings family mapping and default option constants.
  - Added `base` family support for `decimal` and `base2`.
- Forced-default semantics:
  - Locked+installed settings keys now define effective family default per calculator.
  - Precedence resolves deterministically by keypad order.
  - Pressing active setting key toggles back to effective default when applicable.
- Runtime/layout/persistence cutover:
  - Runtime invariants normalize settings and remove obsolete settings flags from `buttonFlags` paths.
  - Layout changes normalize selected setting to effective default when selected key leaves keypad.
  - Save schema bumped; legacy save migration resets settings families to typed defaults and preserves non-settings data.
- Startup + first paint stabilization:
  - Boot path normalizes state before store creation.
  - Key-label fit scheduling hardened to avoid first-load squished labels and stale visualizer projection on main menu.

### Exit Criteria Snapshot

- Canonical settings state is typed per calculator and drives behavior/rendering.
- Mutually exclusive settings-family behavior is intrinsic via single-option family state (not flag group coupling).
- Locked+installed forced defaults are deterministic and keyed by keypad order.
- Settings-family `buttonFlags` are no longer canonical state sources.
- Full suite passed at release cut: `113/113` test groups.

# Release v0.8.1 (Shipped 2026-03-14)

## Milestone: Independent Display + Keying Changes

Goal: ship independent feature work (visualizer semantics/layout, CE removal, function-slot display rework) without introducing step-through execution state.

### Scope

- Feature set #1 (default visualizer behavior/layout updates).
- Feature set #4 (remove CE and standardize on C paths).
- Feature set #5 (slot display format updates plus marquee overflow behavior).
- Explicitly out of scope: feature sets #2 and #3 (reserved for v0.8.2).

### Deliverables

- Total display updates:
  - NaN shows seven-segment `Err` / `Er` / `E` based on `maxTotalDigits`.
  - Rational-with-numerator-denominator shows seven-segment `FrAC` / `FrC` / `Fr` / `F` based on `maxTotalDigits`.
  - Remainder indicator uses `r=` prefix.
  - Minus glyph moves to just left of the leftmost active digit.
  - Number-domain indicator moves to prior minus position.
  - Memory/lambda row remains visible regardless of active visualizer.
- CE removal updates:
  - `CE` key removed from key catalog/presentation/layout defaults/sandbox preset.
  - CE-specific clear-entry routing removed; clear behavior standardized on `C`.
  - Unlock catalog/effects updated so CE-specific unlock paths no longer exist.
  - Save-load migration support for legacy states that still include CE references.
- Function slot display updates:
  - Arrow separators removed.
  - Seed placeholder introduced (`_ [ _ _ ] [ _ _ ]` style).
  - Seed value replaces leading `_` when entered.
  - Overflow behavior becomes ellipsis + slow bidirectional marquee with edge pauses.

### Exit Criteria

- No runtime references to CE remain in domain keying or default layouts.
- Total panel semantics match required display strings and truncation behavior across digit capacities.
- Slot display format and marquee behavior are stable on both mobile and desktop shells.
- Persistence round-trip succeeds for both fresh v0.8.1 states and legacy pre-v0.8.1 CE-bearing saves.
- Existing reducer parity invariants remain deterministic for non-step execution flows.

### Test Matrix

- Domain:
  - Update `tests/totalDisplay.test.ts` for new NaN/fraction token semantics and indicator placement assumptions.
  - Update/remove CE assertions in:
    - `tests/keyBehavior.contract.test.ts`
    - `tests/reducer.layout.test.ts`
    - `tests/reducer.input.test.ts`
    - `tests/unlocksDisplay.test.ts`
  - Add/adjust migration assertions in `tests/persistence.test.ts` for CE-bearing legacy payload normalization.
- UI contracts:
  - Update `tests/operationSlotDisplay.test.ts` for new seed-first format and no-arrow tokens.
  - Add slot overflow/marquee behavior checks (module or integration-level).
  - Update total-panel integration checks in `tests/uiIntegration.mobileShell.test.ts` for moved minus/domain/remainder conventions.
- Parity:
  - Refresh affected fixtures in `tests/contracts/fixtures/parityGolden.ts` and dependent parity tests.

# Release v0.8.2 (Shipped 2026-03-14)

## Milestone: Step-Through Execution + Expansion Toggle

Goal: introduce step-wise execution (`step_through`) and per-step expansion view (`[ ??? ]`) as a coordinated execution-state upgrade.

### Scope

- Feature set #2 (new execution key `step_through` with partial execution semantics).
- Feature set #3 (new mutually exclusive settings toggle `[ ??? ]` that alters active slot rendering during step mode).

### Deliverables

- Step-through key (`step_through`) support:
  - New execution key with keyface U+25BB.
  - Press executes exactly one operation slot per invocation.
  - Intermediate substep results render inline on function display in place of executed slot body.
  - Roll is not committed until final slot execution completes.
  - `=` after partial stepping executes only remaining slots (not full restart).
  - If and only if `step_through` is present on keypad, next operation slot is rendered in white.
- Step expansion toggle (`[ ??? ]`) support:
  - New yellow settings toggle keyface `[ ??? ]`.
  - Mutually exclusive with existing settings-toggle keys.
  - Effective only when `step_through` is present and a step target exists.
  - Shows per-operator alternate expansion for current white-highlighted slot.
  - Expansion definitions are function/slot aware and operator-specific.
  - Operator expansion map includes bespoke forms for:
    - `+`, `-`, `×`, `÷`, `#`, `◇`, `↺`, `⋀`, `⋁`, `++`, `--`, `±`, `Ω`, `φ`, `σ`.
  - Symbol policy in expansion rendering:
    - subtraction operation uses `U+2013` en dash;
    - negative sign uses ASCII hyphen-minus (`-`).

### Exit Criteria

- Step execution state is deterministic, resumable, and reset correctly by clear/layout transitions.
- `=` continuation behavior after partial step execution is correct for all supported operator classes.
- White-slot highlight rules are tied to keypad presence of `step_through`, not merely unlock state.
- `[ ??? ]` toggle obeys settings mutual-exclusion rules and does not alter execution results, only rendering.
- v0.8.1 behavior remains unchanged when `step_through` is absent.

### Test Matrix

- Domain:
  - Add reducer tests for:
    - step cursor progression,
    - partial execution state transitions,
    - `=` continuation from partial state,
    - clear/reset/layout actions cancelling or normalizing step state.
  - Add execution-path tests for binary/unary/euclidean/error paths under stepped evaluation.
  - Add unlock/state typing tests for new step key and any new settings flag.
- UI contracts:
  - Add slot display tests for inline substep replacement rendering.
  - Add visual state tests for white next-slot highlighting conditioned on keypad presence of `step_through`.
  - Add toggle-render tests for `[ ??? ]` expansion switching on active step target.
- Integration/parity:
  - Add mobile/desktop interaction tests for repeated `step_through` presses and mixed `step_through` + `=` workflow.
  - Update parity fixtures and round-trip tests to include new step state and toggle flags.

  # Release v0.8.4: Refactor/Cleanup (Shipped 2026-03-16)

Goal: retire high-risk architectural debt through staged foundational refactors that reduce coupling and increase test confidence without changing gameplay outcomes.

### Direction

- Sequence work in three tracks: dependency injection for `contentRegistry`, semantic pipeline unification, and UI runtime typing cleanup.
- Apply a foundation-first approach in each track: establish contracts and parity tests before behavior moves.
- Use incremental cutovers with temporary adapters and explicit adapter-removal checkpoints.
- Gate completion on parity across gameplay, replay, persistence, and UI lifecycle behavior.

### Deliverables

- Composition root (`AppServices` or equivalent) implemented and wired through top-level factories; production paths no longer rely on global `contentRegistry`.
- Canonical `Action -> Event -> Reducer` boundary documented and adopted, with fixture-based equivalence coverage and seeded trace tests.
- Shared typed UI runtime lifecycle helper introduced and applied to targeted modules, with migrated modules no longer using untyped runtime bags.
- Refactor log completed for all three tracks, including temporary shims, cutover points, and final cleanup/removal commits.

### Exit Criteria

- No runtime reads of global `contentRegistry` remain outside explicitly scoped legacy-adapter tests.
- Semantic parity suite passes against pre-refactor baselines for core gameplay transitions, replay behavior, and persistence outputs.
- UI lifecycle cleanup tests (observers, timers, listeners) pass for all migrated modules.
- CI is green and v0.8.4 notes enumerate removed adapters/debt items with no open refactor blockers.

# Release v0.8.5: Multiple Calculators (Shipped 2026-03-18)

Goal: define and de-risk multi-calculator progression through implementation-ready phases.

### Direction

- Lock v1 player-facing semantics before architecture choices.
- Define v1 domain model and persistence impact for more than one calculator.
- Stage rollout from read-only surfaces to one unlockable second calculator.
- Defer specialist variants until onboarding and complexity targets are validated.

### Deliverables

- Functional clauses and traceability IDs are updated for multi-calculator behavior (`FS-MC-*`, boundary deltas).
- Multi-calculator contract prerequisites are documented:
  - calculator-targeted action semantics
  - per-instance execution-state isolation
  - active-calculator selection invariants
  - multi-instance persistence/migration invariants
- A phase execution plan is frozen with entry/exit criteria:
  - Phase 0: Spec + contract scaffolding only (no gameplay behavior change).
  - Phase 1: Read-only second calculator surface (observe/select only, non-mutating).
  - Phase 2: One unlockable second calculator with full targeted execution behavior.
- Baseline-compat strategy is defined for existing saves and one-calculator parity behavior.

### Risks / Validation Focus

- Player cognitive load from calculator switching may reduce clarity of immediate goals.
- Save migration risk rises due to shape change from single to multi-instance calculator state.
- Unlock predicate semantics can drift if calculator-target scope is underspecified.
- Mobile/desktop shell parity risk increases when focus, selection, and routing are introduced.

### Exit Criteria

- Phase plan exists with clear boundaries and prerequisite contracts.
- v1 success metrics and risks are documented.
- Review-flag multi-calculator items are no longer undecided.
- A no-regression path is documented for single-calculator saves and behavior parity.
- At least one acceptance fixture is defined per phase boundary (Phase 0/1/2).

# Release v0.9.1: Main Menu + Session Control Surface (Shipped 2026-03-25)

Goal: ship a dedicated main menu flow and global system control family, then harden policy/contract seams for mode transitions and calculator integration.

### Deliverables

- Main menu mode and menu calculator:
  - `main_menu` app mode added as a peer to `game` and `sandbox`.
  - Main menu starts with only `menu` calculator visible/active.
  - Title visualizer added (`v*.*.*` top-left, `AutoCalc` center).
- Global system key family delivered:
  - `Continue`, `New Game`, `Sandbox`, `Save&Quit`, `Quit Game`.
  - `Save&Quit` saves then transitions to main menu.
  - `New Game` clears save then transitions to game mode.
  - `Quit Game` emits shell-targeted quit signal for `mobile_web_itch`.
- Frozen startup/keypad baseline:
  - `f` startup layout frozen as `#0 Save&Quit`, `#1 blank`, `#2 blank`, `#3 blank`, `#4 unary_inc`, `#5 exec_equals`.
- Policy hardening (behavior-preserving):
  - Canonical transition intent effect introduced (`request_mode_transition` with `savePolicy`).
  - Single system-key intent registry adopted (no per-key branch chain in command execution).
  - Mode policy manifest and calculator seed manifest added for deterministic, id-agnostic boot/layout behavior.
  - Multi-calculator routing/lifecycle invariants reinforced via contract coverage.

### Exit Criteria

- Main menu launch and system key transitions are deterministic and shell-safe.
- Storage/checklist shells remain visible in main menu while their contents are hidden by policy.
- Multi-calculator keyspace isolation is preserved (`menu`, `f`, `g`) with no cross-calculator leakage unless explicit cross-surface action is performed.
- Save compatibility preserved without schema bump.
- Full regression suite green at release cut.

### Validation Snapshot

- Full suite passed at release: `108/108` test groups.
- Added policy contracts:
  - `contracts/system-key-intent-registry`
  - `domain/mode-manifest`
  - `domain/calculator-seed-manifest`
  - `app/quit-signal`

# Release v0.9.3: Key Family Taxonomy + Visual Identity Pass (Shipped 2026-03-26)

Goal: improve key-role readability through unified settings family styling and explicit subgroup/operator accent rules.

### Deliverables

- Settings + visualizer family unification:
  - Visualizer keys now render through `key--group-settings` on keypad and storage surfaces.
  - Visualizer-specific rendering dependency on `key--group-visualizers` removed from UI paths.
- Settings base + subgroup identity:
  - Settings base moved to darker-blue palette.
  - Subgroup mappings finalized:
    - visualizers = all `viz_*`
    - mod/wrap = `toggle_delta_range_clamp` + `toggle_mod_zero_to_delta`
    - `[ ??? ]` = `toggle_step_expansion`
    - base-2 = `toggle_binary_mode`
  - Settings subgroup stripe logic standardized:
    - bottom-aligned stripe for settings-family keys
    - LED semantics for toggles (`off` when untoggled via darkened stripe token, `on` when toggled via bright stripe token)
    - settings labels remain default white.
- Binary operator accent finalization:
  - Binary operators use a bottom-right corner triangle accent (binary-only; excludes unary operators).
  - Triangle geometry is width-independent 45-degree.
  - Triangle white gradient matches default keycap lighting (including active-state inversion).
- Documentation/contracts:
  - UX, contract, and functional docs updated with explicit key visual-affordance invariants and traceability (`UX-KVA-*`, `FS-CS-10`, `FS-CS-11`).

### Exit Criteria

- Unified settings/visualizer family behavior is stable on keypad and storage surfaces.
- Settings subgroup stripe mapping, placement, and LED-state semantics are implemented as agreed.
- Binary operator accent scope/geometry/lighting rules are implemented as agreed.
- No domain action/type/schema behavior changes introduced by visual identity work.

### Validation Snapshot

- Build verification passed: `npm run build:web`.
- Focused suites passed:
  - `ui-module/calculator-keypad-render`
  - `ui-module/storage-v2`
  - `ui/visualizer-fit-contract`
  - `contracts/ui-action-emission`

