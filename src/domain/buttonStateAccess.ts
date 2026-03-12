import {
  buttonRegistry,
  getButtonDefinition,
  type ButtonKey,
} from "./buttonRegistry.js";
import { resolveKeyId, toKeyId, toLegacyKey, type KeyLike } from "./keyPresentation.js";
import type { GameState, Key } from "./types.js";

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

export const isButtonUnlocked = (state: GameState, key: KeyLike): boolean => {
  const keyId = resolveKeyId(key);
  const definition = getButtonDefinition(toLegacyKey(keyId));
  if (!definition) {
    return false;
  }
  if (definition.unlockGroup === "valueAtoms") {
    const typedKey = keyId as keyof GameState["unlocks"]["valueAtoms"];
    return Boolean(state.unlocks.valueAtoms[typedKey] || state.unlocks.valueExpression[typedKey]);
  }
  if (definition.unlockGroup === "slotOperators") {
    const typedKey = keyId as keyof GameState["unlocks"]["slotOperators"];
    return Boolean(state.unlocks.slotOperators[typedKey]);
  }
  if (definition.unlockGroup === "unaryOperators") {
    const typedKey = keyId as keyof GameState["unlocks"]["unaryOperators"];
    return Boolean(state.unlocks.unaryOperators[typedKey]);
  }
  if (definition.unlockGroup === "utilities") {
    const typedKey = keyId as keyof GameState["unlocks"]["utilities"];
    return Boolean(state.unlocks.utilities[typedKey]);
  }
  if (definition.unlockGroup === "memory") {
    const typedKey = keyId as keyof GameState["unlocks"]["memory"];
    return Boolean(state.unlocks.memory[typedKey]);
  }
  if (definition.unlockGroup === "visualizers") {
    const typedKey = keyId as keyof GameState["unlocks"]["visualizers"];
    return Boolean(state.unlocks.visualizers[typedKey]);
  }
  return Boolean(state.unlocks.execution[keyId as keyof GameState["unlocks"]["execution"]]);
};

export const setButtonUnlocked = (state: GameState, key: KeyLike, unlocked: boolean): GameState => {
  const keyId = resolveKeyId(key);
  const definition = getButtonDefinition(toLegacyKey(keyId));
  if (!definition) {
    return state;
  }
  if (definition.unlockGroup === "valueAtoms") {
    const typedKey = keyId as keyof GameState["unlocks"]["valueAtoms"];
    if (state.unlocks.valueAtoms[typedKey] === unlocked) {
      return state;
    }
    return withValueExpressionMirror(state, { [typedKey]: unlocked });
  }
  if (definition.unlockGroup === "slotOperators") {
    const typedKey = keyId as keyof GameState["unlocks"]["slotOperators"];
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
    const typedKey = keyId as keyof GameState["unlocks"]["unaryOperators"];
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
    const typedKey = keyId as keyof GameState["unlocks"]["utilities"];
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
    const typedKey = keyId as keyof GameState["unlocks"]["memory"];
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
  if (definition.unlockGroup === "visualizers") {
    const typedKey = keyId as keyof GameState["unlocks"]["visualizers"];
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
  const typedExecutionKey = keyId as keyof GameState["unlocks"]["execution"];
  if (state.unlocks.execution[typedExecutionKey] === unlocked) {
    return state;
  }
  return {
    ...state,
    unlocks: {
      ...state.unlocks,
      execution: {
        ...state.unlocks.execution,
        [typedExecutionKey]: unlocked,
      },
    },
  };
};

export const iterUnlockedButtons = (state: GameState): Key[] =>
  buttonRegistry
    .filter((entry) => isButtonUnlocked(state, entry.key))
    .map((entry) => toKeyId(entry.key));
