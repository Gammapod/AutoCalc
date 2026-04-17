# Visualizer x Roll Content Interaction Matrix (Current-vs-Planned Parity)

Purpose: mirror `docs/planning/visualizer-roll-content-interaction-matrix.md`, but mark whether current implementation matches the planned cell behavior.

Legend:
- `match`: current implementation aligns with planned behavior for that cell.
- `mismatch`: current implementation diverges from planned behavior for that cell.
- `n/a`: no planned cell exists (outside original matrix scope).

## Play-Facing Matrix Parity

| Visualizer ID | latest_total | previous_rows | orbit_analysis | cycles | errors | number_domain | symbolic_payload | factorization_payload | forecast_simulation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `total` (default) | match | match | match | mismatch | match | match | match | match | match |
| `graph` | match | match | mismatch | match | match | match | match | match | match |
| `feed` | match | match | match | mismatch | match | match | match | match | mismatch |
| `number_line` | match | match | match | mismatch | mismatch | match | match | match | match |
| `circle` | match | match | match | mismatch | mismatch | match | match | match | match |
| `ratios` | mismatch | mismatch | mismatch | mismatch | mismatch | mismatch | mismatch | mismatch | mismatch |

## Notes For Mismatched Play-Facing Cells

- `total.cycles`: current implementation does not use cycle metadata/history-toggle to style cycle-start rows.
- `graph.orbit_analysis`: current implementation does not consume orbit/cycle diagnostics for history-triggered cycle styling.
- `feed.cycles`: current implementation does not consume cycle metadata/history-toggle for cycle-start styling.
- `feed.forecast_simulation`: current implementation does not render history/step-expansion forecast rows.
- `number_line.cycles`: current implementation draws history/forecast vectors but does not use cycle metadata to render cycle-point constellation links.
- `number_line.errors`: current implementation applies error role at plot level instead of scoping error styling only to the errored value/vector.
- `circle.cycles`: current implementation does not use cycle metadata to render cycle-point constellation links.
- `circle.errors`: current implementation does not apply latest-roll-row error styling to the plotted vector.
- `ratios.*`: no `ratios` visualizer is currently implemented.

## Visualizers Outside Original Matrix Scope

These visualizers were not given full cell-level planned entries in the original matrix table, so parity is evaluated against the surrounding implementation notes in that doc.

| Visualizer ID | planned scope summary | current parity |
| --- | --- | --- |
| `factorization` | Deep diagnostics panel consuming roll window/history, orbit/cycle analysis, domain interpretation, factorization payloads | match |
| `algebraic` | Conditional symbolic payload consumer (resolved symbolic text when matching symbolic roll payload exists) | match |
| `help` | Help/dev panel; no cycle-indicator requirement | match |
| `state` | Non-roll/system panel | match |
| `title` | Non-roll/system panel | match |
| `release_notes` | Non-roll/system panel | match |

## Additional Divergence Not Captured By Original Columns

- Remainders are still rendered in current UI paths (`total` remainder token and `graph` remainder points), while the planning doc states remainders are deprecated for visualizer projection.
