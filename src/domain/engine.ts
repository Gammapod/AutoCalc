import { addInt, divInt, mulInt, subInt } from "../infra/math/rationalEngine.js";
import { euclideanDivide } from "../infra/math/euclideanEngine.js";
import { calculatorValueToExpression, isRationalCalculatorValue, toExpressionCalculatorValue, toNanCalculatorValue, toRationalCalculatorValue } from "./calculatorValue.js";
import { intExpr, normalizeExpression, slotOperandToExpression } from "./expression.js";
import type { CalculatorValue, ExpressionValue, RationalValue, Slot } from "./types.js";

export type ExecuteSlotsResult =
  | { ok: true; total: RationalValue; euclidRemainder?: RationalValue }
  | { ok: false; reason: "division_by_zero" | "unsupported_symbolic" };

export const executeSlots = (total: RationalValue, slots: Slot[]): ExecuteSlotsResult => {
  if (slots.length === 0) {
    return { ok: true, total };
  }

  let nextTotal = total;
  let lastEuclidModComponent: RationalValue | undefined;
  let endsWithEuclidLikeOperator = false;
  for (const slot of slots) {
    if (typeof slot.operand !== "bigint") {
      return { ok: false, reason: "unsupported_symbolic" };
    }
    if (slot.operator === "+") {
      nextTotal = addInt(nextTotal, slot.operand);
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (slot.operator === "-") {
      nextTotal = subInt(nextTotal, slot.operand);
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (slot.operator === "*") {
      nextTotal = mulInt(nextTotal, slot.operand);
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (slot.operator === "/") {
      if (slot.operand === 0n) {
        return { ok: false, reason: "division_by_zero" };
      }
      nextTotal = divInt(nextTotal, slot.operand);
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (slot.operator === "#") {
      const euclidean = euclideanDivide(nextTotal, slot.operand);
      if (!euclidean.ok) {
        return euclidean;
      }
      nextTotal = euclidean.quotient;
      lastEuclidModComponent = euclidean.remainder;
      endsWithEuclidLikeOperator = true;
      continue;
    }
    if (slot.operator === "⟡") {
      const euclidean = euclideanDivide(nextTotal, slot.operand);
      if (!euclidean.ok) {
        return euclidean;
      }
      nextTotal = euclidean.remainder;
      lastEuclidModComponent = euclidean.remainder;
      endsWithEuclidLikeOperator = true;
      continue;
    }
    throw new Error(`Unsupported operator: ${slot.operator}`);
  }

  if (endsWithEuclidLikeOperator && lastEuclidModComponent) {
    return { ok: true, total: nextTotal, euclidRemainder: lastEuclidModComponent };
  }
  return { ok: true, total: nextTotal };
};

const applyBinaryExpression = (
  left: ExpressionValue,
  operator: Slot["operator"],
  right: ExpressionValue,
): ExpressionValue | null => {
  if (operator === "+") {
    return normalizeExpression({ type: "binary", op: "add", left, right });
  }
  if (operator === "-") {
    return normalizeExpression({ type: "binary", op: "sub", left, right });
  }
  if (operator === "*") {
    return normalizeExpression({ type: "binary", op: "mul", left, right });
  }
  if (operator === "/") {
    return normalizeExpression({ type: "binary", op: "div", left, right });
  }
  return null;
};

export type ExecuteSlotsValueResult =
  | { ok: true; total: CalculatorValue; euclidRemainder?: RationalValue }
  | { ok: false; reason: "division_by_zero" | "nan_input" | "unsupported_symbolic" };

export const executeSlotsValue = (total: CalculatorValue, slots: Slot[]): ExecuteSlotsValueResult => {
  if (total.kind === "nan") {
    return { ok: false, reason: "nan_input" };
  }
  if (slots.length === 0) {
    return { ok: true, total };
  }

  const canUsePureRationalPath =
    isRationalCalculatorValue(total)
    && slots.every((slot) => typeof slot.operand === "bigint");
  if (canUsePureRationalPath) {
    const executed = executeSlots(total.value, slots);
    if (!executed.ok) {
      return { ok: false, reason: executed.reason };
    }
    return {
      ok: true,
      total: toRationalCalculatorValue(executed.total),
      ...(executed.euclidRemainder ? { euclidRemainder: executed.euclidRemainder } : {}),
    };
  }

  let currentExpression = calculatorValueToExpression(total);
  if (!currentExpression) {
    return { ok: false, reason: "nan_input" };
  }

  for (const slot of slots) {
    if (slot.operator === "#" || slot.operator === "\u27E1") {
      return { ok: false, reason: "unsupported_symbolic" };
    }
    const right = typeof slot.operand === "bigint" ? intExpr(slot.operand) : slotOperandToExpression(slot.operand);
    const applied = applyBinaryExpression(currentExpression, slot.operator, right);
    if (!applied) {
      return { ok: false, reason: "unsupported_symbolic" };
    }
    currentExpression = applied;
  }

  return { ok: true, total: toExpressionCalculatorValue(currentExpression) };
};
