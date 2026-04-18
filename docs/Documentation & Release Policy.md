Truth 1: Invariants

Completed: Compared existing docs against functional spec and archived/discarded contradictions.

Completed: Consolidated remaining information into invariant-focused categories (`ux-spec`, `calculator-spec`, and related refs).

Completed: Moved release planning content into `docs/planning/Planning Board.md` and archive records.

TODO: Review any information not processed by the above rules; flag as potentially deletable.

TODO: Ensure the following rules are enforced going forward.

# Documentation Policy
Documents follow an epistemelogical hierarchy.
If any of documents from different truth levels contradict, the lower truth source is discarded - the two are not harmonized.
If documents from within the same truth level contradict, stop what you are doing and flag for review immediately.

Highest truth
    1 - This documentation policy, functional specification, UX specification, game design tuning docs, etc. Describes invariants, edited with scrutiny.
    2 - Archived release details, upcoming work, implementation runbooks. Authoritative, unless contradicted by a source of truth.
    3 - Loose feature notes, todo lists, anything lacking a truth label. If relevant to the current task you may ask for a decision about it; ignore otherwise. Do not delete by default.
    4 - Implementation plans for already-released features. Flag for review; if everything described in the doc matches archived release plans, the doc can be deleted instead of saved. 
Lowest truth

## Planning Lanes and Trains
Active planning lives in `docs/planning/Planning Board.md` using versionless lanes.

### Lane definitions and required fields
- `Now`: implementable slices ready for active execution. Every `Now` slice must include:
- `Slice ID`
- `User Story`
- `Exit Criteria`
- `Owner`
- `Status`
- `Next`: prioritized follow-up slices not yet execution-ready. Every `Next` slice must include:
- `Slice ID`
- `Intent/Problem`
- `Rough Exit Criteria`
- `Later`: parked ideas/themes not yet prioritized. Every `Later` slice must include:
- `Slice ID`
- `Theme/Idea`

### Promotion flow
- Slices move only in this direction: `Later -> Next -> Now -> Shipped`.
- Promotion from `Next` to `Now` requires implementation-ready scope and concrete exit criteria.
- `Now` slices are versionless and are not pre-assigned semver.

### Train cut policy (on-demand)
- Trains are cut on-demand when enough `Now` slices are complete and release quality gates pass.
- Semver (`vMAJOR.MINOR.PATCH` or prerelease variant) is assigned only at train cut.
- A train must include at least one user-facing implementation slice; pre-work-only trains are not allowed.

### Release notes policy
- `Release Note ID` is required for shipped train records, not for active `Now`/`Next`/`Later` slices.
- Every shipped train record must list final `Release Note ID` values that map to `src/content/releaseNotes.ts` for in-game display.

### Hygiene/notes
- Completed shipped trains should be archived in release history records.
- Temporary planning notes beyond these requirements can be deleted after release rather than archived.
