import { parseRational, toDisplayString } from "../math/rationalEngine.js";
import { SAVE_KEY, SAVE_SCHEMA_VERSION } from "../../domain/state.js";
import { isRationalCalculatorValue, toNanCalculatorValue, toRationalCalculatorValue } from "../../domain/calculatorValue.js";
import { fromKeyLayoutArray } from "../../domain/keypadLayoutModel.js";
import { isValidSchemaVersion, migrateToLatest, type SerializableStateV10, type SerializableSlot } from "./migrations.js";
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

const serializeCalculatorValue = (value: GameState["calculator"]["total"]): string =>
  isRationalCalculatorValue(value) ? toDisplayString(value.value) : "NaN";

const deserializeCalculatorValue = (value: string): GameState["calculator"]["total"] =>
  value.trim() === "NaN" ? toNanCalculatorValue() : toRationalCalculatorValue(parseRational(value));

const toSerializableState = (state: GameState): SerializableStateV10 => ({
  calculator: {
    total: serializeCalculatorValue(state.calculator.total),
    pendingNegativeTotal: state.calculator.pendingNegativeTotal,
    singleDigitInitialTotalEntry: state.calculator.singleDigitInitialTotalEntry,
    roll: state.calculator.roll.map((value) => serializeCalculatorValue(value)),
    rollErrors: state.calculator.rollErrors,
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
    keypadCells: state.ui.keypadCells,
    storageLayout: state.ui.storageLayout,
    keypadColumns: state.ui.keypadColumns,
    keypadRows: state.ui.keypadRows,
    buttonFlags: state.ui.buttonFlags,
  },
  keyPressCounts: state.keyPressCounts,
  allocatorReturnPressCount: state.allocatorReturnPressCount ?? 0,
  unlocks: state.unlocks,
  completedUnlockIds: state.completedUnlockIds,
  allocator: state.allocator,
});

const fromSerializableStateV3 = (payloadState: SerializableStateV10): GameState => ({
  calculator: {
    total: deserializeCalculatorValue(payloadState.calculator.total),
    pendingNegativeTotal: payloadState.calculator.pendingNegativeTotal,
    singleDigitInitialTotalEntry: payloadState.calculator.singleDigitInitialTotalEntry ?? false,
    roll: payloadState.calculator.roll.map((value) => deserializeCalculatorValue(value)),
    rollErrors: payloadState.calculator.rollErrors,
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
    keypadCells:
      payloadState.ui.keypadCells && payloadState.ui.keypadCells.length === payloadState.ui.keypadColumns * payloadState.ui.keypadRows
        ? payloadState.ui.keypadCells
        : fromKeyLayoutArray(
            payloadState.ui.keyLayout,
            payloadState.ui.keypadColumns,
            payloadState.ui.keypadRows,
          ),
    storageLayout: payloadState.ui.storageLayout,
    keypadColumns: payloadState.ui.keypadColumns,
    keypadRows: payloadState.ui.keypadRows,
    buttonFlags: payloadState.ui.buttonFlags,
  },
  keyPressCounts: payloadState.keyPressCounts ?? {},
  allocatorReturnPressCount: payloadState.allocatorReturnPressCount ?? 0,
  unlocks: payloadState.unlocks,
  completedUnlockIds: payloadState.completedUnlockIds,
  allocator: payloadState.allocator,
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
