import assert from "node:assert/strict";
import { createSandboxState } from "../src/domain/sandboxPreset.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { toIndexFromCoord } from "../src/domain/keypadLayoutModel.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";
import { reducer } from "../src/domain/reducer.js";
import type { CalculatorId } from "../src/domain/types.js";

const keyAt = (
  state: ReturnType<typeof createSandboxState>,
  calculatorId: CalculatorId,
  row: number,
  col: number,
): string | null => {
  const ui = state.calculators?.[calculatorId]?.ui;
  if (!ui) {
    return null;
  }
  const index = toIndexFromCoord({ row, col }, ui.keypadColumns, ui.keypadRows);
  const cell = ui.keyLayout[index];
  return cell?.kind === "key" ? cell.key : null;
};

export const runSandboxPresetTests = (): void => {
  const sandbox = normalizeRuntimeStateInvariants(createSandboxState());

  assert.deepEqual(sandbox.calculatorOrder, ["f_prime", "g_prime"], "sandbox boot order uses prime calculators");
  assert.equal(sandbox.activeCalculatorId, "f_prime", "sandbox activates f_prime");
  assert.ok(Boolean(sandbox.calculators?.f_prime), "sandbox materializes f_prime");
  assert.ok(Boolean(sandbox.calculators?.g_prime), "sandbox materializes g_prime");
  assert.ok(!sandbox.calculators?.f, "sandbox does not materialize gameplay f");
  assert.ok(!sandbox.calculators?.g, "sandbox does not materialize gameplay g");

  const fPrimeUi = sandbox.calculators?.f_prime?.ui;
  const gPrimeUi = sandbox.calculators?.g_prime?.ui;
  assert.equal(fPrimeUi?.keypadColumns, 6, "f_prime keypad width matches spec");
  assert.equal(fPrimeUi?.keypadRows, 5, "f_prime keypad height matches spec");
  assert.equal(gPrimeUi?.keypadColumns, 7, "g_prime keypad width matches spec");
  assert.equal(gPrimeUi?.keypadRows, 2, "g_prime keypad height matches spec");

  assert.equal(keyAt(sandbox, "f_prime", 5, 6), KEY_ID.system_save_quit_main_menu, "f_prime R5C6 is Save&Quit");
  assert.equal(keyAt(sandbox, "f_prime", 5, 5), KEY_ID.viz_number_line, "f_prime R5C5 is number line");
  assert.equal(keyAt(sandbox, "f_prime", 1, 1), KEY_ID.exec_equals, "f_prime R1C1 is equals");

  assert.equal(keyAt(sandbox, "g_prime", 2, 2), KEY_ID.toggle_binary_mode, "g_prime R2C2 is binary toggle");
  assert.equal(keyAt(sandbox, "g_prime", 1, 2), KEY_ID.toggle_mod_zero_to_delta, "g_prime R1C2 is mod-zero toggle");
  assert.equal(keyAt(sandbox, "g_prime", 2, 7), KEY_ID.digit_1, "g_prime R2C7 keeps digit_1");
  assert.equal(keyAt(sandbox, "g_prime", 1, 7), KEY_ID.digit_0, "g_prime R1C7 keeps digit_0");
  assert.equal(keyAt(sandbox, "g_prime", 2, 3), KEY_ID.op_mul, "g_prime R2C3 keeps multiply");
  assert.equal(keyAt(sandbox, "g_prime", 1, 3), KEY_ID.op_add, "g_prime R1C3 keeps add");
  assert.equal(keyAt(sandbox, "g_prime", 1, 1), KEY_ID.exec_equals, "g_prime R1C1 keeps equals");
  assert.equal(sandbox.calculators?.g_prime?.settings.base, "base2", "g_prime starts with binary mode active");

  assert.ok(Object.values(sandbox.unlocks.valueExpression).every(Boolean), "sandbox unlocks all value keys");
  assert.ok(Object.values(sandbox.unlocks.slotOperators).every(Boolean), "sandbox unlocks all slot operators");
  assert.ok(Object.values(sandbox.unlocks.unaryOperators).every(Boolean), "sandbox unlocks all unary operators");
  assert.ok(Object.values(sandbox.unlocks.visualizers).every(Boolean), "sandbox unlocks all visualizers");
  assert.ok(Object.values(sandbox.unlocks.execution).every(Boolean), "sandbox unlocks all execution keys");

  assert.ok(Object.values(sandbox.unlocks.memory).every((flag) => !flag), "sandbox keeps all memory keys locked");
  assert.equal(sandbox.unlocks.utilities[KEY_ID.system_save_quit_main_menu], true, "sandbox keeps Save&Quit unlocked");
  assert.equal(sandbox.unlocks.utilities[KEY_ID.system_mode_game], false, "sandbox keeps Continue locked");
  assert.equal(sandbox.unlocks.utilities[KEY_ID.system_new_game], false, "sandbox keeps New Game locked");
  assert.equal(sandbox.unlocks.utilities[KEY_ID.system_mode_sandbox], false, "sandbox keeps Sandbox mode key locked");
  assert.equal(sandbox.unlocks.utilities[KEY_ID.system_quit_game], false, "sandbox keeps Quit Game locked");

  assert.equal(sandbox.unlocks.uiUnlocks.storageVisible, true, "sandbox keeps storage visible");

  const afterGPrimeUnaryNot = reducer(sandbox, { type: "PRESS_KEY", key: KEY_ID.unary_not, calculatorId: "g_prime" });
  const afterSwitchToGPrime = reducer(afterGPrimeUnaryNot, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "g_prime" });
  const gPrimeAfter = afterSwitchToGPrime.calculators?.g_prime?.ui;
  assert.equal(gPrimeAfter?.keypadColumns, 7, "g_prime keeps its keypad width after targeted input and activation");
  assert.equal(gPrimeAfter?.keypadRows, 2, "g_prime keeps its keypad height after targeted input and activation");
  assert.equal(keyAt(afterSwitchToGPrime, "g_prime", 2, 7), KEY_ID.digit_1, "g_prime keeps digit_1 after targeted unary_not");
  assert.equal(keyAt(afterSwitchToGPrime, "g_prime", 1, 1), KEY_ID.exec_equals, "g_prime keeps equals after targeted unary_not");

  const afterFPrimeDigit = reducer(afterSwitchToGPrime, { type: "PRESS_KEY", key: KEY_ID.digit_2, calculatorId: "f_prime" });
  assert.equal(keyAt(afterFPrimeDigit, "f_prime", 2, 5), KEY_ID.digit_2, "f_prime keeps digit_2 after targeted input");
  assert.equal(keyAt(afterFPrimeDigit, "f_prime", 1, 1), KEY_ID.exec_equals, "f_prime keeps equals after targeted input");

  const afterFPrimeAlphaUpdate = reducer(sandbox, { type: "SET_CONTROL_FIELD", calculatorId: "f_prime", field: "alpha", value: 8 });
  assert.equal(afterFPrimeAlphaUpdate.calculators?.f_prime?.ui.keypadColumns, 8, "f_prime alpha update resizes keypad columns in sandbox");
  assert.equal(afterFPrimeAlphaUpdate.ui.keypadColumns, 8, "active sandbox projection reflects updated f_prime keypad columns");

  const afterFPrimeBetaUpdate = reducer(afterFPrimeAlphaUpdate, {
    type: "SET_CONTROL_FIELD",
    calculatorId: "f_prime",
    field: "beta",
    value: 3,
  });
  assert.equal(afterFPrimeBetaUpdate.calculators?.f_prime?.ui.keypadRows, 3, "f_prime beta update resizes keypad rows in sandbox");
  assert.equal(afterFPrimeBetaUpdate.ui.keypadRows, 3, "active sandbox projection reflects updated f_prime keypad rows");
};
