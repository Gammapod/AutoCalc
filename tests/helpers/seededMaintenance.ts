import { EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG } from "../../src/domain/state.js";
import { KEY_ID } from "../../src/domain/keyPresentation.js";
import type { Action, AllocatorAllocationField, CalculatorId, GameState, Key } from "../../src/domain/types.js";

export type SeededMaintenanceConfig = {
  seed: number;
  steps: number;
};

export const SEEDED_MAINTENANCE_RUNS: SeededMaintenanceConfig[] = [
  { seed: 1337, steps: 72 },
  { seed: 424242, steps: 72 },
  { seed: 9001, steps: 72 },
  { seed: 7777, steps: 72 },
];

const PRESS_KEY_POOL: readonly Key[] = [
  KEY_ID.digit_0,
  KEY_ID.digit_1,
  KEY_ID.digit_2,
  KEY_ID.op_add,
  KEY_ID.op_sub,
  KEY_ID.op_mul,
  KEY_ID.op_div,
  KEY_ID.exec_equals,
  KEY_ID.exec_play_pause,
  KEY_ID.util_clear_all,
  KEY_ID.util_undo,
  KEY_ID.memory_cycle_variable,
  KEY_ID.memory_adjust_plus,
  KEY_ID.memory_adjust_minus,
  KEY_ID.memory_recall,
  KEY_ID.exec_step_through,
];
const ALLOCATOR_FIELDS: readonly AllocatorAllocationField[] = ["width", "height", "slots", "range", "speed"];
const TARGETABLE_CALCULATOR_IDS: readonly CalculatorId[] = ["f", "g", "menu"];

const createRng = (seed: number): (() => number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x1_0000_0000;
  };
};

const maybeTargetCalculator = (rng: () => number, state: GameState): CalculatorId | undefined => {
  if (!state.calculators || rng() < 0.55) {
    return undefined;
  }
  const available = TARGETABLE_CALCULATOR_IDS.filter((id) => Boolean(state.calculators?.[id]));
  if (available.length === 0) {
    return undefined;
  }
  return available[Math.floor(rng() * available.length)];
};

const withMaybeTarget = <T extends Action>(
  action: T,
  rng: () => number,
  state: GameState,
): T => {
  const calculatorId = maybeTargetCalculator(rng, state);
  if (!calculatorId) {
    return action;
  }
  return { ...action, calculatorId } as T;
};

export const chooseSeededMaintenanceAction = (rng: () => number, state: GameState): Action => {
  const pick = Math.floor(rng() * 14);
  if (pick <= 5) {
    const key = PRESS_KEY_POOL[Math.floor(rng() * PRESS_KEY_POOL.length)];
    return withMaybeTarget({ type: "PRESS_KEY", key }, rng, state);
  }
  if (pick === 6) {
    return withMaybeTarget({
      type: "TOGGLE_VISUALIZER",
      visualizer: rng() > 0.5 ? "graph" : "feed",
    }, rng, state);
  }
  if (pick === 7) {
    return withMaybeTarget({
      type: "TOGGLE_FLAG",
      flag: rng() > 0.5 ? EXECUTION_PAUSE_FLAG : EXECUTION_PAUSE_EQUALS_FLAG,
    }, rng, state);
  }
  if (pick === 8) {
    return withMaybeTarget({
      type: "MOVE_LAYOUT_CELL",
      fromSurface: "keypad",
      fromIndex: Math.floor(rng() * 2),
      toSurface: "storage",
      toIndex: Math.floor(rng() * 2),
    }, rng, state);
  }
  if (pick === 9) {
    return withMaybeTarget({
      type: "SWAP_LAYOUT_CELLS",
      fromSurface: "storage",
      fromIndex: Math.floor(rng() * 2),
      toSurface: "keypad",
      toIndex: Math.floor(rng() * 2),
    }, rng, state);
  }
  if (pick === 10) {
    return withMaybeTarget({
      type: "SET_KEYPAD_DIMENSIONS",
      columns: 1 + Math.floor(rng() * 4),
      rows: 1 + Math.floor(rng() * 4),
    }, rng, state);
  }
  if (pick === 11) {
    return withMaybeTarget({
      type: "ALLOCATOR_ADJUST",
      field: ALLOCATOR_FIELDS[Math.floor(rng() * ALLOCATOR_FIELDS.length)] ?? "width",
      delta: rng() > 0.5 ? 1 : -1,
    }, rng, state);
  }
  if (pick === 12) {
    return { type: "AUTO_STEP_TICK" };
  }
  if (!state.calculators) {
    return { type: "AUTO_STEP_TICK" };
  }
  const available = TARGETABLE_CALCULATOR_IDS.filter((id) => Boolean(state.calculators?.[id]));
  if (available.length === 0) {
    return { type: "AUTO_STEP_TICK" };
  }
  return { type: "SET_ACTIVE_CALCULATOR", calculatorId: available[Math.floor(rng() * available.length)] ?? "f" };
};

export const generateSeededMaintenanceTrace = (seed: number, steps: number, state: GameState): Action[] => {
  const rng = createRng(seed);
  const actions: Action[] = [];
  for (let index = 0; index < steps; index += 1) {
    const action = chooseSeededMaintenanceAction(rng, state);
    actions.push(action);
  }
  return actions;
};

export const createSeededMaintenanceRng = createRng;
