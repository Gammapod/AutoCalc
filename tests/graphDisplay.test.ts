import assert from "node:assert/strict";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow, isGraphRenderable } from "../src_v2/ui/modules/visualizers/graphModel.js";
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
    buildGraphPoints([e(r(5n)), e(r(-2n)), e(r(99n))]),
    [
      { x: 0, y: 5, hasError: false },
      { x: 1, y: -2, hasError: false },
      { x: 2, y: 99, hasError: false },
    ],
    "graph points map index to x and roll value to y",
  );
  assert.equal(isGraphRenderable([e(r(5n))]), true, "non-empty rational roll is graph-renderable");

  const huge = 9007199254740993n;
  const hugePoint = buildGraphPoints([e(r(huge))])[0];
  assert.equal(hugePoint.x, 0, "large values still map to their index");
  assert.equal(
    Number.isSafeInteger(hugePoint.y),
    false,
    "bigint graph values convert to number and may lose precision beyond safe range",
  );

  const mixedWithNaN = buildGraphPoints([
    e(r(7n)),
    e({ kind: "nan" }),
    e(r(8n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }),
  ]);
  assert.deepEqual(
    mixedWithNaN,
    [
      { x: 0, y: 7, hasError: false },
      { x: 1, y: 8, hasError: true },
    ],
    "graph skips NaN roll rows and marks error-associated points",
  );

  const withDuplicateErrorCodes = buildGraphPoints([
    e(r(1n)),
    e(r(2n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }),
    e(r(3n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }),
    e(r(4n)),
  ]);
  assert.deepEqual(
    withDuplicateErrorCodes,
    [
      { x: 0, y: 1, hasError: false },
      { x: 1, y: 2, hasError: true },
      { x: 2, y: 4, hasError: false },
    ],
    "graph suppresses plotting rows where an error code is repeated later in the same roll",
  );

  const withNonConsecutiveDuplicates = buildGraphPoints([
    e(r(1n), { error: { code: "n/0", kind: "division_by_zero" } }),
    e(r(2n)),
    e(r(3n), { error: { code: "n/0", kind: "division_by_zero" } }),
  ]);
  assert.deepEqual(
    withNonConsecutiveDuplicates,
    [
      { x: 0, y: 1, hasError: true },
      { x: 1, y: 2, hasError: false },
      { x: 2, y: 3, hasError: true },
    ],
    "graph keeps non-consecutive duplicate error codes",
  );

  assert.deepEqual(buildGraphXWindow(0), { min: 0, max: 25 }, "empty roll uses default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(10), { min: 0, max: 25 }, "short roll keeps default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(25), { min: 0, max: 24 }, "window snaps to last 25 indices at threshold");
  assert.deepEqual(buildGraphXWindow(26), { min: 1, max: 25 }, "window slides to latest 25 indices");
  assert.deepEqual(buildGraphXWindow(100), { min: 75, max: 99 }, "window tracks only the latest 25 indices");

  assert.deepEqual(buildGraphYWindow(1), { min: -9, max: 9 }, "one unlocked total digit sets y-axis to -9..9");
  assert.deepEqual(buildGraphYWindow(2), { min: -99, max: 99 }, "two unlocked total digits sets y-axis to -99..99");
  assert.deepEqual(buildGraphYWindow(0), { min: -9, max: 9 }, "y-axis helper clamps minimum digit count to one");
};

