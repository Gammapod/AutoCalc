Truth 1: Invariants
# AutoCalc UX Specification

Last updated: 2026-04-16
Status: Canonical Truth 1 UX invariants.
Purpose: Define UX/runtime interaction invariants that are compatible with `docs/functional-spec.md`.

## 1. Scope and Precedence

This document defines UX-level invariant behavior for interaction, projection, and parity.

Precedence order for UX concerns:

1. `docs/Documentation & Release Policy.md`
2. `docs/functional-spec.md`
3. this UX specification
4. Truth 2 release docs and runbooks
5. non-authoritative reference docs

If this document conflicts with `docs/functional-spec.md`, the functional spec wins.

## 2. Normative Clauses

### 2.1 Cross-shell parity

- `UX-PAR-01` (MUST): Mobile and desktop shells must produce equivalent reducer outcomes for equivalent domain action histories.
  Rationale: shell divergence is presentation-level, not game-semantics divergence.
- `UX-PAR-02` (MUST): Unlock progression outcomes must be parity-equivalent across shells for equivalent action histories.
  Rationale: progression truth is platform-invariant.
- `UX-PAR-03` (MUST): Execution-gated rejected inputs, including terminal-NaN execution-key rejects, must remain non-mutating and parity-equivalent across dispatch paths.
  Rationale: rejection semantics are part of gameplay determinism.

### 2.2 Visualizer projection invariants

- `UX-VIS-01` (MUST): Visualizers are read-model projections of canonical domain state and never alternate sources of truth.
  Rationale: UI projection must not redefine domain semantics.
- `UX-VIS-02` (MUST): Visualizer key interactions emit visualizer-toggle intent through domain actions only.
  Rationale: visualizer state ownership remains in domain state.
- `UX-VIS-03` (MUST): Exactly one active visualizer panel is resolved from domain visualizer state; unsupported states fall back to `total`.
  Rationale: host behavior must be deterministic and resilient.
- `UX-VIS-04` (MUST): Inactive visualizer modules must clear stale DOM/runtime view state during host render.
  Rationale: stale panel state must not leak between visualizer activations.
- `UX-VIS-05` (MUST): Forecast visualization is projection-only and scoped by visualizer family: `total`/`ratios` do not render forecast simulation, while forecast-capable panels (`number_line`, `circle`, and approved history/plot panels such as `graph`/`feed`) must derive forecast content only from simulated canonical domain transitions.
  Rationale: forecast UI must remain a read-model hint, never a competing source of truth, and must stay out of integer-only number displays.
- `UX-VIS-06` (MUST): Cycle-start highlight gating is canonical and parity-consistent across cycle-highlight visualizers (`total`, `feed`, `ratios`): highlight only when History is enabled, cycle metadata exists with `stopReason="cycle"`, the latest committed row index is at/after cycle detection index `j`, and the latest committed value equals cycle-start value `f_i`.
  Rationale: cycle emphasis semantics must remain deterministic and shared across textual and seven-segment surfaces.
- `UX-VIS-07` (MUST): Cycle constellation overlays are additive layers and must not replace existing history/current/forecast vectors in plot visualizers (`number_line`, `graph`, `circle`).
  Rationale: cycle analysis is supplementary context and must preserve baseline trajectory readability.
- `UX-VIS-08` (MUST): Error styling scope and precedence remain visualizer-specific but deterministic: `total` uses `error > cycle > imaginary`; `number_line` applies error styling only to latest-current representation (with NaN center-marker fallback); `ratios` applies red error styling to `Error` token renders.
  Rationale: error salience must be unambiguous while preserving non-error analytical context.
- `UX-VIS-09` (MUST): Ratios seven-segment ghost-digit budgets are field-scoped: numerator displays use `delta` (`maxTotalDigits`), denominator displays use `delta_q` (`maxDenominatorDigits`/control `delta_q`), and slot-cap behavior is explicit and test-locked.
  Rationale: ratio readability must align with allocator semantics rather than a shared generic slot budget.
- `UX-VIS-10` (MUST): Feed forecast rows are additive projections appended after visible committed rows, remain forecast-styled only, and never mutate committed-row styling; committed-row visibility cap is enforced independently of appended forecasts.
  Rationale: projected values must remain clearly synthetic and must not rewrite committed history semantics.

### 2.3 Semantic visual families

- `UX-SVF-01` (MUST): Modulo, cycle analysis, and congruence concepts share one semantic family across visualizers and function displays.
- `UX-SVF-02` (MUST): Memory, control-matrix, and lambda concepts share one semantic family across visualizers and function displays.
- `UX-SVF-03` (MUST): Error concepts use a distinct semantic family that cannot be confused with non-error families.
- `UX-SVF-04` (SHALL): Semantic families are not expressed by color alone; at least one additional cue is required (label, icon, pattern, or motion/state treatment).

