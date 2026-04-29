import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { evaluateLayoutDrop } from "../src/domain/layoutRules.js";
import { initialState } from "../src/domain/state.js";
import { buildStepBodyHighlightRegions } from "../src/ui/stepHighlight.js";
import type { GameState } from "../src/domain/types.js";

const withTwoByTwoKeypad = (state: GameState): GameState => ({
  ...state,
  calculators: undefined,
  unlocks: {
    ...state.unlocks,
    valueExpression: {
      ...state.unlocks.valueExpression,
      [k("digit_1")]: true,
    },
    utilities: {
      ...state.unlocks.utilities,
      [utility("util_clear_all")]: true,
    },
    execution: {
      ...state.unlocks.execution,
      [execution("exec_equals")]: true,
    },
  },
  ui: {
    ...state.ui,
    keypadColumns: 2,
    keypadRows: 2,
    keyLayout: [
      { kind: "placeholder", area: "empty" },
      { kind: "placeholder", area: "empty" },
      { kind: "key", key: k("digit_1") },
      { kind: "key", key: k("exec_equals") },
    ],
    storageLayout: [{ kind: "key", key: k("util_clear_all") }, ...state.ui.storageLayout.slice(1)],
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

  const lockedEqualsOnKeypad: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      execution: {
        ...base.unlocks.execution,
        [execution("exec_equals")]: false,
      },
    },
  };
  const lockedSwapWithinKeypad = evaluateLayoutDrop(
    lockedEqualsOnKeypad,
    { surface: "keypad", index: 3 },
    { surface: "keypad", index: 2 },
  );
  assert.deepEqual(
    lockedSwapWithinKeypad,
    { allowed: true, action: "swap" },
    "locked keypad keys remain valid intra-keypad swap sources",
  );

  const firstEmptyStorageIndex = lockedEqualsOnKeypad.ui.storageLayout.findIndex((cell) => cell === null);
  assert.ok(firstEmptyStorageIndex >= 0, "fixture provides an empty storage slot");
  const lockedMoveToStorageBlocked = evaluateLayoutDrop(
    lockedEqualsOnKeypad,
    { surface: "keypad", index: 3 },
    { surface: "storage", index: firstEmptyStorageIndex },
  );
  assert.deepEqual(
    lockedMoveToStorageBlocked,
    { allowed: false, reason: "locked_key_immobile" },
    "locked keypad keys cannot move off-calculator into storage",
  );

  const lockedSwapWithStorageBlocked = evaluateLayoutDrop(
    lockedEqualsOnKeypad,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.deepEqual(
    lockedSwapWithStorageBlocked,
    { allowed: false, reason: "locked_key_immobile" },
    "swaps that would move a locked keypad key into storage are rejected",
  );

  const stepHighlights = buildStepBodyHighlightRegions(base);
  assert.deepEqual(stepHighlights, [], "no step highlight regions are generated without a step key");
};







