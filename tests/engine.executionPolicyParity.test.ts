import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import {
  toComplexCalculatorValue,
  toNanCalculatorValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { executePlanIR, executePlanIRLegacyPath } from "../src/domain/engine.js";
import { buildExecutionPlanIR } from "../src/domain/executionPlanIR.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import type { CalculatorValue, Slot } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): CalculatorValue =>
  toRationalCalculatorValue({ num, den });

const fixtures: Array<{ id: string; total: CalculatorValue; slots: Slot[] }> = [
  {
    id: "rational_happy_path",
    total: r(2n),
    slots: [{ operator: KEY_ID.op_add, operand: 3n }, { operator: KEY_ID.op_mul, operand: 5n }],
  },
  {
    id: "complex_addition_path",
    total: toComplexCalculatorValue(
      toRationalScalarValue({ num: 2n, den: 1n }),
      toRationalScalarValue({ num: 3n, den: 1n }),
    ),
    slots: [{ operator: KEY_ID.op_add, operand: 4n }],
  },
  {
    id: "unsupported_symbolic_operand",
    total: r(7n),
    slots: [{ operator: KEY_ID.op_mod, operand: { type: "constant", value: "pi" } }],
  },
  {
    id: "division_by_zero_path",
    total: r(10n),
    slots: [{ operator: KEY_ID.op_div, operand: 0n }],
  },
  {
    id: "nan_input_path",
    total: toNanCalculatorValue(),
    slots: [{ operator: KEY_ID.op_add, operand: 1n }],
  },
];

export const runEngineExecutionPolicyParityTests = (): void => {
  for (const fixture of fixtures) {
    const built = buildExecutionPlanIR(fixture.total, fixture.slots);
    const viaRegistry = executePlanIR(built.plan);
    const viaLegacy = executePlanIRLegacyPath(built.plan);
    assert.deepEqual(viaRegistry, viaLegacy, `execution policy parity fixture remains bit-for-bit (${fixture.id})`);
  }
};
