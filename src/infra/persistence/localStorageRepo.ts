import { SAVE_KEY, SAVE_SCHEMA_VERSION } from "../../domain/state.js";
import type { GameState } from "../../domain/types.js";
import { deserializeV20, serializeV20 } from "./saveCodecV20.js";
import { parseEnvelope, serializeEnvelope, type KeyValueStorage } from "./saveEnvelope.js";
import { createDefaultCalculatorSettings, normalizeSettingsFlagsFromButtonFlags } from "../../domain/settings.js";

export const enum LoadFailureReason {
  MissingSave = "missing_save",
  InvalidJson = "invalid_json",
  InvalidPayloadEnvelope = "invalid_payload_envelope",
  UnsupportedSchemaVersion = "unsupported_schema_version",
  MigrationFailed = "migration_failed",
  DeserializeFailed = "deserialize_failed",
}

export type LoadResult = {
  state: GameState | null;
  reason: LoadFailureReason | null;
};

const migrateLegacySettingsDefaults = (state: GameState): GameState => {
  const defaultSettings = createDefaultCalculatorSettings();
  const normalizeUi = (ui: GameState["ui"]): GameState["ui"] => ({
    ...ui,
    activeVisualizer: defaultSettings.visualizer,
    buttonFlags: normalizeSettingsFlagsFromButtonFlags(ui.buttonFlags ?? {}),
  });
  const calculators = state.calculators
    ? Object.fromEntries(
      Object.entries(state.calculators).map(([id, instance]) => {
        if (!instance) {
          return [id, instance];
        }
        return [
          id,
          {
            ...instance,
            settings: createDefaultCalculatorSettings(),
            ui: normalizeUi(instance.ui),
          },
        ];
      }),
    ) as GameState["calculators"]
    : state.calculators;
  const activeCalculatorId = state.activeCalculatorId;
  const projectedActiveUi = activeCalculatorId && calculators?.[activeCalculatorId]
    ? calculators[activeCalculatorId]?.ui
    : null;
  return {
    ...state,
    settings: createDefaultCalculatorSettings(),
    ui: projectedActiveUi ?? normalizeUi(state.ui),
    ...(calculators ? { calculators } : {}),
  };
};

export const loadFromRawSave = (raw: string | null): LoadResult => {
  if (!raw) {
    return { state: null, reason: LoadFailureReason.MissingSave };
  }

  const parsed = parseEnvelope(raw);
  if (!parsed.payload) {
    return {
      state: null,
      reason: parsed.reason === "invalid_json" ? LoadFailureReason.InvalidJson : LoadFailureReason.InvalidPayloadEnvelope,
    };
  }

  const legacySchemaVersion = SAVE_SCHEMA_VERSION - 1;
  if (parsed.payload.schemaVersion !== SAVE_SCHEMA_VERSION && parsed.payload.schemaVersion !== legacySchemaVersion) {
    return { state: null, reason: LoadFailureReason.UnsupportedSchemaVersion };
  }

  try {
    const deserialized = deserializeV20(parsed.payload.state);
    if (parsed.payload.schemaVersion === legacySchemaVersion) {
      return { state: migrateLegacySettingsDefaults(deserialized), reason: null };
    }
    return { state: deserialized, reason: null };
  } catch {
    return { state: null, reason: LoadFailureReason.DeserializeFailed };
  }
};

export const createLocalStorageRepo = (storage: KeyValueStorage) => ({
  load: (): GameState | null => loadFromRawSave(storage.getItem(SAVE_KEY)).state,

  save: (state: GameState): void => {
    const payload = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: serializeV20(state),
    };
    storage.setItem(SAVE_KEY, serializeEnvelope(payload));
  },

  clear: (): void => {
    storage.removeItem(SAVE_KEY);
  },
});
