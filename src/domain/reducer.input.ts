import { resolveKeyActionHandlerId, type KeyActionHandlerId } from "./keyActionHandlers.js";
import { isValueAtomDigit } from "./reducer.input.core.js";
import { handleEqualsInput, handleStepThroughInput } from "./reducer.input.handlers.execution.js";
import { handleMemoryInput } from "./reducer.input.handlers.memory.js";
import { handleOperatorInput, handleUnaryOperatorInput } from "./reducer.input.handlers.operator.js";
import { handleClearAllInput, handleBackspaceInput, handleUndoInput } from "./reducer.input.handlers.utility.js";
import { handleValueInput } from "./reducer.input.handlers.value.js";
import { prepareKeyActionContext } from "./reducer.input.shared.js";
import type { GameState, Key, KeyInput } from "./types.js";

export const applyKeyAction = (state: GameState, keyLike: KeyInput): GameState => {
  const context = prepareKeyActionContext(state, keyLike);

  // Input precedence:
  // 1) active-roll digit keys are hard no-op
  // 2) active-roll operator keys clear current operation entry before handling
  // 3) normal key dispatch
  if (context.stepAwareState.calculator.rollEntries.length > 0 && isValueAtomDigit(context.key)) {
    return context.stepAwareState;
  }

  if (!context.isUnlocked) {
    return context.keyed;
  }

  const handlers: Record<KeyActionHandlerId, (nextState: GameState, currentKey: Key) => GameState> = {
    apply_digit: (nextState, currentKey) => handleValueInput(nextState, currentKey),
    apply_operator: (nextState, currentKey) => handleOperatorInput(nextState, currentKey),
    apply_unary_operator: (nextState, currentKey) => handleUnaryOperatorInput(nextState, currentKey),
    apply_execute: (nextState) => nextState,
    apply_utility: (nextState) => nextState,
    apply_visualizer_noop: (nextState) => nextState,
    apply_toggle_noop: (nextState) => nextState,
    apply_noop: (nextState) => nextState,
    apply_memory: (nextState, currentKey) => handleMemoryInput(nextState, currentKey),
    apply_clear_all: (nextState) => handleClearAllInput(nextState),
    apply_backspace: (nextState) => handleBackspaceInput(nextState),
    apply_undo: (nextState) => handleUndoInput(nextState),
    apply_equals: (nextState) => handleEqualsInput(nextState),
    apply_step_through: (nextState) => handleStepThroughInput(nextState),
  };

  const handlerId = resolveKeyActionHandlerId(context.key);
  return handlers[handlerId](context.keyed, context.key);
};
