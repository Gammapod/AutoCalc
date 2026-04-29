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


## Deep-Dive Feasibility Review (Actionable)

### 1) Dead/Over-Abstracted Candidates: feasibility + recommendation

| Candidate | Evidence to gather (quick audit) | Feasibility | Recommendation | Suggested action |
|---|---|---|---|---|
| `src/persistence/migrations.ts` re-export shim | `rg --line-number "src/persistence/migrations|persistence/migrations" src tests` and check whether any consumers require the façade path. | **High** (mechanical import rewrite) | **Do now** | Rewrite imports to canonical infra migration module; remove shim in same PR with a narrow contract test pass. |
| `src/infra/debug/rollStateSerializer.ts` | Build import graph + runtime grep for debug serializer symbol references, including docs scripts. | **Medium** (risk comes from hidden diagnostics hooks) | **Probably skip for now** unless references are truly zero | Keep file if used by developer tooling. If unused, deprecate first, delete in later cleanup PR after one release cycle. |
| `tests/support/legacyState.ts` + legacy fixture scenarios | Enumerate all imports and classify by test layer (UI/domain/contracts). | **High** (test-only; low runtime risk) | **Do in batches** | Replace helper usages with canonical state builders per suite; delete helper only after zero references. |
| `tests/noLegacySymbols.guard.test.ts` token checks | Compare against current architecture guards (`catalog`, `contract`, boundary suites). | **High** (test-only) | **Trim, don’t fully remove** | Consolidate overlapping assertions into one boundary test; remove stale token strings not tied to current risk. |
| Deprecated shell target handling (`legacy` query/env values) | Confirm docs/release policy and any saved links that still use `ui=legacy`. | **Medium** | **Defer behind compatibility decision** | Keep parsing branch until compatibility cutoff date is declared; then remove parser + tests together. |
| Archive docs references in `docs/planning/archive/*` | Search for inbound links from active docs/readme. | **High** | **Not worth prioritizing** | Optional docs hygiene only; no runtime value. |

### 2) Non-legacy refactor candidates: decomposition plan

| Candidate | Root issue | Feasibility | Recommendation | First extraction seam |
|---|---|---|---|---|
| `src/app/bootstrap.ts` orchestration density | Too many responsibilities in one composition root. | **Medium** | **High-value; do early** | Extract `resolveRuntimeMode`, `configurePersistencePolicy`, and `wireUiShell` helpers with contract tests around boot ordering. |
| `reducer.ts` + `reducer.input.core.ts` routing complexity | Phase boundaries implicit, difficult to reason/test. | **Medium** | **High-value; do after bootstrap seam** | Introduce explicit pipeline object (`normalize -> route -> execute -> effects`) while preserving existing reducer signature. |
| `readModel.*` + visualizer registry coupling | Repeated projection glue and loosely standardized DTO shapes. | **Medium** | **Do after reducer stabilization** | Define a small projection contract interface and adapt 1–2 visualizers first before full migration. |
| Key class parity (`keypadRender.ts` + `storage/render.ts`) | Duplicate conditional class assembly invites drift. | **High** | **Quick win; do first or second** | Extract shared `composeKeyClasses` util used by both renderers; prove parity via current UI tests. |
| Version token resolution duplication | Multiple renderers apply similar fallback normalization. | **High** | **Do early (low risk)** | Add single `resolveVersionToken` utility and swap callers with no behavior change. |
| Unlock hint projection chain | Ownership unclear across content/domain/ui layers. | **Medium** | **Do late** (depends on stable reducer/read-model contracts) | Introduce DTO adapters at layer boundaries, starting with read-model total projection tests. |

## Suggested Implementation Order (dependency-minimizing)

1. **Key class parity extraction** (low risk, high reward, almost no upstream dependency).
2. **Version token resolver centralization** (low risk utility refactor).
3. **Persistence migrations shim removal** (small cleanup once imports are redirected).
4. **Bootstrap decomposition** (creates cleaner seams for later pipeline refactors).
5. **Legacy test helper replacement (`legacyState`) in batches** (unblocks safe legacy pruning).
6. **Guard-suite consolidation for legacy symbol checks** (after fixture churn is reduced).
7. **Reducer/input explicit phase pipeline** (depends on clearer bootstrap and tests).
8. **Read-model/visualizer contract standardization** (depends on reducer stability).
9. **Unlock hint projection DTO boundary cleanup** (depends on read-model contract choices).
10. **Policy-gated removals**: deprecated shell `legacy` mode and deep legacy persistence branches only after compatibility decision + release communication.

## Candidates likely **not worth implementing now**

- `docs/planning/archive/*` pruning: very low runtime/product impact; do only during docs-focused maintenance.
- `rollStateSerializer` deletion without proving no tooling/debug workflow dependency: risk outweighs reward unless audit shows zero usage.
- Immediate removal of deprecated shell `legacy` handling: should be policy-driven, not purely technical cleanup.

## Additional anti-patterns noticed during review

1. **Mixed “policy + wiring” in composition roots** (bootstrap): policy decisions (compatibility, fallback behavior) are encoded alongside setup side effects.
2. **Cross-layer projection leakage** (unlock hints/read models): domain-shaping details appear to leak into UI read-model logic.
3. **Test scaffolding longevity risk**: “temporary” legacy fixtures have become broad dependencies, making removal expensive.
4. **Guard-test overlap**: multiple suites appear to enforce similar architectural constraints with different token vocabularies, increasing maintenance cost.

## Execution guardrails for each PR

- Keep each PR to **one seam** (utility extraction, import rewrite, or test fixture replacement).
- Require **no-behavior-change evidence**: targeted tests + before/after snapshots where applicable.
- For legacy removals, require: (a) explicit compatibility policy date/version, (b) release-note migration note, (c) rollback plan.
