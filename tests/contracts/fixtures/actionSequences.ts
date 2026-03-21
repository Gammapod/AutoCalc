import "../../support/keyCompat.runtime.js";
import type { Action } from "../../../src/domain/types.js";

export type ActionSequenceFixture = {
  id: string;
  actions: Action[];
};

export const LONG_TRACE_FIXTURES: ActionSequenceFixture[] = [
  {
    id: "visualizer-and-layout-mix",
    actions: [
      { type: "PRESS_KEY", key: k("viz_graph") },
      { type: "PRESS_KEY", key: k("viz_graph") },
      { type: "PRESS_KEY", key: k("viz_feed") },
      { type: "PRESS_KEY", key: k("viz_feed") },
      { type: "SET_KEYPAD_DIMENSIONS", columns: 5, rows: 3 },
      { type: "UPGRADE_KEYPAD_COLUMN" },
      { type: "UPGRADE_KEYPAD_ROW" },
      { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 },
      { type: "SWAP_LAYOUT_CELLS", fromSurface: "storage", fromIndex: 0, toSurface: "keypad", toIndex: 1 },
      { type: "PRESS_KEY", key: k("digit_1") },
      { type: "PRESS_KEY", key: k("op_add") },
      { type: "PRESS_KEY", key: k("digit_1") },
      { type: "PRESS_KEY", key: k("exec_equals") },
    ],
  },
  {
    id: "allocator-heavy-sequence",
    actions: [
      { type: "ALLOCATOR_SET_MAX_POINTS", value: 14 },
      { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 },
      { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 },
      { type: "ALLOCATOR_ADJUST", field: "range", delta: 1 },
      { type: "ALLOCATOR_ADJUST", field: "speed", delta: 1 },
      { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 },
      { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 2 },
      { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 },
      { type: "ALLOCATOR_ADJUST", field: "speed", delta: -1 },
      { type: "ALLOCATOR_ALLOCATE_PRESSED" },
      { type: "ALLOCATOR_RETURN_PRESSED" },
    ],
  },
  {
    id: "unlock-and-reset-mix",
    actions: [
      { type: "UNLOCK_ALL" },
      { type: "PRESS_KEY", key: k("digit_1") },
      { type: "PRESS_KEY", key: k("digit_1") },
      { type: "PRESS_KEY", key: k("exec_equals") },
      { type: "PRESS_KEY", key: k("util_clear_all") },
      { type: "PRESS_KEY", key: k("digit_1") },
      { type: "PRESS_KEY", key: k("op_add") },
      { type: "PRESS_KEY", key: k("digit_1") },
      { type: "PRESS_KEY", key: k("exec_equals") },
      { type: "PRESS_KEY", key: k("util_undo") },
      { type: "PRESS_KEY", key: k("util_clear_all") },
      { type: "RESET_ALLOCATOR_DEVICE" },
    ],
  },
];



