import {
  buttonRegistry,
  getButtonDefinition,
  type ButtonKey,
  type ButtonKeyByUnlockGroup,
} from "./buttonRegistry.js";
import type { GameState } from "./types.js";

const withValueExpressionMirror = (
  state: GameState,
  patch: Partial<GameState["unlocks"]["valueAtoms"]>,
): GameState => ({
  ...state,
  unlocks: {
    ...state.unlocks,
    valueAtoms: {
      ...state.unlocks.valueAtoms,
      ...Object.fromEntries(
        Object.entries(patch).filter(([key]) => Object.prototype.hasOwnProperty.call(state.unlocks.valueAtoms, key)),
      ),
    },
    valueCompose: state.unlocks.valueCompose,
    valueExpression: {
      ...state.unlocks.valueExpression,
      ...patch,
    },
  },
});

export const isButtonUnlocked = (state: GameState, key: ButtonKey): boolean => {
  const definition = getButtonDefinition(key);
  if (!definition) {
    return false;
  }
  if (definition.unlockGroup === "valueAtoms") {
    const typedKey = key as ButtonKeyByUnlockGroup<"valueAtoms">;
    return Boolean(state.unlocks.valueAtoms[typedKey] || state.unlocks.valueExpression[typedKey]);
  }
  if (definition.unlockGroup === "slotOperators") {
    return state.unlocks.slotOperators[key as ButtonKeyByUnlockGroup<"slotOperators">];
  }
  if (definition.unlockGroup === "unaryOperators") {
    return state.unlocks.unaryOperators[key as ButtonKeyByUnlockGroup<"unaryOperators">];
  }
  if (definition.unlockGroup === "utilities") {
    return state.unlocks.utilities[key as ButtonKeyByUnlockGroup<"utilities">];
  }
  if (definition.unlockGroup === "memory") {
    return state.unlocks.memory[key as ButtonKeyByUnlockGroup<"memory">];
  }
  if (definition.unlockGroup === "steps") {
    return state.unlocks.steps[key as ButtonKeyByUnlockGroup<"steps">];
  }
  if (definition.unlockGroup === "visualizers") {
    return state.unlocks.visualizers[key as ButtonKeyByUnlockGroup<"visualizers">];
  }
  return state.unlocks.execution[key as ButtonKeyByUnlockGroup<"execution">];
};

export const setButtonUnlocked = (state: GameState, key: ButtonKey, unlocked: boolean): GameState => {
  const definition = getButtonDefinition(key);
  if (!definition) {
    return state;
  }
  if (definition.unlockGroup === "valueAtoms") {
    const typedKey = key as ButtonKeyByUnlockGroup<"valueAtoms">;
    if (state.unlocks.valueAtoms[typedKey] === unlocked) {
      return state;
    }
    return withValueExpressionMirror(state, { [typedKey]: unlocked });
  }
  if (definition.unlockGroup === "slotOperators") {
    const typedKey = key as ButtonKeyByUnlockGroup<"slotOperators">;
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
  if (definition.unlockGroup === "unaryOperators") {
    const typedKey = key as ButtonKeyByUnlockGroup<"unaryOperators">;
    if (state.unlocks.unaryOperators[typedKey] === unlocked) {
      return state;
    }
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        unaryOperators: {
          ...state.unlocks.unaryOperators,
          [typedKey]: unlocked,
        },
      },
    };
  }
  if (definition.unlockGroup === "utilities") {
    const typedKey = key as ButtonKeyByUnlockGroup<"utilities">;
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
  if (definition.unlockGroup === "memory") {
    const typedKey = key as ButtonKeyByUnlockGroup<"memory">;
    if (state.unlocks.memory[typedKey] === unlocked) {
      return state;
    }
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        memory: {
          ...state.unlocks.memory,
          [typedKey]: unlocked,
        },
      },
    };
  }
  if (definition.unlockGroup === "steps") {
    const typedKey = key as ButtonKeyByUnlockGroup<"steps">;
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
  if (definition.unlockGroup === "visualizers") {
    const typedKey = key as ButtonKeyByUnlockGroup<"visualizers">;
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
  const typedKey = key as ButtonKeyByUnlockGroup<"execution">;
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
