import assert from "node:assert/strict";
import { buildRollLines, buildRollRows, buildRollViewModel } from "../src/ui/render.js";

const r = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });

export const runRollDisplayTests = (): void => {
  assert.deepEqual(
    buildRollLines([r(3n), r(9n), r(15n)]),
    ["3", "9", "15"],
    "roll lines render oldest-to-newest (top-to-bottom)",
  );

  assert.deepEqual(buildRollLines([]), [], "empty roll renders no lines");
  assert.deepEqual(
    buildRollRows(["3", "9", "15"]),
    [
      { prefix: "X =", value: "3" },
      { prefix: "  =", value: "9" },
      { prefix: "  =", value: "15" },
    ],
    "roll rows use first-line X = and then aligned equals prefixes",
  );

  const hiddenRoll = buildRollViewModel([]);
  assert.equal(hiddenRoll.isVisible, false, "empty roll is hidden");
  assert.equal(hiddenRoll.lineCount, 0, "empty roll has zero line count");
  assert.equal(hiddenRoll.valueColumnChars, 0, "empty roll value column width is zero");
  assert.deepEqual(hiddenRoll.rows, [], "empty roll model returns no rows");

  const visibleRoll = buildRollViewModel([r(3n), r(9n), r(15n)]);
  assert.equal(visibleRoll.isVisible, true, "non-empty roll is visible");
  assert.equal(visibleRoll.lineCount, 3, "non-empty roll line count matches entry count");
  assert.equal(visibleRoll.valueColumnChars, 2, "value column width tracks longest rendered value");
  assert.deepEqual(
    visibleRoll.rows,
    [
      { prefix: "X =", value: "3" },
      { prefix: "  =", value: "9" },
      { prefix: "  =", value: "15" },
    ],
    "roll model rows preserve chronological order and prefixes",
  );

  assert.deepEqual(buildRollLines([r(3n, 2n)]), ["3/2"], "fraction roll values render as exact fractions");
};
