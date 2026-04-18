import type { ReleaseNotesCatalog } from "../contracts/releaseNotes.js";

export const releaseNotes: ReleaseNotesCatalog = {
  // Ideal release notes are laconic and understated.
  // 'summary' should contain the main change, and 'bullets' should list smaller changes.
  entries: [
    {
      id: "release_v1_1_0",
      releaseVersion: "v1.1.0",
      channel: "released",
      title: "Complex Family Expansion and Ratio Visualizer",
      summary:
        "Complex-number play now has broader operator coverage, a dedicated ratio panel, and stronger visual parity across views.",
      bullets: [
        "Added the Ratios visualizer with real/imag numerator-denominator rendering, plus cycle/error and irrational-state handling.",
        "Expanded complex families with new unary and binary operator entries, including reciprocal, conjugation, real/imag projection, and tuple-style division/log variants.",
        "Circle and number-line visualizers now include richer overlays (imaginary-axis cues, cycle traces, and clearer error state signaling).",
        "Unlock progression now supports staged digit unlock behavior for key 1 (installed-only first, then portable).",
        "Execution and UI behavior are backed by expanded operator-matrix, scalar-limit, and visualizer contract coverage.",
      ],
    },
    {
      id: "release_v1_0_0",
      releaseVersion: "v1.0.0",
      channel: "released",
      title: "Real rotation implemented.",
      summary:
        "Last major design hurdle cleared; we are now in Alpha.",
      bullets: [
        "Circle Visualizer.",
        "Rotation supported in 15-degree steps.",
      ],
    },
    {
      id: "release_v0_10_2",
      releaseVersion: "v0.10.2",
      channel: "released",
      title: "Runtime Mode Transition Canonicalization",
      summary:
        "Mode transitions are now runtime-only with no URL reload fallback path.",
      bullets: [
        "System-key transition policies (`none`, `save_current`, `clear_save`) now flow through one canonical runtime coordinator contract.",
        "Hydration-equivalence matrix coverage now validates all transition entry points for each policy and target mode.",
        "Mode shell parity (`game`, `sandbox`, `main_menu`) is preserved through `HYDRATE_SAVE` + active-mode synchronization.",
      ],
    },
    {
      id: "release_v0_10_1",
      releaseVersion: "v0.10.1",
      channel: "released",
      title: "Number Line Vizualizer",
      summary:
        "Visualizer that shows numbers spatially. Also:",
      bullets: [
        "Performance/Loading upgrades.",
        "Complex number support.",
        "Regularized error handling.",
        "Inverse execution key actually inverts.",
      ],
    },
    {
      id: "release_v0_9_32",
      releaseVersion: "v0.9.32",
      channel: "released",
      title: "IR-First Execution Consolidation",
      summary:
        "Completes cleanup-wave execution hardening by consolidating reducer/engine flows onto typed execution IR with parity-locked contracts.",
      bullets: [
        "Reducer execution progression (equals, step-through, auto-step, wrap-tail paths) now runs through shared IR-first evaluation helpers.",
        "Engine execution keeps an IR-first runtime path with a single legacy comparator retained for deterministic parity harnesses.",
        "Execution parity coverage expanded with deterministic IR builder/executor suites and targeted multi-calculator isolation traces.",
        "Cleanup wave exits with full checkpoint gates green and release docs synchronized to Milestones 2A/2B/2C.",
      ],
    },
    {
      id: "release_v0_9_31",
      releaseVersion: "v0.9.31",
      channel: "released",
      title: "Complex Unary Vertical Slice (\u2A1D)",
      summary:
        "Adds the first complex-number runtime slice with unary \u2A1D (\u00D7i), pure-imaginary domain projection, and save compatibility.",
      bullets: [
        "Introduced structured complex runtime values (`a + bi`) with pure-real collapse behavior when `im = 0`.",
        "Added unary \u2A1D key flow end-to-end: key face, slot rendering, expanded form, and execution semantics.",
        "Default total display now shows a complex placeholder token (`CIRC`) and domain indicators include pure-imaginary families.",
        "Complex values now round-trip through persistence while legacy saves continue to load unchanged.",
      ],
    },
    {
      id: "release_v0_9_30",
      releaseVersion: "v0.9.30",
      channel: "released",
      title: "Boundary Contracts and Cue Decoupling",
      summary:
        "Hardens architecture seams with explicit control-locality and mutation-boundary contracts, plus cue-motion service decoupling.",
      bullets: [
        "Added explicit contract suites for control matrix locality and direct mutation-bypass boundaries.",
        "Cue coordinators now consume an injected motion-settlement service contract instead of direct UI bridge imports.",
        "Control selection coverage now includes canonical non-legacy field normalization guards.",
      ],
    },
    {
      id: "release_v0_9_28",
      releaseVersion: "v0.9.28",
      channel: "released",
      title: "Storage Drawer Replacement",
      summary: "Storage is now a palette-style drawer for unlocked keys with filter browsing and direct install/uninstall drag actions.",
      bullets: [
        "Storage membership is unlock-derived; dragging to/from storage does not mutate storage contents.",
        "Install is unique per calculator key ID, and occupied-slot installs replace the destination key.",
        "Keys can be uninstalled by dragging off calculator surfaces, including executor keys.",
        "Standard and browse drawer modes support compact play and expanded scanning workflows.",
      ],
    },
    {
      id: "release_v0_9_19",
      releaseVersion: "v0.9.19",
      channel: "released",
      title: "Unlock Hints in Visualizer",
      summary: "Replaces progression browsing with contextual visualizer hints that show progress without spoilers.",
      bullets: [
        "Visualizer hints surface actionable near-unlock guidance in context.",
        "Predicate-aware progress cues replace unlock-list scanning as the default progression loop.",
      ],
    },
    {
      id: "release_v0_9_10",
      releaseVersion: "v0.9.10",
      channel: "released",
      title: "Per-Calculator Memory & Matrix Isolation",
      summary: "Each calculator now keeps isolated settable-variable selection and memory-key targeting.",
      bullets: [
        "Memory cycle/adjust/recall operate only on the active calculator's normalized settable selection.",
        "Selected variable highlight in footer and allocator visualizer stays in sync with memory-key behavior.",
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
