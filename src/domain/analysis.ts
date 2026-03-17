import {
  getPredicateCapabilitySpec,
  type CapabilityId,
  type PredicateCapabilitySpec,
} from "./predicateCapabilitySpec.js";
import { isRationalCalculatorValue } from "./calculatorValue.js";

import type { GameState, Key, UnlockDefinition, UnlockPredicate } from "./types.js";
import { KEY_ID } from "./keyPresentation.js";
import { evaluateUnlockPredicate } from "./unlockEngine.js";
import { getContentProvider } from "../contracts/contentRegistry.js";
import {
  computeCapabilityContext,
  createAvailabilityReader as createCapabilityAvailabilityReader,
  resolveCapabilityFromContext,
  type CapabilityContext,
} from "./capabilitySemantics.js";

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

const formatPredicate = (name: string, value: boolean): string => `${name}=${value ? "true" : "false"}`;

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
  return {
    isAvailable: createCapabilityAvailabilityReader(state, capabilityScope),
    scopeLabel: capabilityScope,
  };
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
    .filter((required) => !resolveCapabilityFromContext(required.capability, unlock.predicate, caps, isAvailable))
    .map((required) => required.capability);

  const matchedSufficientSetIds = spec.sufficientSets
    .filter((set) => set.allOf.every((capability) => resolveCapabilityFromContext(capability, unlock.predicate, caps, isAvailable)))
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
  const caps = computeCapabilityContext(state, isAvailable);
  return catalog.map((unlock) => analyzeUnlockBySpec(state, unlock, caps, isAvailable));
};

export const analyzeNumberDomains = (
  state: GameState,
  now: Date = new Date(),
  options: NumberDomainAnalysisOptions = {},
): NumberDomainReport => {
  const { isAvailable, scopeLabel } = createAvailabilityReader(state, options);
  const caps = computeCapabilityContext(state, isAvailable);

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


