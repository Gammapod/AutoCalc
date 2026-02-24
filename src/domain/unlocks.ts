import type { GameState, UnlockEffect, UnlockPredicate, UnlockDefinition } from "./types.js";

export const evaluatePredicate = (predicate: UnlockPredicate, state: GameState): boolean => {
  if (predicate.type === "roll_length_at_least") {
    return state.calculator.roll.length >= predicate.length;
  }
  return false;
};

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
  return state;
};

export const applyUnlocks = (state: GameState, catalog: UnlockDefinition[]): GameState => {
  let nextState = state;

  for (const unlock of catalog) {
    const isAlreadyCompleted = nextState.completedUnlockIds.includes(unlock.id);

    if (unlock.once && isAlreadyCompleted) {
      continue;
    }

    if (!evaluatePredicate(unlock.predicate, nextState)) {
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
