import { parseRational, toDisplayString } from "../math/rationalEngine.js";
import { SAVE_KEY, SAVE_SCHEMA_VERSION } from "../../domain/state.js";
import { isValidSchemaVersion, migrateToLatest, type SerializableStateV5, type SerializableSlot } from "./migrations.js";
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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toSerializableState = (state: GameState): SerializableStateV5 => ({
  calculator: {
    total: toDisplayString(state.calculator.total),
    pendingNegativeTotal: state.calculator.pendingNegativeTotal,
    roll: state.calculator.roll.map((value) => toDisplayString(value)),
    euclidRemainders: state.calculator.euclidRemainders.map((entry) => ({
      rollIndex: entry.rollIndex,
      value: toDisplayString(entry.value),
    })),
    operationSlots: state.calculator.operationSlots.map<SerializableSlot>((slot) => ({
      operator: slot.operator,
      operand: slot.operand.toString(),
    })),
    draftingSlot: state.calculator.draftingSlot,
  },
  ui: {
    keyLayout: state.ui.keyLayout,
    storageLayout: state.ui.storageLayout,
    keypadColumns: state.ui.keypadColumns,
    keypadRows: state.ui.keypadRows,
    buttonFlags: state.ui.buttonFlags,
  },
  unlocks: state.unlocks,
  completedUnlockIds: state.completedUnlockIds,
});

const fromSerializableStateV3 = (payloadState: SerializableStateV5): GameState => ({
  calculator: {
    total: parseRational(payloadState.calculator.total),
    pendingNegativeTotal: payloadState.calculator.pendingNegativeTotal,
    roll: payloadState.calculator.roll.map((value) => parseRational(value)),
    euclidRemainders: payloadState.calculator.euclidRemainders.map((entry) => ({
      rollIndex: entry.rollIndex,
      value: parseRational(entry.value),
    })),
    operationSlots: payloadState.calculator.operationSlots.map((slot) => ({
      operator: slot.operator,
      operand: BigInt(slot.operand),
    })),
    draftingSlot: payloadState.calculator.draftingSlot,
  },
  ui: {
    keyLayout: payloadState.ui.keyLayout,
    storageLayout: payloadState.ui.storageLayout,
    keypadColumns: payloadState.ui.keypadColumns,
    keypadRows: payloadState.ui.keypadRows,
    buttonFlags: payloadState.ui.buttonFlags,
  },
  unlocks: payloadState.unlocks,
  completedUnlockIds: payloadState.completedUnlockIds,
});

const parsePayloadEnvelope = (
  raw: string,
): { payload: SavePayload | null; reason: LoadFailureReason.InvalidJson | LoadFailureReason.InvalidPayloadEnvelope | null } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { payload: null, reason: LoadFailureReason.InvalidJson };
  }

  if (!isObject(parsed)) {
    return { payload: null, reason: LoadFailureReason.InvalidPayloadEnvelope };
  }
  if (!("schemaVersion" in parsed) || !("state" in parsed)) {
    return { payload: null, reason: LoadFailureReason.InvalidPayloadEnvelope };
  }

  return {
    payload: {
      schemaVersion: parsed.schemaVersion as number,
      savedAt: (parsed.savedAt as number | undefined) ?? Date.now(),
      state: parsed.state,
    },
    reason: null,
  };
};

export const loadFromRawSave = (raw: string | null): LoadResult => {
  if (!raw) {
    return { state: null, reason: LoadFailureReason.MissingSave };
  }

  const parsedEnvelope = parsePayloadEnvelope(raw);
  if (!parsedEnvelope.payload) {
    return { state: null, reason: parsedEnvelope.reason };
  }
  const payload = parsedEnvelope.payload;

  if (!isValidSchemaVersion(payload.schemaVersion)) {
    return { state: null, reason: LoadFailureReason.UnsupportedSchemaVersion };
  }

  const migrated = migrateToLatest(payload.schemaVersion, payload.state);
  if (!migrated) {
    return { state: null, reason: LoadFailureReason.MigrationFailed };
  }

  try {
    return { state: fromSerializableStateV3(migrated), reason: null };
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
      state: toSerializableState(state),
    };
    storage.setItem(SAVE_KEY, JSON.stringify(payload));
  },

  clear: (): void => {
    storage.removeItem(SAVE_KEY);
  },
});
