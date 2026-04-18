Truth: 1
# Code Map: Keys, Operators, Roll, and Visualizers

Purpose: quick navigation for implementing or reviewing key behavior with minimal search churn.

## Fast Path (New Key)
1. Add key metadata and traits.
2. Add keyface/operator-slot label.
3. Implement operation semantics (+ inverse behavior if needed).
4. Ensure render-time classes/UX accents are applied.
5. Add or update tests.

## Core Systems

### Canonical Key Metadata
- `src/contracts/keyCatalog.ts`
- Owns: key id, category, unlock group, traits, behavior kind, runtime-facing metadata.
- Use this first for any new key trait (example: `complex_family`).

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
- `src/domain/reducer.input.core.ts`
- Owns: app dispatch entrypoint and canonical reducer/input routing.

### Unlock Predicates and Hint Projection
- `src/content/unlocks.catalog.ts`
- `src/domain/unlockEngine.ts`
- `src/domain/unlockGraph.ts`
- `src/domain/unlockHintProgress.ts`
- `src/ui/shared/readModel.total.ts`
- `src/ui/modules/calculator/totalDisplay.ts`
- Owns: unlock predicate definitions, evaluator wiring, and total-strip hint projection.

### Calculator Keypad Rendering
- `src/ui/modules/calculator/keypadRender.ts`
- Owns: per-key class assignment (group classes, unary class, trait-based classes).

### Storage Rendering
- `src/ui/modules/storage/render.ts`
- Owns: storage key button class parity with keypad.

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
- `src/ui/shared/readModel.rollFeed.ts`
- `src/ui/shared/readModel.algebraic.ts`
- `src/ui/shared/readModel.factorization.ts`
- `src/domain/diagnostics.ts`
- `src/domain/graphProjection.ts`
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
- `docs/planning/unlock-predicate-condition-matrix.md`

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

### CSS / UX Contracts
- `tests/uiVisualizerFitContract.test.ts`
- `tests/uiVisualizerUxSpecInvariants.test.ts`

### Capability / Semantics Parity
- `tests/capabilitySemanticsParity.contract.test.ts`

## Low-Noise Validation Workflow

1. Full compile (required before most tests):
- `npm run build:web:full`

2. Run targeted tests only (preferred):
- `node ./dist/tests/run-tests.js --grep="^(domain/key-catalog-normalization|contracts/catalog-canonical-guard)$"`

3. If a target test file is not included by `run-tests.ts`, run focused ad-hoc compile+invoke:
- Compile selected tests to a temp out dir.
- Execute only those test modules with Node.

## Search Patterns That Save Time
- Find all trait usage points:
  - `rg --line-number "KeyTrait|traits\.includes\(|complex_family" src tests`
- Find key render class assignment:
  - `rg --line-number "classList\.add\(\"key--" src/ui/modules`
- Find key symbol/label definitions:
  - `rg --line-number "KEY_ID|keyface|slot|operator" src/domain`

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
