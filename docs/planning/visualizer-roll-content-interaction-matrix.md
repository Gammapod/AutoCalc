# Visualizer x Roll Content Interaction Matrix

Purpose: define how each visualizer should consume roll-derived content, so visualizer behavior is consistent and testable.

Canonical sources:
- Visualizer registration and IDs: `src/ui/modules/visualizers/registry.ts` and `src/contracts/keyCatalog.ts`.
- Default/total visualizer render path: `src/ui/modules/calculator/totalDisplay.ts`.
- Roll-derived read models and diagnostics: `src/ui/shared/readModel.rollFeed.ts`, `src/ui/shared/readModel.algebraic.ts`, `src/ui/shared/readModel.factorization.ts`, `src/domain/diagnostics.ts`.
- Plot/vector projections: `src/domain/graphProjection.ts`, `src/ui/modules/visualizers/numberLineModel.ts`, `src/ui/modules/visualizers/circleRenderer.ts`.

Consume level key:
- `required`: panel meaningfully depends on this roll content every render.
- `conditional`: consumed only with flags/modes/data presence (history, step expansion, symbolic rows, etc.).
- `none`: panel should not consume this roll content.

Cycle indicator rule (cross-cutting UX):
- When a cycle is detected, visualizers that participate in gameplay-facing analysis must show a yellow indicator (analysis feedback channel).
- Number-based visualizers (`total`, `ratios`) show their number readout in yellow while cycle indicator is active (parallel to red error-row emphasis behavior).
- Graph-based visualizers (`graph`, `number_line`, `circle`) show cycle points linked by a thin yellow vector chain.
- Help/dev visualizers (`help`, `state`, `title`, `release_notes`, debug-only panels) do not require a cycle indicator.

Error indicator rule (cross-cutting UX):
- Any roll row with an error must render/plot that row's value in red.
- Red must be scoped to the individual errored value/point only.
- No other numbers, points, vectors, labels, or panel chrome should be red unless they are directly representing that errored roll row value.

Roll content slices used in this matrix:
- `latest_total`: current value (`state.calculator.total`) or latest roll `y` when panel semantics use it.
- `previous_rows`: roll history beyond latest row (seed + prior step rows).
- `orbit_analysis`: derived growth/cycle/orbit diagnostics from roll history and `rollAnalysis`.
- `errors`: execution errors on roll rows (`entry.error`).
- `number_domain`: domain/category projections from current/latest value (`N`, `Z`, `Q`, complex family, etc.).
- `remainders`: Euclidean remainder payloads (`entry.remainder`) (deprecated for UI projection; expected `none` for visualizers).
- `symbolic_payload`: symbolic roll payload (`entry.symbolic`).
- `factorization_payload`: prime factorization payloads (`entry.factorization`).
- `forecast_simulation`: predicted next values from simulated execution/step expansion.

| Visualizer ID | latest_total | previous_rows | orbit_analysis | errors | number_domain | remainders | symbolic_payload | factorization_payload | forecast_simulation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `total` (default) | Shows integer totals only; non-integer/non-real domains map to unique 7-segment domain codes | conditional (unlock-hint rows derive progress from roll history) | conditional (unlock-hint rows can evaluate growth/cycle predicates) | conditional (latest roll error toggles error styling) | required (domain indicator from latest roll `y` fallback `total`) | none | none | none | none |
| `graph` | Plots latest roll `y` via roll projection (not direct `state.calculator.total`) | required (seed + step history, with x-window constrained to latest 25 x indices) | none | conditional (error rows plotted with error styling) | none | none | none | none | none |
| `feed` | Displays latest visible row in table | required (seed + step rows, capped to last 12 visible rows) | none | conditional (error rows marked/styled) | none | none | none | none | none |
| `number_line` | required (current vector from latest roll `y`; no vector before first roll row) | conditional (immediate previous roll segment when History flag is on) | none | conditional (plot enters error style only when latest roll row has error) | conditional (complex-grid/Argand mode enabled by non-zero imaginary current total or any complex roll row) | none | none | none | conditional (history forecast when History is on; step forecast when Step Expansion is on) |
| `circle` | required (magnitude/direction from current `state.calculator.total`) | conditional (previous-point segment when History flag is on and prior roll exists) | none | none | none | none | none | none | conditional (history forecast when History is on; step forecast chain when Step Expansion is on) |
| `ratios` | Shows `Re(num)`, `Re(den)`, `Im(num)`, `Im(den)`; supports integer/rational real and integer/rational imaginary-part forms |  |  |  |  |  |  |  |  |
<!-- debug/dev visualizer, not player-facing | `factorization` | required | required | required | conditional | required | none | none | required | none | -->
<!-- legacy/test visualizer, not player-facing| `algebraic` | conditional | conditional | none | none | none | none | required | none | none | -->
<!-- | `help` | conditional | conditional | conditional | conditional | none | none | none | none | none | -->
<!-- | `state` | none | none | none | none | none | none | none | none | none | -->
<!-- | `title` | none | none | none | none | none | none | none | none | none | -->
<!-- | `release_notes` | none | none | none | none | none | none | none | none | none | -->

Implementation notes (current behavior):
- `total` uses latest roll entry for domain/error display, and uses unlock-hint progress rows that can depend on full roll history and roll-analysis predicates.
- `graph` consumes roll rows (seed + steps) and renders the latest 25-step x-window; `feed` consumes roll rows and renders the latest 12 visible rows.
- `number_line`/`circle` are trajectory panels: they consume latest value, optionally consume previous rows (History flag), and optionally consume forecast values (History forecast and/or Step Expansion forecast).
- `total` is integer-native: non-integer/non-real domains should map to unique 7-segment domain codes rather than rendering full non-integer payloads inline.
- `ratios` supports integer/rational real parts and integer/rational imaginary parts; behavior outside those forms is TBD.
- Remainders are deprecated for UI projection and should not be displayed in any visualizer panel.
- `factorization` is the deepest roll diagnostics panel: it consumes roll window history, orbit/cycle analysis, domain interpretation, and factorization payloads.
- `algebraic` consumes symbolic payload conditionally: it resolves to simplified symbolic text only when latest relevant roll rows include matching `entry.symbolic.exprText`.
- `state`/`title`/`release_notes` intentionally stay non-roll panels.

Testing implications (next pass):
- Add contract fixtures that assert `none` cells stay non-consuming (especially `state`, `title`, `release_notes`).
- Add targeted visualizer tests for conditional cells (`history`, `stepExpansion`, symbolic matches, error rows).

Planned forecast render patterns (`graph`/`feed`):
- `graph` (planned): show forecast as a forward ghost chain starting from the latest real point.
- `graph` (planned): use thin dashed styling and reduced opacity for forecast segments/points so projected data is visually distinct from committed roll rows.
- `graph` (planned): color forecast by source (`history` forecast vs `step expansion` forecast) using existing semantic families.
- `feed` (planned): append forecast-only rows after committed rows, labeled with a projection prefix (for example `~1`, `~2`, ...).
- `feed` (planned): keep forecast rows visually muted/analysis-styled, and never rewrite or recolor committed historical rows.
- `feed` (planned): when no forecast is available, omit forecast rows entirely instead of rendering placeholders.
