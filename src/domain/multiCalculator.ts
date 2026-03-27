import { buildAllocatorSnapshot, sanitizeLambdaControl } from "./lambdaControl.js";
import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import type { CalculatorId, CalculatorInstanceState, GameState } from "./types.js";
import { controlProfiles } from "./controlProfilesCatalog.js";
import { createSeededKeyLayout } from "./calculatorSeedManifest.js";
import { createInitialUiDiagnosticsLastAction } from "./state.js";
import { createDefaultCalculatorSettings } from "./settings.js";

export const CALCULATOR_ORDER: readonly CalculatorId[] = ["menu", "f", "g"];
export const MAIN_CALCULATOR_ID: CalculatorId = "f";

const cloneUi = (ui: GameState["ui"]): GameState["ui"] => ({
  ...ui,
  keyLayout: ui.keyLayout.map((cell) => ({ ...cell })),
  keypadCells: ui.keypadCells.map((cell) => ({ ...cell, cell: { ...cell.cell } })),
  storageLayout: [...ui.storageLayout],
  buttonFlags: { ...ui.buttonFlags },
  diagnostics: {
    lastAction: { ...ui.diagnostics.lastAction },
  },
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

const cloneSettings = (settings: GameState["settings"]): GameState["settings"] => ({
  ...settings,
});

const createDefaultFCalculator = (state: GameState): CalculatorInstanceState => ({
  id: "f",
  symbol: "f",
  calculator: cloneCalculator(state.calculator),
  settings: cloneSettings(state.settings),
  lambdaControl: sanitizeLambdaControl(state.lambdaControl, controlProfiles.f),
  allocator: buildAllocatorSnapshot(sanitizeLambdaControl(state.lambdaControl, controlProfiles.f), controlProfiles.f),
  ui: cloneUi(state.ui),
});

const createDefaultGCalculator = (): CalculatorInstanceState => {
  const { keyLayout, columns: keypadColumns, rows: keypadRows, activeVisualizer } = createSeededKeyLayout("g");

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
    activeVisualizer,
    memoryVariable: "α",
    buttonFlags: {},
    diagnostics: {
      lastAction: createInitialUiDiagnosticsLastAction(),
    },
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
    settings: {
      ...createDefaultCalculatorSettings(),
      visualizer: activeVisualizer,
    },
    lambdaControl,
    allocator: buildAllocatorSnapshot(lambdaControl, controlProfiles.g),
    ui: baseUi,
  };
};

const createDefaultMenuCalculator = (): CalculatorInstanceState => {
  const { keyLayout, columns: keypadColumns, rows: keypadRows, activeVisualizer } = createSeededKeyLayout("menu");

  const lambdaControl = sanitizeLambdaControl({
    maxPoints: controlProfiles.menu.starts.gamma,
    alpha: controlProfiles.menu.starts.alpha,
    beta: controlProfiles.menu.starts.beta,
    gamma: controlProfiles.menu.starts.gamma,
    gammaMinRaised: false,
  }, controlProfiles.menu);

  const baseUi: GameState["ui"] = {
    keyLayout,
    keypadCells: fromKeyLayoutArray(keyLayout, keypadColumns, keypadRows),
    storageLayout: [],
    keypadColumns,
    keypadRows,
    activeVisualizer,
    memoryVariable: "α",
    buttonFlags: {},
    diagnostics: {
      lastAction: createInitialUiDiagnosticsLastAction(),
    },
  };

  return {
    id: "menu",
    symbol: "menu",
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
    settings: {
      ...createDefaultCalculatorSettings(),
      visualizer: activeVisualizer,
    },
    lambdaControl,
    allocator: buildAllocatorSnapshot(lambdaControl, controlProfiles.menu),
    ui: baseUi,
  };
};

const resolveCalculatorOrder = (calculators: Partial<Record<CalculatorId, CalculatorInstanceState>>): CalculatorId[] =>
  CALCULATOR_ORDER.filter((calculatorId) => Boolean(calculators[calculatorId]));

export const ensureCalculatorInstances = (state: GameState): GameState => {
  const calculators = state.calculators;
  if (calculators && Object.keys(calculators).length > 0) {
    const coherentOrder = (state.calculatorOrder ?? []).filter((calculatorId) => Boolean(calculators[calculatorId]));
    const resolvedOrder = coherentOrder.length > 0 ? coherentOrder : resolveCalculatorOrder(calculators);
    const resolvedActiveCalculatorId = state.activeCalculatorId && calculators[state.activeCalculatorId]
      ? state.activeCalculatorId
      : (resolvedOrder[0] ?? MAIN_CALCULATOR_ID);
    if (
      resolvedOrder.length === (state.calculatorOrder?.length ?? 0)
      && resolvedOrder.every((id, index) => state.calculatorOrder?.[index] === id)
      && resolvedActiveCalculatorId === state.activeCalculatorId
    ) {
      return state;
    }
    return {
      ...state,
      calculatorOrder: resolvedOrder,
      activeCalculatorId: resolvedActiveCalculatorId,
    };
  }

  if (state.calculators?.f) {
    return state;
  }
  const f = createDefaultFCalculator(state);
  return {
    ...state,
    calculators: { ...(state.calculators ?? {}), f },
    calculatorOrder: ["f"],
    activeCalculatorId: state.activeCalculatorId ?? MAIN_CALCULATOR_ID,
  };
};

const hasCoherentCalculatorOrder = (state: GameState): boolean => {
  const order = state.calculatorOrder ?? [];
  if (order.length === 0) {
    return false;
  }
  const calculators = state.calculators ?? {};
  return order.every((calculatorId) => Boolean(calculators[calculatorId]));
};

export const isMultiCalculatorSession = (state: GameState): boolean => {
  const withInstances = ensureCalculatorInstances(state);
  return (withInstances.calculatorOrder?.length ?? 0) > 1 && hasCoherentCalculatorOrder(withInstances);
};

export const materializeCalculatorMenu = (state: GameState): GameState => {
  const withInstances = ensureCalculatorInstances(state);
  if (withInstances.calculators?.menu) {
    return withInstances;
  }
  const nextCalculators = {
    ...withInstances.calculators,
    menu: createDefaultMenuCalculator(),
  };
  return {
    ...withInstances,
    calculators: nextCalculators,
    calculatorOrder: resolveCalculatorOrder(nextCalculators),
    activeCalculatorId: withInstances.activeCalculatorId ?? MAIN_CALCULATOR_ID,
  };
};

export const materializeCalculatorG = (state: GameState): GameState => {
  const withInstances = ensureCalculatorInstances(materializeCalculator(state, "f"));
  if (withInstances.calculators?.g) {
    return withInstances;
  }
  const nextCalculators = {
    ...withInstances.calculators,
    g: createDefaultGCalculator(),
  };
  return {
    ...withInstances,
    calculators: nextCalculators,
    calculatorOrder: resolveCalculatorOrder(nextCalculators),
    activeCalculatorId: withInstances.activeCalculatorId ?? MAIN_CALCULATOR_ID,
  };
};

export const materializeCalculator = (state: GameState, calculatorId: CalculatorId): GameState => {
  if (calculatorId === "f") {
    return ensureCalculatorInstances(state);
  }
  if (calculatorId === "g") {
    return materializeCalculatorG(state);
  }
  return materializeCalculatorMenu(state);
};

export const resolveActiveCalculatorId = (state: GameState): CalculatorId => {
  if (state.activeCalculatorId) {
    return state.activeCalculatorId;
  }
  const order = state.calculatorOrder ?? [];
  if (order.length > 0) {
    return order[0];
  }
  const calculators = state.calculators ?? {};
  const fallback = resolveCalculatorOrder(calculators)[0];
  return fallback ?? MAIN_CALCULATOR_ID;
};

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
    settings: cloneSettings(instance.settings),
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
    settings: cloneSettings(projected.settings),
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
    calculatorOrder: base.calculatorOrder ?? (base.calculators?.g ? ["f", "g"] : ["f"]),
    activeCalculatorId: projected.activeCalculatorId ?? calculatorId,
  };
};

export const resolveFormulaSymbol = (state: GameState): "f" | "g" => {
  const active = resolveActiveCalculatorId(state);
  return active === "g" ? "g" : "f";
};

export const withActiveCalculator = (state: GameState, calculatorId: CalculatorId): GameState =>
  projectCalculatorToLegacy(ensureCalculatorInstances(state), calculatorId);

export const toCalculatorSurface = (calculatorId: CalculatorId): "keypad_f" | "keypad_g" | "keypad_menu" =>
  calculatorId === "g" ? "keypad_g" : calculatorId === "menu" ? "keypad_menu" : "keypad_f";

export const fromCalculatorSurface = (surface: "keypad_f" | "keypad_g" | "keypad_menu"): CalculatorId =>
  surface === "keypad_g" ? "g" : surface === "keypad_menu" ? "menu" : "f";

export const normalizeLegacyForMissingInstances = (state: GameState): GameState =>
  ensureCalculatorInstances(state);

