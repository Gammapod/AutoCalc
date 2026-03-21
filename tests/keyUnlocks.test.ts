import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { isKeyUnlocked, isKeyUsableForInput } from "../src/domain/keyUnlocks.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, Key } from "../src/domain/types.js";
import { k } from "./support/keyCompat.js";

const withUnlock = (state: GameState, path: "valueExpression" | "slotOperators" | "unaryOperators" | "utilities" | "memory" | "steps" | "visualizers" | "execution", key: Key): GameState => {
  if (path === "valueExpression") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        valueAtoms: key in state.unlocks.valueAtoms
          ? {
            ...state.unlocks.valueAtoms,
            [key]: true,
          }
          : state.unlocks.valueAtoms,
        valueCompose: key in state.unlocks.valueCompose
          ? {
            ...state.unlocks.valueCompose,
            [key]: true,
          }
          : state.unlocks.valueCompose,
        valueExpression: {
          ...state.unlocks.valueExpression,
          [key]: true,
        },
      },
    };
  }
  if (path === "slotOperators") {
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
  if (path === "unaryOperators") {
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
  if (path === "utilities") {
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
  if (path === "visualizers") {
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
  if (path === "memory") {
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
  if (path === "steps") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        steps: {
          ...state.unlocks.steps,
          [key]: true,
        },
      },
    };
  }
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
};

export const runKeyUnlocksTests = (): void => {
  const base = initialState();
  assert.equal(isKeyUnlocked(base, k("digit_1")), false, "value-expression key starts locked");
  assert.equal(isKeyUnlocked(base, k("op_add")), false, "slot-operator key starts locked");
  assert.equal(isKeyUnlocked(base, k("util_clear_all")), false, "utility key starts locked");
  assert.equal(isKeyUnlocked(base, k("unary_inc")), true, "unary-operator key default-unlocked state is applied");
  assert.equal(isKeyUnlocked(base, k("util_backspace")), false, "backspace utility key starts locked");
  assert.equal(isKeyUnlocked(base, k("memory_adjust_plus")), false, "memory key starts locked");
  assert.equal(isKeyUnlocked(base, k("viz_graph")), false, "visualizer key starts locked");
  assert.equal(isKeyUnlocked(base, k("viz_circle")), false, "circle visualizer key starts locked");
  assert.equal(isKeyUnlocked(base, k("exec_equals")), true, "execution key default-unlocked state is applied");

  const valueUnlocked = withUnlock(base, "valueExpression", k("digit_1"));
  assert.equal(isKeyUnlocked(valueUnlocked, k("digit_1")), true, "value-expression unlock is routed correctly");

  const slotUnlocked = withUnlock(base, "slotOperators", k("op_add"));
  assert.equal(isKeyUnlocked(slotUnlocked, k("op_add")), true, "slot-operator unlock is routed correctly");
  const unaryUnlocked = withUnlock(base, "unaryOperators", k("unary_inc"));
  assert.equal(isKeyUnlocked(unaryUnlocked, k("unary_inc")), true, "unary-operator unlock is routed correctly");

  const utilityUnlocked = withUnlock(base, "utilities", k("util_clear_all"));
  assert.equal(isKeyUnlocked(utilityUnlocked, k("util_clear_all")), true, "utility unlock is routed correctly");
  const backspaceUnlocked = withUnlock(base, "utilities", k("util_backspace"));
  assert.equal(isKeyUnlocked(backspaceUnlocked, k("util_backspace")), true, "backspace utility unlock is routed correctly");

  const memoryUnlocked = withUnlock(base, "memory", k("memory_adjust_plus"));
  assert.equal(isKeyUnlocked(memoryUnlocked, k("memory_adjust_plus")), true, "memory unlock is routed correctly");

  const visualizerUnlocked = withUnlock(base, "visualizers", k("viz_feed"));
  assert.equal(isKeyUnlocked(visualizerUnlocked, k("viz_feed")), true, "visualizer unlock is routed correctly");

  const executionUnlocked = withUnlock(base, "execution", k("exec_equals"));
  assert.equal(isKeyUnlocked(executionUnlocked, k("exec_equals")), true, "execution unlock is routed correctly");

  const lockedInstalledOnKeypad: GameState = {
    ...base,
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: k("exec_equals") }],
      keypadColumns: 1,
      keypadRows: 1,
    },
    unlocks: {
      ...base.unlocks,
      execution: {
        ...base.unlocks.execution,
        [k("exec_equals")]: false,
      },
    },
  };
  assert.equal(
    isKeyUsableForInput(lockedInstalledOnKeypad, k("exec_equals")),
    true,
    "installed locked keys are still usable for input",
  );
  assert.equal(
    isKeyUsableForInput(base, k("util_clear_all")),
    false,
    "locked keys that are not installed are not usable",
  );

  assert.throws(() => isKeyUnlocked(base, "NOT_A_KEY" as Key), /Unsupported key id/, "unknown keys fail closed");
};


