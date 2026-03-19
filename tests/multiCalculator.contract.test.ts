import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { normalizeLegacyForMissingInstances, projectCalculatorToLegacy } from "../src/domain/multiCalculator.js";
import type { Action, GameState } from "../src/domain/types.js";

const toSingleCalculatorState = (state: GameState): GameState => ({
  ...state,
  calculators: undefined,
  calculatorOrder: undefined,
  activeCalculatorId: undefined,
  perCalculatorCompletedUnlockIds: undefined,
  sessionControlProfiles: undefined,
});

export const runMultiCalculatorContractTests = (): void => {
  const base = initialState();
  assert.ok(base.calculators?.f && base.calculators?.g, "session initializes with one-or-more calculators");
  assert.equal(base.activeCalculatorId === "f" || base.activeCalculatorId === "g", true, "active selection is always singular");

  const switched = reducer(base, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "g" });
  assert.equal(switched.activeCalculatorId, "g", "active calculator selection is explicit and deterministic");

  const isolated = reducer(base, { type: "SET_KEYPAD_DIMENSIONS", calculatorId: "g", columns: 3, rows: 3 });
  assert.equal(isolated.calculators?.g?.ui.keypadColumns, 3, "targeted layout action mutates g instance");
  assert.equal(isolated.calculators?.g?.ui.keypadRows, 3, "targeted layout action mutates g rows");
  assert.equal(
    isolated.calculators?.f?.ui.keypadColumns,
    base.calculators?.f?.ui.keypadColumns,
    "targeted layout action preserves f instance layout",
  );
  assert.equal(
    isolated.calculators?.f?.ui.keypadRows,
    base.calculators?.f?.ui.keypadRows,
    "targeted layout action preserves f instance rows",
  );

  const unlockedViaG = reducer(base, { type: "ALLOCATOR_RETURN_PRESSED", calculatorId: "g" });
  assert.equal(
    unlockedViaG.unlocks.utilities[KEY_ID.util_undo],
    true,
    "unlock mutations remain global/shared when driven from a specific calculator",
  );
  const projectedF = projectCalculatorToLegacy(unlockedViaG, "f");
  assert.equal(projectedF.unlocks.utilities[KEY_ID.util_undo], true, "shared unlock state is visible on f projection");

  const legacyOnly = toSingleCalculatorState(initialState());
  const normalizedOnce = normalizeLegacyForMissingInstances(legacyOnly);
  const normalizedTwice = normalizeLegacyForMissingInstances(legacyOnly);
  assert.deepEqual(
    normalizedOnce.calculators?.g,
    normalizedTwice.calculators?.g,
    "missing-instance normalization is deterministic for g initialization",
  );
  assert.deepEqual(
    normalizedOnce.calculators?.f,
    normalizedTwice.calculators?.f,
    "missing-instance normalization is deterministic for f initialization",
  );

  const baselineActions: Action[] = [
    { type: "PRESS_KEY", key: KEY_ID.digit_1 },
    { type: "PRESS_KEY", key: KEY_ID.op_add },
    { type: "PRESS_KEY", key: KEY_ID.digit_1 },
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
    { type: "PRESS_KEY", key: KEY_ID.util_clear_all },
    { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 },
  ];
  let legacy = toSingleCalculatorState(initialState());
  let dual = initialState();
  for (const action of baselineActions) {
    legacy = reducer(legacy, action);
    dual = reducer(dual, action);
    const projectedMain = projectCalculatorToLegacy(dual, "f");
    assert.deepEqual(projectedMain.calculator, legacy.calculator, `single-calculator calculator parity must hold (${action.type})`);
    assert.deepEqual(projectedMain.ui.keyLayout, legacy.ui.keyLayout, `single-calculator layout parity must hold (${action.type})`);
    assert.deepEqual(projectedMain.unlocks, legacy.unlocks, `single-calculator unlock parity must hold (${action.type})`);
    assert.deepEqual(projectedMain.keyPressCounts, legacy.keyPressCounts, `single-calculator key-count parity must hold (${action.type})`);
  }
};
