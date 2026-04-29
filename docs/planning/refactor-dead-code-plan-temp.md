# Temporary Refactor Plan: Dead-Code Candidates

Status: temporary planning artifact for cleanup sequencing prior to implementation.

## Candidate Assessment Matrix

| Candidate | Why it may be dead / over-abstracted | Risk | Reward |
|---|---|---|---|
| `src/persistence/migrations.ts` (re-export shim) | Pure re-export facade over infra migrations; may be obsolete if all imports can target canonical infra path directly. | med | med |
| `src/infra/debug/rollStateSerializer.ts` (debug serializer path) | Debug-focused serialization that might be removable if no production/UI dependency remains after audit. | high | low |
| Legacy fixture helpers in tests (`tests/support/legacyState.ts` and legacy-tagged fixture scenarios) | Could be partially redundant if parity/compat contracts are narrowed; may represent historical coverage rather than current guarantees. | high | med |
| Legacy-symbol guard expectations tied to now-removed monolith references (`tests/noLegacySymbols.guard.test.ts` + related token checks) | Guard intent may have drifted; some checks may be redundant with newer architecture constraints. | med | low |
| Deprecated shell target handling (`legacy` value handling in shell-mode resolver tests) | Behavior explicitly marked deprecated; candidate for removal if backward-compat policy no longer requires accepting legacy env/query values. | med | med |
| Planning/archive references to already-removed modules in docs (`docs/planning/archive/*`) | Historical notes are not runtime code; candidates for docs pruning only if archive slimming is desired. | low | low |

## Refactor Candidates (Non-Legacy)

| Candidate | Why it is a refactor opportunity | Risk | Reward |
|---|---|---|---|
| `src/app/bootstrap.ts` (orchestration density) | Bootstrapping currently combines mode resolution, persistence policy, UI wiring, scheduling, and coordinator setup in a single long module; split into composition helpers could improve readability/testability. | med | high |
| `src/domain/reducer.ts` + `src/domain/reducer.input.core.ts` (routing boundary complexity) | Input routing and reducer semantics are spread across multiple entry points; clearer phase separation (normalize → route → execute → effects) may reduce cognitive load and defect risk. | med | high |
| `src/ui/shared/readModel.*` and visualizer registry coupling | Multiple read-model builders and visualizer projections may duplicate derivation/transformation patterns; standardizing projection contracts could reduce repeated glue code. | med | med |
| Key class assignment parity (`src/ui/modules/calculator/keypadRender.ts` and `src/ui/modules/storage/render.ts`) | Both paths must keep class behavior in sync; extracting shared key-class composition logic could prevent divergence and reduce duplicate conditionals. | low | high |
| App version token resolution duplicated by consumer concerns (`src/app/bootstrap.ts`, visualizer title/release notes renderers) | Version fallback/normalization concerns appear in multiple places; centralizing version token policy would simplify renderer logic and reduce drift. | low | med |
| Unlock hint projection chain (`src/content/unlocks.catalog.ts` → `src/domain/unlockEngine.ts` → `src/ui/shared/readModel.total.ts`) | Cross-layer hint/progress shaping may be hard to reason about; explicit DTO boundaries and projection adapters could clarify ownership and make testing more targeted. | med | high |

## Notes
- No code deletion should occur until import-graph + symbol-usage audits are complete.
- "Legacy" naming alone is not sufficient evidence for deletion; several legacy paths are validated by explicit contract tests.
- Prioritize low-risk, medium-reward shims first (`src/persistence/migrations.ts`) for initial cleanup PR.
- For non-legacy refactors, prefer extracting seams with contract tests before behavior changes.


## Legacy Code Removal Plan

| Legacy area | Current footprint | What must happen before complete removal | Risk | Reward |
|---|---|---|---|---|
| Legacy shell target acceptance (`legacy` query/env handling) | Deprecated behavior validated in shell-mode resolver tests. | 1) Decide cutoff version/date for backward compatibility. 2) Remove `legacy` parsing branches in resolver. 3) Update tests and release notes with migration guidance. | med | med |
| Legacy persistence migration support (old save payload normalization) | Migration tests assert successful hydration of legacy schemas and cleanup of obsolete flags. | 1) Publish explicit save-compatibility policy (which schema versions are still supported). 2) Add telemetry or support-data confidence that active users are beyond cutoff. 3) Remove old migration branches + fixtures and keep only supported schema path tests. | high | high |
| Legacy reducer parity harness / comparator semantics | Docs and release notes describe retained legacy comparator path for deterministic parity checks. | 1) Prove IR-first path correctness via strengthened property/contract tests. 2) Freeze parity snapshots and confirm no regression across representative scenarios. 3) Remove comparator path and associated parity-only fixtures. | high | med |
| Legacy initial-state fixture usage in tests (`tests/support/legacyState.ts` + imports) | Widely used across UI/domain contract tests as baseline constructor alias. | 1) Replace all uses with canonical `initialState`/scenario builders. 2) Keep behavior parity by converting fixtures in small batches. 3) Delete alias helper after zero references remain. | low | med |
| Legacy symbol guard tests / monolith-retirement tokens | Multiple tests assert absence/presence of retired symbols and import boundaries. | 1) Re-evaluate which guards still protect real regressions. 2) Consolidate overlapping guards into a single boundary suite. 3) Remove stale token checks that no longer map to architectural risk. | med | low |
| Legacy contract-tagged slot-input scenarios (`legacy_contract`) | Contract fixtures and runner include dedicated legacy-tag scenario sets. | 1) Classify each legacy scenario as still-required invariant vs historical behavior. 2) Promote required ones to target-spec tags. 3) Remove historical-only scenarios and simplify runner projections. | med | high |

### Legacy Removal Sequencing Notes
- Remove legacy behavior only behind an explicit compatibility policy decision (version/date based).
- For runtime legacy paths (persistence, execution parity), require a two-step rollout: strengthen tests first, delete second.
- For test-only legacy scaffolding, prioritize incremental replacement to avoid large coupled diffs.
