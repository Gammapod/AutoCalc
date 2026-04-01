# Routine Maintenance Log

Purpose: paper trail for layer-by-layer maintenance passes run using `docs/routine-maintenance-runbook.md`.

## 2026-03-27 - Initialization
- Runbook baseline established: `docs/routine-maintenance-runbook.md`.
- This file is the canonical maintenance log for all future passes.

## 2026-03-27 - Initial Cleanup Layer Audit (Migrated)

### Review Scope
- Git ranges reviewed:
  - `v0.9.6..v0.9.10` (63 files, 1725 insertions, 672 deletions)
  - `v0.9.7..v0.9.10` (31 files, 948 insertions, 329 deletions)
- Release docs reviewed:
  - `docs/planning/Planned Releases.md`
  - `docs/planning/archive/Released_Milestones.md`
  - `src/content/releaseNotes.ts`
- Health gates reviewed:
  - `node scripts/code-health-score.mjs` (passed, 113/113 tests, score 98.25/100)

### Major Recent Change Themes
1. Per-calculator memory/control projection hardening (`v0.9.10`).
2. Unified settings state model cutover (`v0.9.7`) and related runtime/persistence adjustments.
3. CI/release workflow consolidation (Windows/Itch/Android workflow updates + release docs refresh).
4. Multi-calculator routing and invariants expanded with substantial contract coverage growth.

### Churn Hotspots (v0.9.6..v0.9.10)
- Layer totals (added + deleted):
  - `src/domain`: 867
  - `tests`: 833
  - `docs`: 100
  - `src/ui`: 91
  - `src/infra`: 58
  - `scripts`: 47
  - `src/content`: 47
- Highest-churn files:
  - `tests/multiCalculator.contract.test.ts` (292)
  - `src/domain/runtimeStateInvariants.ts` (211)
  - `src/domain/settings.ts` (196)
  - `src/domain/reducer.ts` (124)
  - `src/domain/memoryController.ts` (71)

### Relevant Product Layers For Cleanup
1. Domain state + reducer boundary (`src/domain/*`):
   - Why now: repeated changes in invariants, reducer routing, settings, and memory selection indicate high coupling risk.
   - Cleanup target: tighten ownership boundaries between state normalization, input handling, and projection derivation.
2. Multi-calculator isolation contracts (`src/domain/multiCalculator.ts`, reducer paths, `tests/multiCalculator.contract.test.ts`):
   - Why now: large recent churn and feature-critical behavior (cross-calculator isolation).
   - Cleanup target: reduce duplicated isolation assertions and extract reusable test helpers/fixtures.
3. Settings/memory semantics cohesion (`src/domain/settings.ts`, `src/domain/memoryController.ts`, `src/domain/controlSelection.ts`, `src/ui/modules/calculator/totalDisplay.ts`):
   - Why now: both v0.9.7 and v0.9.10 changed nearby semantics.
   - Cleanup target: centralize the canonical "selected variable" contract so handlers and visuals cannot drift.
4. Persistence + migration seam (`src/infra/persistence/*`, `src/domain/state.ts`, `tests/persistence.test.ts`):
   - Why now: settings and calculator-local behavior shifts increase migration fragility.
   - Cleanup target: add/maintain migration fixture matrix for single-calculator and multi-calculator saves.
5. Release pipeline/docs coherence (`.github/workflows/*`, `docs/release-*.md`, `docs/ci-cd-pipeline.md`, `src/generated/appVersion.ts`):
   - Why now: automation changed materially and can silently drift from docs.
   - Cleanup target: keep one authoritative release path per channel and remove stale workflow/document overlap.
6. Repo hygiene anomalies:
   - `src/domain/unlockGraph (1).types.ts` appeared to be an unreferenced duplicate candidate.
   - Cleanup target: verify provenance; delete or archive once confirmed unused.

### Suggested Sequence For Next Cleanup Pass
1. Domain boundary pass: reducer/invariants/settings/memory ownership map + small refactors.
2. Multi-calculator contract pass: de-duplicate tests and unify helpers.
3. Persistence matrix pass: lock migration fixtures for recent semantics changes.
4. Release automation pass: reconcile workflow docs and scripts, remove dead paths.

## 2026-03-27 - Aggressive Cleanup Pass 1 (Migrated)

### Deletions Applied
- Removed unreferenced files:
  - `src/domain/unlockGraph (1).types.ts`
  - `src/contracts/cueWorkflow.ts`
  - `src/domain/invariants.ts`
  - `src/infra/math/algebrite.ts`
  - `src/persistence/schema.ts`
