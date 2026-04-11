import { getLambdaDerivedValues, sanitizeLambdaControl } from "./lambdaControl.js";
import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import type { CalculatorId, CalculatorInstanceState, GameState } from "./types.js";
import { controlProfiles } from "./controlProfilesCatalog.js";
import { createSeededKeyLayout } from "./calculatorSeedManifest.js";
import { BINARY_MODE_FLAG, createInitialUiDiagnosticsLastAction } from "./state.js";
import { createDefaultCalculatorSettings } from "./settings.js";
import {
  fromCalculatorSurface as fromSurfaceMapping,
  toCalculatorSurface as toSurfaceMapping,
  type CalculatorKeypadSurface,
} from "./calculatorSurface.js";

export const CALCULATOR_ORDER: readonly CalculatorId[] = ["menu", "f", "g", "f_prime", "g_prime"];
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

const createInitialCalculatorState = (): GameState["calculator"] => ({
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
});

const buildDefaultControl = (calculatorId: CalculatorId): GameState["lambdaControl"] =>
  sanitizeLambdaControl(controlProfiles[calculatorId].starts, controlProfiles[calculatorId]);

const createDefaultFCalculator = (state: GameState): CalculatorInstanceState => ({
  id: "f",
  symbol: "f",
  calculator: cloneCalculator(state.calculator),
  settings: cloneSettings(state.settings),
  lambdaControl: sanitizeLambdaControl(state.lambdaControl, controlProfiles.f),
  ui: cloneUi(state.ui),
});

const createCalculatorUi = (
  calculatorId: CalculatorId,
  options: { buttonFlags?: Record<string, boolean> },
): GameState["ui"] => {
  const { keyLayout, columns: keypadColumns, rows: keypadRows, activeVisualizer } = createSeededKeyLayout(calculatorId);
  return {
    keyLayout,
    keypadCells: fromKeyLayoutArray(keyLayout, keypadColumns, keypadRows),
    storageLayout: [],
    keypadColumns,
    keypadRows,
    activeVisualizer,
    buttonFlags: { ...(options.buttonFlags ?? {}) },
    diagnostics: {
      lastAction: createInitialUiDiagnosticsLastAction(),
    },
  };
};

const createDefaultGCalculator = (): CalculatorInstanceState => {
  const calculatorId: CalculatorId = "g";
  const ui = createCalculatorUi(calculatorId, {});
  return {
    id: calculatorId,
    symbol: calculatorId,
    calculator: createInitialCalculatorState(),
    settings: {
      ...createDefaultCalculatorSettings(),
      visualizer: ui.activeVisualizer,
    },
    lambdaControl: buildDefaultControl(calculatorId),
    ui,
  };
};

const createDefaultMenuCalculator = (): CalculatorInstanceState => {
  const calculatorId: CalculatorId = "menu";
  const ui = createCalculatorUi(calculatorId, {});
  return {
    id: calculatorId,
    symbol: calculatorId,
    calculator: createInitialCalculatorState(),
    settings: {
      ...createDefaultCalculatorSettings(),
      visualizer: ui.activeVisualizer,
    },
    lambdaControl: buildDefaultControl(calculatorId),
    ui,
  };
};

const createDefaultFPrimeCalculator = (): CalculatorInstanceState => {
  const calculatorId: CalculatorId = "f_prime";
  const ui = createCalculatorUi(calculatorId, {});
  return {
    id: calculatorId,
    symbol: calculatorId,
    calculator: createInitialCalculatorState(),
    settings: {
      ...createDefaultCalculatorSettings(),
      visualizer: ui.activeVisualizer,
    },
    lambdaControl: buildDefaultControl(calculatorId),
    ui,
  };
};

const createDefaultGPrimeCalculator = (): CalculatorInstanceState => {
  const calculatorId: CalculatorId = "g_prime";
  const ui = createCalculatorUi(calculatorId, {
    buttonFlags: {
      [BINARY_MODE_FLAG]: true,
    },
  });
  return {
    id: calculatorId,
    symbol: calculatorId,
    calculator: createInitialCalculatorState(),
    settings: {
      ...createDefaultCalculatorSettings(),
      base: "base2",
      visualizer: ui.activeVisualizer,
    },
    lambdaControl: buildDefaultControl(calculatorId),
    ui,
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

export const materializeCalculatorFPrime = (state: GameState): GameState => {
  const withInstances = ensureCalculatorInstances(materializeCalculator(state, "f"));
  if (withInstances.calculators?.f_prime) {
    return withInstances;
  }
  const nextCalculators = {
    ...withInstances.calculators,
    f_prime: createDefaultFPrimeCalculator(),
  };
  return {
    ...withInstances,
    calculators: nextCalculators,
    calculatorOrder: resolveCalculatorOrder(nextCalculators),
    activeCalculatorId: withInstances.activeCalculatorId ?? MAIN_CALCULATOR_ID,
  };
};

export const materializeCalculatorGPrime = (state: GameState): GameState => {
  const withInstances = ensureCalculatorInstances(materializeCalculator(state, "f"));
  if (withInstances.calculators?.g_prime) {
    return withInstances;
  }
  const nextCalculators = {
    ...withInstances.calculators,
    g_prime: createDefaultGPrimeCalculator(),
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
  if (calculatorId === "f_prime") {
    return materializeCalculatorFPrime(state);
  }
  if (calculatorId === "g_prime") {
    return materializeCalculatorGPrime(state);
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
  const projectedControl = sanitizeLambdaControl(instance.lambdaControl, controlProfiles[calculatorId]);
  const derivedControl = getLambdaDerivedValues(projectedControl, controlProfiles[calculatorId]);
  return {
    ...withInstances,
    activeCalculatorId: calculatorId,
    calculator: cloneCalculator(instance.calculator),
    settings: cloneSettings(instance.settings),
    lambdaControl: projectedControl,
    unlocks: {
      ...withInstances.unlocks,
      maxSlots: derivedControl.effectiveFields.gamma,
      maxTotalDigits: derivedControl.effectiveFields.delta,
    },
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
    calculatorOrder: base.calculatorOrder ?? resolveCalculatorOrder(base.calculators ?? {}),
    activeCalculatorId: projected.activeCalculatorId ?? calculatorId,
  };
};

export const resolveFormulaSymbol = (state: GameState): "f" | "g" => {
  const active = resolveActiveCalculatorId(state);
  return active === "g" || active === "g_prime" ? "g" : "f";
};

export const withActiveCalculator = (state: GameState, calculatorId: CalculatorId): GameState =>
  projectCalculatorToLegacy(ensureCalculatorInstances(state), calculatorId);

export const setActiveCalculator = (state: GameState, calculatorId: CalculatorId): GameState => {
  const withInstances = ensureCalculatorInstances(state);
  if (!withInstances.calculators?.[calculatorId]) {
    return withInstances;
  }
  return projectCalculatorToLegacy(withInstances, calculatorId);
};

export const fromCalculatorSurface = (
  surface: CalculatorKeypadSurface,
): CalculatorId => fromSurfaceMapping(surface);

export const toCalculatorSurface = (calculatorId: CalculatorId): CalculatorKeypadSurface =>
  toSurfaceMapping(calculatorId);

export const normalizeLegacyForMissingInstances = (state: GameState): GameState =>
  ensureCalculatorInstances(state);
