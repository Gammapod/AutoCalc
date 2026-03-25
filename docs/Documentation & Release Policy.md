Truth 1: Invariants

TODO (finished): Compare information in all existing docs against existing functional-spec. Discard or archive any information that directly contradicts invariants; ramaining information will be further processed.

TODO (finished): Consolidate remaining information into categories; propose consolidations that will take the form of invariant files ux-spec and calc-spec, containing UX invariants and Calculator balancing details, respectively. Flag any contradictions for review before final versions. Any information not related to UX or content/feature balancing will be further processed.

TODO: Consolidate remaining information into Planned Releases (see that doc for more detailed TODO). Any information not related to release plans will be further processed.

TODO: Review any information not processed by the above rules; flag as potentially deletable.

TODO: Ensure the following rules are enforced going forward.

# Documentation Policy
Documents follow an epistemelogical hierarchy.
If any of documents from different truth levels contradict, the lower truth source is discarded - the two are not harmonized.
If documents from within the same truth level contradict, stop what you are doing and flag for review immediately.

Highest truth
    1 - This documentation polict, functional specification, UX specification, game design tuning docs, etc. Describes invariants, edited with scrutiny.
    2 - Archived release details, upcoming work, implementation runbooks. Authoritative, unless contradicted by a source of truth.
    3 - Loose feature notes, todo lists, anything lacking a truth label. If relevant to the current task you may ask for a decision about it; ignore otherwise. Do not delete by default.
    4 - Implementation plans for already-released features. Flag for review; if everything described in the doc matches archived release plans, the doc can be deleted instead of saved. 
Lowest truth

## Release Plans
Planned releases, both major and minor, are given a corresponding Planned Releases entry (earlier documentation might say "milestone" instead of Planned Releases, this should be corrected where found).

### Every Planned Release must have:
- User Story: Description in words. User-facing description and justification for feature. If there are no user-facing components, it is not a user story, it is pre-work.
- User Story Exit Criteria: Succinct checklist. Concrete user-facing examples of how the feature should function, including exceptions and relationships to other systems if any.

### Every Planned Release should have:
- Pre-work: Description in words. Prep-work or refactors required before the Planned Release can be started.
- Pre-work Exit Criteria: Succinct checklist. What must be true before the user story can be considered implementable.

### Hygiene/notes:
- "Content Only" releases can occur, which has user story content but no pre-work required.
- There should never be a release that only has pre-work, at least one MVP implementation of what the pre-work enables must be included in every release.
- Completed releases should be archived.
- Documentation beyond the Release Criteria listed above can be created, but is considered temporary planning material and can be deleted after release rather than archived. 