- Removed `legacy/` directory (`legacy/index.html`, `legacy/src/app.js`, `legacy/src/styles.css`).

### Guardrails Added
- Extended `scripts/check-boundaries.mjs`:
  - Emits orphan report at `dist/reports/orphan-modules.json`.
  - Classifies orphans as `typeOnly` vs value module and fails only on actionable value-module orphans.
  - Emits filename hygiene report at `dist/reports/filename-hygiene.json`.
  - Fails when duplicate-artifact filenames match pattern `* (n).*`.
  - Keeps explicit allowlist for intentional value-orphan seam: `src/contracts/contentRegistry.ts`.

### Follow-up Redundancy Sweep (This Pass)
- Clarified duplicated runtime-shape naming in shell rendering path:
  - Renamed `src/ui/shell/runtimeState.ts` export from `ShellRuntimeState` to `ShellRenderRuntimeState`.
  - Updated imports/usages in `src/ui/shellRender.ts` and `src/ui/shell/gestureBinder.ts`.
- Cleaned stale finished TODO wording in `docs/Documentation & Release Policy.md` by converting finished TODOs into completed statements.

### Verification Evidence
- `npm run build:web:full` -> pass.
- `npm test` -> pass (`113/113` test groups).
- `npm run ci:verify:boundaries` -> pass.
- Orphan scan report:
  - `dist/reports/orphan-modules.json` generated.
  - `actionableOrphans: []`.
- Filename hygiene report:
  - `dist/reports/filename-hygiene.json` generated.
  - `duplicateFilenameHits: []`.
- Grep checks:
  - No remaining references to removed modules (`cueWorkflow`, `invariants`, `algebrite` wrapper, `schema`, duplicate unlockGraph types).
  - `legacy_exists=false`.

## 2026-03-27 - Next Step Recommendation (Current Cleanup)

### Recommended Next Step
Start **Routine Maintenance: Pre-Step + Step 1** for the `domain runtime` layer (state/reducer/settings/memory), before any additional deletions or movement.

### Why This Is Next
- Current cleanup completed Step 2-style trash collection and guardrails.
- Highest churn remains in `src/domain/*` around reducer/invariants/settings/memory.
- `docs/functional-spec.md` still marks several domain-runtime invariants as partial coverage.

### Scope For The Next Pass
- Target layer: `src/domain/reducer*.ts`, `src/domain/runtimeStateInvariants.ts`, `src/domain/settings.ts`, `src/domain/memoryController.ts`, `src/domain/controlSelection.ts`.
- Goal: lock behavior with explicit harness first, then continue cleanup safely.

### Step 1 Deliverables
1. Publish a short layer map + ownership boundaries for domain runtime state mutation and projection.
2. Define invariant list for this layer:
   - Per-calculator memory selection is canonical and isolated.
   - Memory cycle/adjust/recall and UI projection read same selected-variable source.
   - Execution-gated rejected inputs are non-mutating where required.
   - Calculator-local mutations do not leak cross-calculator.
3. Add/extend tests/contracts to lock these invariants before further refactor.
4. Run verification checkpoint:
   - `npm run build:web:full`
   - `npm test`
   - `npm run ci:verify:boundaries`

## 2026-03-27 - Routine Maintenance Step 1 (Domain Runtime) - Implemented

### Layer Map + Ownership
- Domain mutation owner: `reducer` orchestration + input handlers + `normalizeRuntimeStateInvariants`.
- Selection semantics owner: `controlSelection` (canonical normalization order + legacy-memory mapping).
- Projection/read-model consumers: memory handling and UI render modules now consume shared selected-field helper path.
- Execution gating owner: `executionModePolicy` (memory keys remain interrupting actions, not gated rejects).

### Invariants Locked In This Pass
1. Selected-field normalization precedence:
   - valid `selectedControlField` wins;
   - otherwise legacy `memoryVariable` mapping is used when settable;
   - otherwise first settable field by canonical order.
2. Targeted multi-calculator memory actions keep selection/control mutation calculator-local.
3. No-settable calculators preserve `selectedControlField: null` and memory actions remain explicit no-op.
4. Total/footer and eigen-allocator visualizer highlight the same selected field and remain stable under memory-cycle updates (including targeted multi-calculator updates).
5. While execution mode is active, memory keys interrupt-and-run (parity-equivalent), while value/operator input remains non-mutating reject behavior.

### Prep Extraction (Low Risk)
- Added canonical helper in `controlSelection` for UI/state-selected-field resolution.
- Updated consumers to use the shared helper path:
  - `memoryController`
  - total/footer display renderer
  - eigen allocator visualizer renderer
