import type { CalculatorState, DraftingSlot, Slot } from "./types.js";

export const toCommittedDraftingSlot = (draftingSlot: DraftingSlot): Slot | null => {
  if (draftingSlot.operandInput === "") {
    return null;
  }

  const magnitude = BigInt(draftingSlot.operandInput);
  return {
    operator: draftingSlot.operator,
    operand: draftingSlot.isNegative && magnitude !== 0n ? -magnitude : magnitude,
  };
};

export const getOperationSnapshot = (
  calculator: Pick<CalculatorState, "operationSlots" | "draftingSlot">,
  includeDrafting: boolean = true,
): Slot[] => {
  const slots = [...calculator.operationSlots];
  if (!includeDrafting || !calculator.draftingSlot) {
    return slots;
  }

  const draftingSlot = toCommittedDraftingSlot(calculator.draftingSlot);
  if (!draftingSlot) {
    return slots;
  }

  slots.push(draftingSlot);
  return slots;
};
