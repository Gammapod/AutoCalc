Truth 1: Invariants
# AutoCalc Functional Specification

Last updated: 2026-03-28
Status: Draft v2 (design-truth restructure)
Purpose: Define player-facing functional truth, independent of implementation structure.

## 1. Scope and Precedence

This document specifies what AutoCalc MUST do as a game system.

Precedence order:

1. This functional specification
2. Contract docs (for example `docs/contracts/ui-domain-contract.md`)
3. Milestone/feature docs
4. Implementation details

If implementation conflicts with this document, implementation is incorrect.

## 2. Product Identity

AutoCalc is a calculator-first progression game.

- Player capability is represented by unlocked actions.
- Progression is earned by demonstrated behavior.
- Shell/UI presentation may vary, but game semantics MUST remain invariant.

## 3. Top-Level Player Interfaces

The player interacts with two top-level interfaces:

1. Global State Interface
2. Calculator State Interface

### 3.1 Global State Interface

The Global State Interface governs session continuity, progression capability state, and shared storage policy.

#### 3.1.1 Saves and Session

- `FS-GS-01` (MUST): Save/load round-trip preserves gameplay-equivalent global state.
  Rationale: session continuity must not change player capability semantics.
- `FS-GS-02` (MUST): Malformed or incompatible save payloads fail safe.
  Rationale: invalid persistence must not create undefined progression state.

#### 3.1.2 Storage Model

- `FS-GS-03` (MUST): Storage is a global progression-governed unlocked-key palette/surface, not an execution engine.
  Rationale: storage is a capability browser/install source, not part of math execution.
- `FS-GS-04` (MUST): Storage interactions may change action availability ergonomics, but not action meaning.
  Rationale: relocation cannot redefine key semantics.
- `FS-GS-05` (MUST): Installed keypad key identity is unique per calculator by key ID. A calculator cannot install duplicate copies of the same key ID.
  Rationale: deterministic per-calculator layout policy prevents redundant installs while preserving clear install intent.
- `FS-GS-06` (MUST): Storage shows every unlocked key and only unlocked keys; storage membership is derived from unlock state and does not mutate through drag/install/uninstall interactions.
  Rationale: unlocked capability browsing must be complete and deterministic, and locked capability state must not be represented as hidden storage inventory.

#### 3.1.3 Unlock/Progression (Gameplay Spine)

- `FS-UP-01` (MUST): Unlock runtime state is progression-owned under Global State.
  Rationale: capability ownership must be singular and auditable.
- `FS-UP-02` (MUST): Unlock predicates evaluate canonical domain state/history, never presentation artifacts.
  Rationale: progression truth must be shell-agnostic.
- `FS-UP-03` (MUST): Unlock completion is monotonic unless explicitly defined as reversible.
  Rationale: earned progress should not silently regress.
- `FS-UP-04` (MUST): Equivalent action histories produce equivalent unlock outcomes across shells.
  Rationale: platform parity is a core player promise.
- `FS-UP-05` (MUST): Implemented key catalog/type definition is separate from unlock runtime flags.
  Rationale: static key identity and dynamic capability state are distinct concerns.
- `FS-UP-06` (SHALL): Locked capabilities remain inert for gameplay mutation.
  Rationale: locked actions must not create hidden state change paths.
- `FS-UP-07` (MUST): A key installed on a calculator keypad is press-usable even while locked, and locked installed keys are immobile. For locked installed toggle behavior: (a) settings-toggle keys are forced ON and cannot be toggled OFF until unlocked; (b) play/pause is excluded from forced-ON lock behavior; (c) if one or more locked visualizer keys are installed, exactly one locked visualizer is forced-active, chosen by keypad scan order.
  Rationale: installed locked keys are explicit progression affordances, with deterministic locked-toggle and visualizer-selection behavior and no locked-key relocation.
- `FS-UP-08` (SHALL): Execution-gated rejected inputs should not contribute to progression evidence (including key-press-count-based unlock progress), unless explicitly defined by a specific unlock rule.
  Rationale: rejected execution-gated input is normally non-progress behavior while permitting explicit progression-rule exceptions.
