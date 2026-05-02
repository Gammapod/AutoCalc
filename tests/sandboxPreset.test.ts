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

  assert.deepEqual(sandbox.calculatorOrder, ["f_prime", "g_prime", "h_prime", "i_prime"], "sandbox boot order uses prime calculators");
  assert.equal(sandbox.activeCalculatorId, "f_prime", "sandbox activates f_prime");
  assert.ok(Boolean(sandbox.calculators?.f_prime), "sandbox materializes f_prime");
  assert.ok(Boolean(sandbox.calculators?.g_prime), "sandbox materializes g_prime");
  assert.ok(Boolean(sandbox.calculators?.h_prime), "sandbox materializes h_prime");
  assert.ok(Boolean(sandbox.calculators?.i_prime), "sandbox materializes i_prime");
  assert.ok(!sandbox.calculators?.f, "sandbox does not materialize gameplay f");
  assert.ok(!sandbox.calculators?.g, "sandbox does not materialize gameplay g");

  const fPrimeUi = sandbox.calculators?.f_prime?.ui;
  const gPrimeUi = sandbox.calculators?.g_prime?.ui;
  const hPrimeUi = sandbox.calculators?.h_prime?.ui;
  const iPrimeUi = sandbox.calculators?.i_prime?.ui;
  assert.equal(fPrimeUi?.keypadColumns, 6, "f_prime keypad width matches spec");
  assert.equal(fPrimeUi?.keypadRows, 5, "f_prime keypad height matches spec");
  assert.equal(gPrimeUi?.keypadColumns, 7, "g_prime keypad width matches spec");
  assert.equal(gPrimeUi?.keypadRows, 2, "g_prime keypad height matches spec");
  assert.equal(hPrimeUi?.keypadColumns, 4, "h_prime keypad width matches spec");
  assert.equal(hPrimeUi?.keypadRows, 5, "h_prime keypad height matches spec");
  assert.equal(iPrimeUi?.keypadColumns, 4, "i_prime keypad width matches spec");
  assert.equal(iPrimeUi?.keypadRows, 7, "i_prime keypad height matches spec");

  assert.deepEqual(
    sandbox.calculators?.g_prime?.lambdaControl,
    { alpha: 7, beta: 2, gamma: 12, delta: 4, delta_q: 4, epsilon: 4 },
    "g_prime lambda starts match spec",
  );
  assert.deepEqual(
    sandbox.calculators?.h_prime?.lambdaControl,
    { alpha: 4, beta: 5, gamma: 6, delta: 12, delta_q: 12, epsilon: 1 },
    "h_prime lambda starts match spec",
  );
  assert.deepEqual(
    sandbox.calculators?.i_prime?.lambdaControl,
    { alpha: 4, beta: 7, gamma: 6, delta: 8, delta_q: 8, epsilon: 0 },
    "i_prime lambda starts match spec",
  );

  assert.equal(keyAt(sandbox, "f_prime", 5, 6), KEY_ID.system_save_quit_main_menu, "f_prime R5C6 is Save&Quit");
  assert.equal(keyAt(sandbox, "f_prime", 5, 5), KEY_ID.viz_number_line, "f_prime R5C5 is number line");
  assert.equal(keyAt(sandbox, "f_prime", 1, 1), KEY_ID.exec_equals, "f_prime R1C1 is equals");

  assert.equal(keyAt(sandbox, "g_prime", 2, 7), KEY_ID.toggle_binary_octave_cycle, "g_prime R2C7 is octave-cycle toggle");
  assert.equal(keyAt(sandbox, "g_prime", 2, 3), KEY_ID.op_interval, "g_prime R2C3 is interval");
  assert.equal(keyAt(sandbox, "g_prime", 1, 7), KEY_ID.viz_ratios, "g_prime R1C7 is ratios");
  assert.equal(keyAt(sandbox, "g_prime", 1, 1), KEY_ID.exec_step_through, "g_prime R1C1 is step-through");
  assert.equal(sandbox.calculators?.g_prime?.settings.base, "decimal", "g_prime starts in decimal mode");

  assert.equal(keyAt(sandbox, "h_prime", 5, 4), KEY_ID.toggle_history, "h_prime R5C4 is history");
  assert.equal(keyAt(sandbox, "h_prime", 4, 3), KEY_ID.op_rotate_15, "h_prime R4C3 is rotate");
  assert.equal(keyAt(sandbox, "h_prime", 1, 1), KEY_ID.exec_equals, "h_prime R1C1 is equals");

  assert.equal(keyAt(sandbox, "i_prime", 7, 1), KEY_ID.toggle_mod_zero_to_delta, "i_prime R7C1 is mod-zero toggle");
  assert.equal(keyAt(sandbox, "i_prime", 5, 4), KEY_ID.unary_collatz, "i_prime R5C4 is Collatz");
  assert.equal(keyAt(sandbox, "i_prime", 5, 3), KEY_ID.op_mod, "i_prime R5C3 is mod");
  assert.equal(keyAt(sandbox, "i_prime", 5, 2), KEY_ID.op_euclid_tuple, "i_prime R5C2 is euclid tuple");
  assert.equal(keyAt(sandbox, "i_prime", 5, 1), KEY_ID.op_euclid_div, "i_prime R5C1 is euclid div");
  assert.equal(keyAt(sandbox, "i_prime", 1, 1), KEY_ID.exec_equals, "i_prime R1C1 is equals");

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

  const afterGPrimeDigit = reducer(sandbox, { type: "PRESS_KEY", key: KEY_ID.digit_1, calculatorId: "g_prime" });
  const afterSwitchToGPrime = reducer(afterGPrimeDigit, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "g_prime" });
  const gPrimeAfter = afterSwitchToGPrime.calculators?.g_prime?.ui;
  assert.equal(gPrimeAfter?.keypadColumns, 7, "g_prime keeps its keypad width after targeted input and activation");
  assert.equal(gPrimeAfter?.keypadRows, 2, "g_prime keeps its keypad height after targeted input and activation");
  assert.equal(keyAt(afterSwitchToGPrime, "g_prime", 1, 6), KEY_ID.digit_1, "g_prime keeps digit_1 after targeted input");
  assert.equal(keyAt(afterSwitchToGPrime, "g_prime", 1, 1), KEY_ID.exec_step_through, "g_prime keeps step-through after targeted input");

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
