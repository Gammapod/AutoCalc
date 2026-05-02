# Headless Confusion Classification Report

Date: 2026-05-01

Scope: follow-up to black-box exploration of interactive headless mode in `game` and `sandbox`. This report traces each observed confusing area to the relevant code and design docs, then classifies it as:

* `System bug`: implementation or authored content conflicts with current design truth, or the underlying behavior is incorrect.

* `Spec/doc bug`: runtime behavior is correct, but current design documentation describes outdated or incorrect behavior.

* `Headless UX/parity bug`: underlying runtime/UI behavior is intentional or supported elsewhere, but the headless surface omits, misrepresents, or makes it difficult to use.

* `Correct but non-intuitive`: behavior matches current docs/code, but a user can reasonably misunderstand it.

## Summary

| Area                                                     | Classification                                | Main finding                                                                                                                                                                                | Designer Notes                                                                                                                                                                                       | Response to Notes | Resolution Proposal |
| -------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------- |
| Initial installed locked `digit_1` rejects press         | Spec/doc bug                                  | Former functional spec wording said installed locked keys were press-usable, but reducer/headless behavior and tests reject the press.                                                       | In this case, the functional spec is outdated and should be updated; we currently define 3 lock states: fully unlocked, pressable but not movable, and not-pressable.                                | Agreed. Reclassify the conflict as spec drift rather than runtime breakage. The observed behavior matches the intended three-state model: portable, installed-only, and locked. | Update `FS-UP-07` and related wording to define the three lock states explicitly. Keep current reducer/headless behavior unless separate design work changes lock semantics. |
| Game progression visibility                              | Headless UX/parity bug                        | UI has hint/progress projections; headless compact read model exposes only completed unlock IDs.                                                                                            | We will have to decide whether or not there is a way to convey visualizer information headlessly.                                                                                                    | Agreed. Headless should not try to reproduce visualizers pixel-for-pixel, but it can expose the same underlying semantic read models that visualizers use. | Add a compact `progress` or `hints` command that returns eligible unlock hint rows, predicate category, current/target progress where available, and target effect. Keep visualizer-specific projections separate from core progression hints. |
| Repeated `unary_inc` progression seemed stuck at total 7 | Correct but non-intuitive                     | Growth unlocks need enough growth-classification window and overflow/continued roll evidence; not obvious from headless output.                                                             | Correct; there is a design tension yet to be solved on how to convey growth order hints.                                                                                                             | Agreed. This is not a correctness issue; it is a feedback design problem. Growth order is emergent and should remain game-like, but the player/headless user needs some signal that evidence is accumulating. | Defer full growth-order explanation until the visual hint design is settled. In the interim, expose a terse diagnostic hint such as `growth: unknown/linear candidate`, window size, and progress fraction only in headless `progress` output or debug-style views. |
| `unlock_digit_1_portable_on_total_equals_9` naming       | System bug                                    | Former catalog ID said `equals_2`, but description and predicate use total `9`. Behavior is total 9.                                                                                        | The catalog id should be changed.                                                                                                                                                                    | Agreed. This is a content identifier bug. The runtime behavior and designer intent are total 9. | Rename the unlock ID to match behavior, e.g. `unlock_digit_1_portable_on_total_equals_9`. Update tests, reports, saved completed-unlock compatibility if needed, and any generated unlock graph artifacts. |
| Completed unlock IDs are machine-oriented                | Headless UX/parity bug                        | Headless reports raw IDs and done flags, not descriptions/effects/progress labels.                                                                                                          | I think this is also a gap in frontend feedback; I don't believe we have a "a key or calculator was unlocked" channel, do we? If not, we should add one. If so, we should expose it headlessly.      | Agreed. Current UI appears to infer unlock changes from state snapshots rather than receiving an explicit unlock event channel. That makes both frontend celebratory feedback and headless summaries weaker than they should be. | Add a domain/UI effect for newly completed unlocks, carrying unlock id, description, target label, effect type, and affected key/calculator when applicable. Use it in frontend unlock feedback and expose the same payload in headless command responses. |
| Sandbox multi-digit entry replaces instead of appends    | Correct but non-intuitive                     | Math spec explicitly limits seed/operand entry to one digit and replacement at max length.                                                                                                  | Yes, 1-digit operands are a key gameplay constraint. I think a new player will quickly learn this, but I am open to suggestions on how to intuitively convey it (either graphically or headlessly)   | Agreed. This should remain a gameplay constraint. The feedback should teach the constraint without over-explaining the game in normal play. | Add subtle affordance: in UI, show single-slot digit entry as one active digit cell rather than a freeform number field. In headless, add `limits` metadata to `help` or `snapshot`, e.g. `seedDigits:1`, `operandDigits:1`, and include `replaced:true` in digit press feedback when a digit overwrites an existing digit. |
| Sandbox unlocked keys with `location:"none"`             | Headless UX/parity bug, with exceptions       | Headless uses raw `ui.storageLayout`, while UI storage is a derived unlocked-key palette. `pi`/`e` are intentional exceptions.                                                              | I am open to suggestions on what should be changed to remove the friction.                                                                                                                           | The friction comes from using layout slots as the only install source. For a headless user, a portable unlocked key should be installable by key id even if it is not physically present in raw storage layout. | Add a headless `install` command: `{cmd:"install", key:"op_div", destination:{surface:"keypad", index:2}, calculatorId?}`. Keep `drop` for layout-parity testing. Update `listKeys` to distinguish `portable`, `installable`, `installed`, and intentionally unavailable constants such as `pi`/`e`. |
| Multi-calculator exploration                             | Headless UX/parity bug                        | System supports isolated calculator state; headless can target some commands by `calculatorId`, but snapshots always project active state and there is no discoverable switch/list command. | If I understand, you are saying that headless mode does not show the calculators that are available? Or something else?                                                                              | Yes, and also that headless cannot easily inspect a non-active calculator after targeting it. `layout` and `listKeys` can be scoped, but `snapshot` always reports the active calculator, and there is no discoverable calculator list or active-calculator switch command. | Add `listCalculators`, `setActiveCalculator`, and `snapshot calculatorId` support. `listCalculators` should return id, symbol, active flag, keypad dimensions, and terse state summary. `snapshot calculatorId` should project that calculator without requiring an active switch. |
| Toggle/visualizer effects are hard to observe            | Headless UX/parity bug                        | Runtime emits `settings_changed`, but compact snapshot omits settings/active visualizer/button flags.                                                                                       | We will have to decide whether or not there is a way to convey visualizer information headlessly.                                                                                                    | Agreed. Headless should expose stateful visualizer selection and high-level visualizer read models, not rendered visual output. | Extend compact snapshots with a `settings` block containing active visualizer, wrapper/base/step/history/forecast/cycle settings, and relevant button flags. Consider a separate `visualizer` command for textual projections of the active visualizer where available. |
| Less obvious sandbox operators are hard to understand    | Headless UX/parity bug                        | Math docs and operator matrix define behavior, but headless exposes only terse labels and generic diagnostics are not surfaced.                                                             | This is a design tension, because the game is meant to blend normal/canonical math functions with stranger ones. exact key semantics are still being designed, so we will have to accept it for now. | Agreed. We should not prematurely lock exact player-facing explanations for operators that are still being designed. Headless can still help exploration by reporting observed behavior without declaring final semantics. | Do not add authoritative operator descriptions yet. Add an optional `examples` or `probe` workflow later that runs sample inputs and reports observed outputs. For now, improve key metadata only with labels, category, arity, and experimental/deferred status where known. |
| `drop` invalid/no-op returns top-level `ok:true`         | Correct but non-intuitive                     | Command parsing succeeded and domain feedback rejected the action; the split is intentional but easy to miss.                                                                               | I am open to suggestions on what should be changed to remove the friction.                                                                                                                           | Keep protocol-level `ok:true` for successfully handled commands, but add an explicit action outcome field so users do not have to inspect nested UI effects. | Add `accepted:boolean` and `reasonCode?:string` to user-action responses such as `press`, `drop`, and future `install`. For invalid/no-op drops, return `ok:true`, `accepted:false`, `reasonCode:"layout_invalid_or_noop"`, and keep existing feedback for parity. |
| `unlockAll` layout/index jump and noisy unlock snapshot  | Correct but non-intuitive / Headless UX issue | `unlockAll` intentionally expands control dimensions; headless suppresses diffs but still includes large completed unlock rows.                                                             | We should reduce the noise. Can we send only a single terse success message, without any noisy details?                                                                                              | Yes. `unlockAll` is a setup/debug convenience, so its default output should be terse. Detailed unlock state can remain available behind `verbose:true` or a separate snapshot command. | Change default `unlockAll` response to redact completed unlock rows and bulky snapshot unlock details. Return only `{message:"all keys unlocked", unlockedCount, layoutChanged?:true}` plus normal command metadata. Preserve current detailed output under `verbose:true`. |