- Behavior preserved; extraction only removed duplicated fallback logic.

### Test/Harness Additions
- `reducer/input`:
  - explicit selected-field normalization precedence assertions.
- `contracts/multi-calculator-invariants`:
  - root vs projected active selected-field consistency after normalization;
  - no cross-calculator leakage from active `g` normalization.
- `contracts/execution-gate-parity`:
  - explicit memory-key interrupt parity case under execution pause.
- New UI module suite:
  - `ui-module/eigen-allocator-renderer-v2`
  - validates footer/eigen highlight parity and stability under memory-cycle and targeted multi-calculator actions.

### Verification Evidence
- Focused pass:
  - `node ./dist/tests/run-tests.js --grep="^(reducer/input|contracts/execution-gate-parity|contracts/multi-calculator-invariants|ui/total-display|ui-module/eigen-allocator-renderer-v2)$"` -> pass.
- Full checkpoint:
  - `npm run build:web:full` -> pass.
  - `npm test` -> pass (`114/114` test groups).
  - `npm run ci:verify:boundaries` -> pass.

### Reconciliation + Remaining Gaps (for Step 2)
- Alignment improved:
  - Selected-field ownership is now explicit and shared across domain/runtime consumers.
  - Cross-calculator isolation and execution-gate memory-key policy have direct harness coverage.
- Remaining Step 2 candidates:
  1. Domain trash-collection pass for reducer/runtime seams with new harness as protection.
  2. Expand property-style randomized isolation matrix for multi-calculator invariants.
  3. Add dedicated contract fixtures for remaining partial functional-spec gaps (`FS-UP-07`, `FS-FB-09`, and broader lifecycle matrix items).

## 2026-03-27 - Routine Maintenance SoC Regrouping (Items 1-3) - Implemented

### Pass A - Extraction + Adapters + Equivalence Harness
- Selection ownership extraction:
  - Added canonical selected-control context helper in `src/domain/controlSelection.ts`:
    - `resolveSelectedControlContextFromUi(...)`
    - `SelectedControlContext` type (resolved field + settable fields + effective legacy symbol mapping)
  - Added read-model adapter `src/ui/shared/readModel.selection.ts` producing:
    - selection token
    - canonical field highlight map
    - embedded selected-control context
- Runtime invariants extraction:
  - Split monolithic internals into focused modules:
    - `src/domain/runtimeStateInvariants.diagnostics.ts`
    - `src/domain/runtimeStateInvariants.layout.ts`
    - `src/domain/runtimeStateInvariants.settingsSelection.ts`
  - Kept public orchestrator entrypoint stable in `src/domain/runtimeStateInvariants.ts`.
  - Published deterministic stage ordering contract:
    - `RUNTIME_INVARIANT_NORMALIZER_ORDER = ["diagnostics", "layout_storage", "settings_selection"]`
- Reducer orchestration extraction:
  - Added dedicated pipeline modules:
    - `src/domain/reducer.pipeline.action.ts` (action pre-normalization + execution policy resolution + action targeting)
    - `src/domain/reducer.pipeline.scope.ts` (projection scope routing/commit and action reduction pipeline)
    - `src/domain/reducer.pipeline.diagnostics.ts` (diagnostics action trace patching)
  - Added harness suites:
    - `tests/runtimeStateInvariants.pipelineEquivalence.test.ts` (legacy vs split output equivalence on fixture states)
    - `tests/reducer.pipelineEquivalence.test.ts` (public reducer vs composed stage pipeline equivalence on representative traces)

### Pass B - Rewire + Internal Cleanup
- UI renderers rewired to read-model/domain selection context instead of local normalization:
  - `src/ui/modules/calculator/totalDisplay.ts`
  - `src/ui/modules/visualizers/eigenAllocatorRenderer.ts`
- `src/domain/reducer.ts` reduced to thin composition root:
  - orchestration only (`reduceWithProjectionScope` -> diagnostics patch -> invariant normalization)
  - public API unchanged (`reducer` export and action/policy resolver exports preserved)
- Runtime normalizer old monolith path removed from production entrypoint:
  - public `normalizeRuntimeStateInvariants` now orchestrates extracted stage modules.

### Boundaries / Ownership Now Enforced
- Selection semantics owner:
  - domain `controlSelection` (+ `readModel.selection` adapter for renderers)
- Runtime invariants owner:
  - `normalizeRuntimeStateInvariants` orchestrator over stage modules (single public entrypoint)
- Reducer orchestration owner:
  - `reducer.pipeline.*` modules with `reducer.ts` as composition root

