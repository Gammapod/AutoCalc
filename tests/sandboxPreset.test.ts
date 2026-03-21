import assert from "node:assert/strict";
import { createSandboxState } from "../src/domain/sandboxPreset.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { toIndexFromCoord } from "../src/domain/keypadLayoutModel.js";
import { DELTA_RANGE_CLAMP_FLAG, EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG, MOD_ZERO_TO_DELTA_FLAG } from "../src/domain/state.js";

const keyAt = (state: ReturnType<typeof createSandboxState>, row: number, col: number): string | null => {
  const index = toIndexFromCoord({ row, col }, state.ui.keypadColumns, state.ui.keypadRows);
  const cell = state.ui.keyLayout[index];
  return cell?.kind === "key" ? cell.key : null;
};

const behaviorAt = (
  state: ReturnType<typeof createSandboxState>,
  row: number,
  col: number,
): unknown => {
  const index = toIndexFromCoord({ row, col }, state.ui.keypadColumns, state.ui.keypadRows);
  const cell = state.ui.keyLayout[index];
  return cell?.kind === "key" ? cell.behavior : undefined;
};

export const runSandboxPresetTests = (): void => {
  const sandbox = createSandboxState();

  assert.deepEqual(
    sandbox.lambdaControl,
    {
      maxPoints: 10,
      alpha: 4,
      beta: 7,
      gamma: 4,
      gammaMinRaised: true,
    },
    "sandbox lambda defaults are applied",
  );

  assert.equal(sandbox.ui.keypadColumns, 5, "sandbox keypad width is canonical");
  assert.equal(sandbox.ui.keypadRows, 8, "sandbox keypad height is canonical");
  assert.equal(keyAt(sandbox, 8, 5), KEY_ID.toggle_delta_range_clamp, "R8C5 mapped from screenshot");
  assert.deepEqual(
    behaviorAt(sandbox, 8, 5),
    { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG },
    "R8C5 is delta toggle behavior",
  );
  assert.equal(keyAt(sandbox, 8, 4), KEY_ID.viz_feed, "R8C4 mapped from screenshot");
  assert.equal(keyAt(sandbox, 8, 3), KEY_ID.viz_graph, "R8C3 mapped from screenshot");
  assert.equal(keyAt(sandbox, 8, 2), KEY_ID.viz_circle, "R8C2 mapped from screenshot");
  assert.equal(keyAt(sandbox, 8, 1), KEY_ID.viz_factorization, "R8C1 mapped from screenshot");
  assert.deepEqual(
    behaviorAt(sandbox, 7, 5),
    { type: "toggle_flag", flag: MOD_ZERO_TO_DELTA_FLAG },
    "R7C5 is mod-zero toggle behavior",
  );
  assert.equal(keyAt(sandbox, 7, 1), KEY_ID.exec_play_pause, "R7C1 is play/pause key id");
  assert.deepEqual(
    behaviorAt(sandbox, 7, 1),
    { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG },
    "R7C1 is play/pause behavior",
  );
  assert.equal(keyAt(sandbox, 6, 5), KEY_ID.op_gcd, "R6C5 is gcd");
  assert.equal(keyAt(sandbox, 5, 5), KEY_ID.op_lcm, "R5C5 is lcm");
  assert.equal(keyAt(sandbox, 4, 2), KEY_ID.unary_neg, "R4C2 is negation");
  assert.equal(keyAt(sandbox, 3, 2), KEY_ID.unary_dec, "R3C2 is decrement");
  assert.equal(keyAt(sandbox, 2, 2), KEY_ID.unary_inc, "R2C2 is increment");
  assert.equal(keyAt(sandbox, 3, 1), KEY_ID.op_sub, "R3C1 is subtraction");
  assert.equal(keyAt(sandbox, 2, 1), KEY_ID.op_add, "R2C1 is addition");
  assert.equal(keyAt(sandbox, 1, 1), KEY_ID.exec_equals, "R1C1 mapped from screenshot");
  assert.deepEqual(
    behaviorAt(sandbox, 1, 1),
    { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG },
    "R1C1 is equals auto-step toggle behavior",
  );

  assert.ok(Object.values(sandbox.unlocks.valueExpression).every(Boolean), "sandbox unlocks all value keys");
  assert.ok(Object.values(sandbox.unlocks.slotOperators).every(Boolean), "sandbox unlocks all slot operators");
  assert.ok(Object.values(sandbox.unlocks.unaryOperators).every(Boolean), "sandbox unlocks all unary operators");
  assert.ok(Object.values(sandbox.unlocks.utilities).every(Boolean), "sandbox unlocks all utility keys");
  assert.ok(Object.values(sandbox.unlocks.memory).every(Boolean), "sandbox unlocks all memory keys");
  assert.ok(Object.values(sandbox.unlocks.visualizers).every(Boolean), "sandbox unlocks all visualizers");
  assert.ok(Object.values(sandbox.unlocks.execution).every(Boolean), "sandbox unlocks all execution keys");
  assert.equal(sandbox.unlocks.uiUnlocks.storageVisible, false, "sandbox hides storage drawer");
};

