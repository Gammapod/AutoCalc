Truth: 1 - Code Map
# Code Map: Keys, Operators, Roll, and Visualizers

Purpose: quick navigation for implementing or reviewing key behavior with minimal search churn.

## Fast Path (New Key)
1. Add key metadata and traits.
2. Add keyface/operator-slot label.
3. Implement operation semantics (+ inverse behavior if needed).
4. Ensure render-time classes/UX accents are applied.
5. Add or update tests.

## Core Systems

### Bootstrap and Runtime Composition
- `src/app/bootstrap.ts`
- `src/app/headlessRuntime.ts`
- `src/app/headlessSession.ts`
- `src/app/headlessCli.ts`
- `src/app/bootstrap/bootState.ts`
- `src/app/bootstrap/uiControllerWiring.ts`
- `src/app/bootstrap/subscriptionCoordinator.ts`
- `src/app/modeTransitionCoordinator.ts`
- `src/app/persistenceSaveScheduler.ts`
- `src/ui/shared/appVersion.ts`
- Owns: app startup, headless command runtime, boot-state construction, runtime version resolution, UI controller wiring, subscriptions, mode transitions, persistence scheduling, initial render, and cleanup.
- Keep `src/app/bootstrap.ts` as the composition root; move small boot-state, version, subscription, or UI-wiring details into the helper modules above.
- Use `src/app/headlessRuntime.ts` for Node-driven runtime tests that need real boot-state, reducer dispatch, persistence policy, mode transitions, UI effects, and read-model snapshots without DOM rendering.
- Use `src/app/headlessSession.ts` for the interactive JSONL protocol, command parsing, compact snapshots, layout/key discovery responses, and per-command diff reporting.

### Canonical Key Metadata
- `src/contracts/keyCatalog.ts`
- Owns: key id, category, unlock group, traits, behavior kind, runtime-facing metadata.
- Use this first for any new key trait (example: `complex_family`).

### Calculator Instances and Seed Layouts
- `src/domain/controlProfilesCatalog.ts`
- `src/domain/calculatorSeedManifest.ts`
- `src/domain/multiCalculator.ts`
- `src/domain/sandboxPreset.ts`
- `src/domain/calculatorSurface.ts`
- Owns: calculator ids, per-calculator control starts, seeded keypad placements, materialization, sandbox calculator order, and keypad surface mapping.
- Seeded keypad dimensions derive from each calculator control profile's alpha/beta starts; `calculatorSeedManifest` owns placements only.
- Control profiles are direct starts/static metadata; there is no derived equation matrix in the current runtime contract.
- `src/domain/multiCalculator.ts` also owns active calculator projection and calculator formula-symbol routing.
- Sandbox mode currently materializes `f_prime`, `g_prime`, `h_prime`, and `i_prime` with shared storage.

### Key Runtime Catalog Exports
- `src/content/keyCatalog.ts`
- `src/content/keyRuntimeCatalog.ts`
- `src/contracts/keyRuntimeCatalog.ts`
- Owns: normalized/exported catalog surfaces consumed by runtime.

### Button Registry and Trait Access
- `src/domain/buttonRegistry.ts`
- Owns: `getButtonDefinition(...)`, type-safe key lookups, registry-derived helpers.
- Use for renderer-side class decisions based on traits.

### Key Presentation (Labels / Symbols)
- `src/domain/keyPresentation.ts`
- `src/domain/types.ts`
- Owns: keyface labels, slot/operator display strings used in UI.

### Operation Semantics (Math)
- `src/domain` (search by key id / op function)
- Typical search:
  - `rg --line-number "op_<name>|unary_<name>|exec_roll_inverse|euclid|eulog|residual|tuple" src/domain`
- Owns: forward execution behavior, inverse integration, numeric/complex handling.

### Dispatch and Reducer Boundary
- `src/app/store.ts`
- `src/domain/reducer.ts`
- `src/domain/reducer.pipeline.ts`
- `src/domain/reducer.pipeline.action.ts`
- `src/domain/reducer.pipeline.scope.ts`
- `src/domain/reducer.pipeline.diagnostics.ts`
- `src/domain/reducer.input.ts`
- `src/domain/reducer.input.core.ts`
- Owns: app dispatch entrypoint, canonical reducer phase sequencing, action-policy resolution, projection scope, diagnostics, and input routing.
- Treat the `reducer.pipeline.*` files as phase-clarity helpers for the canonical reducer, not as an alternate reducer implementation.

### Persistence
- `src/infra/persistence/localStorageRepo.ts`
- `src/infra/persistence/saveEnvelope.ts`
- `src/infra/persistence/saveCodecV20.ts`
- `src/infra/persistence/runtimeLoadNormalizer.ts`
- `src/infra/persistence/migrations/registry.ts`
- `src/domain/state.ts`
- Owns: save-envelope parsing, current codec serialization, localStorage read/write behavior, load error policy, runtime normalization, and default state shape.
- Current policy: only `SAVE_SCHEMA_VERSION` loads successfully; older schemas return `UnsupportedSchemaVersion`. `src/infra/persistence/migrations/registry.ts` is a generic helper only and is not wired into the current load path.

