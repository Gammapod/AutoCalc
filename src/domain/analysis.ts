import {
  getPredicateCapabilitySpec,
  type CapabilityId,
  type PredicateCapabilitySpec,
} from "./predicateCapabilitySpec.js";
import { isRationalCalculatorValue } from "./calculatorValue.js";
import { isKeyUnlocked } from "./keyUnlocks.js";

import type { GameState, Key, LayoutCell, UnlockDefinition, UnlockPredicate } from "./types.js";
import { isBinaryOperatorKeyId, isUnaryOperatorId, KEY_ID } from "./keyPresentation.js";
import { evaluateUnlockPredicate } from "./unlockEngine.js";
import { getContentProvider } from "../contracts/contentRegistry.js";

export type NumberDomainAnalysisOptions = {
  capabilityScope?: CapabilityScope;
  useAllUnlockedKeys?: boolean;
};

export type UnlockSpecStatus = "satisfied" | "possible" | "blocked" | "unknown" | "todo";
export type CapabilityScope = "present_on_keypad" | "all_unlocked";

export type UnlockSpecAnalysisRow = {
  unlockId: string;
  predicateType: UnlockPredicate["type"];
  status: UnlockSpecStatus;
  predicateSatisfiedNow: boolean;
  missingNecessary: CapabilityId[];
  matchedSufficientSetIds: string[];
  detail: string;
};

export type NumberDomainReport = {
  naturalNumbers: boolean;
  integersNonNatural: boolean;
  generatedAtIso: string;
  reasoning: string[];
  unlockSpecAnalysis: UnlockSpecAnalysisRow[];
};

type CapabilityContext = {
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
  euclidDivisionOperator: boolean;
};

const formatPredicate = (name: string, value: boolean): string => `${name}=${value ? "true" : "false"}`;

const isKeyCell = (cell: LayoutCell): cell is { kind: "key"; key: Key } => cell.kind === "key";

const resolveCapabilityScope = (options: NumberDomainAnalysisOptions): CapabilityScope => {
  if (options.capabilityScope) {
    return options.capabilityScope;
  }
  return options.useAllUnlockedKeys ? "all_unlocked" : "present_on_keypad";
};

const createAvailabilityReader = (
  state: GameState,
  options: NumberDomainAnalysisOptions,
): { isAvailable: (key: Key) => boolean; scopeLabel: CapabilityScope } => {
  const capabilityScope = resolveCapabilityScope(options);
  const useAllUnlockedKeys = capabilityScope === "all_unlocked";
  const keypadKeys = new Set(state.ui.keyLayout.filter(isKeyCell).map((cell) => cell.key));
  return {
    isAvailable: (key: Key): boolean => isKeyUnlocked(state, key) && (useAllUnlockedKeys || keypadKeys.has(key)),
    scopeLabel: capabilityScope,
  };
};

const computeCapabilities = (state: GameState, isAvailable: (key: Key) => boolean): CapabilityContext => {
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
    euclidDivisionOperator,
  };
};

