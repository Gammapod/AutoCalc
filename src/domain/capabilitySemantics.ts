import { keyCatalog } from "../contracts/keyCatalog.js";
import type { CapabilityId } from "./predicateCapabilitySpec.js";
import type { GameState, Key, LayoutCell, UnlockPredicate } from "./types.js";
import { isBinaryOperatorKeyId, isUnaryOperatorId, KEY_ID, toKeyId } from "./keyPresentation.js";
import { isKeyUnlocked } from "./keyUnlocks.js";

export type SufficientClause = readonly Key[];
export type FunctionSufficiencySpec = readonly SufficientClause[];

export type CapabilityContext = {
  executeActivation: boolean;
  stepPlusOne: boolean;
  stepMinusOne: boolean;
  resetToZero: boolean;
  unarySlotCommit: boolean;
  allocatorReturnPress: boolean;
  allocatorAllocatePress: boolean;
  formOperatorPlusOperand: boolean;
  rollGrowth: boolean;
  rollEqualRun: boolean;
  rollIncrementingRun: boolean;
  rollAlternatingSignConstantAbs: boolean;
  rollConstantStepRun: boolean;
  divisionByZeroError: boolean;
  symbolicResultError: boolean;
  euclidDivisionOperator: boolean;
};

const isKeyCell = (cell: LayoutCell): cell is { kind: "key"; key: Key } => cell.kind === "key";

const uniqueClauses = (clauses: Array<Array<Key>>): Key[][] => {
  const seen = new Set<string>();
  const deduped: Key[][] = [];
  for (const clause of clauses) {
    const normalized = [...new Set(clause)];
    if (normalized.length === 0) {
      continue;
    }
    const signature = normalized.join("|");
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(normalized);
  }
  return deduped;
};

const clause = (...keys: Array<Key | null>): Key[] => keys.filter((key): key is Key => key !== null);

const hasKey = (key: Key): boolean => keyCatalog.some((entry) => toKeyId(entry.key) === key);

const keysMatching = (predicate: (key: Key) => boolean): Key[] =>
  keyCatalog
    .map((entry) => toKeyId(entry.key))
    .filter(predicate);

const valueAtomKeys = (): Key[] =>
  keyCatalog
    .filter((entry) => entry.unlockGroup === "valueAtoms")
    .map((entry) => toKeyId(entry.key));

const binaryOperatorKeys = (): Key[] => keysMatching((key) => isBinaryOperatorKeyId(key));
const unaryOperatorKeys = (): Key[] => keysMatching((key) => isUnaryOperatorId(key));

const crossClauses = (left: readonly Key[], right: readonly Key[]): Key[][] =>
  left.flatMap((l) => right.map((r) => [l, r]));

const withPrefix = (prefix: readonly Key[], clauses: readonly Key[][]): Key[][] =>
  clauses.map((entry) => [...prefix, ...entry]);

export const createAvailabilityReader = (
  state: GameState,
  scope: "present_on_keypad" | "all_unlocked",
): ((key: Key) => boolean) => {
  const useAllUnlockedKeys = scope === "all_unlocked";
  const keypadKeys = new Set(state.ui.keyLayout.filter(isKeyCell).map((cell) => cell.key));
  return (key: Key): boolean => isKeyUnlocked(state, key) && (useAllUnlockedKeys || keypadKeys.has(key));
};