### Unlock Predicates and Hint Projection
- `src/content/unlocks.catalog.ts`
- `src/domain/unlockEngine.ts`
- `src/domain/unlockGraph.ts`
- `src/domain/unlockHintProgress.ts`
- `src/ui/shared/readModel.total.ts`
- `src/ui/shared/viewModelProjection.ts`
- `src/ui/modules/calculator/totalDisplay.ts`
- `src/ui/modules/visualizers/hintProjectionShared.ts`
- `src/ui/modules/visualizers/feedHintProjection.ts`
- `src/ui/modules/visualizers/graphHintProjection.ts`
- Owns: unlock predicate definitions, evaluator wiring, domain progress rows, total-strip hint projection, and visualizer hint projection.
- Domain files own predicate truth and progress. UI/read-model files own wording, categories, ARIA copy, UX roles, and formatted progress text.

### Calculator Keypad Rendering
- `src/ui/modules/calculator/keypadRender.ts`
- `src/ui/shared/keyButtonClasses.ts`
- Owns: per-key class assignment (group classes, unary class, trait-based classes).

### Storage Rendering
- `src/ui/modules/storage/render.ts`
- `src/ui/shared/keyButtonClasses.ts`
- Owns: storage key button class parity with keypad via shared class assignment.

### Key Styling
- `styles/key-family.css`
- `styles/key-visual-affordance.css`
- `index.html` (global CSS tokens + stylesheet linkage)
- Owns: key family colors, accents, pseudo-elements, toggle visuals.

### Visualizer Rendering
- `src/ui/modules/visualizers/*`
- `styles/visualizer-*.css`
- Owns: specific visualizer output and visual layout.

### Visualizer Roll/Projection Sources
- `src/ui/modules/visualizers/registry.ts`
- `src/ui/shared/viewModelProjection.ts`
- `src/ui/shared/readModel.rollFeed.ts`
- `src/ui/shared/readModel.algebraic.ts`
- `src/ui/shared/readModel.factorization.ts`
- `src/domain/diagnostics.ts`
- `src/domain/graphProjection.ts`
- `src/ui/modules/visualizers/hintProjectionShared.ts`
- `src/ui/modules/visualizers/feedHintProjection.ts`
- `src/ui/modules/visualizers/graphHintProjection.ts`
- `src/ui/modules/visualizers/numberLineModel.ts`
- `src/ui/modules/visualizers/circleRenderer.ts`
- `src/ui/modules/calculator/totalDisplay.ts`
- Owns: canonical visualizer IDs, roll-derived read models, diagnostics, and plot/vector projection paths.

### Build Outputs and Reports
- `dist/reports/unlock-graph-report.md`
- `dist/reports/unlock-graph-report.json`
- `dist/reports/unlock-graph-report.mmd`
- `dist/reports/code-health-score.json`
- Owns: generated unlock-graph outputs and CI health scorecard artifacts.

### Release Workflows and Runbooks
- `.github/workflows/release-win-portable.yml`
- `.github/workflows/release-android-apk.yml`
- `docs/release-windows.md`
- `docs/release-itch.md`
- `docs/release-android.md`
- Owns: tag-driven release automation and platform runbook procedures.

## Invariant / Contract Docs (Docs Folder)
- `docs/ux-spec.md`
- `docs/math-spec.md`
- `docs/functional-spec.md`
- `docs/planning/visualizer-roll-content-interaction-matrix.md`
- `docs/planning/operator-testing-matrix.md`

Use these when behavior seems ambiguous; they are the first stop before inventing new policy.

## Test Map (Most Relevant)

### Key Catalog / Contract Integrity
- `tests/keyCatalog.normalization.test.ts`
- `tests/catalogCanonical.guard.test.ts`
- `tests/keyUniverseContract.guard.test.ts`
- `tests/buttonRegistry.contract.test.ts`

### Key Rendering / Class Assignment
- `tests/uiModule.calculatorKeypadRender.test.ts`
- `tests/uiModule.storage.v2.test.ts`

### Calculator Seeds / Sandbox Preset
- `tests/calculatorSeedManifest.test.ts`
- `tests/sandboxPreset.test.ts`
- `tests/uiModule.calculatorSlotDisplay.test.ts`
- `tests/uiModule.algebraicRenderer.v2.test.ts`
- Use these when changing calculator ids, control-profile starts, seeded keypad placements, sandbox calculator order, or seed dimension policy.

