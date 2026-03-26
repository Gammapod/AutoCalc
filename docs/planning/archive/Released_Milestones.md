Truth 2: Releases
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