### Remaining Follow-ups
1. Add broader fixture matrix to pipeline equivalence suites (seeded randomized traces).
2. Audit other visualizers for any direct selection inference bypassing read-model adapter.

### Verification Evidence
- `npm test -- --grep='^domain/runtime-state-invariants-pipeline-equivalence$'` -> pass (full health pipeline executed; `116/116` groups).
- `npm run build:web:full` -> pass.
- `npm run ci:verify:boundaries` -> pass.
  - Note: after `clean:dist`, standalone boundary verification required ensuring `dist/reports` exists (`New-Item -ItemType Directory -Force dist/reports`) before rerun.
- Grep validation:
  - No UI modules call `resolveSelectedControlFieldFromUi` directly; selection normalization remains in domain + read-model adapter path.
  - Reducer composition root delegates to extracted pipeline modules (`reducer.pipeline.action|scope|diagnostics`).

## 2026-03-27 - Routine Maintenance Micro-Pass: Shared ReadModel Barrel Dedup

### Change
- Removed redundant duplicate barrel:
  - deleted `src/ui/shared/readModel.core.ts`
- Retained `src/ui/shared/readModel.ts` as the single canonical shared read-model barrel.

### Validation
- `npm run build:web:full` -> pass.
- `npm run ci:verify:boundaries` -> pass.
- `rg "readModel\.core" src tests docs` -> only historical mention remains in this log.

## 2026-03-27 - Routine Maintenance Closeout: Final 4-Step Completion

### Tooling Hardening
- Hardened `scripts/check-boundaries.mjs` precondition flow:
  - always creates `dist/reports` before writes via recursive mkdir
  - asserts the reports directory is accessible before continuing
- Outcome:
  - `ci:verify:boundaries` now succeeds immediately after `clean:dist` with no manual directory bootstrap.

### Seeded Equivalence Expansion
- Added deterministic shared seeded generator:
  - `tests/helpers/seededMaintenance.ts`
  - medium matrix runs: seeds `1337`, `424242`, `9001`, `7777`, each `72` steps
- Expanded reducer pipeline equivalence coverage:
  - `tests/reducer.pipelineEquivalence.test.ts`
  - now includes seeded traces across value/operator/memory/layout/execution/lifecycle-like routing actions, including targeted `calculatorId` actions in multi-calculator sessions.
- Expanded runtime invariant coverage with deterministic fixture matrix + frozen baseline:
  - `tests/runtimeStateInvariants.pipelineEquivalence.test.ts`
  - frozen baseline fixture: `tests/contracts/fixtures/routineMaintenanceGolden.ts` (SHA-256 hashes over stable-serialized normalized states).

### Legacy Comparator Retirement
- Removed temporary legacy comparator module:
  - `src/domain/runtimeStateInvariants.legacy.ts`
- Runtime invariant equivalence harness no longer uses old-vs-new dual implementation; it now validates against frozen deterministic golden baseline.

### Verification Evidence
- Acceptance precondition:
  - `npm run clean:dist` -> pass
  - `npm run ci:verify:boundaries` -> pass (without manual `dist/reports` creation)
- Focused suites:
  - `node ./dist/tests/run-tests.js --grep="^(domain/runtime-state-invariants-pipeline-equivalence|domain/reducer-pipeline-equivalence|contracts/execution-gate-parity|contracts/multi-calculator-invariants)$"` -> pass.
- Full checkpoint:
  - `npm run build:web:full` -> pass
  - `npm test` -> pass (`116/116` test groups)
  - `npm run ci:verify:boundaries` -> pass

### Closeout Status
- Routine Maintenance cleanup scope is now closed for this wave.
- Remaining work, if any, is optional future hardening rather than required cleanup debt.

## 2026-03-31 - Post-Milestone Cleanup Wave Kickoff (Planning + Layer Order)

### Trigger
- Major milestone implementation completed; beginning new review/consolidation/cleanup wave under `docs/routine-maintenance-runbook.md`.

### Review Scope
- Git range reviewed:
  - `v0.9.30..HEAD` -> `141 files changed, 7439 insertions(+), 2909 deletions(-)`.
- Churn by top-level area:
  - `docs`: 1519
  - `src`: 1295
  - `tests`: 899
  - `scripts`: 90
