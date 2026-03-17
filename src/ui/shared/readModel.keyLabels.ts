import { calculatorValueToDisplayString } from "../../domain/calculatorValue.js";
import { expressionToDisplayString, slotOperandToExpression } from "../../domain/expression.js";
import { getButtonDefinition } from "../../domain/buttonRegistry.js";
import {
  getKeyButtonFaceLabel,
  getOperatorAlgebraicFaceLabel,
  getOperatorInlineFaceLabel,
  getOperatorSlotFaceLabel,
  isBinaryOperatorKeyId,
  isDigitKeyId,
  KEY_ID,
  resolveKeyId,
  toLegacyKey,
} from "../../domain/keyPresentation.js";
import type {
  CalculatorValue,
  GameState,
  Key,
  Slot,
  SlotOperator,
} from "../../domain/types.js";

export type KeyVisualGroup = "value_expression" | "slot_operator" | "utility" | "memory" | "step" | "settings" | "visualizers" | "execution";

export const formatOperatorForDisplay = (operator: SlotOperator): string =>
  getOperatorInlineFaceLabel(operator);

export const formatOperatorForOperationSlotDisplay = (operator: SlotOperator): string =>
  getOperatorSlotFaceLabel(operator);

const formatUnarySlotOperator = (operator: Extract<Slot, { kind: "unary" }>["operator"]): string =>
  getOperatorSlotFaceLabel(operator);

const formatUnarySlotToken = (operator: Extract<Slot, { kind: "unary" }>["operator"]): string =>
  operator === KEY_ID.unary_dec ? "\u2013 \u2013" : formatUnarySlotOperator(operator);

const formatAlgebraicOperator = (operator: SlotOperator): string =>
  getOperatorAlgebraicFaceLabel(operator);

const isEuclidLiteralOperator = (operator: SlotOperator): boolean => {
  const operatorId = resolveKeyId(operator);
  return operatorId === KEY_ID.op_euclid_div || operatorId === KEY_ID.op_mod;
};

export const formatKeyLabel = (key: Key): string => getKeyButtonFaceLabel(key);

export const getKeyVisualGroup = (key: Key): KeyVisualGroup => {
  if (isDigitKeyId(key)) {
    return "value_expression";
  }
  if (getButtonDefinition(toLegacyKey(resolveKeyId(key)))?.unlockGroup === "unaryOperators") {
    return "slot_operator";
  }
  if (isBinaryOperatorKeyId(key)) {
    return "slot_operator";
  }
  if (key === KEY_ID.util_clear_all || key === KEY_ID.util_undo || key === KEY_ID.util_backspace) {
    return "utility";
  }
  if (getButtonDefinition(toLegacyKey(resolveKeyId(key)))?.category === "settings") {
    return "settings";
  }
  if (getButtonDefinition(toLegacyKey(resolveKeyId(key)))?.category === "memory") {
    return "memory";
  }
  if (getButtonDefinition(toLegacyKey(resolveKeyId(key)))?.behaviorKind === "visualizer") {
    return "visualizers";
  }
  return "execution";
};

export const resolveStepExpansionText = (
  slot: Slot,
  context: {
    seedTotal: CalculatorValue;
    currentTotal: CalculatorValue;
    nextSlotIndex: number;
  },
): string | null => {
  void context.seedTotal;
  void context.nextSlotIndex;
  const current = calculatorValueToDisplayString(context.currentTotal);
  if (slot.kind === "unary") {
    if (slot.operator === KEY_ID.unary_inc) {
      return "+ 1";
    }
    if (slot.operator === KEY_ID.unary_dec) {
      return "+ -1";
    }
    if (slot.operator === KEY_ID.unary_neg) {
      return "\u00D7 -1";
    }
    if (slot.operator === KEY_ID.unary_omega) {
      return "\u03A3e_p";
    }
    if (slot.operator === KEY_ID.unary_phi) {
      return "n \u00D7 \u220F(1-p^-1)";
    }
    if (slot.operator === KEY_ID.unary_sigma) {
      return "\u03A3( [d|n] \u00D7 d)";
    }
    return `${formatUnarySlotOperator(slot.operator)}(${current})`;
  }
  if (slot.operator === KEY_ID.op_add && typeof slot.operand === "bigint") {
    if (slot.operand > 0n) {
      return Array.from({ length: Number(slot.operand) }, () => "+1").join(" ");
    }
    if (slot.operand < 0n) {
      return Array.from({ length: Number(-slot.operand) }, () => "-1").join(" ");
    }
    return "0";
  }
  if (slot.operator === KEY_ID.op_sub && typeof slot.operand === "bigint") {
    if (slot.operand > 0n) {
      return Array.from({ length: Number(slot.operand) }, () => "\u20131").join(" ");
    }
    if (slot.operand < 0n) {
      return Array.from({ length: Number(-slot.operand) }, () => "+1").join(" ");
    }
    return "0";
  }
  if (slot.operator === KEY_ID.op_mul && typeof slot.operand === "bigint" && slot.operand > 1n) {
    return Array.from({ length: Number(slot.operand - 1n) }, () => "+n").join(" ");
  }
  if (slot.operator === KEY_ID.op_div && typeof slot.operand === "bigint" && slot.operand !== 0n) {
    return `\u00D7(1/${slot.operand.toString()})`;
  }
  if (slot.operator === KEY_ID.op_rotate_left && typeof slot.operand === "bigint" && slot.operand > 0n) {
    return `n ${"<".repeat(Number(slot.operand))}`;
  }
  if (slot.operator === KEY_ID.op_euclid_div && typeof slot.operand === "bigint") {
    return `(\u230An \u00F7 ${slot.operand.toString()}\u230B, n \u2013 q)`;
  }
  if (slot.operator === KEY_ID.op_mod && typeof slot.operand === "bigint") {
    return "n \u2013 (m \u00D7 \u230An \u00F7 m\u230B)";
  }
  if (slot.operator === KEY_ID.op_gcd && typeof slot.operand === "bigint") {
    return "\u220Fp^(e_a \u2567 e_b)";
  }
  if (slot.operator === KEY_ID.op_lcm && typeof slot.operand === "bigint") {
    return "\u220Fp^(e_a \u2564 e_b)";
  }
  const operand = typeof slot.operand === "bigint" ? slot.operand.toString() : expressionToDisplayString(slotOperandToExpression(slot.operand));
  return `${current} ${formatOperatorForOperationSlotDisplay(slot.operator)} ${operand}`;
};

export const keyLabelInternals = {
  formatUnarySlotToken,
  formatUnarySlotOperator,
  formatAlgebraicOperator,
  isEuclidLiteralOperator,
};

export const algebraicHelpers = {
  isZeroRational: (value: CalculatorValue): boolean => value.kind === "rational" && value.value.num === 0n && value.value.den === 1n,
  hasAnyKeyPress: (state: GameState): boolean => Object.values(state.keyPressCounts).some((count) => (count ?? 0) > 0),
};