## Findings

### 1. Initial installed locked `digit_1` rejects press

Classification: `Spec/doc bug`.

Observed behavior:

* Fresh game mode shows `digit_1` installed on the keypad but locked.

* `press digit_1` returns `reasonCode:"locked"` and does not mutate state.

Design/code evidence:

* `docs/functional-spec.md:72` formerly said installed locked keys were press-usable while locked, and immobile.

* `src/domain/keyUnlocks.ts:16` resolves locked/installed-only/portable capability, and `src/domain/keyUnlocks.ts:35` treats only non-locked keys as usable.

* `src/app/headlessRuntime.ts:204` rejects a press when capability is locked.

* `src/domain/reducer.input.core.ts:2483` gates reducer input on `isKeyUsableForInput`.

* Tests currently assert the old behavior: `tests/keyCapabilityProgression.test.ts:26`, `tests/headlessRuntime.test.ts:26`, `tests/headlessRuntime.test.ts:31`, and `tests/headlessRuntime.test.ts:192`.

Conclusion:

This is not headless-only, but the designer note resolves the conflict in favor of the current runtime model. The functional spec is outdated and should describe the three intended states: fully unlocked/portable, pressable but not movable/installed-only, and not-pressable/locked.

### 2. Game progression visibility is poor

Classification: `Headless UX/parity bug`.

