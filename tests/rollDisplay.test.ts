import assert from "node:assert/strict";
import { buildRollLines, buildRollRows, buildRollViewModel } from "../src_v2/ui/shared/readModel.js";
import { resolveActiveVisualizerPanel } from "../src_v2/ui/modules/visualizerHost.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, RollEntry } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n): { kind: "rational"; value: { num: bigint; den: bigint } } => ({
  kind: "rational",
  value: { num, den },
});
const e = (y: RollEntry["y"], patch: Partial<RollEntry> = {}): RollEntry => ({ y, ...patch });

export const runRollDisplayTests = (): void => {
  assert.deepEqual(
    buildRollLines([e(r(3n)), e(r(9n)), e(r(15n))]),
    ["3", "9", "15"],
    "roll lines render oldest-to-newest (top-to-bottom)",
  );

  assert.deepEqual(buildRollLines([]), [], "empty roll renders no lines");
  assert.deepEqual(
    buildRollRows([e(r(3n)), e(r(9n)), e(r(15n))]),
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

  const visibleRoll = buildRollViewModel([e(r(3n)), e(r(9n)), e(r(15n))]);
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

  assert.deepEqual(buildRollLines([e(r(3n, 2n))]), ["3/2"], "fraction roll values render as exact fractions");

  assert.deepEqual(
    buildRollRows([e(r(10n)), e(r(1n), { remainder: rv(1n, 2n) })]),
    [
      { prefix: "X =", value: "10", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "1", remainder: "1/2", errorCode: undefined },
    ],
    "roll rows place euclidean remainders on the same line as their target roll entry",
  );

  const rollWithRemainder = buildRollViewModel([e(r(10n)), e(r(1n), { remainder: rv(1n, 2n) })]);
  assert.deepEqual(
    rollWithRemainder.rows,
    [
      { prefix: "X =", value: "10", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "1", remainder: "1/2", errorCode: undefined },
    ],
    "roll view model includes the same-line euclidean remainder",
  );

  const rollWithErrorAndRemainder = buildRollRows([
    e(r(10n)),
    e(r(1n), { remainder: rv(1n, 2n), error: { code: "n/0", kind: "division_by_zero" } }),
  ]);
  assert.deepEqual(
    rollWithErrorAndRemainder,
    [
      { prefix: "X =", value: "10", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "", remainder: undefined, errorCode: "n/0" },
    ],
    "error code takes precedence over displayed remainder on the same roll row",
  );

  const rollWithDuplicateErrorCodes = buildRollRows([
    e(r(10n)),
    e(r(1n), { error: { code: "n/0", kind: "division_by_zero" } }),
    e(r(2n), { error: { code: "n/0", kind: "division_by_zero" } }),
    e(r(99n)),
  ]);
  assert.deepEqual(
    rollWithDuplicateErrorCodes,
    [
      { prefix: "X =", value: "10", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "", remainder: undefined, errorCode: "n/0" },
      { prefix: "  =", value: "99", remainder: undefined, errorCode: undefined },
    ],
    "duplicate consecutive error codes suppress later matching error rows in the roll",
  );

  const nonConsecutiveDuplicateErrors = buildRollRows([
    e(r(10n), { error: { code: "n/0", kind: "division_by_zero" } }),
    e(r(11n)),
    e(r(12n), { error: { code: "n/0", kind: "division_by_zero" } }),
  ]);
  assert.deepEqual(
    nonConsecutiveDuplicateErrors,
    [
      { prefix: "X =", value: "", remainder: undefined, errorCode: "n/0" },
      { prefix: "  =", value: "11", remainder: undefined, errorCode: undefined },
      { prefix: "  =", value: "", remainder: undefined, errorCode: "n/0" },
    ],
    "non-consecutive duplicate errors are preserved",
  );

  const base = initialState();
  assert.equal(resolveActiveVisualizerPanel(base), "total", "default active visualizer resolves to total panel");

  const withFeedOn: GameState = {
    ...base,
    ui: {
      ...base.ui,
      activeVisualizer: "feed",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withFeedOn), "feed", "FEED on activates feed panel");

  const withFeedAndGraphOn: GameState = {
    ...withFeedOn,
    ui: {
      ...withFeedOn.ui,
      activeVisualizer: "graph",
    },
  };
  assert.equal(
    resolveActiveVisualizerPanel(withFeedAndGraphOn),
    "graph",
    "graph active visualizer wins when selected",
  );
};
