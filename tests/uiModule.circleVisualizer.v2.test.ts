import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import {
  detectResidueWheelSpec,
  projectResidueWheelPoints,
  resolveCircleRenderMode,
} from "../src_v2/ui/modules/visualizers/circleModel.js";
import type { GameState, RollEntry } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): RollEntry["y"] => ({
  kind: "rational",
  value: { num, den },
});
const e = (y: RollEntry["y"], patch: Partial<RollEntry> = {}): RollEntry => ({ y, ...patch });

export const runUiModuleCircleVisualizerV2Tests = (): void => {
  const base = initialState();

  const withFinalMod: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      operationSlots: [
        { operator: "+", operand: 4n },
        { operator: "\u27E1", operand: 3n },
      ],
    },
  };
  const wheelSpec = detectResidueWheelSpec(withFinalMod);
  assert.ok(wheelSpec, "final modulo slot enables residue-wheel mode");
  assert.equal(wheelSpec?.modulus, 3n, "detected modulus matches final modulo operand");
  assert.equal(resolveCircleRenderMode(withFinalMod), "residue_wheel", "render mode resolves to residue wheel");

  const withModOne: GameState = {
    ...withFinalMod,
    calculator: {
      ...withFinalMod.calculator,
      operationSlots: [
        { operator: "+", operand: 4n },
        { operator: "\u27E1", operand: 1n },
      ],
    },
  };
  assert.equal(detectResidueWheelSpec(withModOne), null, "modulo one does not enable residue-wheel mode");

  const withoutFinalMod: GameState = {
    ...withFinalMod,
    calculator: {
      ...withFinalMod.calculator,
      operationSlots: [
        { operator: "\u27E1", operand: 3n },
        { operator: "+", operand: 1n },
      ],
    },
  };
  assert.equal(detectResidueWheelSpec(withoutFinalMod), null, "missing final modulo slot disables residue-wheel mode");

  const withDivideSlot: GameState = {
    ...withFinalMod,
    calculator: {
      ...withFinalMod.calculator,
      operationSlots: [
        { operator: "/", operand: 2n },
        { operator: "\u27E1", operand: 3n },
      ],
    },
  };
  assert.equal(
    detectResidueWheelSpec(withDivideSlot),
    null,
    "slot chains containing division do not enable residue-wheel mode",
  );

  const residueProjection = projectResidueWheelPoints(
    [e(r(1n)), e(r(2n)), e(r(3n)), e(r(4n))],
    { modulus: 3n, modulusNumber: 3 },
    50,
    48,
  );
  assert.deepEqual(
    residueProjection.dots.map((dot) => dot.residue),
    [1, 2, 0, 1],
    "residue-wheel projection maps integer y values to canonical residues",
  );

  const negativeProjection = projectResidueWheelPoints(
    [e(r(-1n)), e(r(-4n)), e(r(5n))],
    { modulus: 3n, modulusNumber: 3 },
    50,
    48,
  );
  assert.deepEqual(
    negativeProjection.dots.map((dot) => dot.residue),
    [2, 2, 2],
    "negative integer y values normalize to canonical non-negative residues",
  );

  const withInvalidEntries = projectResidueWheelPoints(
    [
      e(r(1n)),
      e(r(2n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }),
      e({ kind: "nan" }),
      e(r(7n, 2n)),
      e(r(2n)),
    ],
    { modulus: 3n, modulusNumber: 3 },
    50,
    48,
  );
  assert.deepEqual(
    withInvalidEntries.dots.map((dot) => dot.residue),
    [1, 2],
    "invalid wheel entries are skipped and not rendered as residue points",
  );
  assert.deepEqual(
    withInvalidEntries.segments.map((segment) => segment.length),
    [1, 1],
    "invalid wheel entries break line continuity into separate segments",
  );

  const triangleProjection = projectResidueWheelPoints(
    [e(r(2n)), e(r(0n)), e(r(1n)), e(r(2n)), e(r(0n)), e(r(1n))],
    { modulus: 3n, modulusNumber: 3 },
    50,
    48,
  );
  assert.equal(triangleProjection.segments.length, 1, "continuous cycle yields a single contiguous segment");
  assert.equal(triangleProjection.segments[0].length, 6, "all valid cycle points participate in the trace");
  assert.equal(
    new Set(triangleProjection.dots.map((dot) => dot.residue)).size,
    3,
    "mod 3 cycle visits exactly three perimeter slices",
  );
  for (const dot of triangleProjection.dots) {
    const distanceFromCenter = Math.hypot(dot.px - 50, dot.py - 50);
    assert.ok(
      Math.abs(distanceFromCenter - 48) < 1e-6,
      "residue-wheel points lie on the perimeter radius",
    );
  }
};

