import assert from "node:assert/strict";
import { buildRollLines, buildRollRows, buildRollViewModel } from "../src/ui/render.js";

export const runRollDisplayTests = (): void => {
  assert.deepEqual(
    buildRollLines([3n, 9n, 15n]),
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

  const visibleRoll = buildRollViewModel([3n, 9n, 15n]);
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
};