- `FS-UP-09` (MUST): Unlock graph report is built from unlock-authored sufficiency metadata. Each unlock definition declares one or more sufficient key sets, and the first set is canonical for graphing/reporting.
  Rationale: report truth is explicit content metadata, not runtime inference.
- `FS-UP-10` (MUST): Graph nodes include key nodes and unlock target nodes. Directed edges represent canonical sufficiency dependencies from source keys to unlock targets.
  Rationale: target-node modeling supports both key and non-key unlock effects in one graph contract.
- `FS-UP-11` (MUST): Structural validation is strict: each unlock must provide at least one sufficient key set; canonical set must be non-empty; canonical keys must reference known key identities; target node id must be valid.
  Rationale: deterministic static reporting requires hard validation guards.
- `FS-UP-12` (MUST): Dynamic proving/traversal is not part of build-time unlock graph generation. Invalid unlock metadata is excluded from graph edges and surfaced in diagnostics.
  Rationale: removing search/proof execution keeps reporting deterministic and bounded.

#### 3.1.4 Traceability (Global State)

| Invariant ID | Clause summary | Primary suites | Coverage type | Gap |
|---|---|---|---|---|
| FS-GS-01 | Save/load preserves gameplay-equivalent global state | `persistence`, `v2/persistence-parity` | unit + contract | none |
| FS-GS-02 | Malformed/incompatible saves fail safe | `persistence` | unit | none |
| FS-GS-03 | Storage is global unlocked-key palette/surface, not execution engine | `ui/storage-display`, `ui/drag-drop-behavior` | integration | partial: dedicated palette-source contract rollout pending |
| FS-GS-04 | Storage changes do not alter key meaning | `contracts/ui-action-emission`, `domain/key-identity-adapters` | contract + unit | partial: no direct end-to-end assertion |
| FS-GS-05 | Installed keypad key identity is unique per calculator by key ID | `reducer/layout`, `contracts/multi-calculator-invariants` | unit + contract | partial: dedicated install-rejection contract rollout pending |
| FS-GS-06 | Storage displays all-and-only unlocked keys from unlock state (non-mutable membership) | `ui-module/storage-v2`, `ui/storage-display`, `contracts/storage-palette` | integration + contract | partial: runtime migration/parity coverage rollout pending |
| FS-UP-01 | Unlock runtime state progression-owned | `contracts/content-provider-wiring`, `domain/button-registry-contract` | contract | partial: ownership is indirectly asserted |
| FS-UP-02 | Predicate evaluation uses canonical state/history | `domain/unlock-engine` | unit | none |
| FS-UP-03 | Unlock completion monotonic by default | `content-drill/unlock-extension`, `domain/unlock-engine` | workflow + unit | gap: no generic monotonicity property test |
| FS-UP-04 | Cross-shell unlock outcome equivalence | `ui-integration/mobile-shell`, `ui-integration/desktop-shell`, `v2/parity` | integration + parity | partial: no unlock-focused cross-shell parity fixture |
| FS-UP-05 | Key catalog/type is separate from runtime unlock flags | `domain/button-registry-contract`, `domain/key-action-handlers-contract`, `domain/key-catalog-normalization` | contract + unit | none |
| FS-UP-06 | Locked capabilities are inert | `reducer/input`, `domain/key-unlocks` | unit | none |
| FS-UP-07 | Installed locked keys are usable but immobile; settings toggles forced ON; play/pause excluded; one locked visualizer forced-active by keypad scan order | `domain/key-unlocks`, `domain/layout-rules-invariants`, `ui-module/calculator-keypad-render` | unit + contract + integration | partial: settings-toggle forced-ON, play/pause exclusion, and locked-visualizer keypad-order selection lack dedicated contract assertions |
| FS-UP-08 | Execution-gated rejected inputs should not normally advance progression evidence, except explicit rule-defined cases | `contracts/execution-gate-parity`, `domain/unlock-engine` | contract + unit | partial: explicit exception-bearing unlock rules may intentionally diverge |
| FS-UP-09 | Unlock graph uses unlock-authored sufficient key sets; first set is canonical | `domain/unlock-graph`, `scripts/generate-unlock-graph-report` | unit + workflow | partial: no catalog-wide required-field contract suite yet |
| FS-UP-10 | Graph includes key and unlock-target nodes with directed canonical dependency edges | `domain/unlock-graph` | unit | partial: additional fixture coverage for mixed target kinds desirable |
| FS-UP-11 | Strict structural validation for sufficient sets and target ids | `domain/unlock-graph`, `domain/key-catalog-normalization` | unit + contract | partial: no dedicated malformed-catalog matrix beyond core fixtures |
| FS-UP-12 | Build report is static (no traversal/proof), with invalid rows surfaced via diagnostics | `domain/unlock-graph`, `scripts/generate-unlock-graph-report` | unit + workflow | partial: no separate contract for diagnostic-category completeness |

