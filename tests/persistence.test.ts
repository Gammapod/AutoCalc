import assert from "node:assert/strict";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import {
  SAVE_KEY,
  SAVE_SCHEMA_VERSION,
  initialState,
} from "../src/domain/state.js";
import {
  LoadFailureReason,
  createLocalStorageRepo,
  loadFromRawSave,
} from "../src/infra/persistence/localStorageRepo.js";

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));

const createMemoryStorage = (): MemoryStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
};

export const runPersistenceTests = (): void => {
  const storage = createMemoryStorage();
  const repo = createLocalStorageRepo(storage);

  const base = initialState();
  const persisted = {
    ...base,
    calculator: {
      ...base.calculator,
      total: r(12n),
      roll: [r(11n), r(12n)],
    },
    keyPressCounts: { "+": 3, "=": 2 },
    unlocks: {
      ...base.unlocks,
      uiUnlocks: { storageVisible: true },
      execution: { ...base.unlocks.execution, "=": true },
    },
    completedUnlockIds: ["unlock_storage_on_total_11", "unlock_equals_on_total_11"],
  };
  repo.save(persisted);

  const rawSaved = storage.getItem(SAVE_KEY);
  assert.ok(rawSaved, "save writes payload");
  const parsedSaved = JSON.parse(rawSaved);
  assert.equal(parsedSaved.schemaVersion, SAVE_SCHEMA_VERSION, "save writes current schema");

  const loaded = repo.load();
  assert.ok(loaded, "saved payload hydrates");
  assert.deepEqual(loaded?.calculator.total, r(12n), "round-trip total");
  assert.deepEqual(loaded?.keyPressCounts, { "+": 3, "=": 2 }, "round-trip key press counters");
  assert.equal(loaded?.unlocks.uiUnlocks.storageVisible, true, "round-trip storage unlock");

  const legacyV1 = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 1,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "9",
          pendingNegativeTotal: false,
          roll: ["9"],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
      },
    }),
  );
  assert.ok(legacyV1.state, "legacy payload hydrates");
  assert.deepEqual(legacyV1.state, initialState(), "legacy payload is hard-reset to current initial state");

  const legacyV5 = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 5,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "11",
          pendingNegativeTotal: false,
          singleDigitInitialTotalEntry: false,
          roll: ["11"],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: initialState().ui.keyLayout,
          keypadCells: initialState().ui.keypadCells,
          storageLayout: initialState().ui.storageLayout,
          keypadColumns: 1,
          keypadRows: 1,
          buttonFlags: {},
        },
        unlocks: initialState().unlocks,
        completedUnlockIds: ["unlock_storage_on_total_11"],
      },
    }),
  );
  assert.ok(legacyV5.state, "v5 payload hydrates");
  assert.deepEqual(legacyV5.state, initialState(), "v5 payload is hard-reset to current initial state");

  const badJson = loadFromRawSave("{");
  assert.equal(badJson.state, null, "invalid JSON fails safely");
  assert.equal(badJson.reason, LoadFailureReason.InvalidJson, "invalid JSON reason is reported");

  const malformed = loadFromRawSave(
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          pendingNegativeTotal: false,
          roll: [],
          rollErrors: [],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: initialState().ui.keyLayout,
          keypadCells: initialState().ui.keypadCells,
          storageLayout: initialState().ui.storageLayout,
          keypadColumns: 1,
          keypadRows: 1,
          buttonFlags: {},
        },
        keyPressCounts: { "+": "bad" },
        unlocks: initialState().unlocks,
        completedUnlockIds: [],
      },
    }),
  );
  assert.ok(malformed.state, "invalid keyPressCounts payload still hydrates");
  assert.deepEqual(malformed.state?.keyPressCounts, {}, "invalid keyPressCounts are normalized away");

  const nanRoundTrip = {
    ...base,
    calculator: {
      ...base.calculator,
      total: toNanCalculatorValue(),
      roll: [r(5n), toNanCalculatorValue()],
      rollErrors: [{ rollIndex: 1, code: "n/0, ∴ NaN" as const, kind: "division_by_zero" as const }],
    },
  };
  repo.save(nanRoundTrip);
  const loadedNan = repo.load();
  assert.ok(loadedNan, "NaN payload hydrates");
  assert.deepEqual(loadedNan?.calculator.total, toNanCalculatorValue(), "NaN total round-trips");
  assert.equal(loadedNan?.calculator.roll[1]?.kind, "nan", "NaN roll entries round-trip");
};
