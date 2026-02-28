import type { GameState, UnlockDefinition, UnlockEffect, UnlockPredicate } from "./types.js";
import { evaluateUnlockPredicate } from "./unlockEngine.js";

export const evaluatePredicate = (predicate: UnlockPredicate, state: GameState): boolean =>
  evaluateUnlockPredicate(predicate, state);

export const applyEffect = (effect: UnlockEffect, state: GameState): GameState => {
  if (effect.type === "unlock_utility") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        utilities: {
          ...state.unlocks.utilities,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "increase_max_total_digits") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        maxTotalDigits: state.unlocks.maxTotalDigits + effect.amount,
      },
    };
  }
  if (effect.type === "unlock_slot_operator") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        slotOperators: {
          ...state.unlocks.slotOperators,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "unlock_execution") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        execution: {
          ...state.unlocks.execution,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "unlock_digit") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        valueExpression: {
          ...state.unlocks.valueExpression,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "unlock_second_slot") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        maxSlots: Math.max(state.unlocks.maxSlots, 2),
      },
    };
  }
  return state;
};

export const applyUnlocks = (state: GameState, catalog: UnlockDefinition[]): GameState => {
  let nextState = state;

  for (const unlock of catalog) {
    const isAlreadyCompleted = nextState.completedUnlockIds.includes(unlock.id);

    if (unlock.once && isAlreadyCompleted) {
      continue;
    }

    if (!evaluateUnlockPredicate(unlock.predicate, nextState)) {
      continue;
    }

    nextState = applyEffect(unlock.effect, nextState);
    if (!isAlreadyCompleted) {
      nextState = {
        ...nextState,
        completedUnlockIds: [...nextState.completedUnlockIds, unlock.id],
      };
    }
  }

  return nextState;
};