### 3.2 Calculator State Interface

The Calculator State Interface governs calculator runtime models for one or more calculator instances.

#### 3.2.0 Multi-Calculator Session Model

- `FS-MC-01` (MUST): A session supports one or more calculator instances, represented by coherent `calculatorOrder` + `calculators` state.
  Rationale: more calculators means a wider possibility space for puzzles while keeping selection/lifecycle truth explicit.
- `FS-MC-02` (MUST): Each calculator instance owns isolated execution-local state (total, drafting, slots, roll/history, control matrix variables, and step progress).
  Rationale: multi-calculator play requires local execution truth per instance.
- `FS-MC-03` (MUST): Progression-owned unlock state remains global and shared across calculators unless explicitly defined otherwise.
  Rationale: progression ownership and auditability remain singular under global state.
- `FS-MC-05` (MUST): Creating or unlocking an additional calculator (including configured bootstrap materialization) deterministically initializes control profile selection, initial keypad/loadout projection, initial calculator settings/defaults, and initial execution state.
  Rationale: newly integrated calculators must enter play with explicit, parity-testable initialization semantics regardless of lifecycle entrypoint.
- `FS-MC-07` (MUST): Save/load round-trip preserves all calculator instances and active-calculator selection.
  Rationale: session continuity must hold for multi-instance progression.
- `FS-MC-08` (MUST): With only one unlocked calculator, behavior remains equivalent to single-calculator gameplay semantics.
  Rationale: multi-calculator rollout must preserve baseline play and existing progress compatibility.
- `FS-MC-09` (MUST): Multi-calculator semantics are enabled when `calculatorOrder` contains more than one calculator id; behavior MUST NOT depend on specific calculator id pairs.
  Rationale: id-agnostic routing prevents regressions when new calculators are introduced.
- `FS-MC-10` (MUST): Calculator identity is the composition of (a) its control profile/matrix relationship, (b) deterministic initialization policy (default settings/loadout at materialization), and (c) action-driven runtime evolution. Control matrix/profile resemblance alone MUST NOT be treated as identity equivalence.
  Rationale: prevents false equivalence assumptions that collapse distinct calculators based only on control matrix similarity.

#### 3.2.1 Core Calculator Surfaces

- `FS-CS-01` (MUST): Calculator state owns keypad, roll/history, display/visualizer projection, and control matrix state.
  Rationale: these are calculator-local runtime semantics.
- `FS-CS-02` (MUST): Control matrix relationships are calculator-local, and each calculator's settable/derived variable policy constrains reachable states and the reachable capability envelope (keypad dimensions, slot count, range, and evaluation cadence semantics).
  Rationale: control behavior must remain calculator-cohesive with explicit local-state and envelope boundaries.
- `FS-CS-03` (MUST): Visualizers are projections of canonical calculator state and cannot become alternate sources of truth.
  Rationale: read-model/UI cannot override domain truth.
- `FS-CS-04` (MUST): Roll/history represents executed outcomes, not transient drafting intent.
  Rationale: history is an auditable execution trail.
- `FS-CS-05` (MUST): Error and remainder channels are canonical parts of execution outcome semantics when present.
  Rationale: failure modes and remainders are gameplay-relevant outputs.

#### 3.2.1.a Semantic Visual Families (Visualizer + Function Displays)

- `FS-CS-06` (MUST): Modulo, cycle analysis, and congruence concepts share one semantic visual family across visualizers and function displays.
  Rationale: players should recognize modular arithmetic concepts as one conceptual channel.
- `FS-CS-07` (MUST): Memory, control matrix, and lambda-related concepts share one semantic visual family across visualizers and function displays.
  Rationale: control/resource concepts should read as one coherent operational channel.