### 2.4 Keypad and storage interaction constraints

- `UX-KS-01` (MUST): Keypad dimensions are runtime-driven and constrained to `1..8` for both columns and rows.
- `UX-KS-02` (MUST): Keypad and storage are separate surfaces with distinct layouts.
- `UX-KS-03` (MUST): Storage visibility remains unlock-gated.
- `UX-KS-04` (MUST): Move/swap interactions across keypad/storage follow domain validity constraints and do not alter key meaning.
- `UX-KS-05` (MUST): Layout divergence between shells is allowed only if emitted domain action intent and resulting state outcomes remain equivalent.

### 2.5 Interaction and accessibility baseline

- `UX-IA-01` (MUST): Pointer interactions provide actionable press and valid/invalid drop-target feedback for layout operations.
- `UX-IA-02` (MUST): Touch interactions in active shell controllers preserve deterministic action intent for rearrangement and navigation gestures.
- `UX-IA-03` (SHALL): Keyboard and screen-reader expectations are treated as quality-gate contract requirements.
- `UX-IA-04` (SHALL): Mobile-responsive behavior preserves usable key interaction targets.
- `UX-IA-05` (MUST): Input outcome LED/audio feedback (green/red) is emitted only for user action categories (`PRESS_KEY`, layout install/uninstall/move/swap, and pre-dispatch blocks of those actions), never for system/runtime actions.
  Rationale: feedback channel should communicate direct player action outcomes only.
- `UX-IA-06` (MUST): A single action/frame outcome for a calculator may emit at most one input outcome color cue (green or red), never both simultaneously.
  Rationale: mutually exclusive outcome semantics must remain unambiguous.

### 2.6 Key visual affordance invariants

- `UX-KVA-01` (MUST): Visualizer keys render in the unified `settings` visual family across keypad and storage surfaces.
  Rationale: settings and visualizer controls share one visual family for consistent role parsing.
- `UX-KVA-02` (MUST): Settings subgroup stripe accents are bottom-aligned and use LED semantics: untoggled = darkened off-state stripe, toggled = bright on-state stripe.
  Rationale: toggle state must be readable from stripe luminance, not position changes.
- `UX-KVA-03` (MUST): Binary operator accent treatment applies to binary operators only and must not apply to unary operators.
  Rationale: binary vs unary role distinction must remain visually unambiguous.
- `UX-KVA-04` (MUST): Binary operator accent geometry is a bottom-right triangular corner marker with a width-independent 45-degree diagonal.
  Rationale: accent geometry must remain stable across responsive key widths.
- `UX-KVA-05` (SHALL): Binary corner accent uses the default keycap white gradient family and follows active-state inversion behavior.
  Rationale: accent luminance should harmonize with core keycap lighting language.

## 3. Traceability

