import assert from "node:assert/strict";
import { toExplicitComplexCalculatorValue, toRationalCalculatorValue, toRationalScalarValue } from "../src/domain/calculatorValue.js";
import type { RollEntry } from "../src/domain/types.js";
import { resolveGraphLayout } from "../src/ui/modules/visualizers/graphLayoutModel.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

const c = (reNum: bigint, imNum: bigint, den: bigint = 1n) =>
  toExplicitComplexCalculatorValue(
    toRationalScalarValue({ num: reNum, den }),
    toRationalScalarValue({ num: imNum, den }),
  );

const entry = (y: RollEntry["y"]): RollEntry => ({ y });

export const runUiModuleGraphLayoutModelV2Tests = (): void => {
  const empty = resolveGraphLayout([], 10, 0, 420, 250);
  assert.deepEqual(empty.yDomain, { min: 0, max: 9 }, "empty roll falls back to [0, radix-1]");
  assert.equal(empty.boundaryLabels.top, "9", "empty roll top boundary is radix-1");
  assert.equal(empty.boundaryLabels.bottom, "", "empty roll has no negative boundary label");
  assert.equal(empty.hasImaginary, false, "empty roll has no imaginary channel");

  const positiveOnly = resolveGraphLayout([entry(r(2n)), entry(r(12n))], 10, 2, 420, 250);
  assert.deepEqual(positiveOnly.yDomain, { min: 0, max: 99 }, "positive-only rolls clamp min to 0 and tier max up");

  const negativeOnly = resolveGraphLayout([entry(r(-1n)), entry(r(-12n))], 10, 2, 420, 250);
  assert.deepEqual(negativeOnly.yDomain, { min: -99, max: 0 }, "negative-only rolls clamp max to 0 and tier min down");

  const complexRange = resolveGraphLayout(
    [entry(c(-6n, 900n)), entry(c(6265n, 5n)), entry(c(5n, -10n))],
    10,
    3,
    420,
    250,
  );
  assert.deepEqual(complexRange.yDomain, { min: -99, max: 9999 }, "complex rolls use both real and imaginary components for bounds");
  assert.equal(complexRange.hasImaginary, true, "imaginary point presence is tracked from plotted points");
  assert.equal(complexRange.boundaryLabels.top, "9999\u00d7i", "nonzero top boundary appends ×i when imaginary points exist");
  assert.equal(complexRange.boundaryLabels.bottom, "-99\u00d7i", "nonzero bottom boundary appends ×i when imaginary points exist");

  const complexWithoutImagPoints = resolveGraphLayout([entry(c(10n, 0n))], 10, 1, 420, 250);
  assert.equal(complexWithoutImagPoints.hasImaginary, false, "zero imaginary components do not trigger imaginary channel");
  assert.equal(complexWithoutImagPoints.boundaryLabels.top, "99", "no ×i suffix is applied when no imaginary points are plotted");

  const shortLabels = resolveGraphLayout([entry(r(9n))], 10, 2, 420, 250);
  const longLabels = resolveGraphLayout([entry(r(999999n)), entry(r(-99999n))], 10, 2, 420, 250);
  assert.equal(shortLabels.plot.left, longLabels.plot.left, "left plot edge is fixed independent of label length");
  assert.equal(shortLabels.plot.right, longLabels.plot.right, "right plot edge is fixed independent of label length");
  assert.equal(shortLabels.style.overhangPx, longLabels.style.overhangPx, "grid overhang policy is deterministic");
};
