Truth: 2 - Visualizer Roll Content Interaction Matrix

# Visualizer x Roll Content Interaction Matrix

Purpose: define how each visualizer should consume roll-derived content, so visualizer behavior is consistent and testable.

Canonical sources:

* Visualizer registration and IDs: `src/ui/modules/visualizers/registry.ts` and `src/contracts/keyCatalog.ts`.

* Default/total visualizer render path: `src/ui/modules/calculator/totalDisplay.ts`.

* Roll-derived read models and diagnostics: `src/ui/shared/readModel.rollFeed.ts`, `src/ui/shared/readModel.algebraic.ts`, `src/ui/shared/readModel.factorization.ts`, `src/domain/diagnostics.ts`.

* Plot/vector projections: `src/domain/graphProjection.ts`, `src/ui/modules/visualizers/numberLineModel.ts`, `src/ui/modules/visualizers/circleRenderer.ts`, `src/ui/modules/grapherRenderer.ts`.

Consume level key:

* `required`: panel meaningfully depends on this roll content every render.

* `conditional`: consumed only with flags/modes/data presence (history, forecast, cycle, step expansion, symbolic rows, etc.).

* `none`: panel should not consume this roll content.

Cycle indicator rule (cross-cutting UX):

* When a cycle is detected, visualizers that participate in gameplay-facing analysis must show a yellow indicator (analysis feedback channel).

* Number-based visualizers (`total`, `ratios`) show their number readout in yellow while cycle indicator is active (parallel to red error-row emphasis behavior).

* Graph-based visualizers (`graph`, `number_line`, `circle`) show cycle points linked by a thin yellow vector chain.

* Help/dev visualizers (`help`, `state`, `title`, `release_notes`, debug-only panels) do not require a cycle indicator.

Error indicator rule (cross-cutting UX):

* Any roll row with an error must render/plot that row's value in red.

* Red must be scoped to the individual errored value/point only.

* No other numbers, points, vectors, labels, or panel chrome should be red unless they are directly representing that errored roll row value.

Roll content slices used in this matrix:

* `latest_total`: current value (`state.calculator.total`) or latest roll `y` when panel semantics use it.

* `previous_rows`: roll history beyond latest row (seed + prior step rows).

* `history`: history-only overlays/readouts from committed roll rows (no forecast/future rows).

* `forecast`: forecast/future projections from simulated execution (full next-result forecast only).

* `cycle`: cycle analysis overlays/highlights derived from `rollAnalysis.cycle`.

* `step_expansion`: step-focused expansion/projection surfaces tied to `settings.stepExpansion`.

* `errors`: execution errors on roll rows (`entry.error`).

* `number_domain`: domain/category projections from current/latest value (`N`, `Z`, `Q`, complex family, etc.).

* `remainders`: Euclidean remainder payloads (`entry.remainder`) (deprecated for UI projection; expected `none` for visualizers).

* `symbolic_payload`: symbolic roll payload (`entry.symbolic`).

* `factorization_payload`: prime factorization payloads (`entry.factorization`).

