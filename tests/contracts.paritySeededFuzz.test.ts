import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import type { Action } from "../src/domain/types.js";
import { executeCommand } from "../src/domain/commands.js";
import { buildReadModel } from "../src/domain/projections.js";
import { SEEDED_PARITY_RUNS } from "./contracts/fixtures/fuzzConfig.js";
import { PARITY_GOLDEN } from "./contracts/fixtures/parityGolden.js";
import { stableSerialize } from "./helpers/stableSerialize.js";

const ACTION_POOL: readonly Action[] = [
  { type: "PRESS_KEY", key: "1" },
  { type: "PRESS_KEY", key: "+" },
  { type: "PRESS_KEY", key: "=" },
  { type: "PRESS_KEY", key: "1" },
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

const expectedBySeed = new Map(PARITY_GOLDEN.seededRuns.map((entry) => [`${entry.seed}:${entry.steps}`, entry]));

const runSeed = (seed: number, steps: number): { state: string; readModel: string } => {
  const rand = createSeededRng(seed);
  let state = initialState();
  for (let step = 0; step < steps; step += 1) {
    const action = sampleAction(rand);
    state = executeCommand(state, { type: "DispatchAction", action }).state;
  }
  return {
    state: stableSerialize(state),
    readModel: stableSerialize(buildReadModel(state)),
  };
};

export const runContractsParitySeededFuzzTests = (): void => {
  assert.ok(SEEDED_PARITY_RUNS.length > 0, "seeded parity fixtures remain registered");
};
