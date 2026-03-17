# AutoCalc Functional Specification

Last updated: 2026-03-17  
Status: Draft v1  
Purpose: Define design truths and behavioral invariants that must remain true regardless of implementation details.

## 1. Scope and Precedence

This document specifies what AutoCalc must do as a game system. It is implementation-agnostic.

Precedence order for behavior decisions:

1. This functional specification
2. Contract docs (for example `docs/contracts/ui-domain-contract.md`)
3. Feature/milestone docs
4. Implementation details

If implementation conflicts with this document, implementation is considered incorrect.

## 2. Product Identity

AutoCalc is a calculator-first progression game.  
Player capability is represented by unlocked input/actions.  
Progression is earned by demonstrated behavior, not by spending a generic currency.

## 3. System Model (Design-Level)

The game consists of:

1. A deterministic state transition system driven by player actions.
2. A progression system that evaluates predicates over player-visible history/state.
3. A UI shell that presents and emits actions but does not define game semantics.
4. A persistence system that restores equivalent gameplay state across sessions.

## 4. Core Design Truths (Invariants)

Each invariant is normative and testable.

### 4.1 Determinism and State Semantics

- `FS-DET-01`: Given the same initial state and same action sequence, resulting gameplay state is identical.
- `FS-DET-02`: Action semantics are platform-independent (mobile/desktop may differ in interaction mechanics, not outcomes).
- `FS-DET-03`: No UI-only effect may alter domain outcome unless it emits a domain action that explicitly encodes that effect.

### 4.2 Input and Execution Semantics

- `FS-EXEC-01`: Unlocked keys define the set of legal player actions.
- `FS-EXEC-02`: Locked keys are inert for gameplay progression and state mutation (except explicitly defined non-gameplay telemetry).
- `FS-EXEC-03`: Standard execution (`=`) resolves the currently committed operation sequence deterministically.
- `FS-EXEC-04`: Any stepped/partial execution mode must preserve final-result equivalence with full execution when both complete.
- `FS-EXEC-05`: Error outcomes are first-class execution results and must be represented consistently in state/history.

### 4.3 Progression and Unlock Semantics

- `FS-PROG-01`: Unlock predicates are evaluated against player state/history, not presentation-layer artifacts.
- `FS-PROG-02`: Unlock completion is monotonic unless a specific unlock is explicitly designed as reversible.
- `FS-PROG-03`: Unlock effects expand or reconfigure capability without invalidating already-earned progression.
- `FS-PROG-04`: Equivalent player behavior must yield equivalent unlock outcomes across supported shells.

### 4.4 History (Roll) Semantics

- `FS-HIST-01`: History is an auditable record of executed outcomes, not transient drafting state.
- `FS-HIST-02`: Error and remainder channels are part of canonical history semantics when present.
- `FS-HIST-03`: History display differences are allowed, but history meaning is invariant.

### 4.5 Layout and Surface Semantics

- `FS-LAYOUT-01`: Layout/storage systems may change action access ergonomics but may not change action meaning.
- `FS-LAYOUT-02`: Move/swap validity constraints are game rules and therefore domain-consistent across shells.
- `FS-LAYOUT-03`: Shell-specific gestures are implementation choices; their emitted action intent must preserve domain rules.

### 4.6 Visualizer and Read-Model Semantics

- `FS-VIZ-01`: Visualizers are projections of canonical state and must not become alternative sources of truth.
- `FS-VIZ-02`: Changing active visualizer must not alter calculator/progression outcomes by itself.
- `FS-VIZ-03`: Unsupported or unavailable visualizer states must degrade to a defined safe default.

### 4.7 Persistence and Migration Semantics

- `FS-PERS-01`: Save/load round-trip preserves gameplay-equivalent state.
- `FS-PERS-02`: Legacy payload migration may normalize structure, but must preserve intended player progression semantics when representable.
- `FS-PERS-03`: Malformed/invalid persisted payloads fail safe and must not produce undefined gameplay states.

## 5. Allowed Variation (Non-Invariants)

The following may vary without violating the design:

1. Visual composition, density, and motion style.
2. Input modality details (click/touch/gesture/keyboard), provided action intent is preserved.
3. Internal module boundaries, naming, and refactors.
4. Data structures that are behaviorally equivalent.

## 6. Contract Clause Style

All contract clauses should map to this format:

1. `Clause ID` (for example `FS-EXEC-04`)
2. `Behavioral statement` (player/system truth)
3. `Observable oracle` (what can be checked)
4. `Negative case` (what must fail)
5. `Current test coverage` (suite names)

## 7. Test Strategy Requirements (Spec-Driven)

- `FS-TEST-01`: Every invariant in Section 4 must have at least one automated assertion.
- `FS-TEST-02`: High-risk invariants (`DET`, `EXEC`, `PROG`, `PERS`) must have at least one multi-step workflow test, not only unit assertions.
- `FS-TEST-03`: Contract tests must assert behavior semantics (action/state outcomes), not pixel-level rendering parity.
- `FS-TEST-04`: Fixture-registration tests alone do not satisfy invariant coverage for parity/fuzz claims; invariants require executable comparisons.

## 8. Traceability Matrix (Template)

Use this table to keep design truths connected to tests:

| Invariant ID | Design Truth Summary | Primary Test Suites | Coverage Type | Gap/Notes |
|---|---|---|---|---|
| FS-DET-01 | Deterministic state transitions |  | Unit + Integration |  |
| FS-EXEC-04 | Stepped vs full execution equivalence |  | Workflow |  |
| FS-PROG-04 | Cross-shell unlock equivalence |  | Integration + Contract |  |
| FS-PERS-01 | Save/load gameplay equivalence |  | Unit + Migration |  |

## 9. Out of Scope

This document does not define:

1. Detailed UI layout specs.
2. Art direction or animation timing details.
3. Internal implementation architecture.
4. Milestone planning specifics.

## 10. Change Control

When behavior changes intentionally:

1. Update relevant invariant clauses first.
2. Update contract clauses and tests second.
3. Update implementation third.
4. Reject behavior changes that have no associated invariant or clause update.
