import { parseExpressionOrNull } from "./expression.js";
import type { BinarySlot, CalculatorState, DraftingSlot, Slot } from "./types.js";
import { isNaturalDivisorOperatorKeyId } from "./keyPresentation.js";

const DIGITS_ONLY_RE = /^\d+$/;
const isNaturalDivisorOperator = (operator: DraftingSlot["operator"]): boolean => isNaturalDivisorOperatorKeyId(operator);

export const toCommittedDraftingSlot = (draftingSlot: DraftingSlot): BinarySlot | null => {
  if (draftingSlot.operandInput === "") {
    return null;
  }

  const normalizedInput = draftingSlot.operandInput.trim();
  if (isNaturalDivisorOperator(draftingSlot.operator) && !DIGITS_ONLY_RE.test(normalizedInput)) {
    return null;
  }
  if (DIGITS_ONLY_RE.test(normalizedInput)) {
    const magnitude = BigInt(normalizedInput);
    return {
      kind: "binary",
      operator: draftingSlot.operator,
      operand: isNaturalDivisorOperator(draftingSlot.operator)
        ? magnitude
        : draftingSlot.isNegative && magnitude !== 0n
          ? -magnitude
          : magnitude,
    };
  }

  const parsedExpression = parseExpressionOrNull(normalizedInput);
  if (!parsedExpression) {
    return null;
  }
  return {
    kind: "binary",
    operator: draftingSlot.operator,
    operand: draftingSlot.isNegative
      ? { type: "unary", op: "neg", arg: parsedExpression }
      : parsedExpression,
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
