import assert from "node:assert/strict";
import {
  buildGraphPoints,
  buildGraphXWindow,
  buildGraphYWindow,
  isGraphRenderable,
  resolveGraphCycleOverlaySegments,
} from "../src/ui/modules/visualizers/graphModel.js";
import { toExplicitComplexCalculatorValue, toRationalScalarValue } from "../src/domain/calculatorValue.js";
import type { RollEntry } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): { kind: "rational"; value: { num: bigint; den: bigint } } => ({
  kind: "rational",
  value: { num, den },
});

const e = (y: RollEntry["y"], patch: Partial<RollEntry> = {}): RollEntry => ({ y, ...patch });

export const runGraphDisplayTests = (): void => {
  assert.deepEqual(buildGraphPoints([]), [], "empty roll returns no graph points");
  assert.equal(isGraphRenderable([]), false, "empty roll is not graph-renderable");

  assert.deepEqual(
    buildGraphPoints([e(r(13n)), e(r(5n)), e(r(-2n)), e(r(99n))]),
    [
      { x: 0, y: 13, kind: "seed", hasError: false },
      { x: 1, y: 5, kind: "roll", hasError: false },
      { x: 2, y: -2, kind: "roll", hasError: false },
      { x: 3, y: 99, kind: "roll", hasError: false },
    ],
    "graph points include seed at x=0 and roll entries at x=index+1",
  );
  assert.equal(isGraphRenderable([e(r(13n)), e(r(5n))]), true, "non-empty rational roll is graph-renderable");

  const huge = 9007199254740993n;
  const hugePoint = buildGraphPoints([e(r(0n)), e(r(huge))])[1];
  assert.equal(hugePoint.x, 1, "large values still map to roll index+1");
  assert.equal(
    Number.isSafeInteger(hugePoint.y),
    false,
    "bigint graph values convert to number and may lose precision beyond safe range",
  );

  const mixedWithNaN = buildGraphPoints([
    e(r(0n)),
    e(r(7n)),
    e({ kind: "nan" }),
    e(r(8n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }),
    e({ kind: "nan" }, { remainder: { num: 3n, den: 2n } }),
  ]);
  assert.deepEqual(
    mixedWithNaN,
    [
      { x: 0, y: 0, kind: "seed", hasError: false },
      { x: 1, y: 7, kind: "roll", hasError: false },
      { x: 3, y: 8, kind: "roll", hasError: true },
      { x: 4, y: 1.5, kind: "remainder", hasError: false },
    ],
    "graph skips NaN roll rows, marks rational errors, and still plots remainders",
  );

  const withDuplicateErrorCodes = buildGraphPoints([
    e(r(0n)),
    e(r(1n)),
    e(r(2n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }),
    e(r(3n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }),
    e(r(4n)),
  ]);
  assert.deepEqual(
    withDuplicateErrorCodes,
    [
      { x: 0, y: 0, kind: "seed", hasError: false },
      { x: 1, y: 1, kind: "roll", hasError: false },
      { x: 2, y: 2, kind: "roll", hasError: true },
      { x: 3, y: 3, kind: "roll", hasError: true },
      { x: 4, y: 4, kind: "roll", hasError: false },
    ],
    "graph preserves consecutive duplicate error-coded rows",
  );

  const withNonConsecutiveDuplicates = buildGraphPoints([
    e(r(0n)),
    e(r(1n), { error: { code: "n/0", kind: "division_by_zero" } }),
    e(r(2n)),
    e(r(3n), { error: { code: "n/0", kind: "division_by_zero" } }),
  ]);
  assert.deepEqual(
    withNonConsecutiveDuplicates,
    [
      { x: 0, y: 0, kind: "seed", hasError: false },
      { x: 1, y: 1, kind: "roll", hasError: true },
      { x: 2, y: 2, kind: "roll", hasError: false },
      { x: 3, y: 3, kind: "roll", hasError: true },
    ],
    "graph keeps non-consecutive duplicate error codes too",
  );

  const withComplexRows = buildGraphPoints([
    e(r(0n)),
    e(
      toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 7n, den: 1n }),
        toRationalScalarValue({ num: -3n, den: 1n }),
      ),
    ),
    e(
      toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: -2n, den: 1n }),
        toRationalScalarValue({ num: 5n, den: 1n }),
      ),
    ),
  ]);
  assert.deepEqual(
    withComplexRows,
    [
      { x: 0, y: 0, kind: "seed", hasError: false },
      { x: 0, y: 0, kind: "imaginary", hasError: false },
      { x: 1, y: 7, kind: "roll", hasError: false },
      { x: 1, y: -3, kind: "imaginary", hasError: false },
      { x: 2, y: -2, kind: "roll", hasError: false },
      { x: 2, y: 5, kind: "imaginary", hasError: false },
    ],
    "graphs with non-zero imaginary components include an imaginary channel point at every plotted x, including zeros",
  );

  const withoutNonZeroImaginary = buildGraphPoints([
    e(r(0n)),
    e(
      toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 7n, den: 1n }),
        toRationalScalarValue({ num: 0n, den: 1n }),
      ),
    ),
    e(r(2n)),
  ]);
  assert.deepEqual(
    withoutNonZeroImaginary,
    [
      { x: 0, y: 0, kind: "seed", hasError: false },
      { x: 1, y: 7, kind: "roll", hasError: false },
      { x: 2, y: 2, kind: "roll", hasError: false },
    ],
    "zero-imaginary points stay hidden when no non-zero imaginary values are present in the graph",
  );

  assert.deepEqual(buildGraphXWindow(0), { min: 0, max: 25 }, "empty roll uses default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(10), { min: 0, max: 25 }, "short roll keeps default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(25), { min: 1, max: 25 }, "window snaps to last 25 indices at threshold");
  assert.deepEqual(buildGraphXWindow(26), { min: 2, max: 26 }, "window slides to latest 25 indices");
  assert.deepEqual(buildGraphXWindow(100), { min: 76, max: 100 }, "window tracks only the latest 25 indices");

  assert.deepEqual(buildGraphYWindow([]), { min: 0, max: 9 }, "empty roll uses [0, radix-1] y window");
  assert.deepEqual(
    buildGraphYWindow([e(r(0n))]),
    { min: 0, max: 9 },
    "zero-only plotted values keep y window at [0, radix-1]",
  );
  assert.deepEqual(
    buildGraphYWindow([e(r(-12n)), e(r(-1n))]),
    { min: -99, max: 0 },
    "negative-only plotted values set max to 0 and min to snapped negative tier",
  );
  assert.deepEqual(
    buildGraphYWindow([e(r(12n)), e(r(1n))]),
    { min: 0, max: 99 },
    "positive-only plotted values set min to 0 and max to snapped positive tier",
  );
  assert.deepEqual(
    buildGraphYWindow([e(r(-1n, 2n)), e(r(1234n, 100n))]),
    { min: -9, max: 99 },
    "bounds use sign-aware rounding before tier snap (floor for negatives, ceil for positives)",
  );
  assert.deepEqual(
    buildGraphYWindow([
      e(r(0n)),
      e(
        toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: -6n, den: 1n }),
          toRationalScalarValue({ num: 900n, den: 1n }),
        ),
      ),
      e(
        toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 6265n, den: 1n }),
          toRationalScalarValue({ num: 5n, den: 1n }),
        ),
      ),
      e(
        toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 5n, den: 1n }),
          toRationalScalarValue({ num: -10n, den: 1n }),
        ),
      ),
    ]),
    { min: -99, max: 9999 },
    "complex roll components both contribute to independent positive/negative axis tiers",
  );
  assert.deepEqual(
    buildGraphYWindow([
      e(r(1n), { remainder: { num: -500n, den: 1n } }),
      e(r(2n), { remainder: { num: 700n, den: 1n } }),
    ]),
    { min: 0, max: 9 },
    "remainder-only extremes do not affect y-window bounds",
  );

  const cycleSampleA = buildGraphPoints([e(r(1n)), e(r(2n)), e(r(3n)), e(r(4n)), e(r(5n)), e(r(6n)), e(r(7n)), e(r(4n)), e(r(5n))]);
  assert.deepEqual(
    resolveGraphCycleOverlaySegments(cycleSampleA, {
      historyEnabled: true,
      cycle: { i: 3, j: 7, transientLength: 3, periodLength: 4 },
      xWindow: { min: 0, max: 25 },
    }),
    [
      { kind: "chain", from: { x: 4, y: 5 }, to: { x: 5, y: 6 } },
      { kind: "chain", from: { x: 5, y: 6 }, to: { x: 6, y: 7 } },
      { kind: "chain", from: { x: 6, y: 7 }, to: { x: 7, y: 4 } },
      { kind: "chain", from: { x: 7, y: 4 }, to: { x: 8, y: 5 } },
      { kind: "closure", from: { x: 4, y: 5 }, to: { x: 8, y: 5 } },
    ],
    "cycle overlay uses latest periodLength+1 points and adds closure for equal start/end y",
  );

  const cycleSampleB = buildGraphPoints([
    e(r(1n)),
    e(r(2n)),
    e(r(3n)),
    e(r(4n)),
    e(r(5n)),
    e(r(6n)),
    e(r(7n)),
    e(r(4n)),
    e(r(5n)),
    e(r(6n)),
  ]);
  assert.deepEqual(
    resolveGraphCycleOverlaySegments(cycleSampleB, {
      historyEnabled: true,
      cycle: { i: 3, j: 7, transientLength: 3, periodLength: 4 },
      xWindow: { min: 0, max: 25 },
    }),
    [
      { kind: "chain", from: { x: 5, y: 6 }, to: { x: 6, y: 7 } },
      { kind: "chain", from: { x: 6, y: 7 }, to: { x: 7, y: 4 } },
      { kind: "chain", from: { x: 7, y: 4 }, to: { x: 8, y: 5 } },
      { kind: "chain", from: { x: 8, y: 5 }, to: { x: 9, y: 6 } },
      { kind: "closure", from: { x: 5, y: 6 }, to: { x: 9, y: 6 } },
    ],
    "cycle overlay advances to the most recent cycle window as roll grows",
  );

  assert.deepEqual(
    resolveGraphCycleOverlaySegments(cycleSampleA, {
      historyEnabled: false,
      cycle: { i: 3, j: 7, transientLength: 3, periodLength: 4 },
      xWindow: { min: 0, max: 25 },
    }),
    [],
    "history-off disables cycle overlay rendering",
  );

  assert.deepEqual(
    resolveGraphCycleOverlaySegments(cycleSampleA, {
      historyEnabled: true,
      cycle: null,
      xWindow: { min: 0, max: 25 },
    }),
    [],
    "missing cycle metadata disables cycle overlay rendering",
  );

  const clippedSegments = resolveGraphCycleOverlaySegments(cycleSampleA, {
    historyEnabled: true,
    cycle: { i: 3, j: 7, transientLength: 3, periodLength: 4 },
    xWindow: { min: 6.5, max: 8 },
  });
  assert.equal(
    clippedSegments.length > 0,
    true,
    "clip window preserves partially visible cycle segments",
  );
  assert.equal(
    clippedSegments.every((segment) =>
      segment.from.x >= 6.5 && segment.from.x <= 8 && segment.to.x >= 6.5 && segment.to.x <= 8),
    true,
    "clipped cycle segments remain within visible x window",
  );
};


