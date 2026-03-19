import { SAVE_KEY, SAVE_SCHEMA_VERSION } from "../../domain/state.js";
import type { GameState } from "../../domain/types.js";

type SavePayload = {
  schemaVersion: number;
  savedAt: number;
  state: unknown;
};

type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

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

type BigIntEnvelope = { __autocalc_bigint__: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const bigintReplacer = (_key: string, value: unknown): unknown => {
  if (typeof value === "bigint") {
    const wrapped: BigIntEnvelope = { __autocalc_bigint__: value.toString() };
    return wrapped;
  }
  return value;
};

const bigintReviver = (_key: string, value: unknown): unknown => {
  if (
    isObject(value)
    && Object.keys(value).length === 1
    && typeof value.__autocalc_bigint__ === "string"
  ) {
    try {
      return BigInt(value.__autocalc_bigint__);
    } catch {
      return value;
    }
  }
  return value;
};

const parsePayloadEnvelope = (
  raw: string,
): { payload: SavePayload | null; reason: LoadFailureReason.InvalidJson | LoadFailureReason.InvalidPayloadEnvelope | null } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { payload: null, reason: LoadFailureReason.InvalidJson };
  }

  if (!isObject(parsed)) {
    return { payload: null, reason: LoadFailureReason.InvalidPayloadEnvelope };
  }
  if (!("schemaVersion" in parsed) || !("state" in parsed)) {
    return { payload: null, reason: LoadFailureReason.InvalidPayloadEnvelope };
  }
  if (typeof parsed.schemaVersion !== "number" || !Number.isInteger(parsed.schemaVersion)) {
    return { payload: null, reason: LoadFailureReason.InvalidPayloadEnvelope };
  }

  return {
    payload: {
      schemaVersion: parsed.schemaVersion,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
      state: parsed.state,
    },
    reason: null,
  };
};

const toPersistedState = (state: GameState): unknown => ({
  ...state,
  // Debug edits are explicitly session-only.
  sessionControlProfiles: {},
});

const fromPersistedState = (persisted: unknown): GameState => {
  try {
    return JSON.parse(JSON.stringify(persisted), bigintReviver) as GameState;
  } catch {
    throw new Error("Failed to deserialize persisted state.");
  }
};

export const loadFromRawSave = (raw: string | null): LoadResult => {
  if (!raw) {
    return { state: null, reason: LoadFailureReason.MissingSave };
  }

  const parsedEnvelope = parsePayloadEnvelope(raw);
  if (!parsedEnvelope.payload) {
    return { state: null, reason: parsedEnvelope.reason };
  }

  if (parsedEnvelope.payload.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return { state: null, reason: LoadFailureReason.UnsupportedSchemaVersion };
  }

  try {
    return { state: fromPersistedState(parsedEnvelope.payload.state), reason: null };
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
      state: toPersistedState(state),
    };
    storage.setItem(SAVE_KEY, JSON.stringify(payload, bigintReplacer));
  },

  clear: (): void => {
    storage.removeItem(SAVE_KEY);
  },
});