| Clause ID | Summary | Primary suites | Coverage type | Gap |
|---|---|---|---|---|
| UX-PAR-01 | Cross-shell reducer outcome parity | `contracts/action-event-current`, `contracts/domain-ui-effects-current` | contract | partial: no UX-only parity fixture bundle |
| UX-PAR-02 | Cross-shell unlock parity | `contracts/catalog-canonical-guard` | contract | partial: no unlock-focused parity fixture |
| UX-PAR-03 | Execution-gate rejection parity | `contracts/domain-ui-effects-current` | contract | partial: matrix expansion pending |
| UX-VIS-01 | Visualizers are projections | `contracts/ui-action-emission`, `ui-module/visualizer-host-v2` | contract + integration | partial: CSS-coupled assertions |
| UX-VIS-02 | Visualizer key -> domain action | `contracts/ui-action-emission` | contract | none |
| UX-VIS-03 | Single active panel + fallback | `ui-module/visualizer-host-v2`, `rollDisplay` | integration + unit | partial: unsupported-state matrix limited |
| UX-VIS-04 | Inactive panel stale-state clearing | `ui-module/visualizer-host-v2` | integration | partial: no explicit stale-DOM contract ID |
| UX-VIS-05 | Forecast scope and simulation-source constraint | `ui-module/number-line-v2`, `ui-module/circle-renderer-v2` | integration + unit | gap: `graph`/`feed` forecast projection contracts not yet implemented |
| UX-VIS-06 | Cycle-start highlight gating parity (`total`/`feed`/`ratios`) | `ui/visualizer-ux-spec-invariants`, `ui/total-display`, `ui/roll-display`, `ui-module/ratios-renderer-v2` | contract + integration + unit | none |
| UX-VIS-07 | Cycle overlays are additive to baseline vectors | `ui/visualizer-ux-spec-invariants`, `ui-module/number-line-renderer-v2`, `ui-module/grapher-v2`, `ui-module/circle-renderer-v2` | contract + integration | none |
| UX-VIS-08 | Visualizer-specific error scope/precedence | `ui/visualizer-ux-spec-invariants`, `ui/total-display`, `ui-module/number-line-renderer-v2`, `ui-module/ratios-renderer-v2` | contract + integration | partial: dedicated precedence matrix snapshot suite not yet separated |
| UX-VIS-09 | Ratios digit-budget field scoping (`delta` vs `delta_q`) | `ui/visualizer-ux-spec-invariants`, `ui-module/ratios-renderer-v2` | contract + unit | none |
| UX-VIS-10 | Feed forecast rows are additive and non-mutating | `ui/visualizer-ux-spec-invariants`, `ui/roll-display`, `ui-integration/mobile-shell` | contract + unit + integration | none |
| UX-SVF-01 | Mod/cycle/congruence family | `ui/graph-display`, `ui-module/grapher-v2` | integration | gap: no explicit semantic-family contract |
| UX-SVF-02 | Memory/control/lambda family | `ui/cue-telemetry`, `ui/cue-lifecycle`, `app/analysis-report` | integration + unit | gap: no explicit semantic-family contract |
| UX-SVF-03 | Distinct error family | `ui/total-display`, `ui/roll-display` | integration | partial: family-level checks indirect |
| UX-SVF-04 | Not color-only semantic cues | `ui-shell/menu-a11y` | integration | gap: dedicated family-cue accessibility suite missing |
| UX-KS-01 | Runtime keypad range constraints | `ui/layout-engine`, `ui/layout-adapter` | integration + unit | partial: explicit bounds matrix limited |
| UX-KS-02 | Keypad/storage separation | `ui-module/storage-v2`, `ui/storage-display` | integration | none |
| UX-KS-03 | Storage unlock gating | `ui-module/storage-v2`, `ui/storage-display` | integration | partial: explicit contract ID absent |
| UX-KS-04 | Move/swap validity and meaning stability | `ui/drag-drop-behavior`, `contracts/ui-action-emission`, `domain/key-identity-adapters` | integration + contract + unit | partial: direct end-to-end meaning assertion limited |
| UX-KS-05 | Layout divergence with semantic parity | `contracts/action-event-current` | contract | partial: shell-integration parity suites pending reintroduction |
| UX-IA-01 | Pointer feedback and valid/invalid targets | `ui/drag-drop-behavior`, `ui-module/calculator-keypad-render` | integration | partial: no dedicated pointer-a11y contract |
| UX-IA-02 | Touch gesture intent determinism | `ui-integration/mobile-shell`, `ui/layout-engine` | integration + unit | partial: scenario matrix expansion pending |
| UX-IA-03 | Keyboard/screen-reader baseline | `ui-shell/menu-a11y` | integration | partial: broader shell coverage pending |
| UX-IA-04 | Mobile usable interaction targets | `ui-integration/mobile-shell` | integration | partial: explicit numeric threshold contract absent |
| UX-IA-05 | LED/audio input feedback only for user actions | `contracts/input-feedback-outcome`, `ui-module/calculator-storage-v2` | contract + integration | none |
| UX-IA-06 | Per-calculator outcome cue is mutually exclusive per render pass | `ui-module/calculator-storage-v2`, `ui-module/calculator-reject-blink` | integration | partial: no direct audio-queue exclusivity assertion |
| UX-KVA-01 | Visualizers use unified settings family | `ui-module/calculator-keypad-render`, `ui-module/storage-v2` | integration | none |
| UX-KVA-02 | Settings stripe bottom placement and LED on/off semantics | `ui/visualizer-fit-contract` | contract | none |
| UX-KVA-03 | Binary accent applies only to binary operators | `ui-module/calculator-keypad-render`, `ui-module/storage-v2`, `ui/visualizer-fit-contract` | integration + contract | none |
| UX-KVA-04 | Binary corner accent geometry is 45-degree and width-independent | `ui/visualizer-fit-contract` | contract | none |
| UX-KVA-05 | Binary corner accent matches default white keycap gradient behavior | `ui/visualizer-fit-contract` | contract | partial: visual token behavior is asserted without pixel snapshot baselines |

## 4. Out of Scope (Truth 1 UX)

This document does not define future/planned UX changes that are not current invariant behavior, including:

1. Checklist replacement and hint-system design direction.
2. New visualizer-host feature phases beyond current contracts.
3. Style exploration themes and non-invariant visual direction.

These belong in Truth 2 release planning (`docs/planning/Planning Board.md`).

## 5. Legacy Reference Mapping

Reference index for UX implementation touchpoints:

- `docs/code-map.md` (dispatch, visualizer, and unlock-hint source paths)
- `docs/planning/visualizer-roll-content-interaction-matrix.md` (Truth 2 rollout matrix)

Authoritative source for UX invariants is this file plus `docs/functional-spec.md`.