Observed behavior:

* Before an unlock, headless shows locked keys but not why they are locked or what actions move progress.

* After unlocks, compact snapshots show raw completed IDs only.

Design/code evidence:

* Progression is behavior-owned and shell-invariant in `docs/functional-spec.md:62` through `docs/functional-spec.md:80`.

* UI has hint projections: `src/domain/unlockHintProgress.ts:361`, `src/ui/shared/readModel.total.ts:67`, and `src/ui/modules/calculator/totalDisplay.ts:199`.

* Headless read model does not use those hint rows. It maps only `completedUnlockIds` to `{ id, done }` in `src/domain/projections.ts:25` and returns that via `src/domain/projections.ts:33`.

Conclusion:

The underlying progression system has hint/progress data, but headless does not expose it. Headless should probably expose eligible unlock hints, human descriptions, target key/effect, and partial progress, or at least provide a `progress`/`unlockHints` command.

### 3. Repeated `unary_inc` progression seemed stuck at total 7

Classification: `Correct but non-intuitive`.

Observed behavior:

* Running `unary_inc` repeatedly from 0 to 7 only completed the first digit-1 installed-only unlock.

* Continuing past total 9 eventually produced additional unlocks, including `overflow_error_seen`, `unlock_c_on_first_error`, `unlock_4_on_linear_growth_run_7`, and `unlock_plus_on_linear_growth_run_7`.

Design/code evidence:

* The first portable digit-1 unlock actually predicates on total 9: `src/content/unlocks.catalog.ts:22` and `src/content/unlocks.catalog.ts:23`.

* Linear-growth unlocks use `roll_ends_with_growth_order_run` length 7: `src/content/unlocks.catalog.ts:35` and `src/content/unlocks.catalog.ts:46`.

* Growth-order classification uses a 5-row window: `src/domain/rollGrowthOrder.ts:6`, `src/domain/rollGrowthOrder.ts:176`, and `src/domain/rollGrowthOrder.ts:177`.

