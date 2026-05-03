import type { Action, CalculatorId, GameState, Key, ScalarValue, UnlockDefinition, UnlockEffect } from "./types.js";
import { eventFromAction, type DomainEvent } from "./events.js";
import { applyEvent } from "./transition.js";
import { getAppServices, type AppServices } from "../contracts/appServices.js";
import { resolveExecutionPolicyForAction } from "./reducer.js";
import type { UiEffect } from "./types.js";
import { resolveSystemKeyIntent, mapSystemKeyIntentToUiEffect } from "./systemKeyIntentRegistry.js";
import { isKeyUsableForInput } from "./keyUnlocks.js";
import { resolveDomainDispatchInputFeedback, resolveFeedbackTargetCalculatorId } from "./inputFeedback.js";
import { calculatorValueToDisplayString } from "./calculatorValue.js";
import { KEY_ID, getButtonFace, isBinaryOperatorKeyId, isConstantKeyId, isDigitKeyId, isUnaryOperatorId } from "./keyPresentation.js";
import { projectCalculatorToLegacy } from "./multiCalculator.js";
import { EXECUTION_PAUSE_EQUALS_FLAG } from "./state.js";
import { resolveWrapStageMode } from "./executionPlan.js";
import { algebraicToApproxNumber } from "./algebraicScalar.js";
import { expressionToRational } from "./expression.js";

export type DomainCommand = {
  type: "DispatchAction";
  action: Action;
};

export type ExecuteCommandResult = {
  state: GameState;
  events: DomainEvent[];
  uiEffects: UiEffect[];
};

type ExecuteCommandOptions = {
  services?: AppServices;
};

const stableSignature = (value: unknown): string =>
  JSON.stringify(value, (_key, entry) => (typeof entry === "bigint" ? { __bigint: entry.toString() } : entry));

const resolveTargetCalculatorState = (state: GameState, calculatorId: ReturnType<typeof resolveFeedbackTargetCalculatorId>) =>
  state.calculators?.[calculatorId]
    ? projectCalculatorToLegacy(state, calculatorId)
    : state;

const isBuilderFeedbackEligiblePress = (action: Action): boolean => {
  if (action.type !== "PRESS_KEY") {
    return false;
  }
  const { key } = action;
  return isDigitKeyId(key)
    || isConstantKeyId(key)
    || isBinaryOperatorKeyId(key)
    || isUnaryOperatorId(key)
    || key === KEY_ID.util_clear_all
    || key === KEY_ID.util_backspace;
};

const hasBuilderChanged = (previous: GameState, next: GameState): boolean =>
  stableSignature({
    operationSlots: previous.calculator.operationSlots,
    draftingSlot: previous.calculator.draftingSlot,
  }) !== stableSignature({
    operationSlots: next.calculator.operationSlots,
    draftingSlot: next.calculator.draftingSlot,
  });

const isSeedEntryContext = (state: GameState): boolean =>
  state.calculator.rollEntries.length <= 1
  && state.calculator.operationSlots.length === 0
  && state.calculator.draftingSlot === null;

const isSeedSetOrBackspaceAction = (action: Action): boolean =>
  action.type === "PRESS_KEY"
  && (
    isDigitKeyId(action.key)
    || isConstantKeyId(action.key)
    || action.key === KEY_ID.util_backspace
  );

const hasSeedValueChanged = (previous: GameState, next: GameState): boolean =>
  stableSignature({
    total: previous.calculator.total,
    pendingNegativeTotal: previous.calculator.pendingNegativeTotal,
    singleDigitInitialTotalEntry: previous.calculator.singleDigitInitialTotalEntry,
  }) !== stableSignature({
    total: next.calculator.total,
    pendingNegativeTotal: next.calculator.pendingNegativeTotal,
    singleDigitInitialTotalEntry: next.calculator.singleDigitInitialTotalEntry,
  });

