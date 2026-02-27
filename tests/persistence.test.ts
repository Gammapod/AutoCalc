import assert from "node:assert/strict";
import { createLocalStorageRepo } from "../src/infra/persistence/localStorageRepo.js";
import { SAVE_KEY, SAVE_SCHEMA_VERSION, defaultKeyLayout, initialState } from "../src/domain/state.js";

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

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

  const state = initialState();
  const nextState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: 15n,
      roll: [3n, 9n, 15n],
      operationSlots: [{ operator: "*" as const, operand: 6n }],
    },
    ui: {
      keyLayout: [state.ui.keyLayout[1], state.ui.keyLayout[0], ...state.ui.keyLayout.slice(2)],
    },
  };

  repo.save(nextState);
  const loaded = repo.load();
  if (!loaded) {
    throw new Error("Expected hydrated state, received null.");
  }

  assert.equal(loaded.calculator.total, 15n, "hydrate bigint total");
  assert.deepEqual(loaded.calculator.roll, [3n, 9n, 15n], "hydrate bigint roll");
  assert.deepEqual(loaded.calculator.operationSlots, [{ operator: "*", operand: 6n }], "hydrate slot bigint operand");
  assert.deepEqual(loaded.ui.keyLayout.slice(0, 2), [state.ui.keyLayout[1], state.ui.keyLayout[0]], "hydrate ui key layout");

  const legacyStorage = createMemoryStorage();
  legacyStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "9",
          roll: ["9"],
          operationSlots: [],
          draftingSlot: null,
        },
        unlocks: state.unlocks,
        completedUnlockIds: [],
      },
    }),
  );

  const legacyRepo = createLocalStorageRepo(legacyStorage);
  const loadedLegacy = legacyRepo.load();
  if (!loadedLegacy) {
    throw new Error("Expected legacy payload to hydrate with default layout.");
  }
  assert.deepEqual(loadedLegacy.ui.keyLayout, defaultKeyLayout(), "legacy saves hydrate default ui layout");
  assert.equal(loadedLegacy.unlocks.execution["="], false, "legacy unlock payload hydrates default execution unlocks");
  assert.equal(loadedLegacy.unlocks.slotOperators["-"], false, "legacy unlock payload hydrates default minus unlock");
  assert.equal(loadedLegacy.unlocks.slotOperators["*"], false, "legacy unlock payload hydrates default mul unlock");
  assert.equal(loadedLegacy.unlocks.digits["1"], true, "legacy unlock payload hydrates current default digit unlocks");
  assert.equal(loadedLegacy.unlocks.maxTotalDigits, 2, "legacy unlock payload hydrates default total-digit cap");

  const legacyLayoutStorage = createMemoryStorage();
  const legacyLayout = defaultKeyLayout().map((cell) =>
    cell.kind === "key" && cell.key === "NEG" ? { kind: "placeholder" as const, area: "negate" } : cell,
  );
  legacyLayoutStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          roll: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: legacyLayout,
        },
        unlocks: state.unlocks,
        completedUnlockIds: [],
      },
    }),
  );
  const legacyLayoutRepo = createLocalStorageRepo(legacyLayoutStorage);
  const loadedLegacyLayout = legacyLayoutRepo.load();
  if (!loadedLegacyLayout) {
    throw new Error("Expected legacy layout payload to hydrate.");
  }
  assert.ok(
    loadedLegacyLayout.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === "NEG"),
    "legacy negate placeholder migrates to NEG key",
  );

  const legacyMulLayoutStorage = createMemoryStorage();
  const legacyMulLayout = defaultKeyLayout().map((cell) =>
    cell.kind === "key" && cell.key === "*" ? { kind: "placeholder" as const, area: "mul" } : cell,
  );
  legacyMulLayoutStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          roll: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: legacyMulLayout,
        },
        unlocks: state.unlocks,
        completedUnlockIds: [],
      },
    }),
  );
  const legacyMulRepo = createLocalStorageRepo(legacyMulLayoutStorage);
  const loadedLegacyMulLayout = legacyMulRepo.load();
  if (!loadedLegacyMulLayout) {
    throw new Error("Expected legacy mul layout payload to hydrate.");
  }
  assert.ok(
    loadedLegacyMulLayout.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === "*"),
    "legacy mul placeholder migrates to mul key",
  );
  assert.equal(
    loadedLegacyMulLayout.ui.keyLayout.filter((cell) => cell.kind === "key" && cell.key === "*").length,
    1,
    "mul key migration does not duplicate key entries",
  );

  const duplicateGuardStorage = createMemoryStorage();
  const customLayoutWithMulKeyAndPlaceholder = [
    ...defaultKeyLayout(),
    { kind: "placeholder" as const, area: "mul" },
  ];
  duplicateGuardStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          roll: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: customLayoutWithMulKeyAndPlaceholder,
        },
        unlocks: state.unlocks,
        completedUnlockIds: [],
      },
    }),
  );
  const duplicateGuardRepo = createLocalStorageRepo(duplicateGuardStorage);
  const loadedDuplicateGuard = duplicateGuardRepo.load();
  if (!loadedDuplicateGuard) {
    throw new Error("Expected duplicate-guard payload to hydrate.");
  }
  assert.equal(
    loadedDuplicateGuard.ui.keyLayout.filter((cell) => cell.kind === "key" && cell.key === "*").length,
    1,
    "existing mul key prevents additional mul insertion",
  );

  const badSchemaStorage = createMemoryStorage();
  badSchemaStorage.setItem(
    SAVE_KEY,
    JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION + 1, state: { calculator: {} } }),
  );

  const badSchemaRepo = createLocalStorageRepo(badSchemaStorage);
  assert.equal(badSchemaRepo.load(), null, "reject wrong schema");
};
