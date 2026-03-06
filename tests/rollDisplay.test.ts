import assert from "node:assert/strict";
import { buildFeedTableRows, buildFeedTableViewModel, buildRollLines, buildRollRows, buildRollViewModel } from "../src_v2/ui/shared/readModel.js";
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

  assert.deepEqual(
    buildFeedTableRows(r(42n), []),
    [{ x: 0, yText: "42", hasRemainder: false, hasError: false }],
    "feed table renders seed-only row",
  );

  assert.deepEqual(
    buildFeedTableRows(r(42n), [e(r(50n))]),
    [
      { x: 0, yText: "42", hasRemainder: false, hasError: false },
      { x: 1, yText: "50", hasRemainder: false, hasError: false },
    ],
    "feed table appends first calculation row after seed",
  );

  const feedWithErrorRows = buildFeedTableRows(r(10n), [
    e(r(11n), { error: { code: "n/0", kind: "division_by_zero" } }),
    e(r(12n), { error: { code: "n/0", kind: "division_by_zero" } }),
  ]);
  assert.deepEqual(
    feedWithErrorRows,
    [
      { x: 0, yText: "10", hasRemainder: false, hasError: false },
      { x: 1, yText: "", hasRemainder: false, hasError: true },
      { x: 2, yText: "", hasRemainder: false, hasError: true },
    ],
    "feed table keeps one row per error entry without deduplication",
  );

  const feedWindowWithRemainder = buildFeedTableViewModel(
    r(1n),
    [
      e(r(2n)),
      e(r(3n)),
      e(r(4n)),
      e(r(5n)),
      e(r(6n)),
      e(r(7n)),
      e(r(8n), { remainder: rv(1n, 2n) }),
      e(r(9n)),
    ],
  );
  assert.equal(feedWindowWithRemainder.rows.length, 7, "feed table keeps rolling window of seven rows");
  assert.equal(feedWindowWithRemainder.rows[0]?.x, 2, "feed table drops oldest rows when window exceeds seven");
  assert.equal(feedWindowWithRemainder.showRColumn, true, "feed table shows r column when visible rows contain remainder");
  assert.equal(feedWindowWithRemainder.xWidth, 5, "feed X column width is fixed at five");
  assert.equal(feedWindowWithRemainder.rWidth, 5, "feed r column width is fixed at five");

  const feedWindowWithoutVisibleRemainder = buildFeedTableViewModel(
    r(1n),
    [
      e(r(2n), { remainder: rv(1n, 2n) }),
      e(r(3n)),
      e(r(4n)),
      e(r(5n)),
      e(r(6n)),
      e(r(7n)),
      e(r(8n)),
      e(r(9n)),
    ],
  );
  assert.equal(
    feedWindowWithoutVisibleRemainder.showRColumn,
    false,
    "feed table hides r column when remainder is outside the visible seven-row window",
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