export const computeCapabilityContext = (
  state: GameState,
  isAvailable: (key: Key) => boolean,
): CapabilityContext => {
  const hasEqualsKey = isAvailable(KEY_ID.exec_equals);
  const executeActivation = hasEqualsKey;
  const hasPlus = isAvailable(KEY_ID.op_add);
  const hasMinus = isAvailable(KEY_ID.op_sub);
  const hasZero = isAvailable(KEY_ID.digit_0);
  const hasOne = isAvailable(KEY_ID.digit_1);
  const hasSomeValueAtom = Object.keys(state.unlocks.valueAtoms).some((key) => isAvailable(key as Key));
  const hasSomeBinaryOperator = Object.keys(state.unlocks.slotOperators)
    .filter((key): key is Key => isBinaryOperatorKeyId(key as Key))
    .some((key) => isAvailable(key));
  const hasSomeUnaryOperator = Object.keys(state.unlocks.unaryOperators)
    .filter((key): key is Key => isUnaryOperatorId(key as Key))
    .some((key) => isAvailable(key));
  const allocatorReturnPress = (state.allocatorReturnPressCount ?? 0) >= 1;
  const allocatorAllocatePress = (state.allocatorAllocatePressCount ?? 0) >= 1;
  const hasUnaryIncrement = isAvailable(KEY_ID.unary_inc);
  const hasUnaryDecrement = isAvailable(KEY_ID.unary_dec);
  const hasUnaryNegate = isAvailable(KEY_ID.unary_neg);
  const hasPi = isAvailable(KEY_ID.const_pi);
  const hasE = isAvailable(KEY_ID.const_e);

  const stepPlusOne = executeActivation && ((hasPlus && hasOne) || hasUnaryIncrement);
  const stepMinusOne = executeActivation && ((hasMinus && hasOne) || hasUnaryDecrement);
  const resetToZero = isAvailable(KEY_ID.util_clear_all) || isAvailable(KEY_ID.util_undo);
  const unarySlotCommit = hasSomeUnaryOperator;
  const formOperatorPlusOperand = hasSomeBinaryOperator && hasSomeValueAtom;
  const rollGrowth = executeActivation && (formOperatorPlusOperand || stepPlusOne || stepMinusOne);
  const rollEqualRun =
    executeActivation &&
    ((hasPlus && hasZero) || (hasMinus && hasZero) || (isAvailable(KEY_ID.op_mul) && hasOne) || (isAvailable(KEY_ID.op_div) && hasOne));
  const rollIncrementingRun = stepPlusOne;
  const rollAlternatingSignConstantAbs = executeActivation && hasUnaryNegate;
  const rollConstantStepRun = executeActivation && (formOperatorPlusOperand || hasUnaryIncrement || hasUnaryDecrement);
  const divisionByZeroError = executeActivation && isAvailable(KEY_ID.op_div) && hasZero;
  const symbolicResultError = executeActivation && (hasPi || hasE);
  const euclidDivisionOperator = isAvailable(KEY_ID.op_euclid_div);

  return {
    executeActivation,
    stepPlusOne,
    stepMinusOne,
    resetToZero,
    unarySlotCommit,
    allocatorReturnPress,
    allocatorAllocatePress,
    formOperatorPlusOperand,
    rollGrowth,
    rollEqualRun,
    rollIncrementingRun,
    rollAlternatingSignConstantAbs,
    rollConstantStepRun,
    divisionByZeroError,
    symbolicResultError,
    euclidDivisionOperator,
  };
};

export const resolveCapabilityFromContext = (
  capability: CapabilityId,
  predicate: UnlockPredicate,
  caps: CapabilityContext,
  isAvailable: (key: Key) => boolean,
): boolean => {
  if (capability === "execute_activation") {
    return caps.executeActivation;
  }
  if (capability === "step_plus_one") {
    return caps.stepPlusOne;
  }
  if (capability === "step_minus_one") {
    return caps.stepMinusOne;
  }
  if (capability === "reset_to_zero") {
    return caps.resetToZero;
  }
  if (capability === "form_operator_plus_operand") {
    return caps.formOperatorPlusOperand;
  }
  if (capability === "unary_slot_commit") {
    return caps.unarySlotCommit;
  }
  if (capability === "roll_growth") {
    return caps.rollGrowth;
  }
  if (capability === "roll_equal_run") {
    return caps.rollEqualRun;
  }
  if (capability === "roll_incrementing_run") {
    return caps.rollIncrementingRun;
  }
  if (capability === "roll_alternating_sign_constant_abs") {
    return caps.rollAlternatingSignConstantAbs;
  }
  if (capability === "roll_constant_step_run") {
    return caps.rollConstantStepRun;
  }
  if (capability === "division_by_zero_error") {
    return caps.divisionByZeroError;
  }
  if (capability === "symbolic_result_error") {
    return caps.symbolicResultError;
  }
  if (capability === "euclid_division_operator") {
    return caps.euclidDivisionOperator;
  }
  if (capability === "press_target_key") {
    if (predicate.type !== "key_press_count_at_least") {
      return false;
    }
    return isAvailable(predicate.key);
  }
  if (capability === "allocator_return_press") {
    return caps.allocatorReturnPress;
  }
  if (capability === "allocator_allocate_press") {
    return caps.allocatorAllocatePress;
  }
  return false;
};

