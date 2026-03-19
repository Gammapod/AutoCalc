import { buildAllocatorSnapshot, sanitizeLambdaControl } from "./lambdaControl.js";
import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { KEY_ID } from "./keyPresentation.js";
import { KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS, defaultDrawerKeyLayout } from "./state.js";
import type { CalculatorId, CalculatorInstanceState, GameState, Key } from "./types.js";
import { controlProfiles } from "./controlProfilesCatalog.js";

export const CALCULATOR_ORDER: readonly CalculatorId[] = ["f", "g"];
export const MAIN_CALCULATOR_ID: CalculatorId = "f";

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

const createDefaultFCalculator = (state: GameState): CalculatorInstanceState => ({
  id: "f",
  symbol: "f",
  calculator: cloneCalculator(state.calculator),
  lambdaControl: sanitizeLambdaControl(state.lambdaControl, controlProfiles.f),
  allocator: buildAllocatorSnapshot(sanitizeLambdaControl(state.lambdaControl, controlProfiles.f), controlProfiles.f),
  ui: cloneUi(state.ui),
});

const createDefaultGCalculator = (): CalculatorInstanceState => {
  const keypadColumns = 4;
  const keypadRows = 2;
  const keyLayout = defaultDrawerKeyLayout(keypadColumns, keypadRows);
  const assign = (row: number, col: number, key: Key): void => {
    const index = (keypadRows - row) * keypadColumns + (keypadColumns - col);
    if (index >= 0 && index < keyLayout.length) {
      keyLayout[index] = { kind: "key", key };
    }
  };
  assign(1, 1, KEY_ID.exec_equals);
  assign(1, 3, KEY_ID.op_mul);
  assign(1, 4, KEY_ID.digit_0);
  assign(2, 3, KEY_ID.op_add);
  assign(2, 4, KEY_ID.digit_1);

  const lambdaControl = sanitizeLambdaControl({
    maxPoints: controlProfiles.g.starts.gamma,
    alpha: controlProfiles.g.starts.alpha,
    beta: controlProfiles.g.starts.beta,
    gamma: controlProfiles.g.starts.gamma,
    gammaMinRaised: controlProfiles.g.starts.gamma >= 1,
  }, controlProfiles.g);

  const baseUi: GameState["ui"] = {
    keyLayout,
    keypadCells: fromKeyLayoutArray(keyLayout, keypadColumns, keypadRows),
    storageLayout: [],
    keypadColumns,
    keypadRows,
    activeVisualizer: "total",
    memoryVariable: "α",
    buttonFlags: {},
  };

  return {
    id: "g",
    symbol: "g",
    calculator: {
      total: { kind: "rational", value: { num: 0n, den: 1n } },
      pendingNegativeTotal: false,
      singleDigitInitialTotalEntry: true,
      rollEntries: [],
      rollAnalysis: {
        stopReason: "none",
        cycle: null,
      },
      operationSlots: [],
      draftingSlot: null,
      stepProgress: {
        active: false,
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
    lambdaControl,
    allocator: buildAllocatorSnapshot(lambdaControl, controlProfiles.g),
    ui: baseUi,
  };
};

export const ensureCalculatorInstances = (state: GameState): GameState => {
  if (state.calculators?.f) {
    return state;
  }
  const f = createDefaultFCalculator(state);
  return {
    ...state,
    calculators: { ...(state.calculators ?? {}), f },
    calculatorOrder: state.calculators?.g ? [...CALCULATOR_ORDER] : ["f"],
    activeCalculatorId: state.activeCalculatorId ?? MAIN_CALCULATOR_ID,
  };
};

export const resolveActiveCalculatorId = (state: GameState): CalculatorId =>
  state.activeCalculatorId ?? MAIN_CALCULATOR_ID;

export const projectCalculatorToLegacy = (state: GameState, calculatorId: CalculatorId): GameState => {
  const withInstances = ensureCalculatorInstances(state);
  const instance = withInstances.calculators?.[calculatorId];
  if (!instance) {
    return withInstances;
  }
  return {
    ...withInstances,
    activeCalculatorId: calculatorId,
    calculator: cloneCalculator(instance.calculator),
    lambdaControl: sanitizeLambdaControl(instance.lambdaControl, controlProfiles[calculatorId]),
    allocator: instance.allocator,
    ui: cloneUi({
      ...instance.ui,
      storageLayout: withInstances.ui.storageLayout,
    }),
  };
};

export const commitLegacyProjection = (previous: GameState, projected: GameState, calculatorId: CalculatorId): GameState => {
  const base = ensureCalculatorInstances(previous);
  const nextInstance: CalculatorInstanceState = {
    id: calculatorId,
    symbol: calculatorId,
    calculator: cloneCalculator(projected.calculator),
    lambdaControl: sanitizeLambdaControl(projected.lambdaControl, controlProfiles[calculatorId]),
    allocator: projected.allocator,
    ui: cloneUi({
      ...projected.ui,
      storageLayout: base.ui.storageLayout,
    }),
  };
  return {
    ...projected,
    calculators: {
      ...base.calculators,
      [calculatorId]: nextInstance,
    },
    calculatorOrder: base.calculatorOrder ?? [...CALCULATOR_ORDER],
    activeCalculatorId: projected.activeCalculatorId ?? calculatorId,
  };
};

export const resolveFormulaSymbol = (state: GameState): "f" | "g" => {
  const active = resolveActiveCalculatorId(state);
  return active === "g" ? "g" : "f";
};

export const withActiveCalculator = (state: GameState, calculatorId: CalculatorId): GameState =>
  projectCalculatorToLegacy(ensureCalculatorInstances(state), calculatorId);

export const toCalculatorSurface = (calculatorId: CalculatorId): "keypad_f" | "keypad_g" =>
  calculatorId === "g" ? "keypad_g" : "keypad_f";

export const fromCalculatorSurface = (surface: "keypad_f" | "keypad_g"): CalculatorId =>
  surface === "keypad_g" ? "g" : "f";

export const normalizeLegacyForMissingInstances = (state: GameState): GameState =>
  ensureCalculatorInstances(state);
