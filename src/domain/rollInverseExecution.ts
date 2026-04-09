import type { CalculatorSettings, RollEntry, Slot } from "./types.js";
import { KEY_ID } from "./keyPresentation.js";

export type InverseExecutionStage =
  | { kind: "slot"; slot: Slot }
  | { kind: "pow_root"; exponent: bigint; reciprocal: boolean }
  | { kind: "divide_by_i" }
  | { kind: "rotate_minus_15" };

export type RollInversePlanResolution =
  | { ok: true; stages: InverseExecutionStage[] }
  | { ok: false; reason: "ambiguous" };

const invertSlot = (slot: Slot): InverseExecutionStage | null => {
  if (slot.kind === "unary") {
    if (slot.operator === KEY_ID.unary_inc) {
      return { kind: "slot", slot: { kind: "unary", operator: KEY_ID.unary_dec } };
    }
    if (slot.operator === KEY_ID.unary_dec) {
      return { kind: "slot", slot: { kind: "unary", operator: KEY_ID.unary_inc } };
    }
    if (slot.operator === KEY_ID.unary_neg) {
      return { kind: "slot", slot: { kind: "unary", operator: KEY_ID.unary_neg } };
    }
    if (slot.operator === KEY_ID.unary_i) {
      return { kind: "divide_by_i" };
    }
    if (slot.operator === KEY_ID.unary_rotate_15) {
      return { kind: "rotate_minus_15" };
    }
    return null;
  }

  if (typeof slot.operand !== "bigint") {
    return null;
  }

  if (slot.operator === KEY_ID.op_add) {
    return { kind: "slot", slot: { kind: "binary", operator: KEY_ID.op_sub, operand: slot.operand } };
  }
  if (slot.operator === KEY_ID.op_sub) {
    return { kind: "slot", slot: { kind: "binary", operator: KEY_ID.op_add, operand: slot.operand } };
  }
  if (slot.operator === KEY_ID.op_mul) {
    if (slot.operand === 0n) {
      return null;
    }
    return { kind: "slot", slot: { kind: "binary", operator: KEY_ID.op_div, operand: slot.operand } };
  }
  if (slot.operator === KEY_ID.op_div) {
    if (slot.operand === 0n) {
      return null;
    }
    return { kind: "slot", slot: { kind: "binary", operator: KEY_ID.op_mul, operand: slot.operand } };
  }
  if (slot.operator === KEY_ID.op_pow) {
    const exponent = slot.operand;
    if (exponent === 0n) {
      return null;
    }
    return {
      kind: "pow_root",
      exponent: exponent < 0n ? -exponent : exponent,
      reciprocal: exponent < 0n,
    };
  }
  return null;
};

export const resolveRollInversePlan = (
  operationSlots: Slot[],
  settings: Pick<CalculatorSettings, "wrapper">,
): RollInversePlanResolution => {
  if (settings.wrapper !== "none") {
    return { ok: false, reason: "ambiguous" };
  }
  const inverseStages: InverseExecutionStage[] = [];
  for (let index = operationSlots.length - 1; index >= 0; index -= 1) {
    const inverted = invertSlot(operationSlots[index]!);
    if (!inverted) {
      return { ok: false, reason: "ambiguous" };
    }
    inverseStages.push(inverted);
  }
  return { ok: true, stages: inverseStages };
};

// Legacy semantic gate retained for compatibility with execution policy call-sites.
// Inverse failure now resolves to terminal NaN(ambiguous), not semantic rejection.
export const shouldRejectRollInverseExecution = (_rollEntries: RollEntry[]): boolean => false;
