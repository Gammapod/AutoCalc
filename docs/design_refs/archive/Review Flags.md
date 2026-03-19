# AutoCalc Review Flags

Last updated: 2026-03-19
Purpose: Track non-implemented, conflicting, or uncategorized design content for disposition.

## Review Items

| Source | Item | Reason Flagged | Proposed Disposition | Actual Resolution |
|---|---|---|---|---|
| `Current UX Spec.md` | Desktop sizing target rules (aspect floor and growth policy) | Marked as active direction, not confirmed current implementation in runtime docs | convert to milestone | converted to milestone: Consolidated Mobile/Desktop UI Policy |
| `Current UX Spec.md` | Mobile fixed-width body policy details | Directional target language, not current-state contract language | convert to milestone | converted to milestone: Consolidated Mobile/Desktop UI Policy |
| `UI Manifesto.md` | Migration philosophy and phase-gate process policy | Process/policy guidance, not implementation behavior; does not fit canonical active buckets | convert to milestone | moved to new doc: Development Guidelines |
| `UI Manifesto.md` | Visualizer conceptual host contract details | Forward contract direction not fully represented as current behavior contract | convert to milestone | converted to milestone: Consolidated Visualizer Policy |
| `UI Spec.md` | Current UI snapshot sections superseded by canonical split into UX + Implementation docs | Consolidated into active docs; original file archived | abandon | date + archive as "Outdated" |
| `Design Summary.md` | High-level current-state summary doc | Content redistributed into canonical docs; duplicate summary layer no longer needed | abandon | date + archive as "Outdated" |
| `Epic Features.md` | Multi-calculator unlock systems and specialist calculator concepts | Explicitly future, non-implemented systems | convert to milestone | converted to milestone: Multiple Calculators |
| `Epic Features.md` | Parallel calculator execution concepts | Future system expansion, not current implementation | convert to milestone | converted to milestone: Multiple Calculators |
| `Shared System Language.md` | Color and unlock-language framework with unresolved rules | Contains open questions/unresolved criteria not mapped to current implementation contracts | convert to milestone | converted to milestone: Consolidated UX Policy |
| `Shared System Language.md` | Digit/constant, utility, visualizer, execution unlock framework placeholders | Explicitly unresolved and non-testable currently | convert to milestone | converted to milestone: Consolidated Unlock Policy |

## Notes

- `dependency_map.mmd` remains unchanged by instruction and is excluded from consolidation edits.
- Any flagged item accepted for near-term delivery should be rewritten into concrete milestone outcomes before implementation work.
- Resolution destinations created: `design_refs/Development Guidelines.md` and new milestones in `design_refs/Milestones.md` (`Consolidated Mobile/Desktop UI Policy`, `Consolidated Visualizer Policy`, `Multiple Calculators`, `Consolidated UX Policy`, `Consolidated Unlock Policy`).
- Canonical refresh snapshot notes recorded under `design_refs/archive/2026-03-19/Archive Notes.md`.
