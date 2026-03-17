import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { SEEDED_PARITY_RUNS } from "./contracts/fixtures/fuzzConfig.js";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { executeCommand } from "../src/domain/commands.js";
import type { Action, GameState } from "../src/domain/types.js";
import { compareParity } from "../src/compat/parityHarness.js";

export const runContractsParitySeededFuzzTests = (): void => {
  assert.ok(SEEDED_PARITY_RUNS.length > 0, "seeded parity fixtures remain registered");

  const keyPool = [
    k("0"),
    k("1"),
    k("2"),
    k("+"),
    k("-"),
    k("*"),
    k("/"),
    k("="),
    k("C"),
    k("UNDO"),
    k("GRAPH"),
    k("FEED"),
  ] as const;

  const createRng = (seed: number): (() => number) => {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 0x1_0000_0000;
    };
  };

  const chooseAction = (rng: () => number): Action => {
    const pick = Math.floor(rng() * 10);
    if (pick <= 5) {
      const key = keyPool[Math.floor(rng() * keyPool.length)];
      return { type: "PRESS_KEY", key };
    }
    if (pick === 6) {
      return { type: "TOGGLE_VISUALIZER", visualizer: rng() > 0.5 ? "graph" : "feed" };
    }
    if (pick === 7) {
      return { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 };
    }
    if (pick === 8) {
      return { type: "SWAP_LAYOUT_CELLS", fromSurface: "storage", fromIndex: 0, toSurface: "keypad", toIndex: 1 };
    }
    return { type: "ALLOCATOR_ADJUST", field: "width", delta: rng() > 0.5 ? 1 : -1 };
  };

  for (const run of SEEDED_PARITY_RUNS) {
    let legacy: GameState = initialState();
    let v2: GameState = initialState();
    const rng = createRng(run.seed);
    for (let step = 0; step < run.steps; step += 1) {
      const action = chooseAction(rng);
      legacy = reducer(legacy, action);
      v2 = executeCommand(v2, { type: "DispatchAction", action }).state;
      const parity = compareParity(legacy, v2);
      assert.equal(
        parity.ok,
        true,
        `seeded parity mismatch seed=${run.seed.toString()} step=${step.toString()} action=${action.type}`,
      );
    }
  }
};


