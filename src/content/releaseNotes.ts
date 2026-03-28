import type { ReleaseNotesCatalog } from "../contracts/releaseNotes.js";

export const releaseNotes: ReleaseNotesCatalog = {
  entries: [
    {
      id: "release_v0_9_10",
      releaseVersion: "v0.9.10",
      channel: "planned",
      title: "Per-Calculator Memory & Matrix Isolation",
      summary: "Each calculator now keeps isolated settable-variable selection and memory-key targeting.",
      bullets: [
        "Memory cycle/adjust/recall operate only on the active calculator's normalized settable selection.",
        "Selected variable highlight in footer and allocator visualizer stays in sync with memory-key behavior.",
      ],
    },
    {
      id: "release_v0_9_9",
      releaseVersion: "v0.9.9",
      channel: "planned",
      title: "Unlock Hints in Visualizer",
      summary: "Replaces progression browsing with contextual visualizer hints that show progress without spoilers.",
      bullets: [
        "Visualizer hints surface actionable near-unlock guidance in context.",
        "Predicate-aware progress cues replace unlock-list scanning as the default progression loop.",
      ],
    },
    {
      id: "release_v0_9_8",
      releaseVersion: "v0.9.8",
      channel: "planned",
      title: "Storage Drawer Replacement",
      summary: "Replaces storage browsing with a faster drawer flow for finding and deploying unlocked keys.",
      bullets: [
        "Key discovery emphasizes families and quick retrieval.",
        "Storage interactions target low-click, no-scroll access patterns.",
      ],
    },
    {
      id: "release_v0_9_7",
      releaseVersion: "v0.9.7",
      channel: "released",
      title: "Unified Settings State Model",
      summary: "Refactors settings to calculator-centric typed families with deterministic defaults and forced-default behavior.",
      bullets: [
        "Settings-state is now canonical per calculator, not derived from settings button flags.",
        "Mutually exclusive setting families resolve through typed option values and default fallback rules.",
        "Locked and installed settings keys can define forced defaults deterministically by keypad order.",
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
