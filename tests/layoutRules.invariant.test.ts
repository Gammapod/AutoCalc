import assert from "node:assert/strict";
import { evaluateLayoutDrop } from "../src/domain/layoutRules.js";
import { initialState } from "../src/domain/state.js";
import { buildStepBodyHighlightRegions } from "../src/ui/stepHighlight.js";
import type { GameState } from "../src/domain/types.js";

const withTwoByTwoKeypad = (state: GameState): GameState => ({
  ...state,
  unlocks: {
    ...state.unlocks,
    valueExpression: {
      ...state.unlocks.valueExpression,
      "1": true,
    },
  },
  ui: {
    ...state.ui,
    keypadColumns: 2,
    keypadRows: 2,
    keyLayout: [
      { kind: "placeholder", area: "empty" },
      { kind: "placeholder", area: "empty" },
      { kind: "key", key: "1" },
      { kind: "key", key: "++" },
    ],
    storageLayout: [{ kind: "key", key: "\u23EF" }, ...state.ui.storageLayout.slice(1)],
  },
});

export const runLayoutRulesInvariantTests = (): void => {
  const base = withTwoByTwoKeypad(initialState());

  const stepMoveToBottomRow = evaluateLayoutDrop(
    base,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 2 },
  );
  assert.deepEqual(
    stepMoveToBottomRow,
    { allowed: false, reason: "step_bottom_row_forbidden" },
    "step key cannot move into keypad bottom row",
  );

  const stepMoveToTopRow = evaluateLayoutDrop(
    base,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 0 },
  );
  assert.deepEqual(stepMoveToTopRow, { allowed: true, action: "move" }, "step key can move into non-bottom keypad rows");

  const withStepOnTopRow: GameState = {
    ...base,
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: "\u23EF" }, base.ui.keyLayout[1], base.ui.keyLayout[2], base.ui.keyLayout[3]],
      storageLayout: [{ kind: "key", key: "C" }, ...base.ui.storageLayout.slice(1)],
    },
  };
  const stepSwapToBottomRow = evaluateLayoutDrop(
    withStepOnTopRow,
    { surface: "keypad", index: 0 },
    { surface: "keypad", index: 2 },
  );
  assert.deepEqual(
    stepSwapToBottomRow,
    { allowed: false, reason: "step_bottom_row_forbidden" },
    "step key cannot swap into keypad bottom row",
  );

  const storageAllowedWithoutModeGate = evaluateLayoutDrop(
    base,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 0 },
  );
  assert.deepEqual(
    storageAllowedWithoutModeGate,
    { allowed: true, action: "move" },
    "storage drag/drop remains available regardless of interaction mode",
  );

  const malformedStorageState: GameState = {
    ...base,
    ui: {
      ...base.ui,
      storageLayout: base.ui.storageLayout.slice(0, 7),
    },
  };
  const malformedStorageMove = evaluateLayoutDrop(
    malformedStorageState,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 0 },
  );
  assert.deepEqual(
    malformedStorageMove,
    { allowed: false, reason: "storage_geometry_invalid" },
    "storage interactions reject malformed storage geometry",
  );

  const stepHighlights = buildStepBodyHighlightRegions(withStepOnTopRow);
  assert.deepEqual(
    stepHighlights,
    [{ topIndex: 0, bottomIndex: 2 }],
    "step highlight region includes step key slot and slot below it",
  );
};