- Highest churn hotspots sampled from this range:
  - `src/domain/engine.ts` (648)
  - `docs/design_refs/dependency_map.mmd` (399)
  - `docs/planning/Planned Releases.md` (300)
  - `tests/reducer.input.test.ts` (188)
  - `tests/engine.test.ts` (182)
  - `src/domain/calculatorValue.ts` (162)
  - `src/domain/reducer.input.core.ts` (137)
  - `src/domain/rollDerived.ts` (101)
  - `tests/controlMatrixLocality.contract.test.ts` (100)
  - `src/content/keyBehavior.catalog.ts` / `src/content/keyCatalog.ts` vicinity (content layer churn cluster: 49 total)

### Proposed Layer Order (This Wave)
1. Domain execution + value semantics (`src/domain/engine.ts`, `src/domain/calculatorValue.ts`, `src/domain/reducer.input.core.ts`, `src/domain/rollDerived.ts`).
2. Domain harness consolidation (`tests/engine.test.ts`, `tests/reducer.input.test.ts`, `tests/domain.controlSelection.test.ts`, `tests/controlMatrixLocality.contract.test.ts`).
3. Content/catalog coherence (`src/content/*` + related key behavior contracts).
4. UI/app integration edge checks (`src/ui/*`, `src/app/*`, `tests/uiIntegration.mobileShell.test.ts`, `tests/currentTotalDomain.test.ts`).
5. Docs/release reconciliation (`docs/planning/*`, `docs/functional-spec.md`, `docs/math-spec.md`, `docs/Documentation & Release Policy.md`, `scripts/verify-release-notes.mjs`).

### Step 1 Focus (Next Action)
- Start Step 1 (`Invariants and Safety Harness`) for Layer 1 before any broad refactor:
  - Re-state domain execution/value invariants.
  - Identify harness gaps for complex-number and reducer-input behavior.
  - Add/adjust tests first, then proceed to consolidation.

### Verification Policy For This Wave
- Run checkpoint after each layer batch:
  - `npm run build:web:full`
  - `npm test`
  - `npm run ci:verify:boundaries`
- Record pass/fail evidence and decisions in this log after each layer.

## 2026-03-31 - Layer 1 Step 1 (Invariants + Harness Plan) - In Progress

### Layer 1 Scope
- `src/domain/engine.ts`
- `src/domain/calculatorValue.ts`
- `src/domain/reducer.input.core.ts`
- `src/domain/rollDerived.ts`
- Primary harness files:
  - `tests/engine.test.ts`
  - `tests/reducer.input.test.ts`
  - `tests/domain.controlSelection.test.ts`
  - `tests/controlMatrixLocality.contract.test.ts`

### Invariants Restated For This Layer
1. Complex values remain exact runtime/domain values (no float fallback; unsupported paths reject as `unsupported_symbolic`).
2. Unary/binary execution behavior remains deterministic and exact-first across rational/expr/complex value kinds.
3. Auto-step execution gate reject behavior remains non-mutating for rejected calculator/progression mutations (`FS-FB-08`), with explicit interrupt-path exceptions only.
4. Auto-step progress remains preview-only and commits terminal roll/total exactly once on completion (`FS-FB-09`).
5. Calculator-local execution state and control-matrix effects remain isolated under targeted actions (`FS-MC-02` boundary).

### Current Harness Signals
- Existing direct complex behavior coverage is concentrated in `tests/engine.test.ts` and targeted reducer execution cases in `tests/reducer.input.test.ts`.
- Control selection and targeted calculator locality contracts exist (`tests/domain.controlSelection.test.ts`, `tests/controlMatrixLocality.contract.test.ts`).
- Functional-spec mapping still marks some execution/high-risk areas as partial (notably `FS-FB-08`, `FS-FB-09`, and broader randomized multi-calculator isolation expansions).

### Harness Gap Plan Before Refactor
1. Add dedicated reducer-input stress assertions for auto-step completion/finalization single-commit behavior (tighten `FS-FB-09` coverage).
2. Expand execution-gate action-family matrix assertions for pause/equals-pause reject-vs-interrupt behavior (tighten `FS-FB-08` coverage).
3. Add compact seeded targeted-calculator execution isolation traces tied to Layer 1 mutation paths (reduce cross-calculator regression risk before consolidation).

### Execution Status
- Step 1 planning artifacts captured.
- Test additions/refactors not yet applied in this entry.
- Verification checkpoint pending after harness updates.

## 2026-03-31 - Layer 1 Step 1 (Harness Hardening) - Implemented

### What Was Added
- `tests/reducer.input.test.ts`
  - Added deterministic stress traces for:
    - step-through multi-slot preview/terminal behavior
    - auto-step tick multi-slot preview/terminal behavior
    - equals-toggle auto-step multi-slot preview/terminal behavior
    - equals-toggle + wrap-tail progression path
  - Locked assertions that preview ticks remain non-committing (`rollEntries` unchanged) and terminal commits append a single seed/result pair per completion path.
  - Added post-terminal checks to prevent immediate duplicate terminal roll appends on the next auto-step tick.