| Visualizer ID     | latest\_total                                                                                                              | previous\_rows                                                                   | history                                                                                         | forecast                                                                                                     | cycle                                                                                              | step\_expansion                                                                                                              | errors                                                                                                                                                                                                                                                                      | number\_domain                                                                                                                                                                                                                                | symbolic\_payload | factorization\_payload |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------- |
| `total` (default) | Shows integer totals only; non-integer/non-real domains map to unique 7-segment domain codes                               | conditional (unlock-hint rows derive progress from roll history)                 | conditional (cycle eligibility evaluates committed row history when `settings.cycle` is active) | none                                                                                                         | conditional (cycle amber styling when `settings.cycle` is active and cycle-start match is present) | none                                                                                                                         | conditional (latest roll error toggles error styling)                                                                                                                                                                                                                       | required (domain indicator from latest roll `y` fallback `total`)                                                                                                                                                                             | none              | none                   |
| `graph`           | Plots latest roll `y` via roll projection (not direct `state.calculator.total`)                                            | required (seed + step history, with x-window constrained to latest 25 x indices) | required (committed points are the primary trace)                                               | conditional (blue forecast point at `x = current + 1` from full forecast when `settings.forecast` is active) | conditional (cycle overlays rendered from `rollAnalysis.cycle` when `settings.cycle` is active)    | conditional (single white step point at `x = current + 1` from latest step forecast when `settings.stepExpansion` is active) | conditional (error rows plotted with error styling)                                                                                                                                                                                                                         | none                                                                                                                                                                                                                                          | none              | none                   |
| `feed`            | Displays latest visible row in table                                                                                       | required (seed + step rows, capped to last 12 visible rows)                      | required (committed rows are the baseline table content)                                        | conditional (append only full-forecast/history forecast rows when `settings.forecast` is active)             | conditional (cycle row highlighting for qualifying committed rows when `settings.cycle` is active) | none                                                                                                                         | conditional (error rows marked/styled)                                                                                                                                                                                                                                      | none                                                                                                                                                                                                                                          | none              | none                   |
| `number_line`     | required (current vector from latest roll `y`; no vector before first roll row)                                            | conditional (prior roll needed for history segment and cycle span)               | conditional (immediate previous-roll segment when `settings.history` is active)                 | conditional (history/full-forecast vector when `settings.forecast` is active)                                | conditional (cycle constellation overlays when `settings.cycle` is active)                         | conditional (step forecast chain is sourced from `settings.stepExpansion`, independent of `settings.forecast`)               | conditional (plotted vector enters error style only when latest roll row has error)                                                                                                                                                                                         | conditional (complex-grid/Argand mode enabled by non-zero imaginary current total or any complex roll row)                                                                                                                                    | none              | none                   |
| `circle`          | required (magnitude/direction from current `state.calculator.total`)                                                       | conditional (prior roll needed for history segment and cycle span)               | conditional (previous-point segment when `settings.history` is active and prior roll exists)    | conditional (history/full-forecast segment when `settings.forecast` is active)                               | conditional (cycle constellation overlays when `settings.cycle` is active)                         | conditional (step forecast chain is sourced from `settings.stepExpansion`, independent of `settings.forecast`)               | conditional (plotted vector enters error style only when latest roll row has error)                                                                                                                                                                                         | none                                                                                                                                                                                                                                          | none              | none                   |
| `ratios`          | Shows `Re(num)`, `Re(den)`, `Im(num)`, `Im(den)`; supports integer/rational real and integer/rational imaginary-part forms | none                                                                             | none                                                                                            | none                                                                                                         | conditional (cycle amber styling for all 4 displayed values when `settings.cycle` is active)       | none                                                                                                                         | conditional (latest roll error toggles error styling: for maxDenominatorDigits/precision overflow, the denominator of the part that was clamped gets the red color. For maxTotalDigits/overflow, the numerator of the relevant part is shown red. For NaN, all 4 show red.) | conditional (Re(num) and Re(den) are always shown; Im(num) and Im(den) are only shown if there is a nonzero imaginary part anywhere on the roll. If any of the four numbers contain a radical-like value, that part displays a "rAd" message) | none              | none                   |

<!-- all other visualizers are test/debug/system visualizers, not play-facing: `factorization`, `algebraic`, `help`, `state`, `title`, `release_notes` -->

## Visualizer Hint Capability Matrix (Stub)

Purpose: plan per-visualizer hint telegraph channels separately from roll-content consumption semantics.

Notes:

* This matrix is intentionally a stub.

* Each play-facing visualizer is allocated 2-3 hint types.

* `predicate_type(s)` may map one hint type to one or multiple predicates.

* Predicate mappings are split into `predicate_type_current` (already in catalog/engine) and `predicate_type_proposed` (planned/new).

* Some hints can show close/partial predicate satisfaction.

* All hints should include an animation or other signal after the condition has been met.

* Common UX elements include: stars (on graphs/plots), Amber color (generally), golden outline (always).

* `status` indicates planning maturity/state: `stub`, `draft`, `implemented`, `implemented_v1`, `deferred`.

