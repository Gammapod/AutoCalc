import type { ReleaseNotesCatalog } from "../contracts/releaseNotes.js";

export const releaseNotes: ReleaseNotesCatalog = {
  entries: [
    {
      id: "release_v0_9_7",
      releaseVersion: "v0.9.7",
      channel: "planned",
      title: "Unlock Proximity Radar (Hint System v1)",
      summary: "Adds near-unlock feedback in the default visualizer without revealing exact unlock conditions.",
      bullets: [
        "Default visualizer gains a proximity indicator tied to strongest active near-match.",
        "Partial progress supports multi-row unlock predicates.",
        "Hints reveal proximity only, not full condition text.",
      ],
    },
    {
      id: "release_v0_9_6",
      releaseVersion: "v0.9.6",
      channel: "planned",
      title: "Storage Drawer Replacement",
      summary: "Replaces key storage browsing with a faster, clearer drawer flow for finding and deploying keys.",
      bullets: [
        "Key families are easier to scan without searching.",
        "Storage actions target low-click retrieval.",
        "Navigation is designed to avoid scrolling within the storage flow.",
      ],
    },
    {
      id: "release_v0_9_4",
      releaseVersion: "v0.9.4",
      channel: "released",
      title: "Diagnostics Foundation",
      summary: "Stabilizes diagnostics surfaces and visualizer host behavior used by current gameplay builds.",
      bullets: [
        "Last Key and Next Operation diagnostics are available in active visualizer flows.",
        "Visualizer host transition and fit contracts are standardized across panels.",
        "Core run diagnostics are now available for in-session analysis.",
      ],
    },
  ],
};