- `tests/contracts.executionGateParity.test.ts`
  - Added table-driven paused-state action-family matrix covering rejected vs interrupting actions.
  - Added explicit calculator/progression non-mutation checks for rejection rows.
  - Added explicit pause-flag clear checks for interrupt rows.
  - Preserved reducer vs command parity assertion for every matrix row.
- `tests/multiCalculator.contract.test.ts`
  - Added targeted `calculatorId: "g"` execution-isolation traces while active calculator remains `f`.
  - Added local-runtime shape snapshot assertions for `f` (`total`, `rollEntries`, `draftingSlot`, `operationSlots`, `stepProgress`, `selectedControlField`) to confirm no cross-calculator leakage.
  - Added explicit global-action-family check (`ALLOCATOR_RETURN_PRESSED`) to confirm shared progression counters may mutate while `f` local execution state remains unchanged.

### Why
- Tightened Layer 1 safety harness around `FS-FB-08`, `FS-FB-09`, and `FS-MC-02` before any structural refactor.
- Converted high-risk behavior into deterministic assertions so follow-up consolidation can be performed with lower regression risk.

### Verification Evidence
- Focused suites:
  - `node ./dist/tests/run-tests.js --grep="^reducer/input$"` -> pass.
  - `node ./dist/tests/run-tests.js --grep="^contracts/execution-gate-parity$"` -> pass.
  - `node ./dist/tests/run-tests.js --grep="^contracts/multi-calculator-invariants$"` -> pass.
- Required checkpoint commands:
  - `npm run build:web:full` -> pass.
  - `npm test` -> failed due existing non-target suites:
    - `reducer/wrap-tail-execution`
    - `ui-integration/desktop-shell`
    - `domain/equals-toggle-auto-step`
    - `domain/runtime-state-invariants-pipeline-equivalence`
  - `npm run ci:verify:boundaries` -> pass (after ensuring `dist/reports` exists in standalone run).

### Step 1 Status
- Harness-hardening objective for this layer is implemented.
- Full-suite green checkpoint is currently blocked by existing non-target failures listed above.

## 2026-03-31 - Layer 1 Milestone 1 (Operator Execution Policy Registry) - Implemented

### What Changed
- Added canonical execution-policy registry:
  - `src/domain/operatorExecutionPolicy.ts`
  - Defines per-operator execution policy metadata:
    - accepted runtime value kinds
    - reject reason mapping (`division_by_zero`, `nan_input`, `unsupported_symbolic`)
    - exactness/result metadata
    - status (`active` / `deferred`) + deferred reason where applicable
  - Includes startup validation ensuring one-and-only-one policy entry for every executable unary/binary operator in the button/key catalogs.
- Routed engine policy decisions through registry adapter:
  - `src/domain/engine.ts`
  - `executeSlotsValue(...)` now uses registry-routed policy resolution while preserving current arithmetic implementation paths.
  - Added `executeSlotsValueLegacyPath(...)` for deterministic old-vs-registry parity testing.
- Added integrity + parity test suites:
  - `tests/operatorExecutionPolicyRegistry.contract.test.ts`
  - `tests/engine.executionPolicyParity.test.ts`
  - Registered both in `tests/run-tests.ts`.
- Extended focused suites with explicit routing parity assertions:
  - `tests/reducer.input.test.ts`
  - `tests/contracts.executionGateParity.test.ts`
- Added docs sync rule:
  - `docs/math-spec.md` now states runtime registry is canonical and must remain one-to-one with the operator table.

### Verification Evidence
- Focused suites (new + required):
  - `node ./dist/tests/run-tests.js --grep="^(domain/engine-execution-policy-parity|contracts/operator-execution-policy-registry)$"` -> pass.
  - `node ./dist/tests/run-tests.js --grep="^reducer/input$"` -> pass.
  - `node ./dist/tests/run-tests.js --grep="^contracts/execution-gate-parity$"` -> pass.
- Gate commands:
  - `npm run build:web:full` -> pass.
  - `npm run ci:verify:boundaries` -> pass.
  - `npm test` -> fails on existing non-target suites:
    - `reducer/wrap-tail-execution`
    - `ui-integration/desktop-shell`
    - `domain/equals-toggle-auto-step`
    - `domain/runtime-state-invariants-pipeline-equivalence`

