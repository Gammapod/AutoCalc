import {
  BINARY_MODE_FLAG,
  CYCLE_FLAG,
  DELTA_RANGE_CLAMP_FLAG,
  FORECAST_FLAG,
  HISTORY_FLAG,
  SAVE_SCHEMA_VERSION,
  STEP_EXPANSION_FLAG,
} from "../../domain/state.js";
import { createDefaultCalculatorSettings } from "../../domain/settings.js";

export type SerializableSlot = {
  operator: string;
  operand: string;
};

export type SerializableStateV1 = Record<string, unknown>;
export type SerializableStateV2 = SerializableStateV1;
export type SerializableStateV3 = SerializableStateV2 & {
  operationSlots?: SerializableSlot[];
};
export type SerializableStateV14 = Record<string, unknown>;

export const migrateV1ToV2 = (input: SerializableStateV1): SerializableStateV2 => ({ ...input });

export const migrateV2ToV3 = (input: SerializableStateV2): SerializableStateV3 => ({ ...input });

export const isValidSchemaVersion = (version: unknown): version is number =>
  typeof version === "number" && Number.isInteger(version) && version > 0;

export const validateSerializableStateV3 = (state: unknown): state is SerializableStateV3 =>
  typeof state === "object" && state !== null;

const LEGACY_FLAGS_REMOVED_IN_V22 = [BINARY_MODE_FLAG, DELTA_RANGE_CLAMP_FLAG] as const;
const LEGACY_ANALYTICS_FLAGS_REMOVED_IN_V23 = [STEP_EXPANSION_FLAG, HISTORY_FLAG, FORECAST_FLAG, CYCLE_FLAG] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const dropLegacyFlagsFromUi = (ui: unknown): unknown => {
  if (!isRecord(ui)) {
    return ui;
  }
  if (!isRecord(ui.buttonFlags)) {
    return ui;
  }
  const nextButtonFlags = { ...ui.buttonFlags };
  for (const flag of LEGACY_FLAGS_REMOVED_IN_V22) {
    delete nextButtonFlags[flag];
  }
  return {
    ...ui,
    buttonFlags: nextButtonFlags,
  };
};

const dropLegacyAnalyticsFlagsFromUi = (ui: unknown): unknown => {
  if (!isRecord(ui)) {
    return ui;
  }
  if (!isRecord(ui.buttonFlags)) {
    return ui;
  }
  const nextButtonFlags = { ...ui.buttonFlags };
  for (const flag of LEGACY_FLAGS_REMOVED_IN_V22) {
    delete nextButtonFlags[flag];
  }
  for (const flag of LEGACY_ANALYTICS_FLAGS_REMOVED_IN_V23) {
    delete nextButtonFlags[flag];
  }
  return {
    ...ui,
    buttonFlags: nextButtonFlags,
  };
};

const resetDeprecatedSettings = (settings: unknown): unknown => {
  const defaults = createDefaultCalculatorSettings();
  if (!isRecord(settings)) {
    return defaults;
  }
  return {
    ...settings,
    visualizer: defaults.visualizer,
    wrapper: defaults.wrapper,
    base: defaults.base,
    stepExpansion: defaults.stepExpansion,
  };
};

const migrateV21ToV22 = (state: unknown): SerializableStateV14 | null => {
  if (!isRecord(state)) {
    return null;
  }
  const migrated: Record<string, unknown> = {
    ...state,
    settings: resetDeprecatedSettings(state.settings),
    ui: dropLegacyFlagsFromUi(state.ui),
  };
  if (isRecord(state.calculators)) {
    const nextCalculators: Record<string, unknown> = {};
    for (const [calculatorId, calculator] of Object.entries(state.calculators)) {
      if (!isRecord(calculator)) {
        nextCalculators[calculatorId] = calculator;
        continue;
      }
      nextCalculators[calculatorId] = {
        ...calculator,
        settings: resetDeprecatedSettings(calculator.settings),
        ui: dropLegacyFlagsFromUi(calculator.ui),
      };
    }
    migrated.calculators = nextCalculators;
  }
  return migrated;
};

const withAnalyticsSettingsDefaults = (settings: unknown): unknown => {
  const defaults = createDefaultCalculatorSettings();
  if (!isRecord(settings)) {
    return defaults;
  }
  return {
    ...settings,
    history: defaults.history,
    forecast: defaults.forecast,
    cycle: defaults.cycle,
  };
};

const migrateV22ToV23 = (state: unknown): SerializableStateV14 | null => {
  if (!isRecord(state)) {
    return null;
  }
  const migrated: Record<string, unknown> = {
    ...state,
    settings: withAnalyticsSettingsDefaults(state.settings),
    ui: dropLegacyAnalyticsFlagsFromUi(state.ui),
  };
  if (isRecord(state.calculators)) {
    const nextCalculators: Record<string, unknown> = {};
    for (const [calculatorId, calculator] of Object.entries(state.calculators)) {
      if (!isRecord(calculator)) {
        nextCalculators[calculatorId] = calculator;
        continue;
      }
      nextCalculators[calculatorId] = {
        ...calculator,
        settings: withAnalyticsSettingsDefaults(calculator.settings),
        ui: dropLegacyAnalyticsFlagsFromUi(calculator.ui),
      };
    }
    migrated.calculators = nextCalculators;
  }
  return migrated;
};

export const migrateToLatest = (schemaVersion: number, state: unknown): SerializableStateV14 | null => {
  if (!isValidSchemaVersion(schemaVersion) || !validateSerializableStateV3(state)) {
    return null;
  }
  if (schemaVersion === SAVE_SCHEMA_VERSION) {
    return state as SerializableStateV14;
  }
  if (schemaVersion === SAVE_SCHEMA_VERSION - 1) {
    return migrateV22ToV23(state);
  }
  return null;
};