- `FS-CS-08` (MUST): Error concepts use a distinct semantic visual family that cannot be confused with normal operation families.
  Rationale: failure state readability must be immediate and unambiguous.
- `FS-CS-09` (SHALL): Semantic families are not conveyed by color alone; at least one additional cue (iconography, labeling, pattern, or motion state) is provided.
  Rationale: semantic readability and accessibility must not depend on color perception alone.

#### 3.2.1.b Key Visual Affordance Ownership (UX-aligned)

- `FS-CS-10` (MUST): Key visual affordance invariants are owned by `docs/ux-spec.md` (`UX-KVA-01` through `UX-KVA-05`) and treated as canonical UX truth.
  Rationale: functional truth defines ownership boundaries while UX truth defines concrete visual invariants.
- `FS-CS-11` (MUST): Functional-spec traceability for key visual affordance behavior maps to executable UI contract/integration suites.
  Rationale: visual-affordance policy must remain auditable and test-linked, not implicit.

#### 3.2.2 Function Builder and Operation Slots (Gameplay Spine)

- `FS-FB-01` (MUST): Seed total semantics are deterministic and explicit.
  Rationale: all operation trajectories depend on seed interpretation.
- `FS-FB-02` (MUST): Standard execution resolves committed operation slots deterministically (left-to-right semantics).
  Rationale: execution order is core gameplay truth.
- `FS-FB-03` (MUST): Value/number behavior is capability-gated by unlocked key state.
  Rationale: progression must control expression power.
- `FS-FB-04` (SHALL): Alternate settings modify execution only through explicit modeled flags; when wrap-mode settings are enabled, execution appends a terminal synthetic wrap stage that is included in step order/targeting.
  Rationale: optional behavior must stay declarative and testable.
- `FS-FB-05` (MUST): Step-through partial execution preserves terminal equivalence with full execution when completion scope is equal.
  Rationale: step-through is an interaction mode, not a different math system.
- `FS-FB-06` (MUST): Execution finalization commits one terminal outcome per completion path.
  Rationale: prevents duplicate roll/terminal writes.
- `FS-FB-07` (MUST): If step-through capability is absent, step-specific behavior is inert.
  Rationale: unavailable capabilities cannot leak behavior.
- `FS-FB-08` (MUST): Auto-step mode is an execution-state gate. `=` is the toggle entrypoint for this mode (`execution.pause.equals`). While active, calculator mutations to seed/function-builder/layout are rejected unless the action family is designated as execution-interrupting; rejected inputs are non-mutating for calculator/progression state, while UI-only feedback effects are allowed.
  Rationale: execution cadence and deterministic state transitions require mode-gated mutation boundaries, with explicit toggle-driven entry.
- `FS-FB-09` (MUST): Auto-step intermediate progress is preview-only. Roll/history and terminal total commit exactly once, only on completion/finalization of the execution path.
  Rationale: prevents duplicate terminal writes and preserves roll as terminal execution history. For equals-toggle mode, the flag auto-clears on terminal roll/total commit.

#### 3.2.3 Traceability (Calculator State)

