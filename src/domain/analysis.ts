import { unlockCatalog } from "../content/unlocks.catalog.js";
import {
  getPredicateCapabilitySpec,
  type CapabilityId,
  type PredicateCapabilitySpec,
} from "./predicateCapabilitySpec.js";
import { isRationalCalculatorValue } from "./calculatorValue.js";
import { isKeyUnlocked } from "./keyUnlocks.js";
import type { GameState, Key, LayoutCell, UnlockDefinition, UnlockPredicate } from "./types.js";
import { evaluateUnlockPredicate } from "./unlockEngine.js";

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
  allocatorReturnPress: boolean;
  allocatorAllocatePress: boolean;
  formOperatorPlusOperand: boolean;
  rollGrowth: boolean;
  rollEqualRun: boolean;
  rollIncrementingRun: boolean;
  rollAlternatingSignConstantAbs: boolean;
  rollConstantStepRun: boolean;
  divisionByZeroError: boolean;
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
  const hasEqualsKey = isAvailable("=");
  const hasIncrementKey = isAvailable("++");
  const hasDecrementKey = isAvailable("--");
  const hasPauseKey = isAvailable("\u23EF");
  const hasAnyExecutorUnlocked = isKeyUnlocked(state, "=") || isKeyUnlocked(state, "++") || isKeyUnlocked(state, "--");
  const executeActivation = hasEqualsKey || hasIncrementKey || hasDecrementKey || (hasPauseKey && hasAnyExecutorUnlocked);
  const hasPlus = isAvailable("+");
  const hasMinus = isAvailable("-");
  const hasNeg = isAvailable("NEG");
  const hasZero = isAvailable("0");
  const hasOne = isAvailable("1");
  const hasSomeDigit = Object.keys(state.unlocks.valueExpression).some((key) => isAvailable(key as Key));
  const hasSomeOperator = ["+", "-", "*", "/", "#", "\u27E1"].some((key) => isAvailable(key as Key));
  const allocatorReturnPress = (state.allocatorReturnPressCount ?? 0) >= 1;
  const allocatorAllocatePress = (state.allocatorAllocatePressCount ?? 0) >= 1;

  const stepPlusOne = isAvailable("++") || (executeActivation && hasPlus && hasOne);
  const stepMinusOne = hasDecrementKey || (executeActivation && hasMinus && hasOne) || (executeActivation && hasPlus && hasNeg && hasOne);
  const resetToZero = isAvailable("C") || isAvailable("UNDO");
  const formOperatorPlusOperand = hasSomeOperator && hasSomeDigit;
  const rollGrowth = executeActivation && (formOperatorPlusOperand || stepPlusOne || stepMinusOne);
  const rollEqualRun =
    executeActivation &&
    (hasIncrementKey || (hasPlus && hasZero) || (hasMinus && hasZero) || (isAvailable("*") && hasOne) || (isAvailable("/") && hasOne));
  const rollIncrementingRun = stepPlusOne;
  const rollAlternatingSignConstantAbs = executeActivation && hasPlus && hasNeg && hasSomeDigit;
  const rollConstantStepRun = executeActivation && formOperatorPlusOperand;
  const divisionByZeroError = executeActivation && isAvailable("/") && hasZero;

  return {
    executeActivation,
    stepPlusOne,
    stepMinusOne,
    resetToZero,
    allocatorReturnPress,
    allocatorAllocatePress,
    formOperatorPlusOperand,
    rollGrowth,
    rollEqualRun,
    rollIncrementingRun,
    rollAlternatingSignConstantAbs,
    rollConstantStepRun,
    divisionByZeroError,
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
  catalog: UnlockDefinition[] = unlockCatalog,
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
  const hasDigitOne = isAvailable("1");
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
    unlockSpecAnalysis: analyzeUnlockSpecRows(state, options, unlockCatalog),
  };
};