export const buildCapabilitySufficiencyById = (): Record<Exclude<CapabilityId, "press_target_key">, FunctionSufficiencySpec> => {
  const equalsKey = hasKey(KEY_ID.exec_equals) ? KEY_ID.exec_equals : null;
  const plusKey = hasKey(KEY_ID.op_add) ? KEY_ID.op_add : null;
  const minusKey = hasKey(KEY_ID.op_sub) ? KEY_ID.op_sub : null;
  const mulKey = hasKey(KEY_ID.op_mul) ? KEY_ID.op_mul : null;
  const divKey = hasKey(KEY_ID.op_div) ? KEY_ID.op_div : null;
  const zeroKey = hasKey(KEY_ID.digit_0) ? KEY_ID.digit_0 : null;
  const oneKey = hasKey(KEY_ID.digit_1) ? KEY_ID.digit_1 : null;
  const clearKey = hasKey(KEY_ID.util_clear_all) ? KEY_ID.util_clear_all : null;
  const undoKey = hasKey(KEY_ID.util_undo) ? KEY_ID.util_undo : null;
  const unaryIncrementKey = hasKey(KEY_ID.unary_inc) ? KEY_ID.unary_inc : null;
  const unaryDecrementKey = hasKey(KEY_ID.unary_dec) ? KEY_ID.unary_dec : null;
  const unaryNegateKey = hasKey(KEY_ID.unary_neg) ? KEY_ID.unary_neg : null;
  const euclidKey = hasKey(KEY_ID.op_euclid_div) ? KEY_ID.op_euclid_div : null;
  const piKey = hasKey(KEY_ID.const_pi) ? KEY_ID.const_pi : null;
  const eKey = hasKey(KEY_ID.const_e) ? KEY_ID.const_e : null;

  const formOperatorPlusOperandClauses = uniqueClauses(crossClauses(binaryOperatorKeys(), valueAtomKeys()));
  const unarySlotCommitClauses = uniqueClauses(unaryOperatorKeys().map((key) => [key]));
  const executeActivationClauses = uniqueClauses(equalsKey ? [clause(equalsKey)] : []);
  const stepPlusOneClauses = uniqueClauses([
    ...(equalsKey && plusKey && oneKey ? [clause(equalsKey, plusKey, oneKey)] : []),
    ...(equalsKey && unaryIncrementKey ? [clause(equalsKey, unaryIncrementKey)] : []),
  ]);
  const stepMinusOneClauses = uniqueClauses([
    ...(equalsKey && minusKey && oneKey ? [clause(equalsKey, minusKey, oneKey)] : []),
    ...(equalsKey && unaryDecrementKey ? [clause(equalsKey, unaryDecrementKey)] : []),
  ]);
  const resetToZeroClauses = uniqueClauses([
    ...(clearKey ? [clause(clearKey)] : []),
    ...(undoKey ? [clause(undoKey)] : []),
  ]);

  const rollGrowthClauses = uniqueClauses([
    ...(equalsKey ? withPrefix([equalsKey], formOperatorPlusOperandClauses) : []),
    ...stepPlusOneClauses,
    ...stepMinusOneClauses,
  ]);
  const rollEqualRunClauses = uniqueClauses([
    ...(equalsKey && plusKey && zeroKey ? [clause(equalsKey, plusKey, zeroKey)] : []),
    ...(equalsKey && minusKey && zeroKey ? [clause(equalsKey, minusKey, zeroKey)] : []),
    ...(equalsKey && mulKey && oneKey ? [clause(equalsKey, mulKey, oneKey)] : []),
    ...(equalsKey && divKey && oneKey ? [clause(equalsKey, divKey, oneKey)] : []),
  ]);
  const rollConstantStepClauses = uniqueClauses([
    ...(equalsKey ? withPrefix([equalsKey], formOperatorPlusOperandClauses) : []),
    ...(equalsKey && unaryIncrementKey ? [clause(equalsKey, unaryIncrementKey)] : []),
    ...(equalsKey && unaryDecrementKey ? [clause(equalsKey, unaryDecrementKey)] : []),
  ]);
  const symbolicResultClauses = uniqueClauses([
    ...(equalsKey && piKey ? [clause(equalsKey, piKey)] : []),
    ...(equalsKey && eKey ? [clause(equalsKey, eKey)] : []),
  ]);

  // allocator_* capabilities are runtime button-press counters; unlock graph uses this key-based fallback.
  const allocatorFallbackClauses = executeActivationClauses;

  return {
    execute_activation: executeActivationClauses,
    step_plus_one: stepPlusOneClauses,
    step_minus_one: stepMinusOneClauses,
    reset_to_zero: resetToZeroClauses,
    form_operator_plus_operand: formOperatorPlusOperandClauses,
    unary_slot_commit: unarySlotCommitClauses,
    allocator_return_press: allocatorFallbackClauses,
    allocator_allocate_press: allocatorFallbackClauses,
    roll_growth: rollGrowthClauses,
    roll_equal_run: rollEqualRunClauses,
    roll_incrementing_run: stepPlusOneClauses,
    roll_alternating_sign_constant_abs: uniqueClauses(
      equalsKey && unaryNegateKey ? [clause(equalsKey, unaryNegateKey)] : [],
    ),
    roll_constant_step_run: rollConstantStepClauses,
    division_by_zero_error: uniqueClauses(
      equalsKey && divKey && zeroKey ? [clause(equalsKey, divKey, zeroKey)] : [],
    ),
    symbolic_result_error: symbolicResultClauses,
    euclid_division_operator: uniqueClauses(euclidKey ? [clause(euclidKey)] : []),
  };
};
