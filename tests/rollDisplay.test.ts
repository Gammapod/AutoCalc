import assert from "node:assert/strict";
import { buildRollLines, buildRollRows, buildRollViewModel } from "../src_v2/ui/shared/readModel.js";
import { resolveActiveVisualizerPanel } from "../src_v2/ui/modules/visualizerHost.js";
import { FEED_VISIBLE_FLAG, GRAPH_VISIBLE_FLAG, initialState } from "../src/domain/state.js";
import type { EuclidRemainderEntry } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n): { kind: "rational"; value: { num: bigint; den: bigint } } => ({
  kind: "rational",
  value: { num, den },
});

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
      { prefix: "X =", value: "3", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "9", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "15", remainder: undefined, errorCode: undefined },
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
      { prefix: "X =", value: "3", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "9", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "15", remainder: undefined, errorCode: undefined },
    ],
    "roll model rows preserve chronological order and prefixes",
  );

  assert.deepEqual(buildRollLines([r(3n, 2n)]), ["3/2"], "fraction roll values render as exact fractions");

  const remainderRows: EuclidRemainderEntry[] = [{ rollIndex: 1, value: rv(1n, 2n) }];
  assert.deepEqual(
    buildRollRows(["10", "1"], remainderRows),
    [
      { prefix: "X =", value: "10", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "1", remainder: "1/2", errorCode: undefined },
    ],
    "roll rows place euclidean remainders on the same line as their target roll entry",
  );

  const rollWithRemainder = buildRollViewModel([r(10n), r(1n)], remainderRows);
  assert.deepEqual(
    rollWithRemainder.rows,
    [
      { prefix: "X =", value: "10", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "1", remainder: "1/2", errorCode: undefined },
    ],
    "roll view model includes the same-line euclidean remainder",
  );

  const rollWithErrorAndRemainder = buildRollRows(
    ["10", "1"],
    remainderRows,
    [{ rollIndex: 1, code: "n/0", kind: "division_by_zero" }],
  );
  assert.deepEqual(
    rollWithErrorAndRemainder,
    [
      { prefix: "X =", value: "10", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "", remainder: undefined, errorCode: "n/0" },
    ],
    "error code takes precedence over displayed remainder on the same roll row",
  );

  const rollWithDuplicateErrorCodes = buildRollRows(
    ["10", "1", "2", "99"],
    [],
    [
      { rollIndex: 1, code: "n/0", kind: "division_by_zero" },
      { rollIndex: 2, code: "n/0", kind: "division_by_zero" },
    ],
  );
  assert.deepEqual(
    rollWithDuplicateErrorCodes,
    [
      { prefix: "X =", value: "10", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "", remainder: undefined, errorCode: "n/0" },
      { prefix: "  =", value: "99", remainder: undefined, errorCode: undefined },
    ],
    "duplicate error codes suppress later matching error rows in the roll",
  );

  const base = initialState();
  assert.equal(resolveActiveVisualizerPanel(base), "none", "no visualizer flags leaves visualizer host inactive");

  const withFeedOn = {
    ...base,
    ui: {
      ...base.ui,
      buttonFlags: {
        ...base.ui.buttonFlags,
        [FEED_VISIBLE_FLAG]: true,
      },
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withFeedOn), "feed", "FEED on activates feed panel");

  const withFeedAndGraphOn = {
    ...withFeedOn,
    ui: {
      ...withFeedOn.ui,
      buttonFlags: {
        ...withFeedOn.ui.buttonFlags,
        [GRAPH_VISIBLE_FLAG]: true,
      },
    },
  };
  assert.equal(
    resolveActiveVisualizerPanel(withFeedAndGraphOn),
    "graph",
    "graph flag takes precedence over feed when both visualizers are toggled",
  );
};
