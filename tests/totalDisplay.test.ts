import assert from "node:assert/strict";
import { buildTotalSlotModel } from "../src/ui/render.js";

export const runTotalDisplayTests = (): void => {
  const baseline = buildTotalSlotModel(0n, 2);
  assert.equal(baseline.length, 12, "display always renders 12 fixed-width slots");
  assert.equal(
    baseline.filter((slot) => slot.state === "locked").length,
    10,
    "2 unlocked digits leaves 10 locked slots",
  );
  assert.equal(
    baseline.filter((slot) => slot.state === "active").length,
    1,
    "zero renders one active digit on the right",
  );
  assert.deepEqual(
    baseline.at(-1)?.activeSegments,
    ["a", "b", "c", "d", "e", "f"],
    "rightmost active digit renders 0 segments",
  );

  const twoDigitTotal = buildTotalSlotModel(42n, 2);
  assert.equal(
    twoDigitTotal.filter((slot) => slot.state === "active").length,
    2,
    "two-digit total fills both unlocked slots",
  );
  assert.deepEqual(twoDigitTotal.at(-2)?.activeSegments, ["b", "c", "f", "g"], "left active digit renders 4 segments");
  assert.deepEqual(
    twoDigitTotal.at(-1)?.activeSegments,
    ["a", "b", "d", "e", "g"],
    "right active digit renders 2 segments",
  );

  const clamped = buildTotalSlotModel(1234n, 20);
  assert.equal(
    clamped.filter((slot) => slot.state === "locked").length,
    0,
    "unlocked digit count is clamped to max 12",
  );

  const negativeSingleDigit = buildTotalSlotModel(-1n, 2);
  assert.equal(
    negativeSingleDigit.filter((slot) => slot.state === "active").length,
    1,
    "negative totals render digit slots from magnitude only",
  );
  assert.deepEqual(
    negativeSingleDigit.at(-1)?.activeSegments,
    ["b", "c"],
    "negative -1 keeps 1 segments in the rightmost digit slot",
  );
};
