import assert from "node:assert/strict";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow } from "../src/ui/modules/visualizers/graphModel.js";
import type { CalculatorValue, RollEntry } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): { kind: "rational"; value: { num: bigint; den: bigint } } => ({
  kind: "rational",
  value: { num, den },
});

const e = (y: RollEntry["y"], patch: Partial<RollEntry> = {}): RollEntry => ({ y, ...patch });

export const runLegacyGraphRenderModelTests = (): void => {
  const seed: CalculatorValue = r(4n);
  assert.deepEqual(
    buildGraphPoints([e(r(8n)), e(r(-3n), { remainder: { num: 5n, den: 2n } })], seed),
    [
      { x: 0, y: 4, kind: "seed", hasError: false },
      { x: 1, y: 8, kind: "roll", hasError: false },
      { x: 2, y: -3, kind: "roll", hasError: false },
      { x: 2, y: 2.5, kind: "remainder", hasError: false },
    ],
    "legacy renderer graph points are seed-first and include same-x remainder points",
  );

  assert.deepEqual(buildGraphXWindow(24), { min: 0, max: 25 }, "legacy x-window keeps 0..25 below threshold");
  assert.deepEqual(buildGraphXWindow(25), { min: 1, max: 25 }, "legacy x-window slides at 25 max index");

  assert.deepEqual(
    buildGraphYWindow(3),
    { min: -999, max: 999 },
    "legacy y-window is fixed by unlocked digit range",
  );
  assert.deepEqual(buildGraphYWindow(0), { min: -9, max: 9 }, "legacy y-window clamps minimum digit count to one");
};