const hasMonitoredSettingsChanged = (previous: GameState, next: GameState): boolean =>
  previous.lambdaControl.alpha !== next.lambdaControl.alpha
  || previous.lambdaControl.beta !== next.lambdaControl.beta
  || previous.lambdaControl.gamma !== next.lambdaControl.gamma
  || previous.lambdaControl.delta !== next.lambdaControl.delta
  || previous.lambdaControl.delta_q !== next.lambdaControl.delta_q
  || previous.lambdaControl.epsilon !== next.lambdaControl.epsilon
  || previous.settings.visualizer !== next.settings.visualizer
  || previous.settings.base !== next.settings.base
  || resolveWrapStageMode(previous) !== resolveWrapStageMode(next)
  || previous.settings.stepExpansion !== next.settings.stepExpansion
  || previous.settings.history !== next.settings.history
  || previous.settings.forecast !== next.settings.forecast
  || previous.settings.cycle !== next.settings.cycle;

const hasRollUpdated = (previous: GameState, next: GameState): boolean =>
  stableSignature(previous.calculator.rollEntries) !== stableSignature(next.calculator.rollEntries);

const isSubstepFeedbackAction = (action: Action): boolean =>
  action.type === "AUTO_STEP_TICK"
  || (action.type === "PRESS_KEY" && action.key === KEY_ID.exec_step_through);

const BASE_WHITE_FEEDBACK_TONE_HZ = 440;
const MIN_FEEDBACK_TONE_HZ = 20;
const MAX_FEEDBACK_TONE_HZ = 20000;

const rationalToApprox = (num: bigint, den: bigint): number | null => {
  if (den === 0n) {
    return null;
  }
  const value = Number(num) / Number(den);
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
};

const scalarToApprox = (value: ScalarValue): number | null => {
  if (value.kind === "rational") {
    return rationalToApprox(value.value.num, value.value.den);
  }
  if (value.kind === "alg") {
    const approximated = algebraicToApproxNumber(value.value);
    return Number.isFinite(approximated) ? approximated : null;
  }
  const rational = expressionToRational(value.value);
  if (!rational) {
    return null;
  }
  return rationalToApprox(rational.num, rational.den);
};

const resolveCalculatorValueMagnitudeApprox = (value: GameState["calculator"]["total"]): number | null => {
  if (value.kind === "rational") {
    const approximated = rationalToApprox(value.value.num, value.value.den);
    return approximated === null ? null : Math.abs(approximated);
  }
  if (value.kind === "complex") {
    const re = scalarToApprox(value.value.re);
    const im = scalarToApprox(value.value.im);
    if (re === null || im === null) {
      return null;
    }
    const magnitude = Math.hypot(re, im);
    return Number.isFinite(magnitude) ? magnitude : null;
  }
  return null;
};

const resolveSubstepToneFrequencyHz = (
  value: GameState["calculator"]["total"],
  state: GameState,
): number | undefined => {
  if (resolveWrapStageMode(state) !== "binary_octave_cycle") {
    return undefined;
  }
  const magnitude = resolveCalculatorValueMagnitudeApprox(value);
  if (magnitude === null || !Number.isFinite(magnitude)) {
    return undefined;
  }
  const proportionalHz = BASE_WHITE_FEEDBACK_TONE_HZ * magnitude;
  if (!(proportionalHz > 0) || !Number.isFinite(proportionalHz)) {
    return undefined;
  }
  return Math.max(MIN_FEEDBACK_TONE_HZ, Math.min(MAX_FEEDBACK_TONE_HZ, proportionalHz));
};

