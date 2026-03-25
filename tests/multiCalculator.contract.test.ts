import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import {
  isMultiCalculatorSession,
  materializeCalculator,
  materializeCalculatorMenu,
  materializeCalculatorG,
  fromCalculatorSurface,
  normalizeLegacyForMissingInstances,
  projectCalculatorToLegacy,
  toCalculatorSurface,
} from "../src/domain/multiCalculator.js";
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";
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
  assert.ok(base.calculators?.f, "session initializes with f calculator");
  assert.equal(Boolean(base.calculators?.g), false, "session does not initialize g by default");
  assert.equal(base.activeCalculatorId, "f", "active selection starts on f");

  const switched = reducer(base, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "g" });
  assert.equal(switched.activeCalculatorId, "f", "active calculator cannot switch to missing g");

  const isolated = reducer(base, { type: "SET_KEYPAD_DIMENSIONS", calculatorId: "g", columns: 3, rows: 3 });
  assert.equal(Boolean(isolated.calculators?.g), false, "targeted g layout action does not materialize g");
  assert.equal(isolated.ui.keypadColumns, 3, "layout action applies to active single-calculator projection");
  assert.equal(isolated.ui.keypadRows, 3, "layout action rows apply to active single-calculator projection");

  const unlockedViaG = reducer(base, { type: "ALLOCATOR_RETURN_PRESSED", calculatorId: "g" });
  assert.equal(unlockedViaG.allocatorReturnPressCount, 1, "allocator actions still route through shared state");
  const projectedF = projectCalculatorToLegacy(unlockedViaG, "f");
  assert.equal(projectedF.allocatorReturnPressCount, 1, "shared counter state is visible on f projection");

  const dualUnlocked = materializeCalculatorG(initialState());
  assert.equal(Boolean(dualUnlocked.calculators?.g), true, "unlock-all materializes g calculator");
  const dualWithActiveF = reducer(dualUnlocked, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "f" });
  const beforeFProjection = projectCalculatorToLegacy(dualWithActiveF, "f");
  const beforeGProjection = projectCalculatorToLegacy(dualWithActiveF, "g");
  const afterTargetedGInput = reducer(dualWithActiveF, { type: "SET_KEYPAD_DIMENSIONS", calculatorId: "g", columns: 3, rows: 2 });
  const afterFProjection = projectCalculatorToLegacy(afterTargetedGInput, "f");
  const afterGProjection = projectCalculatorToLegacy(afterTargetedGInput, "g");
  assert.deepEqual(
    afterFProjection.ui,
    beforeFProjection.ui,
    "targeted g layout action keeps f calculator-local ui/runtime state unchanged",
  );
  assert.equal(
    afterGProjection.ui.keypadColumns,
    3,
    "targeted g layout action mutates g calculator-local ui/runtime state",
  );
  assert.equal(afterGProjection.ui.keypadRows, 2, "targeted g layout action updates g rows");
  assert.equal(
    afterTargetedGInput.allocatorReturnPressCount,
    dualWithActiveF.allocatorReturnPressCount,
    "targeted calculator-local layout action does not mutate shared/global progression counters",
  );
  const dualSharedCounter = reducer(dualWithActiveF, { type: "ALLOCATOR_RETURN_PRESSED", calculatorId: "g" });
  assert.equal(
    dualSharedCounter.allocatorReturnPressCount,
    (dualWithActiveF.allocatorReturnPressCount ?? 0) + 1,
    "targeted calculator actions still mutate shared/global progression counters when action family is global",
  );
  const dualWithActiveG = reducer(dualUnlocked, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "g" });
  const beforeFFromActiveG = projectCalculatorToLegacy(dualWithActiveG, "f");
  const beforeGFromActiveG = projectCalculatorToLegacy(dualWithActiveG, "g");
  const afterTargetedFInput = reducer(dualWithActiveG, { type: "SET_KEYPAD_DIMENSIONS", calculatorId: "f", columns: 4, rows: 3 });
  const afterFFromActiveG = projectCalculatorToLegacy(afterTargetedFInput, "f");
  const afterGFromActiveG = projectCalculatorToLegacy(afterTargetedFInput, "g");
  assert.equal(
    afterFFromActiveG.ui.keypadColumns,
    4,
    "targeted f layout action mutates f calculator-local state while g is active",
  );
  assert.equal(afterFFromActiveG.ui.keypadRows, 3, "targeted f layout action updates f rows");
  assert.deepEqual(afterGFromActiveG.ui, beforeGFromActiveG.ui, "targeted f layout action keeps g state unchanged");

  const menuAndFOnly = materializeCalculatorMenu(initialState());
  assert.equal(Boolean(menuAndFOnly.calculators?.menu), true, "menu materialization produces menu instance");
  assert.equal(Boolean(menuAndFOnly.calculators?.g), false, "menu materialization does not implicitly add g");
  assert.equal(isMultiCalculatorSession(menuAndFOnly), true, "menu+f session is recognized as multi-calculator");
  const beforeMenuProjection = projectCalculatorToLegacy(menuAndFOnly, "menu");
  const beforeFWithMenuProjection = projectCalculatorToLegacy(menuAndFOnly, "f");
  const mutatedMenuOnly = reducer(menuAndFOnly, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad_menu",
    fromIndex: 5,
    toSurface: "keypad_menu",
    toIndex: 1,
  });
  const afterMenuProjection = projectCalculatorToLegacy(mutatedMenuOnly, "menu");
  const afterFWithMenuProjection = projectCalculatorToLegacy(mutatedMenuOnly, "f");
  assert.notDeepEqual(afterMenuProjection.ui.keyLayout, beforeMenuProjection.ui.keyLayout, "menu-local keyslot mutation applies to menu");
  assert.equal(
    afterFWithMenuProjection.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === KEY_ID.system_quit_game),
    false,
    "menu-local keyslot mutation does not leak menu-only keys into f",
  );

  const crossMoveReady: GameState = {
    ...menuAndFOnly,
    unlocks: {
      ...menuAndFOnly.unlocks,
      utilities: {
        ...menuAndFOnly.unlocks.utilities,
        [KEY_ID.system_quit_game]: true,
      },
    },
  };
  const beforeCrossMenuProjection = projectCalculatorToLegacy(crossMoveReady, "menu");
  const beforeCrossFProjection = projectCalculatorToLegacy(crossMoveReady, "f");
  const menuSourceIndex = beforeCrossMenuProjection.ui.keyLayout.findIndex((cell) => cell.kind === "key" && cell.key === KEY_ID.system_quit_game);
  const fDestinationIndex = beforeCrossFProjection.ui.keyLayout.findIndex((cell) => cell.kind === "placeholder");
  assert.ok(menuSourceIndex >= 0, "menu keypad contains unlocked quit key for cross-surface move regression coverage");
  assert.ok(fDestinationIndex >= 0, "f keypad contains at least one empty destination slot for cross-surface move regression coverage");
  const movedAcrossCalculators = reducer(crossMoveReady, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad_menu",
    fromIndex: menuSourceIndex,
    toSurface: "keypad_f",
    toIndex: fDestinationIndex,
  });
  const afterCrossMenu = projectCalculatorToLegacy(movedAcrossCalculators, "menu");
  const afterCrossF = projectCalculatorToLegacy(movedAcrossCalculators, "f");
  assert.notDeepEqual(afterCrossMenu.ui.keyLayout, beforeCrossMenuProjection.ui.keyLayout, "explicit cross-calculator move updates menu keypad");
  assert.notDeepEqual(afterCrossF.ui.keyLayout, beforeCrossFProjection.ui.keyLayout, "explicit cross-calculator move updates f keypad");

  const fullOrderState = materializeCalculatorG(materializeCalculatorMenu(initialState()));
  const calculatorOrder = fullOrderState.calculatorOrder ?? [];
  for (const calculatorId of calculatorOrder) {
    assert.ok(controlProfiles[calculatorId], `control profile exists for calculator ${calculatorId}`);
    const surface = toCalculatorSurface(calculatorId);
    assert.equal(fromCalculatorSurface(surface), calculatorId, `surface mapping round-trips for ${calculatorId}`);
    const once = materializeCalculator(initialState(), calculatorId);
    const twice = materializeCalculator(initialState(), calculatorId);
    assert.ok(once.calculators?.[calculatorId], `materializer creates calculator ${calculatorId}`);
    assert.deepEqual(
      once.calculators?.[calculatorId],
      twice.calculators?.[calculatorId],
      `materializer is deterministic for calculator ${calculatorId}`,
    );
  }

  const legacyOnly = toSingleCalculatorState(initialState());
  const normalizedOnce = normalizeLegacyForMissingInstances(legacyOnly);
  const normalizedTwice = normalizeLegacyForMissingInstances(legacyOnly);
  assert.equal(Boolean(normalizedOnce.calculators?.g), false, "missing-instance normalization does not force g");
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

