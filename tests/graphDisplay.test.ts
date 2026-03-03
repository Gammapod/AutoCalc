import assert from "node:assert/strict";
import { buildGraphPoints, buildGraphXWindow, isGraphVisible } from "../src/ui/render.js";

const r = (num: bigint, den: bigint = 1n): { kind: "rational"; value: { num: bigint; den: bigint } } => ({
  kind: "rational",
  value: { num, den },
});

export const runGraphDisplayTests = (): void => {
  assert.deepEqual(buildGraphPoints([]), [], "empty roll returns no graph points");
  assert.equal(isGraphVisible([]), false, "empty roll hides graph plotting");

  assert.deepEqual(
    buildGraphPoints([r(5n), r(-2n), r(99n)]),
    [
      { x: 0, y: 5, hasError: false },
      { x: 1, y: -2, hasError: false },
      { x: 2, y: 99, hasError: false },
    ],
    "graph points map index to x and roll value to y",
  );
  assert.equal(isGraphVisible([r(5n)]), true, "non-empty roll shows graph plotting");

  const huge = 9007199254740993n;
  const hugePoint = buildGraphPoints([r(huge)])[0];
  assert.equal(hugePoint.x, 0, "large values still map to their index");
  assert.equal(
    Number.isSafeInteger(hugePoint.y),
    false,
    "bigint graph values convert to number and may lose precision beyond safe range",
  );

  const mixedWithNaN = buildGraphPoints([r(7n), { kind: "nan" }, r(8n)], [{ rollIndex: 2, code: "x∉[-R,R]", kind: "overflow" }]);
  assert.deepEqual(
    mixedWithNaN,
    [
      { x: 0, y: 7, hasError: false },
      { x: 1, y: 8, hasError: true },
    ],
    "graph skips NaN roll rows and marks error-associated points",
  );

  assert.deepEqual(buildGraphXWindow(0), { min: 0, max: 25 }, "empty roll uses default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(10), { min: 0, max: 25 }, "short roll keeps default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(25), { min: 0, max: 24 }, "window snaps to last 25 indices at threshold");
  assert.deepEqual(buildGraphXWindow(26), { min: 1, max: 25 }, "window slides to latest 25 indices");
  assert.deepEqual(buildGraphXWindow(100), { min: 75, max: 99 }, "window tracks only the latest 25 indices");
};
