import assert from "node:assert/strict";
import { executeSlots } from "../src/domain/engine.js";
import type { RationalValue } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): RationalValue => ({ num, den });

export const runEngineTests = (): void => {
  assert.deepEqual(executeSlots(r(42n), []), { ok: true, total: r(42n) }, "identity behavior when no slots exist");

  const result = executeSlots(r(10n), [{ operator: "+", operand: 5n }]);
  assert.deepEqual(result, { ok: true, total: r(15n) }, "single plus slot executes");

  const subtractionResult = executeSlots(r(10n), [{ operator: "-", operand: 3n }]);
  assert.deepEqual(subtractionResult, { ok: true, total: r(7n) }, "single minus slot executes");

  const multiplicationResult = executeSlots(r(10n), [{ operator: "*", operand: 3n }]);
  assert.deepEqual(multiplicationResult, { ok: true, total: r(30n) }, "single multiply slot executes");

  const divisionResult = executeSlots(r(10n), [{ operator: "/", operand: 4n }]);
  assert.deepEqual(divisionResult, { ok: true, total: r(5n, 2n) }, "single division slot returns reduced fraction");

  const mixedResult = executeSlots(r(10n), [
    { operator: "+", operand: 2n },
    { operator: "/", operand: 4n },
  ]);
  assert.deepEqual(mixedResult, { ok: true, total: r(3n) }, "slots execute left-to-right with division support");

  const divByZero = executeSlots(r(10n), [{ operator: "/", operand: 0n }]);
  assert.deepEqual(divByZero, { ok: false, reason: "division_by_zero" }, "division by zero returns explicit failure");

  const euclidResult = executeSlots(r(10n), [{ operator: "#", operand: 4n }]);
  assert.deepEqual(
    euclidResult,
    { ok: true, total: r(2n), euclidRemainder: r(2n) },
    "euclidean division returns integer quotient and remainder",
  );

  const euclidNegative = executeSlots(r(-10n), [{ operator: "#", operand: 4n }]);
  assert.deepEqual(
    euclidNegative,
    { ok: true, total: r(-3n), euclidRemainder: r(2n) },
    "euclidean division on negative totals uses floor quotient with non-negative remainder",
  );

  const euclidFromFraction = executeSlots(r(5n, 2n), [{ operator: "#", operand: 2n }]);
  assert.deepEqual(
    euclidFromFraction,
    { ok: true, total: r(1n), euclidRemainder: r(1n, 2n) },
    "euclidean division on fractional totals preserves fractional remainder",
  );

  const mixedEuclid = executeSlots(r(20n), [
    { operator: "#", operand: 6n },
    { operator: "+", operand: 1n },
    { operator: "#", operand: 2n },
  ]);
  assert.deepEqual(
    mixedEuclid,
    { ok: true, total: r(2n), euclidRemainder: r(0n) },
    "mixed pipeline reports the final euclidean remainder",
  );
};
