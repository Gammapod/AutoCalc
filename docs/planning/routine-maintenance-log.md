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
