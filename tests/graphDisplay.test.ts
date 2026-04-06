import assert from "node:assert/strict";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow, isGraphRenderable } from "../src/ui/modules/visualizers/graphModel.js";
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
      { x: 1, y: 7, kind: "roll", hasError: false },
      { x: 1, y: -3, kind: "imaginary", hasError: false },
      { x: 2, y: -2, kind: "roll", hasError: false },
      { x: 2, y: 5, kind: "imaginary", hasError: false },
    ],
    "complex roll rows map real and imaginary components as separate points at the same x index",
  );

  assert.deepEqual(buildGraphXWindow(0), { min: 0, max: 25 }, "empty roll uses default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(10), { min: 0, max: 25 }, "short roll keeps default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(25), { min: 1, max: 25 }, "window snaps to last 25 indices at threshold");
  assert.deepEqual(buildGraphXWindow(26), { min: 2, max: 26 }, "window slides to latest 25 indices");
  assert.deepEqual(buildGraphXWindow(100), { min: 76, max: 100 }, "window tracks only the latest 25 indices");

  assert.deepEqual(buildGraphYWindow(1), { min: -9, max: 9 }, "one unlocked total digit sets y-axis to -9..9");
  assert.deepEqual(buildGraphYWindow(2), { min: -99, max: 99 }, "two unlocked total digits sets y-axis to -99..99");
  assert.deepEqual(buildGraphYWindow(0), { min: -9, max: 9 }, "y-axis helper clamps minimum digit count to one");
};


