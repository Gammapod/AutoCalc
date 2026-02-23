import type { UnlockDefinition } from "../domain/types.js";

export const unlockCatalog: UnlockDefinition[] = [
  {
    id: "unlock-ce-on-roll-3",
    description: "Reach a roll length of 3 to unlock CE.",
    predicate: { type: "roll_length_at_least", length: 3 },
    effect: { type: "unlock_utility", key: "CE" },
    once: true,
  },
];
