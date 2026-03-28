import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import type { KeyCell } from "../src/domain/types.js";
import { EXECUTION_PAUSE_EQUALS_FLAG } from "../src/domain/state.js";
import {
  buildKeyButtonAction,
  buildLayoutDropDispatchAction,
  resolveCalculatorKeysLocked,
} from "../src/ui/modules/calculatorStorageCore.js";
import { k, keyCell } from "./support/keyCompat.js";

export const runContractsUiActionEmissionTests = (): void => {
  const graphCell: KeyCell = keyCell("viz_graph");
  const graphAction = buildKeyButtonAction(graphCell);
  assert.deepEqual(
    graphAction,
    { type: "TOGGLE_VISUALIZER", visualizer: "graph" },
    "GRAPH key emits visualizer toggle action",
  );

  const feedCell: KeyCell = keyCell("viz_feed");
  const feedAction = buildKeyButtonAction(feedCell);
  assert.deepEqual(
    feedAction,
    { type: "TOGGLE_VISUALIZER", visualizer: "feed" },
    "FEED key emits visualizer toggle action",
  );
  const circleCell: KeyCell = keyCell("viz_circle");
  const circleAction = buildKeyButtonAction(circleCell);
  assert.deepEqual(
    circleAction,
    { type: "TOGGLE_VISUALIZER", visualizer: "circle" },
    "CIRCLE key emits visualizer toggle action",
  );

  const digitCell: KeyCell = keyCell("digit_1");
  const digitAction = buildKeyButtonAction(digitCell);
  assert.deepEqual(digitAction, { type: "PRESS_KEY", key: k("digit_1") }, "digit key emits press action");
  const equalsCell: KeyCell = keyCell("exec_equals");
  const equalsAction = buildKeyButtonAction(equalsCell);
  assert.deepEqual(
    equalsAction,
    { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG },
    "= key emits equals auto-step toggle action",
  );

  const moveAction = buildLayoutDropDispatchAction(
    { surface: "keypad", index: 1 },
    k("digit_1"),
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
    k("digit_1"),
    { surface: "keypad", index: 1 },
    "install",
  );
  assert.deepEqual(
    swapAction,
    { type: "INSTALL_KEY_FROM_STORAGE", key: k("digit_1"), toSurface: "keypad", toIndex: 1 },
    "storage drag emits INSTALL_KEY_FROM_STORAGE action",
  );

  const uninstallAction = buildLayoutDropDispatchAction(
    { surface: "keypad", index: 2 },
    k("digit_1"),
    null,
    "uninstall",
  );
  assert.deepEqual(
    uninstallAction,
    { type: "UNINSTALL_LAYOUT_KEY", fromSurface: "keypad", fromIndex: 2 },
    "keypad drag-off emits UNINSTALL_LAYOUT_KEY action",
  );

  assert.equal(
    resolveCalculatorKeysLocked(false),
    false,
    "desktop keeps keypad interactive",
  );
  assert.equal(
    resolveCalculatorKeysLocked(false),
    false,
    "mobile keeps keypad interactive",
  );
};


