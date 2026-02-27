import assert from "node:assert/strict";
import { buildRollLines, buildRollRows, buildRollViewModel, getRollLineClassName } from "../src/ui/render.js";
import type { EuclidRemainderEntry } from "../src/domain/types.js";

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
      { prefix: "X =", value: "3", remainder: undefined },
      { prefix: "  =", value: "9", remainder: undefined },
      { prefix: "  =", value: "15", remainder: undefined },
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
      { prefix: "X =", value: "3", remainder: undefined },
      { prefix: "  =", value: "9", remainder: undefined },
      { prefix: "  =", value: "15", remainder: undefined },
    ],
    "roll model rows preserve chronological order and prefixes",
  );

  assert.deepEqual(buildRollLines([r(3n, 2n)]), ["3/2"], "fraction roll values render as exact fractions");

  const remainderRows: EuclidRemainderEntry[] = [{ rollIndex: 1, value: r(1n, 2n) }];
  assert.deepEqual(
    buildRollRows(["10", "1"], remainderRows),
    [
      { prefix: "X =", value: "10", remainder: undefined },
      { prefix: "  =", value: "1", remainder: "1/2" },
    ],
    "roll rows place euclidean remainders on the same line as their target roll entry",
  );

  const rollWithRemainder = buildRollViewModel([r(10n), r(1n)], remainderRows);
  assert.deepEqual(
    rollWithRemainder.rows,
    [
      { prefix: "X =", value: "10", remainder: undefined },
      { prefix: "  =", value: "1", remainder: "1/2" },
    ],
    "roll view model includes the same-line euclidean remainder",
  );

  assert.equal(
    getRollLineClassName({ prefix: "  =", value: "10" }),
    "roll-line",
    "rows without remainders use the base line class",
  );
  assert.equal(
    getRollLineClassName({ prefix: "  =", value: "10", remainder: "1/2" }),
    "roll-line roll-line--with-remainder",
    "rows with remainders use the remainder line class",
  );
};