| Invariant ID | Clause summary | Primary suites | Coverage type | Gap |
|---|---|---|---|---|
| FS-CS-01 | Calculator owns keypad/roll/display/control matrix runtime semantics | `ui/runtime-registry`, `ui/layout-engine`, `ui/layout-adapter` | integration + unit | partial: interface ownership is inferred |
| FS-CS-02 | Control matrix relationships are calculator-local; per-calculator settable/derived variable policy constrains reachable states and capability envelope (keypad dimensions, slot count, range, evaluation cadence semantics) | `domain/sandbox-preset`, `app/analysis-report` | unit | gap: no explicit control-matrix locality contract suite |
| FS-CS-03 | Visualizers are projections, not truth source | `contracts/ui-action-emission`, `ui-module/visualizer-host-v2`, `ui/visualizer-fit-contract` | contract + integration | partial: includes CSS-coupled assertions |
| FS-CS-04 | Roll is executed outcomes, not drafting state | `reducer/input`, `ui/roll-display`, `contracts/slot-input-parity` | unit + integration + contract | none |
| FS-CS-05 | Error/remainder channels are canonical outcomes | `reducer/input`, `ui/total-display`, `ui/roll-display`, `persistence` | unit + integration | none |
| FS-CS-06 | Modulo/cycle/congruence share one semantic visual family | `ui/graph-display`, `ui-module/grapher-v2` | integration | gap: no explicit semantic-family contract assertion |
| FS-CS-07 | Memory/control-matrix/lambda share one semantic visual family | `ui/cue-telemetry`, `ui/cue-lifecycle`, `app/analysis-report` | integration + unit | gap: no explicit semantic-family contract assertion |
| FS-CS-08 | Errors use distinct semantic visual family | `ui/total-display`, `ui/roll-display` | integration | partial: behavior tested, family-level visual contract absent |
| FS-CS-09 | Semantic families are not color-only | `ui-shell/menu-a11y` | integration | gap: no dedicated accessibility contract for semantic family cues |
| FS-CS-10 | Key visual affordance invariants are UX-owned (`UX-KVA-01`..`UX-KVA-05`) | `docs/ux-spec.md`, `docs/contracts/ui-domain-contract.md` | spec governance | none |
| FS-CS-11 | Key visual affordance behavior maps to executable UI suites | `ui/visualizer-fit-contract`, `ui-module/calculator-keypad-render`, `ui-module/storage-v2` | contract + integration | partial: coverage is selector/token/assertion driven rather than pixel snapshot baseline |
| FS-FB-01 | Deterministic seed semantics | `reducer/input`, `contracts/slot-input-target-spec` | unit + contract | partial: target-spec scenarios are selective |
| FS-FB-02 | Deterministic slot execution order | `reducer/input`, `contracts/slot-input-parity`, `v2/parity` | unit + contract + parity | none |
| FS-FB-03 | Value/number behavior is capability-gated | `domain/key-unlocks`, `reducer/input`, `domain/key-behavior-contract` | unit + contract | none |
| FS-FB-04 | Alternate settings use explicit flags | `reducer/input`, `domain/key-action-handlers-contract` | unit + contract | partial: no dedicated cross-feature settings matrix |
| FS-FB-05 | Step-through terminal equivalence with full execution | `reducer/input`, `ui-integration/mobile-shell`, `ui-integration/desktop-shell` | unit + workflow/integration | none |
| FS-FB-06 | Finalization writes one terminal outcome per completion path | `reducer/input`, `persistence` | unit | partial: no dedicated long-trace finalization stress suite |
| FS-FB-07 | Step behavior inert when capability absent | `reducer/input`, `ui-integration/mobile-shell` | unit + integration | none |
| FS-FB-08 | `=` toggles auto-step mode; while active, calculator mutation inputs are gated and rejected actions are non-mutating unless execution-interrupting | `contracts/execution-gate-parity`, `reducer/input`, `reducer/layout`, `domain/execution-mode-policy` | contract + unit | partial: full auto-step action-family matrix coverage pending |
| FS-FB-09 | Auto-step intermediate progress is preview-only; roll/terminal commit exactly once on completion | `reducer/input`, `contracts/slot-input-parity`, `v2/parity` | unit + contract + parity | partial: no dedicated auto-step completion stress suite |

#### 3.2.4 Traceability (Multi-Calculator Session Model)

