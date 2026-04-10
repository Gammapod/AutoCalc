import { SAVE_KEY, SAVE_SCHEMA_VERSION } from "../../domain/state.js";
import type { GameState } from "../../domain/types.js";
import { deserializeV20, serializeV20 } from "./saveCodecV20.js";
import { parseEnvelope, serializeEnvelope, type KeyValueStorage } from "./saveEnvelope.js";

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

  if (parsed.payload.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return { state: null, reason: LoadFailureReason.UnsupportedSchemaVersion };
  }

  try {
    const deserialized = deserializeV20(parsed.payload.state);
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
