import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { buildExecutionStagePlan } from "../src/domain/executionPlan.js";
import {
  buildExecutionPlanIR,
  buildExecutionPlanIRFromStages,
  materializeSlotsFromExecutionPlanIR,
} from "../src/domain/executionPlanIR.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { DELTA_RANGE_CLAMP_FLAG } from "../src/domain/state.js";
import type { Slot } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runExecutionPlanIRBuilderParityTests = (): void => {
  const seed = r(7n);
  const simpleSlots: Slot[] = [
    { operator: KEY_ID.op_add, operand: 2n },
    { kind: "unary", operator: KEY_ID.unary_neg },
  ];
  const symbolicSlots: Slot[] = [
    { operator: KEY_ID.op_add, operand: { type: "constant", value: "pi" } },
  ];

  const builtSimpleA = buildExecutionPlanIR(seed, simpleSlots);
  const builtSimpleB = buildExecutionPlanIR(seed, simpleSlots);
  assert.deepEqual(builtSimpleA, builtSimpleB, "slot->IR build is deterministic for equivalent input");
  assert.equal(builtSimpleA.plan.metadata.terminalMode, "direct", "no-wrap slot plans are direct-terminal");
  assert.equal(builtSimpleA.plan.steps.length, 2, "multi-slot plan creates ordered IR steps");
  assert.equal(
    builtSimpleA.plan.steps[0]?.kind === "binary" && builtSimpleA.plan.steps[0].operand.kind === "digit",
    true,
    "bigint operands are encoded as digit operands in IR",
  );
  assert.equal(
    builtSimpleA.plan.steps[1]?.kind === "unary" && builtSimpleA.plan.steps[1].policy.exactness === "exact_first",
    true,
    "unary steps include policy metadata hooks",
  );

  const builtSymbolic = buildExecutionPlanIR(seed, symbolicSlots);
  assert.equal(
    builtSymbolic.plan.steps[0]?.kind === "binary" && builtSymbolic.plan.steps[0].operand.kind === "symbolic_operand",
    true,
    "non-bigint operands are encoded as symbolic_operand in IR",
  );

  const staged = buildExecutionStagePlan(simpleSlots, {
    ui: {
      buttonFlags: {
        [DELTA_RANGE_CLAMP_FLAG]: true,
      },
    },
    settings: {
      visualizer: "total",
      wrapper: "none",
      base: "decimal",
      stepExpansion: "off",
    },
  });
  const builtFromStages = buildExecutionPlanIRFromStages(seed, staged);
  assert.equal(builtFromStages.hasWrapTail, true, "stage-derived IR tracks synthetic wrap-tail metadata");
  assert.equal(builtFromStages.plan.metadata.terminalMode, "wrap_tail", "wrap-tail metadata sets terminal mode");
  assert.equal(builtFromStages.plan.metadata.source, "stages", "stage builder marks plan source");
  const materialized = materializeSlotsFromExecutionPlanIR(builtFromStages.plan);
  const materializedBinary = materialized[0] as Extract<Slot, { kind?: "binary" }> | undefined;
  const sourceBinary = simpleSlots[0] as Extract<Slot, { kind?: "binary" }> | undefined;
  assert.equal(materialized.length, simpleSlots.length, "materialized slots preserve slot count");
  assert.equal(materialized[0]?.kind ?? "binary", "binary", "first slot remains binary after IR materialization");
  assert.equal(materialized[0]?.operator, simpleSlots[0]?.operator, "binary operator identity is preserved");
  assert.equal(
    materializedBinary?.operand ?? null,
    sourceBinary?.operand ?? null,
    "binary operand is preserved",
  );
  assert.equal(materialized[1]?.kind, "unary", "second slot remains unary after IR materialization");
  assert.equal(materialized[1]?.operator, simpleSlots[1]?.operator, "unary operator identity is preserved");

  const emptyPlan = buildExecutionPlanIR(seed, []);
  assert.equal(emptyPlan.plan.steps.length, 0, "empty slot lists compile to empty IR steps");
};
