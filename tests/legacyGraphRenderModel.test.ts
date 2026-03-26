import assert from "node:assert/strict";
import { buildGraphPoints } from "../src/ui/modules/visualizers/graphModel.js";
import type { RollEntry } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): { kind: "rational"; value: { num: bigint; den: bigint } } => ({
  kind: "rational",
  value: { num, den },
});

const e = (y: RollEntry["y"], patch: Partial<RollEntry> = {}): RollEntry => ({ y, ...patch });

export const runLegacyGraphRenderModelTests = (): void => {
  assert.deepEqual(
    buildGraphPoints([e(r(4n)), e(r(8n)), e(r(-3n), { remainder: { num: 5n, den: 2n } })]),
    [
      { x: 0, y: 4, kind: "seed", hasError: false },
      { x: 1, y: 8, kind: "roll", hasError: false },
      { x: 2, y: -3, kind: "roll", hasError: false },
      { x: 2, y: 2.5, kind: "remainder", hasError: false },
    ],
    "legacy renderer graph points are seed-first and include same-x remainder points",
  );
};

