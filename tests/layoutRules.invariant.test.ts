import "./support/keyCompat.runtime.js";
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
      [k("1")]: true,
    },
  },
  ui: {
    ...state.ui,
    keypadColumns: 2,
    keypadRows: 2,
    keyLayout: [
      { kind: "placeholder", area: "empty" },
      { kind: "placeholder", area: "empty" },
      { kind: "key", key: k("1") },
      { kind: "key", key: k("=") },
    ],
    storageLayout: [{ kind: "key", key: k("C") }, ...state.ui.storageLayout.slice(1)],
  },
});

export const runLayoutRulesInvariantTests = (): void => {
  const base = withTwoByTwoKeypad(initialState());

  const moveToBottomRow = evaluateLayoutDrop(
    base,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 2 },
  );
  assert.deepEqual(moveToBottomRow, { allowed: true, action: "swap" }, "keys can swap into keypad bottom row");

  const moveToTopRow = evaluateLayoutDrop(
    base,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 0 },
  );
  assert.deepEqual(moveToTopRow, { allowed: true, action: "move" }, "keys can move into top row");

  const swapIntoBottomRow = evaluateLayoutDrop(
    base,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.deepEqual(swapIntoBottomRow, { allowed: true, action: "swap" }, "keys can swap into keypad bottom row");

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

  const stepHighlights = buildStepBodyHighlightRegions(base);
  assert.deepEqual(stepHighlights, [], "no step highlight regions are generated without a step key");
};



