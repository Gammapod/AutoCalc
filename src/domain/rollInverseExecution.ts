import type { Slot } from "./types.js";
import { KEY_ID } from "./keyPresentation.js";
import type { WrapStageMode } from "./executionPlanIR.js";

export type InverseExecutionStage =
  | { kind: "wrap_inverse"; mode: WrapStageMode }
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
    if (slot.operator === KEY_ID.unary_reciprocal) {
      return { kind: "slot", slot: { kind: "unary", operator: KEY_ID.unary_reciprocal } };
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
  if (slot.operator === KEY_ID.op_rotate_15) {
    return { kind: "slot", slot: { kind: "binary", operator: KEY_ID.op_rotate_15, operand: -slot.operand } };
  }
  if (slot.operator === KEY_ID.op_whole_steps) {
    return { kind: "slot", slot: { kind: "binary", operator: KEY_ID.op_whole_steps, operand: -slot.operand } };
  }
  if (slot.operator === KEY_ID.op_interval) {
    if (slot.operand === 0n || slot.operand === -1n) {
      return null;
    }
    return { kind: "slot", slot: { kind: "binary", operator: KEY_ID.op_interval, operand: -(slot.operand + 1n) } };
  }
  return null;
};

export const resolveRollInversePlan = (
  operationSlots: Slot[],
  wrapStageMode: WrapStageMode | null,
): RollInversePlanResolution => {
  const inverseStages: InverseExecutionStage[] = [];
  if (wrapStageMode) {
    inverseStages.push({ kind: "wrap_inverse", mode: wrapStageMode });
  }
  for (let index = operationSlots.length - 1; index >= 0; index -= 1) {
    const inverted = invertSlot(operationSlots[index]!);
    if (!inverted) {
      return { ok: false, reason: "ambiguous" };
    }
    inverseStages.push(inverted);
  }
  return { ok: true, stages: inverseStages };
};