| Invariant ID | Clause summary | Primary suites | Coverage type | Gap |
|---|---|---|---|---|
| FS-MC-01 | One-or-more calculators with exactly one active selection and coherent order/instance representation | `reducer/lifecycle`, `v2/parity`, `contracts/multi-calculator-invariants` | unit + parity + contract | partial: baseline coherence + guard coverage exists; broader malformed-state fixtures pending |
| FS-MC-02 | Calculator execution-local state is isolated per instance | `reducer/input`, `contracts/slot-input-parity`, `contracts/multi-calculator-invariants` | unit + contract | partial: core targeted isolation covered; broader randomized isolation matrix pending |
| FS-MC-03 | Unlock ownership remains global/shared | `domain/unlock-engine`, `contracts/content-provider-wiring`, `contracts/multi-calculator-invariants` | unit + contract | partial: global unlock scope covered; reversible/exception scope policies not yet modeled |
| FS-MC-05 | Additional calculator initialization deterministically sets control profile selection, initial keypad/loadout projection, calculator settings/defaults, and execution state across unlock/bootstrap entrypoints | `reducer/lifecycle`, `persistence`, `contracts/multi-calculator-invariants` | unit + contract | partial: deterministic initialization covered; migration-triggered initialization fixtures pending |
| FS-MC-07 | Persistence preserves all instances and active selection | `persistence`, `v2/persistence-parity` | unit + contract | gap: multi-instance migration fixtures not defined |
| FS-MC-08 | One-calculator mode preserves baseline semantics | `v2/parity`, `contracts/parity-long-traces`, `contracts/multi-calculator-invariants` | parity + contract | partial: baseline-compat fixture pair exists for core sequences; broader long-trace coverage expansion pending |
| FS-MC-09 | Multi-calculator enablement and routing are driven by `calculatorOrder` cardinality/coherence, not specific id pairs | `contracts/multi-calculator-invariants`, `reducer/lifecycle`, `domain/execution-mode-policy` | contract + unit | partial: property-style coverage for larger calculator sets pending |
| FS-MC-10 | Calculator identity composes control profile/matrix relationship + deterministic initialization loadout + action-driven runtime evolution; control-matrix similarity alone is non-equivalence | `contracts/multi-calculator-invariants`, `reducer/lifecycle`, `v2/parity` | contract + unit + parity | partial: dedicated non-equivalence fixture matrix (same control profile, different initialization/evolution) pending |

## 4. Cross-Interface Boundary Clauses

- `FS-BND-01` (MUST): Global state owns progression/capability state and MAY gate calculator inputs from that state, but MUST NOT directly mutate calculator-owned execution/runtime state.
  Rationale: preserves single-owner state boundaries and prohibits cross-interface mutation.
- `FS-BND-02` (MUST): Calculator state consumes capability inputs but MUST NOT define unlock predicates/effects.
  Rationale: progression logic remains globally owned.
- `FS-BND-03` (MUST): Shell-specific layout/gesture behavior may diverge, but emitted domain action intent and resulting state outcomes remain equivalent. Canonical dispatch-path specifics are defined in `docs/contracts/action-event-reducer-boundary.md`.
  Rationale: interaction modality may diverge while dispatch-path truth remains centralized in one boundary contract.
- `FS-BND-04` (SHALL): Contract-layer definitions remain implementation-independent from app/ui/infra/content wiring.
  Rationale: contracts should encode stable semantics, not runtime coupling.
- `FS-BND-05` (MUST): Additional calculator creation/removal occurs through explicit domain actions/effects, except explicitly configured bootstrap materialization policy.
  Rationale: calculator lifecycle transitions must remain auditable, deterministic, and policy-scoped.

### 4.1 Traceability (Boundaries)

| Invariant ID | Clause summary | Primary suites | Coverage type | Gap |
|---|---|---|---|---|
| FS-BND-01 | Global state owns progression/capability state; no direct mutation of calculator-owned runtime/execution state | `v2/import-boundary`, `app/bootstrap-boundary` | contract + boundary | gap: no direct cross-interface mutation-bypass test |
| FS-BND-02 | Calculator does not own unlock predicate/effect definitions | `contracts/content-provider-wiring`, `domain/button-registry-contract` | contract | partial: ownership tested indirectly |
| FS-BND-03 | Shell divergence allowed; emitted intent and outcomes equivalent (dispatch-path specifics centralized in boundary contract) | `ui-integration/mobile-shell`, `ui-integration/desktop-shell`, `v2/parity`, `contracts/ui-action-emission`, `contracts/execution-gate-parity`, `contracts/action-event-reducer-boundary` | integration + parity + contract | none |
| FS-BND-04 | Contracts remain implementation-independent | `app/bootstrap-boundary`, `contracts/shim-inventory`, `browser/import-safety` | boundary + contract | partial: semantic independence asserted via import boundaries |
| FS-BND-05 | Calculator lifecycle changes are explicit action/effect or explicit bootstrap policy | `domain/unlock-engine`, `reducer/lifecycle`, `contracts/multi-calculator-invariants` | unit + contract | partial: lifecycle-event matrix can expand with additional calculators |

## 5. Conceptual Contracts (Spec-Level Interfaces)

