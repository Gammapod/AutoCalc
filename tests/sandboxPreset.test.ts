import assert from "node:assert/strict";
import { createSandboxState } from "../src/domain/sandboxPreset.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";
import { reducer } from "../src/domain/reducer.js";
import type { CalculatorId, GameState } from "../src/domain/types.js";
import { modeManifestById } from "../src/domain/modeManifest.js";
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";
import { createSeededKeyLayout } from "../src/domain/calculatorSeedManifest.js";

const keySnapshotFor = (state: GameState, calculatorId: CalculatorId): Array<string | null> => {
  const ui = state.calculators?.[calculatorId]?.ui;
  if (!ui) {
    return [];
  }
  return ui.keyLayout.map((cell) => cell.kind === "key" ? cell.key : null);
};

export const runSandboxPresetTests = (): void => {
  const sandbox = normalizeRuntimeStateInvariants(createSandboxState());
  const sandboxManifest = modeManifestById.sandbox;
  const sandboxCalculatorIds = sandbox.calculatorOrder ?? [];

  assert.deepEqual(sandboxCalculatorIds, sandboxManifest.bootCalculatorOrder, "sandbox preset follows sandbox mode boot order");
  assert.equal(sandbox.activeCalculatorId, sandboxManifest.activeCalculatorId, "sandbox preset follows sandbox mode active calculator");
  assert.equal(new Set(sandboxCalculatorIds).size, sandboxCalculatorIds.length, "sandbox calculator order has no duplicate ids");
  for (const calculatorId of sandboxCalculatorIds) {
    assert.ok(Boolean(sandbox.calculators?.[calculatorId]), `sandbox materializes ordered calculator: ${calculatorId}`);
  }
  for (const calculatorId of Object.keys(sandbox.calculators ?? {}) as CalculatorId[]) {
    assert.equal(sandboxCalculatorIds.includes(calculatorId), true, `sandbox materializes only ordered calculators: ${calculatorId}`);
  }

  for (const calculatorId of sandboxCalculatorIds) {
    const calculator = sandbox.calculators?.[calculatorId];
    const seed = createSeededKeyLayout(calculatorId);
    assert.equal(calculator?.ui.keypadColumns, controlProfiles[calculatorId].starts.alpha, `${calculatorId} sandbox columns derive from control profile alpha`);
    assert.equal(calculator?.ui.keypadRows, controlProfiles[calculatorId].starts.beta, `${calculatorId} sandbox rows derive from control profile beta`);
    assert.deepEqual(calculator?.lambdaControl, controlProfiles[calculatorId].starts, `${calculatorId} sandbox lambda starts derive from control profile`);
    assert.deepEqual(keySnapshotFor(sandbox, calculatorId), seed.keyLayout.map((cell) => cell.kind === "key" ? cell.key : null), `${calculatorId} sandbox keypad materializes seed layout`);
    assert.equal(calculator?.ui.activeVisualizer, seed.activeVisualizer, `${calculatorId} sandbox visualizer derives from seed layout`);
  }

  assert.equal(
    sandboxCalculatorIds.every((calculatorId) => sandbox.calculators?.[calculatorId]?.settings.base === "decimal"),
    true,
    "sandbox calculators start in decimal mode",
  );

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

  const targetCalculatorId = sandboxCalculatorIds.find((calculatorId) =>
    calculatorId !== sandbox.activeCalculatorId
    && sandbox.calculators?.[calculatorId]?.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key.startsWith("digit_")),
  );
  assert.ok(targetCalculatorId, "sandbox has an inactive calculator with an installed digit key");
  if (!targetCalculatorId) {
    return;
  }
  const targetDigit = sandbox.calculators?.[targetCalculatorId]?.ui.keyLayout.find((cell) =>
    cell.kind === "key" && cell.key.startsWith("digit_"));
  assert.ok(targetDigit?.kind === "key", "target calculator digit fixture is installed");
  if (!targetDigit || targetDigit.kind !== "key") {
    return;
  }
  const targetBefore = keySnapshotFor(sandbox, targetCalculatorId);
  const afterTargetDigit = reducer(sandbox, { type: "PRESS_KEY", key: targetDigit.key, calculatorId: targetCalculatorId });
  const afterSwitchToTarget = reducer(afterTargetDigit, { type: "SET_ACTIVE_CALCULATOR", calculatorId: targetCalculatorId });
  const targetAfter = afterSwitchToTarget.calculators?.[targetCalculatorId]?.ui;
  assert.equal(targetAfter?.keypadColumns, controlProfiles[targetCalculatorId].starts.alpha, "targeted input keeps target keypad width");
  assert.equal(targetAfter?.keypadRows, controlProfiles[targetCalculatorId].starts.beta, "targeted input keeps target keypad height");
  assert.deepEqual(keySnapshotFor(afterSwitchToTarget, targetCalculatorId), targetBefore, "targeted input and activation preserve target keypad layout");

  const activeCalculatorId = sandbox.activeCalculatorId;
  const activeDigit = sandbox.calculators?.[activeCalculatorId]?.ui.keyLayout.find((cell) =>
    cell.kind === "key" && cell.key.startsWith("digit_"));
  assert.ok(activeDigit?.kind === "key", "active sandbox calculator has an installed digit key");
  if (!activeDigit || activeDigit.kind !== "key") {
    return;
  }
  const activeBefore = keySnapshotFor(afterSwitchToTarget, activeCalculatorId);
  const afterActiveDigit = reducer(afterSwitchToTarget, { type: "PRESS_KEY", key: activeDigit.key, calculatorId: activeCalculatorId });
  assert.deepEqual(keySnapshotFor(afterActiveDigit, activeCalculatorId), activeBefore, "targeted input preserves active calculator keypad layout");

  const nextAlpha = controlProfiles[activeCalculatorId].starts.alpha + 2;
  const afterActiveAlphaUpdate = reducer(sandbox, { type: "SET_CONTROL_FIELD", calculatorId: activeCalculatorId, field: "alpha", value: nextAlpha });
  assert.equal(afterActiveAlphaUpdate.calculators?.[activeCalculatorId]?.ui.keypadColumns, nextAlpha, "active sandbox alpha update resizes keypad columns");
  assert.equal(afterActiveAlphaUpdate.ui.keypadColumns, nextAlpha, "active sandbox projection reflects updated keypad columns");

  const nextBeta = Math.max(1, controlProfiles[activeCalculatorId].starts.beta - 2);
  const afterActiveBetaUpdate = reducer(afterActiveAlphaUpdate, {
    type: "SET_CONTROL_FIELD",
    calculatorId: activeCalculatorId,
    field: "beta",
    value: nextBeta,
  });
  assert.equal(afterActiveBetaUpdate.calculators?.[activeCalculatorId]?.ui.keypadRows, nextBeta, "active sandbox beta update resizes keypad rows");
  assert.equal(afterActiveBetaUpdate.ui.keypadRows, nextBeta, "active sandbox projection reflects updated keypad rows");
};
