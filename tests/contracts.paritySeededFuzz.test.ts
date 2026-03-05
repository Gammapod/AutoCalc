import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { Action, GameState } from "../src/domain/types.js";
import { compareParity } from "../src_v2/compat/parityHarness.js";
import { executeCommand } from "../src_v2/domain/commands.js";
import { SEEDED_PARITY_RUNS } from "./contracts/fixtures/fuzzConfig.js";

const ACTION_POOL: readonly Action[] = [
  { type: "PRESS_KEY", key: "1" },
  { type: "PRESS_KEY", key: "+" },
  { type: "PRESS_KEY", key: "=" },
  { type: "PRESS_KEY", key: "NEG" },
  { type: "PRESS_KEY", key: "CE" },
  { type: "PRESS_KEY", key: "GRAPH" },
  { type: "PRESS_KEY", key: "FEED" },
  { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 3 },
  { type: "UPGRADE_KEYPAD_ROW" },
  { type: "UPGRADE_KEYPAD_COLUMN" },
  { type: "ALLOCATOR_SET_MAX_POINTS", value: 10 },
  { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 },
  { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 },
  { type: "ALLOCATOR_ADJUST", field: "range", delta: 1 },
  { type: "ALLOCATOR_ADJUST", field: "speed", delta: 1 },
  { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 },
  { type: "ALLOCATOR_ADJUST", field: "speed", delta: -1 },
  { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 2 },
  { type: "ALLOCATOR_ALLOCATE_PRESSED" },
  { type: "ALLOCATOR_RETURN_PRESSED" },
  { type: "RESET_ALLOCATOR_DEVICE" },
  { type: "UNLOCK_ALL" },
];

const createSeededRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const sampleAction = (rand: () => number): Action => {
  const index = Math.floor(rand() * ACTION_POOL.length);
  return ACTION_POOL[index];
};

const runSeed = (seed: number, steps: number): { ok: boolean; step: number; action?: Action; mismatches?: unknown } => {
  const rand = createSeededRng(seed);
  let legacy: GameState = initialState();
  let v2: GameState = initialState();
  for (let step = 0; step < steps; step += 1) {
    const action = sampleAction(rand);
    legacy = reducer(legacy, action);
    v2 = executeCommand(v2, { type: "DispatchAction", action }).state;
    const parity = compareParity(legacy, v2);
    if (!parity.ok) {
      return { ok: false, step, action, mismatches: parity.mismatches };
    }
  }
  return { ok: true, step: steps };
};

export const runContractsParitySeededFuzzTests = (): void => {
  for (const run of SEEDED_PARITY_RUNS) {
    const result = runSeed(run.seed, run.steps);
    assert.equal(
      result.ok,
      true,
      `seeded parity failed seed=${run.seed} step=${result.step} action=${JSON.stringify(result.action)} mismatches=${JSON.stringify(result.mismatches)}`,
    );
  }
};
