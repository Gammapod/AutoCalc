import assert from "node:assert/strict";
import { resolveLayoutMotionIntent } from "../src/ui/layout/motionCoordinator.js";
import type { CalculatorLayoutSnapshot } from "../src/ui/layout/types.js";

const makeSnapshot = (columns: number, rows: number): CalculatorLayoutSnapshot => ({
  id: "primary",
  shellMode: "desktop",
  inputBlocked: false,
  body: {
    widthPx: 100,
    minHeightPx: 100,
    baselineWidthPx: 100,
    baselineMinHeightPx: 100,
  },
  keypad: {
    columns,
    rows,
    keyHeightPx: 50,
    keyMinWidthPx: 75,
    gapPx: 10,
    baselineKeypadHeightPx: 110,
    shouldStretchKeypadHeight: false,
    gridTemplateColumns: "",
    gridTemplateRows: "",
    heightPx: null,
  },
  visualizer: {
    widthPx: 100,
  },
  invariants: {
    keypadBodyHorizontalInsetPx: 16,
    keypadBodyVerticalInsetPx: 260,
  },
});

export const runUiMotionCoordinatorTests = (): void => {
  const none = resolveLayoutMotionIntent(null, makeSnapshot(4, 2), {
    reduceMotion: false,
  });
  assert.equal(none.kind, "none", "first snapshot emits no grow motion");

  const row = resolveLayoutMotionIntent(makeSnapshot(4, 2), makeSnapshot(4, 3), {
    reduceMotion: false,
  });
  assert.equal(row.kind, "keypad_grow_row", "row growth emits row motion");
  assert.equal(row.keypadGrowDirection, "row", "row growth direction is row");

  const column = resolveLayoutMotionIntent(makeSnapshot(4, 2), makeSnapshot(5, 2), {
    reduceMotion: false,
  });
  assert.equal(column.kind, "keypad_grow_col", "column growth emits column motion");

  const both = resolveLayoutMotionIntent(makeSnapshot(4, 2), makeSnapshot(5, 3), {
    reduceMotion: false,
  });
  assert.equal(both.kind, "keypad_grow_both", "combined growth emits combined motion");

  const reduced = resolveLayoutMotionIntent(makeSnapshot(4, 2), makeSnapshot(5, 3), {
    reduceMotion: true,
  });
  assert.equal(reduced.kind, "none", "reduced motion suppresses grow intents");
};