* Unlock evaluation checks growth order for each index in the suffix: `src/domain/unlockEngine.ts:243` through `src/domain/unlockEngine.ts:250`.

* Overflow/error markers are converted into unlock evidence during terminal execution: `src/domain/reducer.input.core.ts:1974`, `src/domain/reducer.input.core.ts:1979`, and `src/domain/reducer.input.core.ts:1995`.

Conclusion:

The behavior is explainable from code: total 7 is not enough for the growth-window-based predicate, and max-one-digit overflow contributes to the later path. It is still non-intuitive because headless does not show partial growth-window progress or explain why "linear run length 7" is not satisfied by the visible `0..7` roll.

### 4. `unlock_digit_1_portable_on_total_equals_9` replaced a misleading ID

Classification: `System bug` in authored content/metadata.

Observed behavior:

* The ID suggests total equals 2.

* The actual behavior occurs at total 9.

Design/code evidence:

* `src/content/unlocks.catalog.ts:22` formerly named the unlock `unlock_digit_1_portable_on_total_equals_2`.

* `src/content/unlocks.catalog.ts:23` describes total equals 9.

* The predicate immediately below is `total_equals` value `9n`.

* Tests assert total 9 behavior: `tests/keyCapabilityProgression.test.ts:80`.

Conclusion:

Runtime behavior appears intentional, but the ID is stale/misleading. Because headless exposes raw IDs prominently, this content mismatch directly creates user confusion.

### 5. Completed unlock rows are machine-readable only

Classification: `Headless UX/parity bug`.

Observed behavior:

* `unlockRows` contains raw IDs with `done:true`.

* There is no human description, target label, effect type, or "what changed" summary.

Design/code evidence:

* Unlock catalog entries include descriptions/effects/target labels, for example `src/content/unlocks.catalog.ts:9` through `src/content/unlocks.catalog.ts:18`.

* Headless/domain projection collapses unlock display to IDs: `src/domain/projections.ts:25`.

* `unlockAll` suppresses diffs by default in `src/app/headlessSession.ts:646` through `src/app/headlessSession.ts:656`, but still returns a snapshot with all completed rows.

Conclusion:

This is a headless UX gap. The data exists, but the command-facing read model does not package it for users.

### 6. Sandbox multi-digit entry replaces rather than appends

Classification: `Correct but non-intuitive`.

Observed behavior:

* Pressing `digit_1`, then `digit_2`, results in total `2`, not `12`.

* Draft operands also replace at one digit.

Design/code evidence:

* `docs/math-spec.md:21` says initial player-entered seed is a single digit.

* `docs/math-spec.md:22` says binary drafting uses `maxOperandDigits: 1`.

* `docs/math-spec.md:23` says entering another digit at max length replaces the existing digit.

* `src/domain/functionBuilder.ts:94` implements digit input for drafting, and `src/domain/functionBuilder.ts:110` replaces when `operandInput` is already at the digit limit.

* `src/domain/reducer.input.core.ts:200` through `src/domain/reducer.input.core.ts:202` make seed-entry context replace with the new digit.

* Operator/digit entry paths pass `maxOperandDigits: 1` at `src/domain/reducer.input.core.ts:227` and `src/domain/reducer.input.core.ts:383`.

Conclusion:

The behavior is correct. It should be documented in headless `help` or exposed through a clearer `slotView`/draft detail because it does not match normal calculator expectations.

### 7. Sandbox unlocked keys appear as `location:"none"`

Classification: `Headless UX/parity bug`, with intentional exceptions for `const_pi` and `const_e`.

Observed behavior:

* In sandbox, many unlocked keys are listed as usable but not installed and not in storage, so users cannot discover a `drop` source.

* Example: `op_div` is portable but `layout surface=storage filter=op_div` returns no cells.

Design/code evidence:

* Functional storage truth says storage shows all unlocked keys and only unlocked keys: `docs/functional-spec.md:55`.

* UI storage render order is derived from unlock state via `buildStorageRenderOrder`: `src/ui/modules/storage/viewModel.ts:77`, `src/ui/modules/storage/viewModel.ts:88`, `src/ui/modules/storage/viewModel.ts:91`, and `src/ui/modules/storage/viewModel.ts:98`.

