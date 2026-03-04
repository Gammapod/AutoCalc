import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { buildShellViewModel, clampSnapToAvailable, getAdjacentSnap, resolveSnapFromDrag } from "../src_v2/ui/renderAdapter.js";
import type { GameState } from "../src/domain/types.js";

export const runUiShellSnapSelectionTests = (): void => {
  const base = initialState();
  const middleOnly = buildShellViewModel(base);
  assert.equal(clampSnapToAvailable("bottom", middleOnly), "middle", "missing bottom snap clamps to middle");
  assert.equal(getAdjacentSnap("middle", middleOnly, "up"), null, "no upward adjacent snap when only middle is available");
  assert.equal(
    resolveSnapFromDrag("middle", middleOnly, 240, 0),
    "middle",
    "drag settles to middle when no alternate snap exists",
  );

  const withStorage: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
    },
  };
  const twoSnapModel = buildShellViewModel(withStorage);
  assert.equal(getAdjacentSnap("middle", twoSnapModel, "down"), "bottom", "middle can move down to bottom");
  assert.equal(getAdjacentSnap("middle", twoSnapModel, "up"), null, "middle has no upward snap in two-snap mode");
  assert.equal(resolveSnapFromDrag("middle", twoSnapModel, 140, 0), "bottom", "positive drag transitions to bottom");
  assert.equal(resolveSnapFromDrag("bottom", twoSnapModel, -140, 0), "middle", "negative drag transitions back to middle");
  assert.equal(resolveSnapFromDrag("middle", twoSnapModel, -140, 0), "middle", "upward drag does not leave middle");
  assert.equal(resolveSnapFromDrag("middle", twoSnapModel, 0, 1), "bottom", "high positive velocity transitions downward");
};

