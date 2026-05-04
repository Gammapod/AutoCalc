import assert from "node:assert/strict";
import { ALG_CONSTANTS } from "../src/domain/algebraicScalar.js";
import { toAlgebraicScalarValue, toComplexCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { serializeRollEntriesForDebug } from "../src/infra/debug/rollStateSerializer.js";

export const runRollStateSerializerTests = (): void => {
  const state = initialState();
  const y = toComplexCalculatorValue(
    toAlgebraicScalarValue(ALG_CONSTANTS.rotate15Cos),
    toAlgebraicScalarValue(ALG_CONSTANTS.rotate15Sin),
  );

  state.calculator.rollEntries = [{ y }];

  const serialized = serializeRollEntriesForDebug(state);
  assert.doesNotThrow(
    () => JSON.stringify({ rollEntries: serialized }, null, 2),
    "debug roll serialization must be JSON-safe for canonical algebraic BigInt coefficients",
  );
  assert.deepEqual(
    serialized[0],
    {
      x: 0,
      y: {
        kind: "complex",
        value: {
          re: {
            kind: "alg",
            value: {
              sqrt2: { num: "1", den: "4" },
              sqrt6: { num: "1", den: "4" },
            },
          },
          im: {
            kind: "alg",
            value: {
              sqrt2: { num: "-1", den: "4" },
              sqrt6: { num: "1", den: "4" },
            },
          },
        },
      },
      d1: null,
      d2: null,
      r1: null,
      seedMinus1Y: null,
      seedPlus1Y: null,
    },
    "canonical algebraic scalar components are preserved in debug output with string coefficients",
  );
};
