import assert from "node:assert/strict";
import { createSandboxState } from "../src/domain/sandboxPreset.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { toIndexFromCoord } from "../src/domain/keypadLayoutModel.js";
import {
  BINARY_MODE_FLAG,
  DELTA_RANGE_CLAMP_FLAG,
  EXECUTION_PAUSE_EQUALS_FLAG,
  EXECUTION_PAUSE_FLAG,
  MOD_ZERO_TO_DELTA_FLAG,
} from "../src/domain/state.js";

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
      alpha: 7,
      beta: 7,
      gamma: 4,
      gammaMinRaised: true,
    },
    "sandbox lambda defaults are applied",
  );

  assert.equal(sandbox.ui.keypadColumns, 7, "sandbox keypad width is canonical");
  assert.equal(sandbox.ui.keypadRows, 7, "sandbox keypad height is canonical");
  assert.equal(keyAt(sandbox, 7, 7), KEY_ID.system_save_quit_main_menu, "R7C7 mapped from screenshot");
  assert.equal(keyAt(sandbox, 7, 6), KEY_ID.viz_graph, "R7C6 mapped from screenshot");
  assert.equal(keyAt(sandbox, 7, 5), KEY_ID.viz_circle, "R7C5 mapped from screenshot");
  assert.equal(keyAt(sandbox, 7, 4), KEY_ID.viz_feed, "R7C4 mapped from screenshot");
  assert.equal(keyAt(sandbox, 7, 3), KEY_ID.viz_help, "R7C3 mapped from screenshot");
  assert.equal(keyAt(sandbox, 7, 2), KEY_ID.toggle_step_expansion, "R7C2 mapped from screenshot");
  assert.equal(keyAt(sandbox, 7, 1), KEY_ID.util_clear_all, "R7C1 mapped from screenshot");
  assert.equal(keyAt(sandbox, 6, 6), KEY_ID.toggle_delta_range_clamp, "R6C6 mapped from screenshot");
  assert.deepEqual(
    behaviorAt(sandbox, 6, 6),
    { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG },
    "R6C6 is delta toggle behavior",
  );
  assert.equal(keyAt(sandbox, 6, 5), KEY_ID.op_rotate_left, "R6C5 is rotate-left");
  assert.equal(keyAt(sandbox, 6, 4), KEY_ID.unary_ceil, "R6C4 is ceil");
  assert.equal(keyAt(sandbox, 6, 3), KEY_ID.op_min, "R6C3 is min");
  assert.equal(keyAt(sandbox, 6, 2), KEY_ID.op_gcd, "R6C2 is gcd");
  assert.equal(keyAt(sandbox, 6, 1), KEY_ID.util_backspace, "R6C1 is backspace");
  assert.deepEqual(
    behaviorAt(sandbox, 6, 7),
    { type: "toggle_flag", flag: MOD_ZERO_TO_DELTA_FLAG },
    "R6C7 is mod-zero toggle behavior",
  );
  assert.equal(keyAt(sandbox, 5, 7), KEY_ID.toggle_binary_mode, "R5C7 is binary mode key id");
  assert.deepEqual(
    behaviorAt(sandbox, 5, 7),
    { type: "toggle_flag", flag: BINARY_MODE_FLAG },
    "R5C7 is binary toggle behavior",
  );
  assert.equal(keyAt(sandbox, 5, 1), KEY_ID.util_undo, "R5C1 is undo");
  assert.equal(keyAt(sandbox, 4, 4), KEY_ID.unary_collatz, "R4C4 is collatz");
  assert.equal(keyAt(sandbox, 4, 3), KEY_ID.op_pow, "R4C3 is power");
  assert.equal(keyAt(sandbox, 4, 2), KEY_ID.op_div, "R4C2 is division");
  assert.equal(keyAt(sandbox, 4, 1), KEY_ID.op_mod, "R4C1 is modulo");
  assert.equal(keyAt(sandbox, 3, 4), KEY_ID.unary_not, "R3C4 is unary-not");
  assert.equal(keyAt(sandbox, 3, 3), KEY_ID.op_mul, "R3C3 is multiply");
  assert.equal(keyAt(sandbox, 3, 2), KEY_ID.op_euclid_div, "R3C2 is euclid-div");
  assert.equal(keyAt(sandbox, 3, 1), KEY_ID.exec_roll_inverse, "R3C1 is roll-inverse");
  assert.equal(keyAt(sandbox, 2, 4), KEY_ID.unary_neg, "R2C4 is negation");
  assert.equal(keyAt(sandbox, 2, 3), KEY_ID.op_add, "R2C3 is addition");
  assert.equal(keyAt(sandbox, 2, 2), KEY_ID.unary_inc, "R2C2 is increment");
  assert.equal(keyAt(sandbox, 2, 1), KEY_ID.exec_play_pause, "R2C1 is play/pause key id");
  assert.deepEqual(
    behaviorAt(sandbox, 2, 1),
    { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG },
    "R2C1 is play/pause behavior",
  );
  assert.equal(keyAt(sandbox, 1, 3), KEY_ID.op_sub, "R1C3 is subtraction");
  assert.equal(keyAt(sandbox, 1, 2), KEY_ID.unary_dec, "R1C2 is decrement");
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
  assert.deepEqual(sandbox.calculatorOrder, ["f"], "sandbox unlocks only calculator f");
  assert.equal(sandbox.activeCalculatorId, "f", "sandbox activates calculator f");
  assert.ok(Boolean(sandbox.calculators?.f), "sandbox materializes calculator f");
  assert.ok(!sandbox.calculators?.g, "sandbox does not unlock calculator g");
};

