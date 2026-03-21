import assert from "node:assert/strict";
import { keyCatalog } from "../src/contracts/keyCatalog.js";
import {
  computeCapabilityContext,
  createAvailabilityReader,
  resolveCapabilityFromContext,
} from "../src/domain/capabilitySemantics.js";
import { capabilityToFunctionProviderIds, staticFunctionCapabilityProviders } from "../src/domain/functionCapabilityProviders.js";
import { resolveKeyId } from "../src/domain/keyPresentation.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, KeyInput, UnlockPredicate } from "../src/domain/types.js";

const DUMMY_PREDICATE: UnlockPredicate = { type: "total_equals", value: 0n };

const unlockKey = (state: GameState, keyLike: KeyInput): GameState => {
  const key = resolveKeyId(keyLike);
  if (key in state.unlocks.valueExpression) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        valueExpression: {
          ...state.unlocks.valueExpression,
          [key]: true,
        },
      },
    };
  }
  if (key in state.unlocks.slotOperators) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        slotOperators: {
          ...state.unlocks.slotOperators,
          [key]: true,
        },
      },
    };
  }
  if (key in state.unlocks.unaryOperators) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        unaryOperators: {
          ...state.unlocks.unaryOperators,
          [key]: true,
        },
      },
    };
  }
  if (key in state.unlocks.utilities) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        utilities: {
          ...state.unlocks.utilities,
          [key]: true,
        },
      },
    };
  }
  if (key in state.unlocks.visualizers) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        visualizers: {
          ...state.unlocks.visualizers,
          [key]: true,
        },
      },
    };
  }
  if (key in state.unlocks.memory) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        memory: {
          ...state.unlocks.memory,
          [key]: true,
        },
      },
    };
  }
  if (key in state.unlocks.execution) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        execution: {
          ...state.unlocks.execution,
          [key]: true,
        },
      },
    };
  }
  return state;
};

const withUnlockedKeys = (keys: KeyInput[]): GameState =>
  keys.reduce((state, key) => unlockKey(state, key), initialState());

const evaluateFromFunctionProviders = (
  capability: Exclude<keyof typeof capabilityToFunctionProviderIds, "press_target_key">,
  availableKeys: Set<string>,
): boolean => {
  const providerById = new Map(staticFunctionCapabilityProviders.map((provider) => [provider.id, provider]));
  const mappedProviderIds = capabilityToFunctionProviderIds[capability];
  return mappedProviderIds.some((providerId) => {
    const provider = providerById.get(providerId);
    if (!provider) {
      return false;
    }
    return provider.sufficiency.some((clause) => clause.every((key) => availableKeys.has(key)));
  });
};

const evaluateByRuntimeSemantics = (
  capability: Exclude<keyof typeof capabilityToFunctionProviderIds, "press_target_key">,
  state: GameState,
): boolean => {
  const isAvailable = createAvailabilityReader(state, "all_unlocked");
  const context = computeCapabilityContext(state, isAvailable);
  return resolveCapabilityFromContext(capability, DUMMY_PREDICATE, context, isAvailable);
};

const availableKeySet = (state: GameState): Set<string> => {
  const isAvailable = createAvailabilityReader(state, "all_unlocked");
  const keys = keyCatalog.map((entry) => entry.key).filter((key) => isAvailable(key));
  return new Set(keys);
};

export const runCapabilitySemanticsParityContractTests = (): void => {
  const scenarios: Array<{
    id: string;
    state: GameState;
    capabilities: Array<Exclude<keyof typeof capabilityToFunctionProviderIds, "press_target_key">>;
  }> = [
    {
      id: "step_plus_via_unary_increment",
      state: withUnlockedKeys(["exec_equals", "unary_inc"]),
      capabilities: ["step_plus_one", "roll_growth", "roll_incrementing_run"],
    },
    {
      id: "step_plus_via_plus_and_one",
      state: withUnlockedKeys(["exec_equals", "op_add", "digit_1"]),
      capabilities: ["step_plus_one", "roll_growth", "roll_incrementing_run"],
    },
    {
      id: "roll_equal_run_requires_zero_or_one_operand",
      state: withUnlockedKeys(["exec_equals", "op_add", "digit_0", "op_mul", "digit_1"]),
      capabilities: ["roll_equal_run"],
    },
    {
      id: "division_by_zero_error_requires_equals_divide_zero",
      state: withUnlockedKeys(["exec_equals", "op_div", "digit_0"]),
      capabilities: ["division_by_zero_error"],
    },
  ];

  for (const scenario of scenarios) {
    const availableKeys = availableKeySet(scenario.state);
    for (const capability of scenario.capabilities) {
      const runtimeValue = evaluateByRuntimeSemantics(capability, scenario.state);
      const providerValue = evaluateFromFunctionProviders(capability, availableKeys);
      assert.equal(
        providerValue,
        runtimeValue,
        `provider/runtime capability parity scenario=${scenario.id} capability=${capability}`,
      );
    }
  }
};

