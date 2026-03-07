import {
  buttonRegistry,
  getButtonDefinition,
  type ButtonKey,
  type ButtonKeyByUnlockBucket,
} from "./buttonRegistry.js";
import type { GameState } from "./types.js";

export const isButtonUnlocked = (state: GameState, key: ButtonKey): boolean => {
  const definition = getButtonDefinition(key);
  if (!definition) {
    return false;
  }
  if (definition.unlockBucket === "valueExpression") {
    return state.unlocks.valueExpression[key as ButtonKeyByUnlockBucket<"valueExpression">];
  }
  if (definition.unlockBucket === "slotOperators") {
    return state.unlocks.slotOperators[key as ButtonKeyByUnlockBucket<"slotOperators">];
  }
  if (definition.unlockBucket === "utilities") {
    return state.unlocks.utilities[key as ButtonKeyByUnlockBucket<"utilities">];
  }
  if (definition.unlockBucket === "steps") {
    return state.unlocks.steps[key as ButtonKeyByUnlockBucket<"steps">];
  }
  if (definition.unlockBucket === "visualizers") {
    return state.unlocks.visualizers[key as ButtonKeyByUnlockBucket<"visualizers">];
  }
  return state.unlocks.execution[key as ButtonKeyByUnlockBucket<"execution">];
};

export const setButtonUnlocked = (state: GameState, key: ButtonKey, unlocked: boolean): GameState => {
  const definition = getButtonDefinition(key);
  if (!definition) {
    return state;
  }
  if (definition.unlockBucket === "valueExpression") {
    const typedKey = key as ButtonKeyByUnlockBucket<"valueExpression">;
    if (state.unlocks.valueExpression[typedKey] === unlocked) {
      return state;
    }
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        valueExpression: {
          ...state.unlocks.valueExpression,
          [typedKey]: unlocked,
        },
      },
    };
  }
  if (definition.unlockBucket === "slotOperators") {
    const typedKey = key as ButtonKeyByUnlockBucket<"slotOperators">;
    if (state.unlocks.slotOperators[typedKey] === unlocked) {
      return state;
    }
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        slotOperators: {
          ...state.unlocks.slotOperators,
          [typedKey]: unlocked,
        },
      },
    };
  }
  if (definition.unlockBucket === "utilities") {
    const typedKey = key as ButtonKeyByUnlockBucket<"utilities">;
    if (state.unlocks.utilities[typedKey] === unlocked) {
      return state;
    }
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        utilities: {
          ...state.unlocks.utilities,
          [typedKey]: unlocked,
        },
      },
    };
  }
  if (definition.unlockBucket === "steps") {
    const typedKey = key as ButtonKeyByUnlockBucket<"steps">;
    if (state.unlocks.steps[typedKey] === unlocked) {
      return state;
    }
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        steps: {
          ...state.unlocks.steps,
          [typedKey]: unlocked,
        },
      },
    };
  }
  if (definition.unlockBucket === "visualizers") {
    const typedKey = key as ButtonKeyByUnlockBucket<"visualizers">;
    if (state.unlocks.visualizers[typedKey] === unlocked) {
      return state;
    }
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        visualizers: {
          ...state.unlocks.visualizers,
          [typedKey]: unlocked,
        },
      },
    };
  }
  const typedKey = key as ButtonKeyByUnlockBucket<"execution">;
  if (state.unlocks.execution[typedKey] === unlocked) {
    return state;
  }
  return {
    ...state,
    unlocks: {
      ...state.unlocks,
      execution: {
        ...state.unlocks.execution,
        [typedKey]: unlocked,
      },
    },
  };
};

export const iterUnlockedButtons = (state: GameState): ButtonKey[] =>
  buttonRegistry
    .filter((entry) => isButtonUnlocked(state, entry.key))
    .map((entry) => entry.key);
