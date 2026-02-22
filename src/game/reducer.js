import { applyKeyPress } from "./calc.js";
import { createInitialState, UNLOCK_COST_DIGIT_2 } from "./state.js";

function canUseKey(state, key) {
  if (key === "2" && !state.unlocked.digit2) {
    return false;
  }
  return key === "1" || key === "2" || key === "+" || key === "=" || key === "C";
}

export function reduce(state, action) {
  if (action.type === "PRESS_KEY") {
    const key = action.key;
    if (!canUseKey(state, key)) {
      return state;
    }

    const next = applyKeyPress(state.calculator, key);
    return {
      ...state,
      calculator: next.calculator,
      totalEarned: next.equalsResult == null ? state.totalEarned : state.totalEarned + next.equalsResult
    };
  }

  if (action.type === "BUY_UNLOCK_2") {
    if (state.unlocked.digit2) {
      return state;
    }
    if (state.totalEarned < UNLOCK_COST_DIGIT_2) {
      return state;
    }
    return {
      ...state,
      totalEarned: state.totalEarned - UNLOCK_COST_DIGIT_2,
      unlocked: {
        ...state.unlocked,
        digit2: true
      }
    };
  }

  if (action.type === "DEBUG_UNLOCK_2") {
    return {
      ...state,
      unlocked: {
        ...state.unlocked,
        digit2: true
      }
    };
  }

  if (action.type === "RESET_STATE") {
    return createInitialState();
  }

  return state;
}
