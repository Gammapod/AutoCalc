import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import type { Action } from "../src/domain/types.js";
import { actionFromEvent, eventFromAction } from "../src/domain/events.js";

const buildCurrentActionFixtures = (): Action[] => {
  const state = initialState();
  return [
    { type: "PRESS_KEY", key: "digit_1" },
    { type: "RESET_RUN" },
    { type: "HYDRATE_SAVE", state },
    { type: "UNLOCK_ALL" },
    { type: "MOVE_KEY_SLOT", fromIndex: 0, toIndex: 1 },
    { type: "SWAP_KEY_SLOTS", firstIndex: 0, secondIndex: 1 },
    { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 },
    { type: "SWAP_LAYOUT_CELLS", fromSurface: "storage", fromIndex: 0, toSurface: "keypad", toIndex: 0 },
    { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 3 },
    { type: "UPGRADE_KEYPAD_ROW" },
    { type: "UPGRADE_KEYPAD_COLUMN" },
    { type: "TOGGLE_FLAG", flag: "settings.history" },
    { type: "TOGGLE_VISUALIZER", visualizer: "graph" },
    { type: "LAMBDA_SET_CONTROL", value: { alpha: 3, beta: 2, gamma: 2, delta: 4, epsilon: 1 } },
    { type: "SET_CONTROL_FIELD", field: "alpha", value: 4 },
    { type: "SET_ACTIVE_CALCULATOR", calculatorId: "f" },
    { type: "AUTO_STEP_TICK" },
  ];
};

export const runContractsActionEventCurrentTests = (): void => {
  for (const action of buildCurrentActionFixtures()) {
    const roundTrip = actionFromEvent(eventFromAction(action));
    assert.deepEqual(roundTrip, action, `Action/event round-trip must preserve payload for ${action.type}`);
  }
};
