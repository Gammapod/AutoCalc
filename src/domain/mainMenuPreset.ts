import { initialState } from "./state.js";
import { materializeCalculator } from "./multiCalculator.js";
import type { CalculatorId, GameState } from "./types.js";
import { resolveModeManifest } from "./modeManifest.js";

const cloneUi = (ui: GameState["ui"]): GameState["ui"] => ({
  ...ui,
  keyLayout: ui.keyLayout.map((cell) => ({ ...cell })),
  keypadCells: ui.keypadCells.map((cell) => ({ ...cell, cell: { ...cell.cell } })),
  storageLayout: [...ui.storageLayout],
  buttonFlags: { ...ui.buttonFlags },
});

const cloneCalculator = (calculator: GameState["calculator"]): GameState["calculator"] => ({
  ...calculator,
  rollEntries: [...calculator.rollEntries],
  operationSlots: [...calculator.operationSlots],
  stepProgress: {
    ...calculator.stepProgress,
    executedSlotResults: [...calculator.stepProgress.executedSlotResults],
  },
});

const cloneCalculatorOrder = (order: CalculatorId[]): CalculatorId[] => [...order];

const lockRecord = <T extends Record<string, boolean>>(record: T): T =>
  Object.fromEntries(Object.keys(record).map((key) => [key, false])) as T;

export const createMainMenuState = (): GameState => {
  const modePolicy = resolveModeManifest("main_menu");
  const withMenu = materializeCalculator(initialState(), "menu");
  const menuInstance = withMenu.calculators?.menu;
  if (!menuInstance) {
    throw new Error("Main menu preset failed to materialize menu calculator.");
  }
  const menuCalculator = {
    ...cloneCalculator(menuInstance.calculator),
    singleDigitInitialTotalEntry: true,
  };
  const menuUi = {
    ...cloneUi(menuInstance.ui),
    buttonFlags: {
      ...menuInstance.ui.buttonFlags,
      ...modePolicy.modeButtonFlags,
    },
  };
  const menuLambdaControl = { ...menuInstance.lambdaControl };

  return {
    ...withMenu,
    calculator: menuCalculator,
    settings: {
      ...withMenu.settings,
      visualizer: menuInstance.settings.visualizer,
    },
    lambdaControl: menuLambdaControl,
    ui: menuUi,
    completedUnlockIds: [],
    keyPressCounts: {},
    unlocks: {
      ...withMenu.unlocks,
      valueAtoms: lockRecord(withMenu.unlocks.valueAtoms),
      valueCompose: lockRecord(withMenu.unlocks.valueCompose),
      valueExpression: lockRecord(withMenu.unlocks.valueExpression),
      slotOperators: lockRecord(withMenu.unlocks.slotOperators),
      unaryOperators: lockRecord(withMenu.unlocks.unaryOperators),
      utilities: lockRecord(withMenu.unlocks.utilities),
      memory: lockRecord(withMenu.unlocks.memory),
      steps: lockRecord(withMenu.unlocks.steps),
      visualizers: lockRecord(withMenu.unlocks.visualizers),
      execution: lockRecord(withMenu.unlocks.execution),
      uiUnlocks: {
        ...withMenu.unlocks.uiUnlocks,
        storageVisible: false,
      },
    },
    calculators: {
      menu: {
        ...menuInstance,
        calculator: menuCalculator,
        lambdaControl: menuLambdaControl,
        ui: menuUi,
      },
    },
    calculatorOrder: cloneCalculatorOrder(["menu"]),
    activeCalculatorId: "menu",
    perCalculatorCompletedUnlockIds: {
      menu: [],
    },
  };
};
