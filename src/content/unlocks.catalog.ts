import type { UnlockDefinition } from "../domain/types.js";

export const unlockCatalog: UnlockDefinition[] = [
  {
    id: "unlock_plus_on_total_11",
    description: "Unlock + when total first reaches 11.",
    predicate: { type: "total_equals", value: 11n },
    effect: { type: "unlock_slot_operator", key: "+" },
    once: true,
  },
  {
    id: "unlock_equals_on_operation_plus_1",
    description: "Unlock = when operation is [+ 1].",
    predicate: {
      type: "operation_equals",
      slots: [{ operator: "+", operand: 1n }],
    },
    effect: { type: "unlock_execution", key: "=" },
    once: true,
  },
  {
    id: "max_total_digits_3",
    description: "Increase max total digits to 3.",
    predicate: { type: "roll_length_at_least", length: 1 },
    effect: { type: "increase_max_total_digits", amount: 1 },
    once: true,
  },
  {
    id: "unlock_c_on_roll_suffix_11_12_13_14",
    description: "Unlock C when roll ends with [11, 12, 13, 14].",
    predicate: { type: "roll_ends_with_sequence", sequence: [11n, 12n, 13n, 14n] },
    effect: { type: "unlock_utility", key: "C" },
    once: true,
  },
];
