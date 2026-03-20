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
  assert.equal(isKeyUnlocked(base, k("1")), false, "value-expression key starts locked");
  assert.equal(isKeyUnlocked(base, k("+")), false, "slot-operator key starts locked");
  assert.equal(isKeyUnlocked(base, k("C")), false, "utility key starts locked");
  assert.equal(isKeyUnlocked(base, k("++")), true, "unary-operator key default-unlocked state is applied");
  assert.equal(isKeyUnlocked(base, k("\u2190")), false, "backspace utility key starts locked");
  assert.equal(isKeyUnlocked(base, k("M+")), false, "memory key starts locked");
  assert.equal(isKeyUnlocked(base, k("GRAPH")), false, "visualizer key starts locked");
  assert.equal(isKeyUnlocked(base, k("CIRCLE")), false, "circle visualizer key starts locked");
  assert.equal(isKeyUnlocked(base, k("=")), true, "execution key default-unlocked state is applied");

  const valueUnlocked = withUnlock(base, "valueExpression", k("1"));
  assert.equal(isKeyUnlocked(valueUnlocked, k("1")), true, "value-expression unlock is routed correctly");

  const slotUnlocked = withUnlock(base, "slotOperators", k("+"));
  assert.equal(isKeyUnlocked(slotUnlocked, k("+")), true, "slot-operator unlock is routed correctly");
  const unaryUnlocked = withUnlock(base, "unaryOperators", k("++"));
  assert.equal(isKeyUnlocked(unaryUnlocked, k("++")), true, "unary-operator unlock is routed correctly");

  const utilityUnlocked = withUnlock(base, "utilities", k("C"));
  assert.equal(isKeyUnlocked(utilityUnlocked, k("C")), true, "utility unlock is routed correctly");
  const backspaceUnlocked = withUnlock(base, "utilities", k("\u2190"));
  assert.equal(isKeyUnlocked(backspaceUnlocked, k("\u2190")), true, "backspace utility unlock is routed correctly");

  const memoryUnlocked = withUnlock(base, "memory", k("M+"));
  assert.equal(isKeyUnlocked(memoryUnlocked, k("M+")), true, "memory unlock is routed correctly");

  const visualizerUnlocked = withUnlock(base, "visualizers", k("FEED"));
  assert.equal(isKeyUnlocked(visualizerUnlocked, k("FEED")), true, "visualizer unlock is routed correctly");

  const executionUnlocked = withUnlock(base, "execution", k("="));
  assert.equal(isKeyUnlocked(executionUnlocked, k("=")), true, "execution unlock is routed correctly");

  const lockedInstalledOnKeypad: GameState = {
    ...base,
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: k("=") }],
      keypadColumns: 1,
      keypadRows: 1,
    },
    unlocks: {
      ...base.unlocks,
      execution: {
        ...base.unlocks.execution,
        [k("=")]: false,
      },
    },
  };
  assert.equal(
    isKeyUsableForInput(lockedInstalledOnKeypad, k("=")),
    true,
    "installed locked keys are still usable for input",
  );
  assert.equal(
    isKeyUsableForInput(base, k("C")),
    false,
    "locked keys that are not installed are not usable",
  );

  assert.throws(() => isKeyUnlocked(base, "NOT_A_KEY" as Key), /Unsupported legacy key/, "unknown keys fail closed");
};

