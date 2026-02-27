import assert from "node:assert/strict";
import { buildGraphPoints, buildGraphXWindow, isGraphVisible } from "../src/ui/render.js";

const r = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });

export const runGraphDisplayTests = (): void => {
  assert.deepEqual(buildGraphPoints([]), [], "empty roll returns no graph points");
  assert.equal(isGraphVisible([]), false, "empty roll hides graph plotting");

  assert.deepEqual(
    buildGraphPoints([r(5n), r(-2n), r(99n)]),
    [
      { x: 0, y: 5 },
      { x: 1, y: -2 },
      { x: 2, y: 99 },
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

  assert.deepEqual(buildGraphXWindow(0), { min: 0, max: 25 }, "empty roll uses default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(10), { min: 0, max: 25 }, "short roll keeps default 0..25 x window");
  assert.deepEqual(buildGraphXWindow(25), { min: 0, max: 24 }, "window snaps to last 25 indices at threshold");
  assert.deepEqual(buildGraphXWindow(26), { min: 1, max: 25 }, "window slides to latest 25 indices");
  assert.deepEqual(buildGraphXWindow(100), { min: 75, max: 99 }, "window tracks only the latest 25 indices");
};