const resolveSubstepExecutedResults = (previous: GameState, next: GameState, action: Action): GameState["calculator"]["total"][] => {
  if (!isSubstepFeedbackAction(action)) {
    return [];
  }
  const previousExecuted = previous.calculator.stepProgress.executedSlotResults.length;
  const nextExecuted = next.calculator.stepProgress.executedSlotResults.length;
  if (nextExecuted > previousExecuted) {
    return next.calculator.stepProgress.executedSlotResults.slice(previousExecuted, nextExecuted);
  }
  const rollDelta = next.calculator.rollEntries.length - previous.calculator.rollEntries.length;
  if (rollDelta <= 0 || previous.calculator.operationSlots.length <= 0) {
    return [];
  }
  const isLikelyAutoStepEqualsFallback =
    action.type === "AUTO_STEP_TICK"
    && !previous.calculator.stepProgress.active
    && !next.calculator.stepProgress.active
    && Boolean(previous.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]);
  if (isLikelyAutoStepEqualsFallback) {
    return [];
  }
  return [next.calculator.total];
};

const resolveDispatchUiEffects = (
  previousState: GameState,
  nextState: GameState,
  action: Action,
  services: AppServices | undefined,
): UiEffect[] => {
  const uiEffects: UiEffect[] = [];
  const policy = resolveExecutionPolicyForAction(previousState, action);
  if (policy.decision.decision === "reject") {
    uiEffects.push({ type: "execution_gate_rejected", calculatorId: policy.calculatorId });
  }
  if (action.type === "PRESS_KEY" && isKeyUsableForInput(previousState, action.key)) {
    const intent = resolveSystemKeyIntent(action.key);
    if (intent) {
      uiEffects.push(mapSystemKeyIntentToUiEffect(intent));
    }
  }

  const targetCalculatorId = resolveFeedbackTargetCalculatorId(previousState, action);
  const previousTarget = resolveTargetCalculatorState(previousState, targetCalculatorId);
  const nextTarget = resolveTargetCalculatorState(nextState, targetCalculatorId);
  const builderChanged =
    isBuilderFeedbackEligiblePress(action)
    && (
      hasBuilderChanged(previousTarget, nextTarget)
      || (
        isSeedSetOrBackspaceAction(action)
        && isSeedEntryContext(previousTarget)
        && hasSeedValueChanged(previousTarget, nextTarget)
      )
    );
  if (builderChanged) {
    uiEffects.push({ type: "builder_changed", calculatorId: targetCalculatorId });
  }
  if (hasMonitoredSettingsChanged(previousTarget, nextTarget)) {
    uiEffects.push({ type: "settings_changed", calculatorId: targetCalculatorId });
  }
  if (hasRollUpdated(previousTarget, nextTarget)) {
    uiEffects.push({ type: "roll_updated", calculatorId: targetCalculatorId });
  }
  const substepExecutedResults = resolveSubstepExecutedResults(previousTarget, nextTarget, action);
  for (const substepResult of substepExecutedResults) {
    const toneFrequencyHz = resolveSubstepToneFrequencyHz(substepResult, nextTarget);
    uiEffects.push({
      type: "substep_executed",
      calculatorId: targetCalculatorId,
      ...(typeof toneFrequencyHz === "number" ? { toneFrequencyHz } : {}),
    });
  }
  if (shouldEmitUnlockCompletedEffects(action)) {
    uiEffects.push(...resolveUnlockCompletedEffects(previousState, nextState, services));
  }
  if (action.type !== "AUTO_STEP_TICK") {
    const inputFeedback = resolveDomainDispatchInputFeedback(previousState, nextState, action, uiEffects);
    uiEffects.push(withDigitReplacementFeedback(previousTarget, nextTarget, action, inputFeedback));
  }
  return uiEffects;
};

const shouldEmitUnlockCompletedEffects = (action: Action): boolean =>
  action.type !== "HYDRATE_SAVE"
  && action.type !== "RESET_RUN"
  && action.type !== "UNLOCK_ALL";