* Headless list/layout uses raw `state.ui.storageLayout` instead: `src/app/headlessSession.ts:349`, `src/app/headlessSession.ts:351`, `src/app/headlessSession.ts:364`, `src/app/headlessSession.ts:375`, `src/app/headlessSession.ts:489`, and `src/app/headlessSession.ts:520`.

* `drop` also reads the raw layout source key before dispatch: `src/app/headlessSession.ts:661`.

* `const_pi` and `const_e` are special: math spec says they are not directly player-enterable at `docs/math-spec.md:24`, and UI storage excludes them in `src/ui/modules/storage/viewModel.ts:27`.

Conclusion:

For ordinary unlocked keys, this is a headless parity bug. Headless should either use the derived storage palette model or provide an install command that accepts a portable key ID directly. `pi` and `e` being unavailable is correct but should be explained.

### 8. Multi-calculator state is hard to inspect

Classification: `Headless UX/parity bug`.

Observed behavior:

* Sandbox materializes `f_prime`, `g_prime`, `h_prime`, and `i_prime`.

* `listKeys` and `layout` can target `calculatorId`, and `press` can dispatch to a non-active calculator.

* Compact `snapshot` remains active-calculator-only. Passing `calculatorId` to `snapshot` is not parsed as a typed command.

Design/code evidence:

* Sandbox materialization is intentional: `docs/code-map.md:46`, `src/domain/sandboxPreset.ts:25` through `src/domain/sandboxPreset.ts:28`, and `src/domain/sandboxPreset.ts:88`.

* Tests assert sandbox order/materialization and local state preservation: `tests/sandboxPreset.test.ts:27` through `tests/sandboxPreset.test.ts:32`, and `tests/sandboxPreset.test.ts:101` through `tests/sandboxPreset.test.ts:108`.

* Multi-calculator isolation is required by `docs/functional-spec.md:116`.

* Headless command type includes `calculatorId` for `listKeys`, `layout`, `press`, and `tick`, but not `snapshot`: `src/app/headlessSession.ts:18` through `src/app/headlessSession.ts:26`.

* Runtime snapshots always build read model from active state: `src/app/headlessRuntime.ts:70`, `src/app/headlessRuntime.ts:214`, `src/app/headlessRuntime.ts:216`, and `src/app/headlessRuntime.ts:223`.

* There is unreachable-looking `snapshot` calculator handling in `src/app/headlessSession.ts:727` through `src/app/headlessSession.ts:732`, because parser output for `snapshot` does not include `calculatorId`.

Conclusion:

The underlying multi-calculator system is intentional. Headless needs a user-facing way to list calculators, switch active calculator, or request scoped snapshots. The current workaround is a raw `action`, which is not discoverable enough for user-facing exploration.

### 9. Toggle and visualizer effects are hard to observe

Classification: `Headless UX/parity bug`.

Observed behavior:

* Pressing some visualizer/toggle keys emits `settings_changed`, but compact snapshots do not show the changed setting, active visualizer, or relevant button flag.

Design/code evidence:

* Headless forwards toggle/visualizer actions with calculator IDs: `src/app/headlessRuntime.ts:79` and `src/app/headlessRuntime.ts:80`.

* Settings/visualizer toggles mutate settings/UI flags in `src/domain/reducer.flags.ts:76` through `src/domain/reducer.flags.ts:118`.

* UI effects report monitored settings changes in `src/domain/commands.ts:231`.

* Compact read model is limited to total, roll, slot, unlock rows, graph points, and graph visibility: `src/domain/projections.ts:9` through `src/domain/projections.ts:34`.

Conclusion:

The underlying behavior is likely correct. Headless lacks state projection for settings, active visualizer, and button flags unless the user requests full `includeState`, which is too bulky for routine exploration.

### 10. Less obvious sandbox operators are not understandable from headless alone

Classification: `Headless UX/parity bug`.

Observed behavior:

* Basic arithmetic was clear.

