import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import type { KeyCell } from "../src/domain/types.js";
import { resolveAllocatorModeAction } from "../src/app/allocatorModeAction.js";
import {
  buildKeyButtonAction,
  buildLayoutDropDispatchAction,
  resolveCalculatorKeysLocked,
} from "../src/ui/modules/calculatorStorageCore.js";

export const runContractsUiActionEmissionTests = (): void => {
  const state = initialState();

  const graphCell: KeyCell = { kind: "key", key: "GRAPH" };
  const graphAction = buildKeyButtonAction(state, graphCell);
  assert.deepEqual(
    graphAction,
    { type: "TOGGLE_VISUALIZER", visualizer: "graph" },
    "GRAPH key emits visualizer toggle action",
  );

  const feedCell: KeyCell = { kind: "key", key: "FEED" };
  const feedAction = buildKeyButtonAction(state, feedCell);
  assert.deepEqual(
    feedAction,
    { type: "TOGGLE_VISUALIZER", visualizer: "feed" },
    "FEED key emits visualizer toggle action",
  );
  const circleCell: KeyCell = { kind: "key", key: "CIRCLE" };
  const circleAction = buildKeyButtonAction(state, circleCell);
  assert.deepEqual(
    circleAction,
    { type: "TOGGLE_VISUALIZER", visualizer: "circle" },
    "CIRCLE key emits visualizer toggle action",
  );

  const digitCell: KeyCell = { kind: "key", key: "1" };
  const digitAction = buildKeyButtonAction(state, digitCell);
  assert.deepEqual(digitAction, { type: "PRESS_KEY", key: "1" }, "digit key emits press action");

  const moveAction = buildLayoutDropDispatchAction(
    { surface: "keypad", index: 1 },
    { surface: "storage", index: 2 },
    "move",
  );
  assert.deepEqual(
    moveAction,
    { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad", fromIndex: 1, toSurface: "storage", toIndex: 2 },
    "drag move emits MOVE_LAYOUT_CELL action",
  );

  const swapAction = buildLayoutDropDispatchAction(
    { surface: "storage", index: 2 },
    { surface: "keypad", index: 1 },
    "swap",
  );
  assert.deepEqual(
    swapAction,
    { type: "SWAP_LAYOUT_CELLS", fromSurface: "storage", fromIndex: 2, toSurface: "keypad", toIndex: 1 },
    "drag swap emits SWAP_LAYOUT_CELLS action",
  );

  assert.deepEqual(
    resolveAllocatorModeAction("calculator"),
    { type: "ALLOCATOR_ALLOCATE_PRESSED" },
    "calculator mode emits allocate transition action",
  );
  assert.deepEqual(
    resolveAllocatorModeAction("modify"),
    { type: "ALLOCATOR_RETURN_PRESSED" },
    "modify mode emits return transition action",
  );

  assert.equal(
    resolveCalculatorKeysLocked("modify", false, "desktop"),
    false,
    "desktop modify mode keeps keypad interactive for drag",
  );
  assert.equal(
    resolveCalculatorKeysLocked("modify", false, "mobile"),
    true,
    "mobile modify mode keeps keypad locked",
  );
};