| visualizer\_id | hint\_type\_id                        | hint\_surface/channel                                                                                                                                | predicate\_type\_current                                             | predicate\_type\_proposed               | nearness\_signal | gating\_settings | spoiler\_policy                                 | status |
| -------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------- | ---------------- | ---------------- | ----------------------------------------------- | ------ |
| `total`        | `total.threshold_marker`              | Threshold marker / numeric HUD cue as total gets close, for example `[2/7] -> [7/7]`.                                                                | `total_at_least`, `total_at_most`                                    | none                                    | partial          | none             | only when within a certain threshold of success | implemented |
| `total`        | `total.domain_chip`                   | Domain-family chip / token; highlight and shake the domain chip after the condition has been met.                                                    | `roll_contains_domain_type`                                          | none                                    | partial          | none             | post-success only                               | deferred |
| `graph`        | `graph.target_y_line`                 | Faint target point (`y = target`); opacity grows when current total is close.                                                                        | `total_equals`                                                       | none                                    | partial          | `forecast`       | only when within a certain threshold of success | implemented_v1 |
| `graph`        | `graph.trend_band`                    | Smooth graph of function connecting plotted points; opacity grows as roll reaches required length.                                                   | `roll_ends_with_growth_order_run`, `roll_ends_with_incrementing_run` | none                                    | partial          | `forecast`       | only when within a certain threshold of success | implemented |
| `feed`         | `feed.cycle_diameter`                 | Indicators pointing at the max and min Y elements of the cycle.                                                                                      | `roll_cycle_diameter_at_least`                                       | none                                    | binary           | `cycle`          | shows current min and max, but not target       | implemented |
| `feed`         | `feed.cycle_length`                   | Indicators pointing at the X-index values where the cycle starts.                                                                                    | `roll_cycle_period_at_least`                                         | none                                    | binary           | `cycle`          | highlights current length, but not target       | implemented |
| `number_line`  | `number_line.goal_plots`              | Star-shaped points plotted at target values; opacity increases as current total gets close.                                                          | `total_equals`                                                       | none                                    | partial          | none             | only when within a certain threshold of success | implemented |
| `number_line`  | `number_line.sequence_window`         | When cycle constellation is drawn and cycle length is close to target, number the vectors in the constellation (i.e., count each side of the shape). | none                                                                 | `roll_ends_with_equal_length_jumps`     | partial          | `cycle`          | counts total lines, but not target              | stub   |
| `number_line`  | `number_line.quadrant_highlights`     | If the roll makes the correct first jump of the sequence, highlight the next quadrant in the sequence.                                               | none                                                                 | `roll_ends_with_quadrant_hop_sequence`  | partial          | `forecast`       | no exact sequence reveal, just next             | stub   |
| `circle`       | `circle.angle_measure`                | An angle-measurement arc appears from origin to current vector, with opacity growing when angle is close.                                            | none                                                                 | `theta_equals`                          | partial          | none             | only when within a certain threshold of success | stub   |
| `circle`       | `circle.polygon_inscription`          | Polygon appears with growing opacity as the shape nears completion.                                                                                  | none                                                                 | `roll_ends_with_equal_length_rotations` | partial          | none             | only when within a certain threshold of success | stub   |
| `circle`       | `circle.quadrant_highlights`          | If the roll makes the correct first jump of the sequence, highlight the next quadrant in the sequence.                                               | none                                                                 | `roll_ends_with_quadrant_hop_sequence`  | partial          | `forecast`       | redacted geometry threshold                     | stub   |
| `ratios`       | `ratios.denominator_threshold_marker` | Threshold marker / numeric HUD cue over denominator as value gets close, for example `[2/7] -> [7/7]`.                                               | none                                                                 | `rational_smaller_than`                 | partial          | none             | redacted order-family only                      | stub   |
| `ratios`       | `ratios.constant_denominator`         | Threshold marker / numeric HUD cue over denominator as threshold gets close, for example `[2/7] -> [7/7]`.                                           | none                                                                 | `roll_ends_with_equal_denominators`     | partial          | none             | redacted tail length                            | stub   |

<br />

Implementation notes (current behavior + target analytics split):

* `total` uses latest roll entry for domain/error display, and uses unlock-hint progress rows that can depend on full roll history and roll-analysis predicates.

* `graph` consumes roll rows (seed + steps) and renders the latest 25-step x-window.

* `graph` overlay projections are split by source:

  * `settings.forecast`: one blue full-forecast point at `x = current + 1`.

  * `settings.stepExpansion`: one white step point at `x = current + 1` using latest step-forecast value; prior step overlay point is replaced each render.

* `feed` consumes roll rows and renders the latest 12 visible committed rows, plus optional full-forecast rows; no step-expansion forecast rows are appended.

* `number_line`/`circle` are trajectory panels: they consume latest value, optionally consume previous rows (`settings.history`), optionally consume full forecast (`settings.forecast`), and optionally consume multi-step forecast chains (`settings.stepExpansion`) independently.

* `total` is integer-native: non-integer/non-real domains should map to unique 7-segment domain codes rather than rendering full non-integer payloads inline.

* `ratios` supports integer/rational real parts and integer/rational imaginary parts; behavior outside those forms is TBD.

* Remainders are deprecated for UI projection and should not be displayed in any visualizer panel.

* `factorization` is the deepest roll diagnostics panel: it consumes roll window history, cycle/analysis diagnostics, domain interpretation, and factorization payloads.

* `algebraic` consumes symbolic payload conditionally: it resolves to simplified symbolic text only when latest relevant roll rows include matching `entry.symbolic.exprText`.

* `state`/`title`/`release_notes` intentionally stay non-roll panels.

Testing implications (next pass):

* Add contract fixtures that assert `none` cells stay non-consuming (especially `state`, `title`, `release_notes`).

* Add targeted visualizer tests for conditional cells (`history`, `forecast`, `cycle`, `stepExpansion`, symbolic matches, error rows).

Current forecast render patterns (`graph`/`feed`):

* `graph`: plots one blue forecast point (`history`/full forecast source) at `x = current + 1` when `settings.forecast` is active.

* `graph`: plots one white step point at `x = current + 1` from the latest step-forecast value when `settings.stepExpansion` is active.

* `graph`: step point is ephemeral; each render replaces the prior step projection instead of accumulating historical step overlays.

* `feed`: appends only forecast-history/full-forecast rows after committed rows (no step-expansion forecast rows).

* `feed`: forecast rows are visually muted on the forecast/blue channel and never rewrite committed historical rows.

* `feed`: when no forecast is available, forecast rows are omitted.