* Operators such as `op_eulog`, `op_residual`, `op_log_tuple`, `op_whole_steps`, `op_interval`, `op_mod`, `op_gcd`, and `op_lcm` require external knowledge or source/docs to interpret.

Design/code evidence:

* Key presentation is mostly symbolic for these operators: `src/domain/keyPresentation.ts:222` through `src/domain/keyPresentation.ts:233`.

* Math/operator docs define expected behavior, e.g. `docs/planning/operator-testing-matrix.md:88` through `docs/planning/operator-testing-matrix.md:99`, and `docs/math-spec.md:92` through `docs/math-spec.md:97`.

* Operation diagnostics are generic templates, not semantic explanations: `src/content/diagnostics/operationDescriptions.ts:55` through `src/content/diagnostics/operationDescriptions.ts:66`.

* Default key diagnostics are also generic unless overridden: `src/content/diagnostics/keyDescriptions.ts:5` through `src/content/diagnostics/keyDescriptions.ts:12`.

Conclusion:

The math behavior is documented and appears intentional, but headless does not surface those explanations. A `describeKey` or `describeOperator` command should expose labels, algebraic face, short semantic description, accepted domains, and a small example.

### 11. Invalid/no-op `drop` returns top-level `ok:true`

Classification: `Correct but non-intuitive`.

Observed behavior:

* A malformed semantic drop such as storage index 999 returns `ok:true`, rejected input feedback, and `result.action:null`.

Design/code evidence:

* `drop` parses successfully as a command if its source/destination shape is valid: `src/app/headlessSession.ts:247`.

* The command is then classified against layout state. If no key/action exists, the response uses rejected feedback with `layout_invalid_or_noop`: `src/app/headlessSession.ts:661` through `src/app/headlessSession.ts:671`.

* Functional spec allows rejected inputs to be non-mutating while still surfacing UI-only feedback in execution-gated contexts: `docs/functional-spec.md:178`. The same command-success/domain-rejection distinction is consistent with the headless feedback model.

Conclusion:

This is defensible protocol design: top-level `ok` means the JSON command was handled, while `feedback` describes domain acceptance. It is still easy to miss. Headless docs/results should make rejected feedback more prominent, possibly with a top-level `accepted:false` field for user actions.

### 12. `unlockAll` changes layout indices dramatically

Classification: `Correct but non-intuitive`.

Observed behavior:

* Fresh game keypad has 6 cells.

* After `unlockAll`, the keypad surface grows and familiar keys move to higher indices.

Design/code evidence:

* `unlockAll` dispatches the real `UNLOCK_ALL` action from headless: `src/app/headlessSession.ts:646`.

* The unlock-all preset intentionally projects larger control dimensions with `alpha: 7`, `beta: 7`, and `gamma: 4`: `src/domain/lifecyclePresets.ts:6`, `src/domain/lifecyclePresets.ts:11`, `src/domain/lifecyclePresets.ts:12`, and `src/domain/lifecyclePresets.ts:13`.

* Headless help recommends `layout includeEmpty:true` to plan drop destinations: `src/app/headlessSession.ts:105` and `src/app/headlessSession.ts:117`.

Conclusion:

This is expected behavior, but the index jump is surprising in a text protocol. `unlockAll` could return a short note that control dimensions changed, or `layout` could include rows/columns plus row/column coordinates.

## Recommended Follow-Up Issues

1. Update `FS-UP-07` to reflect the intended three-state lock model: portable, installed-only, and locked/not-pressable.
2. Rename `unlock_digit_1_portable_on_total_equals_2` or change its predicate/description so ID and behavior agree. Completed by using `unlock_digit_1_portable_on_total_equals_9`.
3. Add headless progression/hint output using `projectEligibleUnlockHintProgressRows` and catalog descriptions/effects.
4. Fix headless storage parity by using derived storage palette semantics or adding key-ID install/uninstall commands.
5. Add scoped snapshot or active-calculator management commands for sandbox multi-calculator exploration.
6. Add compact settings/visualizer/button-flag projection to snapshots.
7. Add `describeKey`/`describeOperator` to expose operator docs and examples without reading source.
8. Add row/column coordinates to `layout` cells and a clearer `accepted` field for rejected user actions.
