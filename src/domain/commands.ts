import type { Action, GameState, ScalarValue } from "./types.js";
import { eventFromAction, type DomainEvent } from "./events.js";
import { applyEvent } from "./transition.js";
import type { AppServices } from "../contracts/appServices.js";
import { resolveExecutionPolicyForAction } from "./reducer.js";
import type { UiEffect } from "./types.js";
import { resolveSystemKeyIntent, mapSystemKeyIntentToUiEffect } from "./systemKeyIntentRegistry.js";
import { isKeyUsableForInput } from "./keyUnlocks.js";
import { resolveDomainDispatchInputFeedback, resolveFeedbackTargetCalculatorId } from "./inputFeedback.js";
import { KEY_ID, isBinaryOperatorKeyId, isConstantKeyId, isDigitKeyId, isUnaryOperatorId } from "./keyPresentation.js";
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
  if (action.type !== "AUTO_STEP_TICK") {
    uiEffects.push(resolveDomainDispatchInputFeedback(previousState, nextState, action, uiEffects));
  }
  return uiEffects;
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
    uiEffects.push(...resolveDispatchUiEffects(currentState, nextState, command.action));
  }
  return { state: nextState, events: [event], uiEffects };
};
