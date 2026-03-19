import { KEY_ID } from "../domain/keyPresentation.js";
import type { UnlockDefinition } from "../domain/types.js";

export const unlockCatalog: UnlockDefinition[] = [
  {
    id: "unlock_4_on_total_4",
    description: "Unlock 4.",
    predicate: { type: "total_equals", value: 4n },
    effect: { type: "unlock_digit", key: KEY_ID.digit_4 },
    once: true,
    domainNodeId: "NN",
    targetNodeId: "I4_unlock",
    targetLabel: "4",
  },
];
