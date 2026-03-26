import type { ReleaseNotesCatalog } from "../contracts/releaseNotes.js";

export const releaseNotes: ReleaseNotesCatalog = {
  entries: [
    {
      id: "release_v0_9_8",
      releaseVersion: "v0.9.8",
      channel: "planned",
      title: "Unified Settings State Model",
      summary: "Unifies lock-state and toggle-state behavior for settings-family keys across keypad and storage.",
      bullets: [
        "Settings and visualizer controls share one interaction model.",
        "Lock and toggle state resolve through one runtime mapping.",
        "Cross-surface parity rules now use one settings-state vocabulary.",
      ],
    },
    {
      id: "release_v0_9_7",
      releaseVersion: "v0.9.7",
      channel: "planned",
      title: "Checklist to Visualizer Hints",
      summary: "Replaces checklist-first progression with contextual visualizer hints that preserve spoiler-safe unlock guidance.",
      bullets: [
        "Hint surfaces move progression guidance into visualizer context.",
        "Predicate-aware progress cues replace checklist scanning.",
        "Hints communicate progress without exposing full unlock condition text.",
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
      id: "release_v0_9_5",
      releaseVersion: "v0.9.5",
      channel: "released",
      title: "Release Automation",
      summary: "Implemented butler for automatic release patches.",
      bullets: [
        "If you can see this, it worked.",
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
