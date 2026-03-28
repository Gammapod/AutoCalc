import {
  classifyExecutionPolicyAction,
  type ExecutionPolicyResult,
} from "./executionModePolicy.js";
import { KEY_ID, isBinaryOperatorKeyId, isUnaryOperatorId } from "./keyPresentation.js";
import {
  isMultiCalculatorSession,
  projectCalculatorToLegacy,
  resolveActiveCalculatorId,
} from "./multiCalculator.js";
import { EXECUTION_PAUSE_EQUALS_FLAG } from "./state.js";
import type {
  Action,
  CalculatorId,
  GameState,
  Key,
  SlotOperator,
  UiDiagnosticsLastActionKind,
  VisualizerId,
} from "./types.js";

export type ResolvedExecutionPolicy = {
  decision: ExecutionPolicyResult;
  calculatorId: CalculatorId;
};

const isSystemKey = (key: Key): boolean => key.startsWith("system_");
const isExecutionKey = (key: Key): boolean => key.startsWith("exec_");

export const resolveActionKind = (action: Action): UiDiagnosticsLastActionKind => {
  if (action.type === "PRESS_KEY") {
    if (isSystemKey(action.key)) {
      return "system_action";
    }
    if (isExecutionKey(action.key)) {
      return "execution_action";
    }
    return "press_key";
  }
  if (action.type === "TOGGLE_VISUALIZER") {
    return "toggle_visualizer";
  }
  if (action.type === "TOGGLE_FLAG") {
    return "toggle_flag";
  }
  if (action.type === "AUTO_STEP_TICK") {
    return "execution_action";
  }
  return "system_action";
};

export const resolveOperatorFromAction = (action: Action): SlotOperator | undefined => {
  if (action.type !== "PRESS_KEY") {
    return undefined;
  }
  if (isBinaryOperatorKeyId(action.key) || isUnaryOperatorId(action.key)) {
    return action.key;
  }
  return undefined;
};

export const resolveKeyFromAction = (
  action: Action,
  visualizerKeyById: ReadonlyMap<VisualizerId, Key>,
): Key | undefined => {
  if (action.type === "PRESS_KEY") {
    return action.key;
  }
  if (action.type === "TOGGLE_VISUALIZER") {
    return visualizerKeyById.get(action.visualizer);
  }
  return undefined;
};

export const normalizeLegacyEqualsPress = (action: Action): Action => {
  if (action.type !== "PRESS_KEY" || action.key !== KEY_ID.exec_equals) {
    return action;
  }
  return {
    type: "TOGGLE_FLAG",
    flag: EXECUTION_PAUSE_EQUALS_FLAG,
    ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}),
  };
};

export const resolveActionCalculatorId = (state: GameState, action: Action): CalculatorId | null => {
  if ("calculatorId" in action && action.calculatorId) {
    return action.calculatorId;
  }
  if (
    action.type === "PRESS_KEY"
    || action.type === "SET_KEYPAD_DIMENSIONS"
    || action.type === "UPGRADE_KEYPAD_ROW"
    || action.type === "UPGRADE_KEYPAD_COLUMN"
    || action.type === "TOGGLE_FLAG"
    || action.type === "TOGGLE_VISUALIZER"
    || action.type === "ALLOCATOR_ADJUST"
    || action.type === "ALLOCATOR_SET_MAX_POINTS"
    || action.type === "ALLOCATOR_ADD_MAX_POINTS"
    || action.type === "RESET_ALLOCATOR_DEVICE"
    || action.type === "ALLOCATOR_RETURN_PRESSED"
    || action.type === "ALLOCATOR_ALLOCATE_PRESSED"
    || action.type === "LAMBDA_SET_CONTROL"
    || action.type === "AUTO_STEP_TICK"
  ) {
    return resolveActiveCalculatorId(state);
  }
  return null;
};

export const resolveExecutionPolicyForAction = (state: GameState, action: Action): ResolvedExecutionPolicy => {
  const normalizedAction = normalizeLegacyEqualsPress(action);
  const targetCalculatorId = resolveActionCalculatorId(state, normalizedAction);
  const calculatorId = targetCalculatorId ?? resolveActiveCalculatorId(state);
  if (isMultiCalculatorSession(state) && targetCalculatorId) {
    const projected = projectCalculatorToLegacy(state, targetCalculatorId);
    return {
      decision: classifyExecutionPolicyAction(projected, normalizedAction),
      calculatorId,
    };
  }
  return {
    decision: classifyExecutionPolicyAction(state, normalizedAction),
    calculatorId,
  };
};