These are stable documentation interfaces for test/contract alignment, not code symbols.

1. `Global State Interface`
   Defines save/session semantics, storage policy, and progression-owned unlock runtime state.
2. `Calculator State Interface`
   Defines per-calculator keypad, roll, visualizer projection, and control matrix runtime semantics.
3. `Progression Capability Contract`
   Defines how unlock predicates/effects map to capability gating consumed by calculator behavior.
4. `Function Builder Contract`
   Defines seed, operation-slot, setting-modifier, step-through, and finalization semantics.

## 6. Test Strategy Requirements (Spec-Driven)

- `FS-TEST-01` (MUST): Every normative clause in this document has a unique ID and appears in exactly one traceability table.
- `FS-TEST-02` (MUST): High-risk clauses (determinism, execution, progression, persistence) map to at least one executable automated suite.
- `FS-TEST-03` (SHALL): Coverage labels classify each mapped suite as `unit`, `workflow/integration`, or `contract`.
- `FS-TEST-04` (MUST): Fixture-registration-only suites do not satisfy parity/fuzz behavioral claims.

### 6.1 Traceability (Test Requirements)

| Invariant ID | Clause summary | Primary suites | Coverage type | Gap |
|---|---|---|---|---|
| FS-TEST-01 | Every normative clause has unique ID and one table entry | this document | spec governance | manual check required |
| FS-TEST-02 | High-risk clauses map to executable suites | `reducer/input`, `persistence`, `v2/parity`, `ui-integration/*`, `contracts/action-event-round-trip` | mixed | none |
| FS-TEST-03 | Coverage classification is explicit | this document tables | spec governance | none |
| FS-TEST-04 | Fixture-only suites do not count as parity/fuzz execution | `contracts/parity-long-traces`, `contracts/parity-seeded-fuzz` | contract hygiene | none |

## 7. Current Gap Report (Initial Baseline)

### 7.1 Invariants with no direct executable assertion

1. `FS-CS-02` control matrix locality has no explicit dedicated contract/assertion suite.
2. `FS-BND-01` action-bypass mutation prevention is not directly asserted as a behavior test.
3. `FS-BND-05` lifecycle explicitness now has baseline contract coverage; lifecycle-event matrix expansion remains pending.

### 7.2 Invariants with only partial or indirect coverage

1. `FS-UP-01` and `FS-BND-02` ownership rules are inferred through contract wiring/boundary tests, not directly behavior-specified.
2. `FS-FB-06` terminal finalization uniqueness has unit checks but no long-trace stress contract.
3. `FS-GS-03` and `FS-GS-04` storage semantics are covered behaviorally, but dedicated palette/install contract suites are rolling out.
4. `FS-CS-06`, `FS-CS-07`, and `FS-CS-09` semantic-family rules are defined but not yet enforced by dedicated contract-level UI semantic tests.
5. `FS-CS-10` and `FS-CS-11` now pin ownership and executable mapping for key visual affordance invariants; coverage is policy/selector driven and intentionally does not require pixel-snapshot baselines.
6. `FS-MC-07` still lacks dedicated multi-instance migration fixture coverage.
7. `FS-UP-07` locked-installed-key toggle semantics (settings-toggle forced ON, play/pause exclusion, single locked visualizer forced-active by keypad scan order) are partially covered but do not yet have a dedicated contract suite.
8. `FS-FB-09` and `FS-UP-08` are currently only partially covered; explicit auto-step completion stress and exception-bearing progression fixtures are pending.
9. `FS-UP-09`, `FS-UP-10`, `FS-UP-11`, and `FS-UP-12` are intentionally partial at introduction time; dedicated key-only schema, partition-matrix, canonical tie-break, and unresolved-classification fixtures/contracts are pending.

### 7.3 Fixture-only parity/fuzz coverage flags

1. no open fixture-only parity/fuzz coverage flags.

## 8. Out of Scope

This document does not define:

1. Visual styling/theming specifics.
2. Animation choreography details.
3. Internal module/file architecture decisions.
4. Milestone sequencing and delivery dates.

## 9. Change Control

When intentional behavior changes occur:

1. Update affected functional clauses first.
2. Update contracts/tests second.
3. Update implementation third.
4. Reject behavior changes without clause and traceability updates.
