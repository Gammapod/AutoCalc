import assert from "node:assert/strict";
import { isKeyUnlocked } from "../src/domain/keyUnlocks.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, Key } from "../src/domain/types.js";

const withUnlock = (state: GameState, path: "valueExpression" | "slotOperators" | "utilities" | "memory" | "steps" | "visualizers" | "execution", key: string): GameState => {
  if (path === "valueExpression") {
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
  assert.equal(isKeyUnlocked(base, "1"), false, "value-expression key starts locked");
  assert.equal(isKeyUnlocked(base, "+"), false, "slot-operator key starts locked");
  assert.equal(isKeyUnlocked(base, "C"), false, "utility key starts locked");
  assert.equal(isKeyUnlocked(base, "M+"), false, "memory key starts locked");
  assert.equal(isKeyUnlocked(base, "\u23EF"), false, "step key starts locked");
  assert.equal(isKeyUnlocked(base, "GRAPH"), false, "visualizer key starts locked");
  assert.equal(isKeyUnlocked(base, "CIRCLE"), true, "circle visualizer key starts unlocked");
  assert.equal(isKeyUnlocked(base, "="), false, "execution key starts locked");
  assert.equal(isKeyUnlocked(base, "++"), true, "default increment key remains unlocked");
  assert.equal(isKeyUnlocked(base, "--"), false, "default decrement key starts locked");

  const valueUnlocked = withUnlock(base, "valueExpression", "1");
  assert.equal(isKeyUnlocked(valueUnlocked, "1"), true, "value-expression unlock is routed correctly");

  const slotUnlocked = withUnlock(base, "slotOperators", "+");
  assert.equal(isKeyUnlocked(slotUnlocked, "+"), true, "slot-operator unlock is routed correctly");

  const utilityUnlocked = withUnlock(base, "utilities", "C");
  assert.equal(isKeyUnlocked(utilityUnlocked, "C"), true, "utility unlock is routed correctly");

  const stepUnlocked = withUnlock(base, "steps", "\u23EF");
  assert.equal(isKeyUnlocked(stepUnlocked, "\u23EF"), true, "step unlock is routed correctly");

  const memoryUnlocked = withUnlock(base, "memory", "M+");
  assert.equal(isKeyUnlocked(memoryUnlocked, "M+"), true, "memory unlock is routed correctly");

  const visualizerUnlocked = withUnlock(base, "visualizers", "FEED");
  assert.equal(isKeyUnlocked(visualizerUnlocked, "FEED"), true, "visualizer unlock is routed correctly");

  const executionUnlocked = withUnlock(base, "execution", "=");
  assert.equal(isKeyUnlocked(executionUnlocked, "="), true, "execution unlock is routed correctly");

  assert.equal(isKeyUnlocked(base, "NOT_A_KEY" as Key), false, "unknown keys resolve to locked");
};
