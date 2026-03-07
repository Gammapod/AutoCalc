import assert from "node:assert/strict";
import { buttonRegistry } from "../src/domain/buttonRegistry.js";
import { keyCatalog } from "../src/content/keyCatalog.js";
import { keyRuntimeCatalog } from "../src/content/keyRuntimeCatalog.js";
import { isButtonUnlocked, iterUnlockedButtons, setButtonUnlocked } from "../src/domain/buttonStateAccess.js";
import { initialState } from "../src/domain/state.js";

const sort = (values: string[]): string[] => [...values].sort((a, b) => a.localeCompare(b));

export const runButtonRegistryContractTests = (): void => {
  const keys = buttonRegistry.map((entry) => entry.key);
  assert.equal(new Set(keys).size, keys.length, "button registry must not contain duplicate keys");
  assert.equal(new Set(keyCatalog.map((entry) => entry.key)).size, keyCatalog.length, "key catalog must not contain duplicate keys");

  const state = initialState();
  const runtimePrimaryUnlockKeys = sort([
    ...Object.keys(state.unlocks.valueAtoms),
    ...Object.keys(state.unlocks.valueCompose),
    ...Object.keys(state.unlocks.slotOperators),
    ...Object.keys(state.unlocks.utilities),
    ...Object.keys(state.unlocks.steps),
    ...Object.keys(state.unlocks.visualizers),
    ...Object.keys(state.unlocks.execution),
  ]);
  const runtimeLegacyUnlockKeys = sort(Object.keys(state.unlocks.valueExpression));
  const registryUnlockKeys = sort(buttonRegistry.map((entry) => entry.key));
  assert.deepEqual(
    registryUnlockKeys,
    runtimePrimaryUnlockKeys,
    "registry unlock groups must exactly match primary runtime unlock-state keys",
  );
  assert.deepEqual(
    runtimeLegacyUnlockKeys,
    sort([...Object.keys(state.unlocks.valueAtoms), ...Object.keys(state.unlocks.valueCompose)]),
    "legacy valueExpression mirror must stay in sync with split value unlock groups",
  );
  assert.deepEqual(
    registryUnlockKeys,
    sort(keyRuntimeCatalog.map((entry) => entry.key)),
    "runtime key catalog must stay parity-aligned with button registry keys",
  );

  const defaultUnlockedByRegistry = sort(buttonRegistry.filter((entry) => entry.defaultUnlocked).map((entry) => entry.key));
  const defaultUnlockedByState = sort(iterUnlockedButtons(state));
  assert.deepEqual(defaultUnlockedByState, defaultUnlockedByRegistry, "default unlocked state must come from button registry metadata");

  for (const entry of buttonRegistry) {
    const unlockedState = setButtonUnlocked(state, entry.key, true);
    assert.equal(isButtonUnlocked(unlockedState, entry.key), true, `${entry.key} can be marked unlocked via state access helper`);
    const relockedState = setButtonUnlocked(unlockedState, entry.key, false);
    assert.equal(isButtonUnlocked(relockedState, entry.key), false, `${entry.key} can be marked locked via state access helper`);
  }
};
