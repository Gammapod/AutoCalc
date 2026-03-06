import { addInt, divInt, mulInt, subInt } from "../infra/math/rationalEngine.js";
import { euclideanDivide } from "../infra/math/euclideanEngine.js";
import type { RationalValue, Slot } from "./types.js";

export type ExecuteSlotsResult =
  | { ok: true; total: RationalValue; euclidRemainder?: RationalValue }
  | { ok: false; reason: "division_by_zero" };

export const executeSlots = (total: RationalValue, slots: Slot[]): ExecuteSlotsResult => {
  if (slots.length === 0) {
    return { ok: true, total };
  }

  let nextTotal = total;
  let lastEuclidModComponent: RationalValue | undefined;
  let endsWithEuclidLikeOperator = false;
  for (const slot of slots) {
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