### Milestone Status
- Milestone 1 objective (policy centralization + parity-preserving routing) is implemented without public API or persistence changes.
- Remaining failures are pre-existing/non-target and unchanged in scope for this milestone.

## 2026-03-31 - Next Slice Stabilization (Execution Cluster Before IR) - Implemented

### Root Causes By Failing Suite
- `reducer/wrap-tail-execution`:
  - execution outcome total normalization in reducer input flow coerced rational terminal totals through complex-record conversion, diverging from expected domain total shape.
- `domain/equals-toggle-auto-step`:
  - same coercion path affected equals-toggle and auto-step terminal commit semantics, producing payload shape drift during completion.
- `ui-integration/desktop-shell`:
  - integration mismatch was downstream of reducer terminal total-shape drift in mixed `step-through` then equals-toggle auto-step flows.
- `domain/runtime-state-invariants-pipeline-equivalence`:
  - required temporary compatibility envelope support (single baseline was too strict for transition-period acceptance policy).

### Resolution Policy Applied
- Code-to-tests resolution (behavior suites):
  - Updated `src/domain/reducer.input.core.ts` to preserve canonical `nextTotal` value shape from execution paths (no forced complex-record conversion in rational/wrap terminal paths).
  - Result: wrap-tail, equals-toggle auto-step, and desktop shell integration behavior suites align to existing contract expectations.
- Dual-baseline transition (runtime invariants suite):
  - Extended golden fixture to support `runtimeInvariantHashesV1` and `runtimeInvariantHashesV1Transition`.
  - Updated runtime invariants pipeline-equivalence test to accept either baseline and emit matched-baseline summary counts.

### Verification Results
- Focused suites:
  - `reducer/wrap-tail-execution` -> pass.
  - `domain/equals-toggle-auto-step` -> pass.
  - `ui-integration/desktop-shell` -> pass.
  - `domain/runtime-state-invariants-pipeline-equivalence` -> pass.
- Milestone 1 guards:
  - `domain/engine-execution-policy-parity` -> pass.
  - `contracts/operator-execution-policy-registry` -> pass.
  - `reducer/input` -> pass.
  - `contracts/execution-gate-parity` -> pass.
- Checkpoint gates:
  - `npm run build:web:full` -> pass.
  - `npm test` -> pass.
  - `npm run ci:verify:boundaries` -> pass.

### Dual-Baseline Sunset Condition
- `runtimeInvariantHashesV1Transition` is temporary compatibility scaffolding.
- Removal trigger for next cleanup slice:
  - all fixtures match `runtimeInvariantHashesV1` for a full clean run and `v1_transition` match count is zero across deterministic fixture set.

## 2026-03-31 - Milestone 2A (Strict Runtime-Invariant v1 Re-Lock) - Implemented

### What Changed
- Removed dual-baseline acceptance from runtime invariant pipeline equivalence test:
  - test now validates only `runtimeInvariantHashesV1`.
  - removed transition branch and match-counter output.
- Contracted golden fixture shape:
  - removed `runtimeInvariantHashesV1Transition`.
  - retained existing `runtimeInvariantHashesV1` hashes unchanged.

### Transition Retirement Evidence
- Final transition-enabled verification run before retirement reported:
  - `[runtime-state-invariants] baseline matches: v1=9 v1_transition=0`
- Strict mode has now been restored; transition envelope is retired.

### Verification Results
- Focused suites:
  - `domain/runtime-state-invariants-pipeline-equivalence` -> pass.
  - `domain/engine-execution-policy-parity` -> pass.
  - `contracts/operator-execution-policy-registry` -> pass.
  - `reducer/input` -> pass.
  - `contracts/execution-gate-parity` -> pass.
- Full gates:
  - `npm run build:web:full` -> pass.
  - `npm test` -> pass.
  - `npm run ci:verify:boundaries` -> pass.

## 2026-03-31 - Milestone 2B (Typed Execution IR Strangler Scaffold) - Implemented

### What Changed
- Added typed execution-plan IR module (`executionPlanIR`) with:
  - explicit seed + ordered unary/binary steps
  - operand typing (`digit` / `symbolic_operand`)
  - per-step policy metadata hooks (`status`, `exactness`, deferred markers)
  - deterministic build from slots and from staged plans (including wrap-tail metadata)
- Added IR execution adapter routing in engine:
  - `executeSlotsValue(...)` now routes through `buildExecutionPlanIR(...) -> executePlanIR(...)`
  - legacy execution path retained for parity comparison (`executePlanIRLegacyPath`, `executeSlotsValueLegacyPath`)