const resolveCapability = (
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

const isTodoSpec = (spec: PredicateCapabilitySpec | undefined): boolean =>
  Boolean(spec?.notes && spec.notes.startsWith("TODO:"));

const analyzeUnlockBySpec = (
  state: GameState,
  unlock: UnlockDefinition,
  caps: CapabilityContext,
  isAvailable: (key: Key) => boolean,
): UnlockSpecAnalysisRow => {
  const spec = getPredicateCapabilitySpec(unlock.predicate.type);
  const predicateSatisfiedNow = evaluateUnlockPredicate(unlock.predicate, state);

  if (!spec || isTodoSpec(spec)) {
    return {
      unlockId: unlock.id,
      predicateType: unlock.predicate.type,
      status: "todo",
      predicateSatisfiedNow,
      missingNecessary: [],
      matchedSufficientSetIds: [],
      detail: "Spec TODO: predicate type lacks concrete capability metadata.",
    };
  }

  const missingNecessary = spec.necessary
    .filter((required) => !resolveCapability(required.capability, unlock.predicate, caps, isAvailable))
    .map((required) => required.capability);

  const matchedSufficientSetIds = spec.sufficientSets
    .filter((set) => set.allOf.every((capability) => resolveCapability(capability, unlock.predicate, caps, isAvailable)))
    .map((set) => set.id);

  let status: UnlockSpecStatus = "unknown";
  let detail = "Necessary capabilities present but no sufficient set currently satisfied.";
  if (predicateSatisfiedNow) {
    status = "satisfied";
    detail = "Predicate already satisfied in current state.";
  } else if (missingNecessary.length > 0) {
    status = "blocked";
    detail = `Missing necessary capabilities: ${missingNecessary.join(", ")}`;
  } else if (matchedSufficientSetIds.length > 0) {
    status = "possible";
    detail = `Sufficient set(s) available: ${matchedSufficientSetIds.join(", ")}`;
  }

  return {
    unlockId: unlock.id,
    predicateType: unlock.predicate.type,
    status,
    predicateSatisfiedNow,
    missingNecessary,
    matchedSufficientSetIds,
    detail,
  };
};

export const analyzeUnlockSpecRows = (
  state: GameState,
  options: NumberDomainAnalysisOptions = {},
  catalog: UnlockDefinition[] = getContentProvider().unlockCatalog,
): UnlockSpecAnalysisRow[] => {
  const { isAvailable } = createAvailabilityReader(state, options);
  const caps = computeCapabilities(state, isAvailable);
  return catalog.map((unlock) => analyzeUnlockBySpec(state, unlock, caps, isAvailable));
};

export const analyzeNumberDomains = (
  state: GameState,
  now: Date = new Date(),
  options: NumberDomainAnalysisOptions = {},
): NumberDomainReport => {
  const { isAvailable, scopeLabel } = createAvailabilityReader(state, options);
  const caps = computeCapabilities(state, isAvailable);

  const rationalTotal = isRationalCalculatorValue(state.calculator.total) ? state.calculator.total.value : null;
  const currentIsInteger = rationalTotal !== null && rationalTotal.den === 1n;
  const currentValue = currentIsInteger && rationalTotal ? rationalTotal.num : null;
  const plusStep = caps.stepPlusOne;
  const minusStep = caps.stepMinusOne;
  const canResetToZero = caps.resetToZero;
  const hasDigitOne = isAvailable(KEY_ID.digit_1);
  const anchorIntegerExists = currentIsInteger || canResetToZero;

  const canReachOne =
    (currentIsInteger && currentValue === 1n) ||
    (currentIsInteger && currentValue === 0n && plusStep) ||
    (canResetToZero && plusStep) ||
    (canResetToZero && hasDigitOne) ||
    (anchorIntegerExists && plusStep && minusStep);

  const canReachZero =
    (currentIsInteger && currentValue === 0n) || canResetToZero || (anchorIntegerExists && plusStep && minusStep);

  const naturalNumbers = canReachOne && plusStep;
  const integersNonNatural = canReachZero && minusStep;

  const reasoning: string[] = [
    `scope=${scopeLabel}`,
    formatPredicate("executeActivation", caps.executeActivation),
    formatPredicate("stepPlusOne", caps.stepPlusOne),
    formatPredicate("stepMinusOne", caps.stepMinusOne),
    formatPredicate("resetToZero", caps.resetToZero),
    formatPredicate("currentIsInteger", currentIsInteger),
    formatPredicate("anchorIntegerExists", anchorIntegerExists),
    formatPredicate("canReachOne", canReachOne),
    formatPredicate("canReachZero", canReachZero),
  ];

  reasoning.push(naturalNumbers ? "naturalNumbers=true" : "naturalNumbers=false");
  reasoning.push(integersNonNatural ? "integersNonNatural=true" : "integersNonNatural=false");

  return {
    naturalNumbers,
    integersNonNatural,
    generatedAtIso: now.toISOString(),
    reasoning,
    unlockSpecAnalysis: analyzeUnlockSpecRows(state, options, getContentProvider().unlockCatalog),
  };
};