### Persistence / Save Compatibility
- `tests/persistence.test.ts`
- `tests/v2PersistenceParity.test.ts`
- Use these when changing save codecs, schema-version policy, localStorage errors, or runtime load normalization.

### Bootstrap / Runtime Wiring
- `tests/headlessRuntime.test.ts`
- `tests/bootstrapBoundary.test.ts`
- `tests/bootstrapDebugControlBindings.test.ts`
- `tests/bootstrapImportOrder.test.ts`
- `tests/bootstrapModeTransitionRuntimeContract.test.ts`
- `tests/bootstrapPersistenceScheduling.test.ts`
- `tests/modeTransitionCoordinator.test.ts`
- `tests/persistenceSaveScheduler.test.ts`
- Use `tests/headlessRuntime.test.ts` when changing the command-facing headless runtime or CLI-relevant dispatch/read-model surface.

### Reducer Pipeline / Action Boundary
- `tests/contracts.actionEvent.current.test.ts`
- `tests/contracts.domainUiEffects.current.test.ts`
- `tests/reducer.rollAnalysis.test.ts`
- `tests/reducer.scalarLimitPolicy.test.ts`
- `tests/reducer.executionIRRoutingParity.test.ts`
- Use these when changing reducer-facing action contracts, effect boundaries, scalar-limit behavior, or input execution routing.

### Unlock Hint / Visualizer Projection
- `tests/unlockHintProgress.test.ts`
- `tests/uiGraphHintProjection.test.ts`
- `tests/uiFeedHintProjection.test.ts`
- `tests/uiUxRoleSystem.test.ts`
- Use these when changing domain hint progress rows, total-display hint rows, hint categories, UX roles, or visualizer hint projections.

### Slot Input Target Spec
- `tests/contracts.slotInputTargetSpec.test.ts`
- `tests/helpers/slotInput.contractFixtures.ts`
- `tests/helpers/slotInput.contractRunner.ts`
- The slot-input contract fixtures describe current target behavior. Avoid reintroducing legacy-only parity scenarios unless the current product behavior requires them.

### CSS / UX Contracts
- `tests/uiVisualizerFitContract.test.ts`
- `tests/uiVisualizerUxSpecInvariants.test.ts`

### Capability / Semantics Parity
- `tests/capabilitySemanticsParity.contract.test.ts`

## Low-Noise Validation Workflow

1. Full compile (required before most tests):
- `npm run build:web:full`

2. Run targeted tests only (preferred):
- Key/catalog work: `node ./dist/tests/run-tests.js --grep="^(domain/key-catalog-normalization|contracts/catalog-canonical-guard)$"`
- Persistence/projection/refactor boundaries: `node ./dist/tests/run-tests.js --grep="^(persistence|v2/persistence-parity|contracts/slot-input-target-spec|domain/unlock-hint-progress|ui/graph-hint-projection|ui/feed-hint-projection)$"`
- Reducer roll-analysis behavior: `node ./dist/tests/run-tests.js --grep="^reducer/roll-analysis$"`

3. If a target test file is not included by `tests/run-tests.ts`, run focused ad-hoc compile+invoke:
- Compile selected tests to a temp out dir.
- Execute only those test modules with Node.

## Search Patterns That Save Time
- Find all trait usage points:
  - `rg --line-number "KeyTrait|traits\.includes\(|complex_family" src tests`
- Find key render class assignment:
  - `rg --line-number "applySharedKeyButtonClasses|classList\.add\(\"key--|key--family|key--group" src/ui tests`
- Find key symbol/label definitions:
  - `rg --line-number "KEY_ID|keyface|slot|operator" src/domain`
- Find reducer-pipeline phases:
  - `rg --line-number "reduceThroughReducerPipeline|resolve.*Action|ProjectionScope|diagnostic" src/domain tests`
- Find persistence schema/load policy:
  - `rg --line-number "SAVE_SCHEMA_VERSION|UnsupportedSchemaVersion|loadFromRawSave|loadFromLocalStorage" src tests`
- Find unlock-hint and visualizer projection boundaries:
  - `rg --line-number "projectEligibleUnlockHintProgressRows|buildTotalHintRowsViewModel|HintProjection|ViewModelProjection" src tests`

## Per-Key Implementation Checklist
- [ ] Add/adjust key entry in `keyCatalog`.
- [ ] Update presentation label/symbol.
- [ ] Implement forward semantics.
- [ ] Implement inverse semantics (or explicit NaN/non-invertible behavior).
- [ ] Ensure keypad render class behavior is correct.
- [ ] Ensure storage render class parity is correct.
- [ ] Add/adjust CSS token + selector if key family/affordance changes.
- [ ] Add tests for positive + negative class/behavior cases.
- [ ] Run targeted validation commands.

## Notes for Future Sessions
- Keep this file updated whenever a new "system touchpoint" appears.
- Prefer adding 1 line here over rediscovering paths in later turns.