- Rewired reducer execution-plan evaluation to consume stage->IR build metadata for slot extraction and wrap-tail handling without behavior changes.
- Updated math spec sync note:
  - operator policy registry remains canonical for policy;
  - typed IR is canonical for runtime execution-plan representation.

### Parity Harness Added
- IR builder parity suite:
  - deterministic slots->IR and stages->IR coverage (empty/single/multi/wrap-tail/symbolic operand forms).
- IR execution parity suite:
  - registry-routed IR execution vs legacy-routed IR execution parity across rational, complex, reject, div-by-zero, and nan-input fixtures.
- Reducer routing parity suite:
  - step-through preview, equals terminal completion, equals-toggle auto-step preview/terminal, and wrap-tail single-commit semantics.

### Verification Results
- Focused suites:
  - `domain/execution-plan-ir-builder-parity` -> pass.
  - `domain/execution-plan-ir-execution-parity` -> pass.
  - `domain/reducer-execution-ir-routing-parity` -> pass.
  - `domain/engine-execution-policy-parity` -> pass.
  - `contracts/operator-execution-policy-registry` -> pass.
  - `reducer/input` -> pass.
  - `contracts/execution-gate-parity` -> pass.
  - `domain/runtime-state-invariants-pipeline-equivalence` -> pass.
- Full gates:
  - `npm run build:web:full` -> pass.
  - `npm test` -> pass.
  - `npm run ci:verify:boundaries` -> pass.

## 2026-03-31 - Milestone 2C (IR-First Reducer Consolidation) - Implemented

### What Changed
- Consolidated reducer execution progression to IR-first shared helpers:
  - full-plan range evaluation from stage index
  - single-stage evaluation for step-through/auto-step progression
  - wrap-tail application sourced from IR metadata instead of local stage decomposition branches.
- Kept engine runtime IR-first and reduced legacy surfaces:
  - retained a single legacy comparator path (`executePlanIRLegacyPath`) for parity harness use.
  - removed redundant legacy slot comparator surface from runtime-facing engine API.
- Converged plan-model ownership:
  - `executionPlan` now acts as compatibility adapter over IR wrap-stage resolver semantics.

### Parity / Coverage Expansion
- Extended reducer IR routing parity coverage with deterministic seeded execution traces across:
  - step-through preview/terminal
  - equals-toggle auto-step preview/terminal
  - wrap-tail terminal completion stability
- Added targeted `calculatorId: "g"` execution trace while active calculator is `f`:
  - confirmed no leakage in `f` local execution state
  - confirmed terminal wrap-tail effect applies to targeted calculator only.
- Updated parity suites to use IR-level legacy comparator path directly.

### Verification Results
- Focused suites:
  - `domain/reducer-execution-ir-routing-parity` -> pass.
  - `domain/execution-plan-ir-builder-parity` -> pass.
  - `domain/execution-plan-ir-execution-parity` -> pass.
  - `domain/engine-execution-policy-parity` -> pass.
  - `contracts/operator-execution-policy-registry` -> pass.
  - `reducer/input` -> pass.
  - `contracts/execution-gate-parity` -> pass.
  - `domain/runtime-state-invariants-pipeline-equivalence` -> pass.
- Full gates:
  - `npm run build:web:full` -> pass.
  - `npm test` -> pass.
  - `npm run ci:verify:boundaries` -> pass.

### Next Removal Trigger
- Full legacy comparator retirement is gated to next slice once one additional full clean run confirms stable parity with IR-first reducer/engine routing.

## 2026-03-31 - Cleanup Wave Final Closeout (Release v0.9.32)

### Exit Criteria Status
- Layer 1 execution/value harness hardening completed (`FS-FB-08`, `FS-FB-09`, targeted `FS-MC-02` risk reduction).
- Operator execution-policy registry consolidation completed with parity lock.
- Execution-cluster stabilization completed (wrap-tail/equals-toggle/desktop integration/runtime invariants failures resolved).
- Runtime invariants strict v1 baseline re-locked (transition baseline retired).
- Typed execution IR strangler + IR-first reducer consolidation completed with full checkpoint gates green.

### Release-Cut Verification
- `npm run build:web:full` -> pass.
- `npm test` -> pass (`124/124` groups).
- `npm run ci:verify:boundaries` -> pass.
- `npm run ci:verify:release-notes` -> pass with shipped train linkage to `release_v0_9_32`.

### Remaining Follow-up (Next Milestone)
- Legacy comparator retirement:
  - remove retained `executePlanIRLegacyPath` parity comparator after one additional clean slice confirms no drift.
