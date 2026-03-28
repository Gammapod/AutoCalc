import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";
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
import { fromKeyLayoutArray } from "../src/domain/keypadLayoutModel.js";
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
  const rational = (num: bigint) => ({ kind: "rational" as const, value: { num, den: 1n } });
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

  const reducerUnlockReady: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries: [
        { y: rational(1n) },
        { y: rational(2n) },
        { y: rational(4n) },
        { y: rational(8n) },
        { y: rational(16n) },
        { y: rational(32n) },
        { y: rational(64n) },
      ],
    },
  };
  const reducerUnlockedG = reducer(reducerUnlockReady, { type: "ALLOCATOR_RETURN_PRESSED" });
  assert.equal(
    reducerUnlockedG.completedUnlockIds.includes("unlock_calculator_g_on_tail_powers_of_two_run_7"),
    true,
    "reducer path records calculator-g unlock completion when predicate is met",
  );
  assert.equal(Boolean(reducerUnlockedG.calculators?.g), true, "reducer path preserves newly materialized g calculator");
  assert.deepEqual(
    reducerUnlockedG.calculatorOrder,
    ["f", "g"],
    "reducer path preserves expanded calculator order after g unlock",
  );

  const dualUnlocked = materializeCalculatorG(initialState());
  assert.equal(Boolean(dualUnlocked.calculators?.g), true, "unlock-all materializes g calculator");
  const duplicateStorageSeed: GameState = {
    ...dualUnlocked,
    ui: {
      ...dualUnlocked.ui,
      storageLayout: [
        { kind: "key", key: KEY_ID.exec_equals },
        { kind: "key", key: KEY_ID.unary_inc },
        { kind: "key", key: KEY_ID.system_save_quit_main_menu },
        ...dualUnlocked.ui.storageLayout,
      ],
    },
  };
  const normalizedDuplicateStorage = reducer(duplicateStorageSeed, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "f" });
  const normalizedDuplicateF = projectCalculatorToLegacy(normalizedDuplicateStorage, "f");
  assert.equal(
    normalizedDuplicateF.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === KEY_ID.exec_equals),
    true,
    "multi-calculator normalization keeps f keypad ownership when storage contains duplicate unlocked keys",
  );
  assert.equal(
    normalizedDuplicateStorage.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === KEY_ID.exec_equals),
    false,
    "multi-calculator normalization removes duplicate unlocked keys from storage when key exists on keypad",
  );
  const dualWithActiveF = reducer(dualUnlocked, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "f" });
  const beforeFProjection = projectCalculatorToLegacy(dualWithActiveF, "f");
  const beforeGProjection = projectCalculatorToLegacy(dualWithActiveF, "g");
  const afterTargetedGInput = reducer(dualWithActiveF, { type: "SET_KEYPAD_DIMENSIONS", calculatorId: "g", columns: 3, rows: 2 });
  const afterFProjection = projectCalculatorToLegacy(afterTargetedGInput, "f");
  const afterGProjection = projectCalculatorToLegacy(afterTargetedGInput, "g");
  assert.deepEqual(
    afterFProjection.ui.keyLayout,
    beforeFProjection.ui.keyLayout,
    "targeted g layout action keeps f calculator-local key layout unchanged",
  );
  assert.equal(afterFProjection.ui.keypadColumns, beforeFProjection.ui.keypadColumns, "targeted g layout action keeps f keypad columns unchanged");
  assert.equal(afterFProjection.ui.keypadRows, beforeFProjection.ui.keypadRows, "targeted g layout action keeps f keypad rows unchanged");
  assert.equal(
    afterFProjection.ui.selectedControlField,
    beforeFProjection.ui.selectedControlField,
    "targeted g layout action keeps f selected control field unchanged",
  );
  assert.equal(
    afterGProjection.ui.keypadColumns,
    3,
    "targeted g layout action mutates g calculator-local ui/runtime state",
  );
  assert.equal(afterGProjection.ui.keypadRows, 2, "targeted g layout action updates g rows");
  assert.equal(afterTargetedGInput.activeCalculatorId, "f", "targeted g actions do not implicitly switch active calculator");
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
  assert.deepEqual(afterGFromActiveG.ui.keyLayout, beforeGFromActiveG.ui.keyLayout, "targeted f layout action keeps g key layout unchanged");
  assert.equal(afterGFromActiveG.ui.keypadColumns, beforeGFromActiveG.ui.keypadColumns, "targeted f layout action keeps g keypad columns unchanged");
  assert.equal(afterGFromActiveG.ui.keypadRows, beforeGFromActiveG.ui.keypadRows, "targeted f layout action keeps g keypad rows unchanged");
  assert.equal(
    afterGFromActiveG.ui.selectedControlField,
    beforeGFromActiveG.ui.selectedControlField,
    "targeted f layout action keeps g selected control field unchanged",
  );
  assert.equal(afterTargetedFInput.activeCalculatorId, "g", "targeted f actions do not implicitly switch active calculator");

  const memoryReadyBase: GameState = {
    ...dualWithActiveF,
    unlocks: {
      ...dualWithActiveF.unlocks,
      memory: {
        ...dualWithActiveF.unlocks.memory,
        [KEY_ID.memory_cycle_variable]: true,
        [KEY_ID.memory_adjust_plus]: true,
        [KEY_ID.memory_adjust_minus]: true,
        [KEY_ID.memory_recall]: true,
      },
    },
    calculators: {
      ...dualWithActiveF.calculators,
      g: dualWithActiveF.calculators?.g
        ? {
            ...dualWithActiveF.calculators.g,
            lambdaControl: {
              ...dualWithActiveF.calculators.g.lambdaControl,
              maxPoints: 8,
            },
            allocator: {
              ...dualWithActiveF.calculators.g.allocator,
              maxPoints: 8,
            },
            ui: {
              ...dualWithActiveF.calculators.g.ui,
              selectedControlField: "gamma",
            },
          }
        : dualWithActiveF.calculators?.g,
    },
    ui: {
      ...dualWithActiveF.ui,
      selectedControlField: "alpha",
    },
  };
  const memoryCycleOnG = reducer(memoryReadyBase, { type: "PRESS_KEY", key: KEY_ID.memory_cycle_variable, calculatorId: "g" });
  const cycleProjectedF = projectCalculatorToLegacy(memoryCycleOnG, "f");
  const cycleProjectedG = projectCalculatorToLegacy(memoryCycleOnG, "g");
  assert.equal(cycleProjectedG.ui.selectedControlField, "gamma", "g cycle remains on gamma when gamma is its only settable field");
  assert.equal(cycleProjectedF.ui.selectedControlField, "alpha", "g memory cycle does not mutate f selected control field");

  const beforeAdjustF = projectCalculatorToLegacy(memoryReadyBase, "f");
  const beforeAdjustG = projectCalculatorToLegacy(memoryReadyBase, "g");
  const adjustedG = reducer(memoryReadyBase, { type: "PRESS_KEY", key: KEY_ID.memory_adjust_plus, calculatorId: "g" });
  const afterAdjustF = projectCalculatorToLegacy(adjustedG, "f");
  const afterAdjustG = projectCalculatorToLegacy(adjustedG, "g");
  assert.equal(afterAdjustG.lambdaControl.gamma, beforeAdjustG.lambdaControl.gamma + 1, "g memory-adjust+ mutates only g gamma");
  assert.equal(afterAdjustF.lambdaControl.gamma, beforeAdjustF.lambdaControl.gamma, "g memory-adjust+ does not mutate f gamma");
  assert.equal(afterAdjustG.unlocks.maxSlots, afterAdjustG.lambdaControl.gamma, "g projection derives max slots from g control");
  assert.equal(afterAdjustF.unlocks.maxSlots, afterAdjustF.lambdaControl.gamma, "f projection derives max slots from f control");
  assert.equal(afterAdjustG.unlocks.maxSlots, beforeAdjustG.unlocks.maxSlots + 1, "g max slots increase is calculator-local");
  assert.equal(afterAdjustF.unlocks.maxSlots, beforeAdjustF.unlocks.maxSlots, "g max slots increase does not leak to f");
  assert.equal(afterAdjustF.unlocks.maxTotalDigits, beforeAdjustF.unlocks.maxTotalDigits, "g control changes do not force f digit capacity");

  const menuSession = materializeCalculatorMenu(initialState());
  const menuMemoryReady: GameState = {
    ...menuSession,
    unlocks: {
      ...menuSession.unlocks,
      memory: {
        ...menuSession.unlocks.memory,
        [KEY_ID.memory_cycle_variable]: true,
        [KEY_ID.memory_adjust_plus]: true,
        [KEY_ID.memory_adjust_minus]: true,
        [KEY_ID.memory_recall]: true,
      },
    },
    calculators: {
      ...menuSession.calculators,
      menu: menuSession.calculators?.menu
        ? {
            ...menuSession.calculators.menu,
            ui: {
              ...menuSession.calculators.menu.ui,
              selectedControlField: null,
            },
          }
        : menuSession.calculators?.menu,
    },
    activeCalculatorId: "menu",
  };
  const menuProjectedBefore = projectCalculatorToLegacy(menuMemoryReady, "menu");
  const menuAfterCycle = reducer(menuMemoryReady, { type: "PRESS_KEY", key: KEY_ID.memory_cycle_variable, calculatorId: "menu" });
  const menuAfterAdjust = reducer(menuMemoryReady, { type: "PRESS_KEY", key: KEY_ID.memory_adjust_plus, calculatorId: "menu" });
  const menuAfterRecall = reducer(menuMemoryReady, { type: "PRESS_KEY", key: KEY_ID.memory_recall, calculatorId: "menu" });
  assert.equal(projectCalculatorToLegacy(menuAfterCycle, "menu").ui.selectedControlField, null, "menu memory cycle is explicit no-op with no settable fields");
  assert.deepEqual(projectCalculatorToLegacy(menuAfterAdjust, "menu").lambdaControl, menuProjectedBefore.lambdaControl, "menu memory-adjust+ is explicit no-op with no settable fields");
  assert.deepEqual(projectCalculatorToLegacy(menuAfterRecall, "menu").calculator, menuProjectedBefore.calculator, "menu memory-recall is explicit no-op with no settable fields");

  const inconsistentSelectionSeed: GameState = {
    ...memoryReadyBase,
    activeCalculatorId: "g",
    ui: {
      ...memoryReadyBase.ui,
      selectedControlField: "delta",
      memoryVariable: "β",
    },
    calculators: {
      ...memoryReadyBase.calculators,
      g: memoryReadyBase.calculators?.g
        ? {
            ...memoryReadyBase.calculators.g,
            ui: {
              ...memoryReadyBase.calculators.g.ui,
              selectedControlField: "delta",
              memoryVariable: "γ",
            },
          }
        : memoryReadyBase.calculators?.g,
    },
  };
  const normalizedSelection = normalizeRuntimeStateInvariants(inconsistentSelectionSeed);
  const normalizedProjectedG = projectCalculatorToLegacy(normalizedSelection, "g");
  assert.equal(
    normalizedProjectedG.ui.selectedControlField,
    "gamma",
    "selected-control normalization in g falls back to legacy memoryVariable before canonical first-settable fallback",
  );
  assert.equal(
    normalizedSelection.ui.selectedControlField,
    normalizedProjectedG.ui.selectedControlField,
    "active root ui selected field stays consistent with projected active calculator after normalization",
  );
  const normalizedProjectedF = projectCalculatorToLegacy(normalizedSelection, "f");
  assert.equal(
    normalizedProjectedF.ui.selectedControlField,
    "alpha",
    "normalizing active g selection does not leak selected-field mutation into f projection",
  );

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

  const menuResetSeed: GameState = {
    ...crossMoveReady,
    calculators: {
      ...crossMoveReady.calculators,
      menu: {
        ...crossMoveReady.calculators!.menu!,
        calculator: {
          ...crossMoveReady.calculators!.menu!.calculator,
          total: rational(19n),
          rollEntries: [{ y: rational(19n) }],
        },
      },
    },
  };
  const menuResetResult = reducer(menuResetSeed, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad_menu",
    fromIndex: menuSourceIndex,
    toSurface: "keypad_f",
    toIndex: fDestinationIndex,
  });
  const menuResetProjected = projectCalculatorToLegacy(menuResetResult, "menu");
  assert.deepEqual(menuResetProjected.calculator.total, rational(0n), "menu key loss resets menu total");
  assert.equal(menuResetProjected.calculator.rollEntries.length, 0, "menu key loss clears menu roll");

  let fGResetSeed = materializeCalculatorMenu(materializeCalculatorG(initialState()));
  fGResetSeed = reducer(fGResetSeed, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "menu" });
  if (!fGResetSeed.calculators?.f || !fGResetSeed.calculators.g) {
    throw new Error("Expected f/g calculators for cross-reset coverage.");
  }
  const fLayout = [
    { kind: "key" as const, key: KEY_ID.exec_equals },
    { kind: "placeholder" as const, area: "empty" as const },
  ];
  const gLayout = [
    { kind: "key" as const, key: KEY_ID.exec_step_through },
    { kind: "placeholder" as const, area: "empty" as const },
  ];
  fGResetSeed = {
    ...fGResetSeed,
    unlocks: {
      ...fGResetSeed.unlocks,
      execution: {
        ...fGResetSeed.unlocks.execution,
        [KEY_ID.exec_equals]: true,
        [KEY_ID.exec_step_through]: true,
      },
    },
    calculators: {
      ...fGResetSeed.calculators,
      f: {
        ...fGResetSeed.calculators.f,
        calculator: {
          ...fGResetSeed.calculators.f.calculator,
          total: rational(9n),
          rollEntries: [{ y: rational(9n) }],
        },
        ui: {
          ...fGResetSeed.calculators.f.ui,
          keyLayout: fLayout,
          keypadColumns: 2,
          keypadRows: 1,
          keypadCells: fromKeyLayoutArray(fLayout, 2, 1),
        },
      },
      g: {
        ...fGResetSeed.calculators.g,
        calculator: {
          ...fGResetSeed.calculators.g.calculator,
          total: rational(13n),
          rollEntries: [{ y: rational(13n) }],
        },
        ui: {
          ...fGResetSeed.calculators.g.ui,
          keyLayout: gLayout,
          keypadColumns: 2,
          keypadRows: 1,
          keypadCells: fromKeyLayoutArray(gLayout, 2, 1),
        },
      },
    },
  };

  const fToG = reducer(fGResetSeed, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad_f",
    fromIndex: 0,
    toSurface: "keypad_g",
    toIndex: 1,
  });
  const fToGProjectedF = projectCalculatorToLegacy(fToG, "f");
  const fToGProjectedG = projectCalculatorToLegacy(fToG, "g");
  assert.deepEqual(fToGProjectedF.calculator.total, rational(0n), "f->g move resets losing f total");
  assert.equal(fToGProjectedF.calculator.rollEntries.length, 0, "f->g move clears f roll");
  assert.deepEqual(fToGProjectedG.calculator.total, rational(13n), "f->g move preserves gaining g total");

  const gToF = reducer(fGResetSeed, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad_g",
    fromIndex: 0,
    toSurface: "keypad_f",
    toIndex: 1,
  });
  const gToFProjectedF = projectCalculatorToLegacy(gToF, "f");
  const gToFProjectedG = projectCalculatorToLegacy(gToF, "g");
  assert.deepEqual(gToFProjectedG.calculator.total, rational(0n), "g->f move resets losing g total");
  assert.equal(gToFProjectedG.calculator.rollEntries.length, 0, "g->f move clears g roll");
  assert.deepEqual(gToFProjectedF.calculator.total, rational(9n), "g->f move preserves gaining f total");

  const swappedFG = reducer(fGResetSeed, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad_f",
    fromIndex: 0,
    toSurface: "keypad_g",
    toIndex: 0,
  });
  const swappedProjectedF = projectCalculatorToLegacy(swappedFG, "f");
  const swappedProjectedG = projectCalculatorToLegacy(swappedFG, "g");
  assert.deepEqual(swappedProjectedF.calculator.total, rational(0n), "f<->g swap resets f total");
  assert.deepEqual(swappedProjectedG.calculator.total, rational(0n), "f<->g swap resets g total");
  assert.equal(swappedProjectedF.calculator.rollEntries.length, 0, "f<->g swap clears f roll");
  assert.equal(swappedProjectedG.calculator.rollEntries.length, 0, "f<->g swap clears g roll");

  const installSeed: GameState = {
    ...fGResetSeed,
    unlocks: {
      ...fGResetSeed.unlocks,
      utilities: {
        ...fGResetSeed.unlocks.utilities,
        [KEY_ID.util_clear_all]: true,
      },
    },
  };
  const installIntoG = reducer(installSeed, {
    type: "INSTALL_KEY_FROM_STORAGE",
    key: KEY_ID.util_clear_all,
    toSurface: "keypad_g",
    toIndex: 1,
  });
  const installIntoGProjectedF = projectCalculatorToLegacy(installIntoG, "f");
  const installIntoGProjectedG = projectCalculatorToLegacy(installIntoG, "g");
  assert.equal(
    installIntoGProjectedG.ui.keyLayout[1]?.kind === "key" ? installIntoGProjectedG.ui.keyLayout[1].key : null,
    KEY_ID.util_clear_all,
    "targeted install mutates only g keypad",
  );
  assert.deepEqual(
    installIntoGProjectedF.calculator.total,
    rational(9n),
    "install into g keeps f calculator runtime unchanged",
  );
  assert.deepEqual(
    installIntoGProjectedG.calculator.total,
    rational(13n),
    "install into empty g slot does not reset g runtime",
  );

  const replaceInG = reducer(installSeed, {
    type: "INSTALL_KEY_FROM_STORAGE",
    key: KEY_ID.util_clear_all,
    toSurface: "keypad_g",
    toIndex: 0,
  });
  const replaceInGProjectedF = projectCalculatorToLegacy(replaceInG, "f");
  const replaceInGProjectedG = projectCalculatorToLegacy(replaceInG, "g");
  assert.deepEqual(replaceInGProjectedG.calculator.total, rational(0n), "replace install in g resets g total");
  assert.equal(replaceInGProjectedG.calculator.rollEntries.length, 0, "replace install in g clears g roll");
  assert.deepEqual(replaceInGProjectedF.calculator.total, rational(9n), "replace install in g keeps f total");

  const uninstallFromG = reducer(installSeed, {
    type: "UNINSTALL_LAYOUT_KEY",
    fromSurface: "keypad_g",
    fromIndex: 0,
  });
  const uninstallFromGProjectedF = projectCalculatorToLegacy(uninstallFromG, "f");
  const uninstallFromGProjectedG = projectCalculatorToLegacy(uninstallFromG, "g");
  assert.deepEqual(uninstallFromGProjectedG.calculator.total, rational(0n), "uninstall from g resets g total");
  assert.equal(uninstallFromGProjectedG.calculator.rollEntries.length, 0, "uninstall from g clears g roll");
  assert.deepEqual(uninstallFromGProjectedF.calculator.total, rational(9n), "uninstall from g keeps f total");

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

