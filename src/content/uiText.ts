import type { UiText } from "../contracts/uiText.js";

export const uiText: UiText = {
  switches: {
    desktop: "Switch to Desktop UI",
    mobile: "Switch to Mobile UI",
    sandbox: "Switch to Sandbox Mode",
    game: "Switch to Game Mode",
  },
  analysis: {
    title: "Number Domain Analysis",
    reasoning: "Reasoning:",
    unlockSpec: "Unlock Spec Analysis:",
    scopeCompare: "Checklist Visibility Scope Compare:",
  },
  checklist: {
    title: "Unlocks",
    headerHint: "Hint",
    headerReward: "Reward",
    emptyAttemptable: "No currently attemptable unlocks from active keypad layout.",
    quickstartTitle: "Feature Overview",
    quickstartItems: {
      unlockKeys: "Make calculations to unlock more convenient calculator keys.",
      debugPanel: "Use unlocks and keypad growth controls in the debug panel to expand your machine.",
      dragDrop: "Drag+Drop keys to rearrange layout at any time.",
      allocatorIntro: "Allocator can change:",
      allocatorItems: [
        "Size of calculator keypad",
        "Range of total display",
        "Number of operations per function",
        "Speed of auto-clicker",
      ],
    },
  },
};