const resolveUnlockCompletedEffects = (
  previous: GameState,
  next: GameState,
  services: AppServices | undefined,
): UiEffect[] => {
  const previousCompleted = new Set(previous.completedUnlockIds);
  const completedIds = next.completedUnlockIds.filter((id) => !previousCompleted.has(id));
  if (completedIds.length === 0) {
    return [];
  }
  const catalog = services?.contentProvider.unlockCatalog ?? getAppServices().contentProvider.unlockCatalog;
  const unlockById = new Map(catalog.map((unlock) => [unlock.id, unlock]));
  return completedIds.flatMap((unlockId) => {
    const unlock = unlockById.get(unlockId);
    return unlock ? [toUnlockCompletedEffect(unlock)] : [];
  });
};

const toUnlockCompletedEffect = (unlock: UnlockDefinition): Extract<UiEffect, { type: "unlock_completed" }> => {
  const affected = resolveUnlockEffectAffectedTarget(unlock.effect);
  return {
    type: "unlock_completed",
    unlockId: unlock.id,
    description: unlock.description,
    effectType: unlock.effect.type,
    targetLabel: unlock.targetLabel ?? affected.targetLabel,
    ...(affected.key ? { key: affected.key } : {}),
    ...(affected.calculatorId ? { calculatorId: affected.calculatorId } : {}),
  };
};

const resolveUnlockEffectAffectedTarget = (
  effect: UnlockEffect,
): { targetLabel: string; key?: Key; calculatorId?: CalculatorId } => {
  if (
    effect.type === "unlock_digit"
    || effect.type === "unlock_slot_operator"
    || effect.type === "unlock_execution"
    || effect.type === "unlock_visualizer"
    || effect.type === "unlock_utility"
    || effect.type === "unlock_memory"
    || effect.type === "unlock_installed_only"
    || effect.type === "move_key_to_coord"
  ) {
    return { targetLabel: getButtonFace(effect.key), key: effect.key };
  }
  if (effect.type === "unlock_calculator" || effect.type === "increase_allocator_max_points_for_calculator") {
    return { targetLabel: effect.calculatorId, calculatorId: effect.calculatorId };
  }
  return { targetLabel: effect.type };
};

const withDigitReplacementFeedback = (
  previous: GameState,
  next: GameState,
  action: Action,
  inputFeedback: Extract<UiEffect, { type: "input_feedback" }>,
): Extract<UiEffect, { type: "input_feedback" }> => {
  if (inputFeedback.outcome !== "accepted" || action.type !== "PRESS_KEY" || !isDigitKeyId(action.key)) {
    return inputFeedback;
  }
  const replacement = resolveDigitReplacement(previous, next);
  return replacement ? { ...inputFeedback, replacement } : inputFeedback;
};

const resolveDigitReplacement = (
  previous: GameState,
  next: GameState,
): Extract<UiEffect, { type: "input_feedback" }>["replacement"] | undefined => {
  if (previous.calculator.draftingSlot && next.calculator.draftingSlot) {
    const before = previous.calculator.draftingSlot.operandInput;
    const after = next.calculator.draftingSlot.operandInput;
    if (before.length >= 1 && after !== before) {
      return { target: "operand", previous: before, next: after, limit: 1 };
    }
    return undefined;
  }
  if (
    isSeedEntryContext(previous)
    && hasSeedValueChanged(previous, next)
  ) {
    const previousDisplay = calculatorValueToDisplayString(previous.calculator.total);
    if (previous.calculator.singleDigitInitialTotalEntry && previousDisplay === "0") {
      return undefined;
    }
    return {
      target: "seed",
      previous: previousDisplay,
      next: calculatorValueToDisplayString(next.calculator.total),
      limit: 1,
    };
  }
  return undefined;
};

export const executeCommand = (
  state: GameState | undefined,
  command: DomainCommand,
  options: ExecuteCommandOptions = {},
): ExecuteCommandResult => {
  const currentState = state;
  const uiEffects: UiEffect[] = [];
  const event = eventFromAction(command.action);
  const nextState = applyEvent(state, event, { services: options.services });
  if (currentState && command.type === "DispatchAction") {
    uiEffects.push(...resolveDispatchUiEffects(currentState, nextState, command.action, options.services));
  }
  return { state: nextState, events: [event], uiEffects };
};
