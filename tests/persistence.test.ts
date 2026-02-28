import assert from "node:assert/strict";
import { SAVE_KEY, SAVE_SCHEMA_VERSION, defaultKeyLayout, initialState } from "../src/domain/state.js";
import { createLocalStorageRepo, loadFromRawSave, LoadFailureReason } from "../src/infra/persistence/localStorageRepo.js";

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const r = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });

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
      total: r(15n, 2n),
      roll: [r(3n), r(9n), r(15n, 2n)],
      euclidRemainders: [{ rollIndex: 2, value: r(1n, 2n) }],
      operationSlots: [{ operator: "*" as const, operand: 6n }],
    },
    ui: {
      ...state.ui,
      keyLayout: [state.ui.keyLayout[1], state.ui.keyLayout[0], ...state.ui.keyLayout.slice(2)],
    },
  };

  repo.save(nextState);
  const rawSaved = storage.getItem(SAVE_KEY);
  assert.ok(rawSaved, "save writes payload");
  const parsedSaved = JSON.parse(rawSaved);
  assert.equal(parsedSaved.schemaVersion, SAVE_SCHEMA_VERSION, "save writes the current schema version");
  const loaded = repo.load();
  if (!loaded) {
    throw new Error("Expected hydrated state, received null.");
  }

  assert.deepEqual(loaded.calculator.total, r(15n, 2n), "hydrate rational total");
  assert.deepEqual(loaded.calculator.roll, [r(3n), r(9n), r(15n, 2n)], "hydrate rational roll");
  assert.deepEqual(
    loaded.calculator.euclidRemainders,
    [{ rollIndex: 2, value: r(1n, 2n) }],
    "hydrate euclidean remainder annotations",
  );
  assert.deepEqual(loaded.calculator.operationSlots, [{ operator: "*", operand: 6n }], "hydrate slot bigint operand");
  assert.deepEqual(loaded.ui.keyLayout.slice(0, 2), [state.ui.keyLayout[1], state.ui.keyLayout[0]], "hydrate ui key layout");
  assert.deepEqual(loaded.ui.storageLayout, state.ui.storageLayout, "hydrate storage layout");

  const legacyStorage = createMemoryStorage();
  legacyStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 1,
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
  assert.deepEqual(loadedLegacy.calculator.total, r(9n), "v1 save migrates integer total to rational");
  assert.deepEqual(loadedLegacy.calculator.roll, [r(9n)], "v1 save migrates integer roll to rationals");
  assert.deepEqual(loadedLegacy.calculator.euclidRemainders, [], "v1 save defaults euclidean remainder annotations");
  assert.deepEqual(loadedLegacy.ui.keyLayout, defaultKeyLayout(), "legacy saves hydrate default ui layout");
  assert.equal(loadedLegacy.ui.storageLayout.length, 8, "legacy saves hydrate fixed storage slots");
  assert.ok(loadedLegacy.ui.storageLayout.every((slot) => slot === null), "legacy storage slots default to empty");
  assert.equal(loadedLegacy.unlocks.execution["="], false, "legacy unlock payload hydrates default execution unlocks");
  assert.equal(loadedLegacy.unlocks.slotOperators["-"], false, "legacy unlock payload hydrates default minus unlock");
  assert.equal(loadedLegacy.unlocks.slotOperators["*"], false, "legacy unlock payload hydrates default mul unlock");
  assert.equal(loadedLegacy.unlocks.slotOperators["/"], false, "legacy unlock payload hydrates default div unlock");
  assert.equal(loadedLegacy.unlocks.slotOperators["⟡"], false, "legacy unlock payload hydrates default modulo unlock");
  assert.equal(loadedLegacy.unlocks.valueExpression["1"], true, "legacy unlock payload hydrates current default digit unlocks");
  assert.equal(loadedLegacy.unlocks.maxTotalDigits, 2, "legacy unlock payload hydrates default total-digit cap");

  const legacyUnlockShapeStorage = createMemoryStorage();
  legacyUnlockShapeStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          pendingNegativeTotal: false,
          roll: [],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: defaultKeyLayout(),
        },
        unlocks: {
          ...state.unlocks,
          valueExpression: undefined,
          digits: {
            "0": false,
            "1": true,
            "2": true,
            "3": false,
            "4": false,
            "5": false,
            "6": false,
            "7": false,
            "8": false,
            "9": false,
          },
          utilities: {
            C: false,
            CE: false,
            NEG: true,
          },
        },
        completedUnlockIds: [],
      },
    }),
  );
  const legacyUnlockShapeRepo = createLocalStorageRepo(legacyUnlockShapeStorage);
  const loadedLegacyUnlockShape = legacyUnlockShapeRepo.load();
  if (!loadedLegacyUnlockShape) {
    throw new Error("Expected legacy unlock shape payload to hydrate.");
  }
  assert.equal(
    loadedLegacyUnlockShape.unlocks.valueExpression["2"],
    true,
    "legacy unlock digits hydrate into valueExpression digits",
  );
  assert.equal(
    loadedLegacyUnlockShape.unlocks.valueExpression.NEG,
    true,
    "legacy utilities.NEG hydrates into valueExpression.NEG",
  );

  const v2Storage = createMemoryStorage();
  v2Storage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "5/2",
          pendingNegativeTotal: true,
          roll: ["1", "5/2"],
          euclidRemainders: [{ rollIndex: 1, value: "1/2" }],
          operationSlots: [{ operator: "+", operand: "1" }],
          draftingSlot: { operator: "-", operandInput: "1", isNegative: true },
        },
        ui: {
          keyLayout: defaultKeyLayout(),
        },
        unlocks: state.unlocks,
        completedUnlockIds: ["unlock_plus_on_total_11"],
      },
    }),
  );
  const v2Repo = createLocalStorageRepo(v2Storage);
  const loadedV2 = v2Repo.load();
  if (!loadedV2) {
    throw new Error("Expected v2 payload to hydrate through v3 migration.");
  }
  assert.deepEqual(loadedV2.calculator.total, r(5n, 2n), "v2 payload migrates total to runtime rational");
  assert.equal(loadedV2.calculator.pendingNegativeTotal, true, "v2 payload preserves pending negative total");
  assert.deepEqual(loadedV2.calculator.roll, [r(1n), r(5n, 2n)], "v2 payload migrates roll");
  assert.equal(loadedV2.ui.storageLayout.length, 8, "v2 payload migrates to fixed storage slots");

  const legacyPackedStorage = createMemoryStorage();
  legacyPackedStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 3,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          pendingNegativeTotal: false,
          roll: [],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: defaultKeyLayout(),
          storageLayout: [{ kind: "key", key: "1" }],
        },
        unlocks: state.unlocks,
        completedUnlockIds: [],
      },
    }),
  );
  const legacyPackedStorageRepo = createLocalStorageRepo(legacyPackedStorage);
  const loadedLegacyPackedStorage = legacyPackedStorageRepo.load();
  if (!loadedLegacyPackedStorage) {
    throw new Error("Expected v3 packed storage payload to hydrate.");
  }
  assert.equal(loadedLegacyPackedStorage.ui.storageLayout[0]?.kind, "key", "v3 packed storage first key is preserved");
  assert.equal(loadedLegacyPackedStorage.ui.storageLayout.length, 8, "v3 packed storage migrates to fixed slot row");

  const legacyLayoutStorage = createMemoryStorage();
  const legacyLayout = defaultKeyLayout().map((cell) =>
    cell.kind === "key" && cell.key === "NEG" ? { kind: "placeholder" as const, area: "negate" } : cell,
  );
  legacyLayoutStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 2,
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
      schemaVersion: 2,
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

  const legacyDivLayoutStorage = createMemoryStorage();
  const legacyDivLayout = defaultKeyLayout().map((cell) =>
    cell.kind === "key" && cell.key === "/" ? { kind: "placeholder" as const, area: "div" } : cell,
  );
  legacyDivLayoutStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          roll: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: legacyDivLayout,
        },
        unlocks: state.unlocks,
        completedUnlockIds: [],
      },
    }),
  );
  const legacyDivRepo = createLocalStorageRepo(legacyDivLayoutStorage);
  const loadedLegacyDivLayout = legacyDivRepo.load();
  if (!loadedLegacyDivLayout) {
    throw new Error("Expected legacy div layout payload to hydrate.");
  }
  assert.ok(
    loadedLegacyDivLayout.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === "/"),
    "legacy div placeholder migrates to div key",
  );

  const legacyModLayoutStorage = createMemoryStorage();
  const legacyModLayout = defaultKeyLayout().map((cell) =>
    cell.kind === "key" && cell.key === "⟡" ? { kind: "placeholder" as const, area: "mod" } : cell,
  );
  legacyModLayoutStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          roll: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: legacyModLayout,
        },
        unlocks: state.unlocks,
        completedUnlockIds: [],
      },
    }),
  );
  const legacyModRepo = createLocalStorageRepo(legacyModLayoutStorage);
  const loadedLegacyModLayout = legacyModRepo.load();
  if (!loadedLegacyModLayout) {
    throw new Error("Expected legacy mod layout payload to hydrate.");
  }
  assert.ok(
    loadedLegacyModLayout.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === "⟡"),
    "legacy mod placeholder migrates to modulo key",
  );

  const legacyEuclidLayoutStorage = createMemoryStorage();
  const legacyEuclidLayout = defaultKeyLayout().map((cell) =>
    cell.kind === "key" && cell.key === "#" ? { kind: "placeholder" as const, area: "euclid_divmod" } : cell,
  );
  legacyEuclidLayoutStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          roll: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: legacyEuclidLayout,
        },
        unlocks: state.unlocks,
        completedUnlockIds: [],
      },
    }),
  );
  const legacyEuclidRepo = createLocalStorageRepo(legacyEuclidLayoutStorage);
  const loadedLegacyEuclidLayout = legacyEuclidRepo.load();
  if (!loadedLegacyEuclidLayout) {
    throw new Error("Expected legacy euclidean layout payload to hydrate.");
  }
  assert.ok(
    loadedLegacyEuclidLayout.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === "#"),
    "legacy euclid placeholder migrates to euclidean key",
  );

  const duplicateGuardStorage = createMemoryStorage();
  const customLayoutWithMulKeyAndPlaceholder = [
    ...defaultKeyLayout(),
    { kind: "placeholder" as const, area: "mul" },
    { kind: "placeholder" as const, area: "div" },
    { kind: "placeholder" as const, area: "mod" },
    { kind: "placeholder" as const, area: "euclid_divmod" },
  ];
  duplicateGuardStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: 2,
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
  assert.equal(
    loadedDuplicateGuard.ui.keyLayout.filter((cell) => cell.kind === "key" && cell.key === "/").length,
    1,
    "existing div key prevents additional div insertion",
  );
  assert.equal(
    loadedDuplicateGuard.ui.keyLayout.filter((cell) => cell.kind === "key" && cell.key === "⟡").length,
    1,
    "existing modulo key prevents additional modulo insertion",
  );
  assert.equal(
    loadedDuplicateGuard.ui.keyLayout.filter((cell) => cell.kind === "key" && cell.key === "#").length,
    1,
    "existing euclidean key prevents additional euclidean insertion",
  );

  const badSchemaStorage = createMemoryStorage();
  badSchemaStorage.setItem(
    SAVE_KEY,
    JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION + 1, state: { calculator: {} } }),
  );

  const badSchemaRepo = createLocalStorageRepo(badSchemaStorage);
  assert.equal(badSchemaRepo.load(), null, "reject wrong schema");

  const badFractionStorage = createMemoryStorage();
  badFractionStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "1.5",
          roll: [],
          operationSlots: [],
          draftingSlot: null,
        },
      },
    }),
  );
  const badFractionRepo = createLocalStorageRepo(badFractionStorage);
  assert.equal(badFractionRepo.load(), null, "malformed fraction values fail safely");

  const badJson = loadFromRawSave("{");
  assert.equal(badJson.state, null, "invalid JSON fails safely");
  assert.equal(
    badJson.reason,
    LoadFailureReason.InvalidJson,
    "invalid JSON reports invalid-json reason",
  );

  const missingState = loadFromRawSave(JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION }));
  assert.equal(missingState.state, null, "missing state envelope is rejected");
  assert.equal(
    missingState.reason,
    LoadFailureReason.InvalidPayloadEnvelope,
    "missing state uses invalid envelope reason",
  );

  const malformedUnlockSubtree = loadFromRawSave(
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          pendingNegativeTotal: false,
          roll: [],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: defaultKeyLayout(),
        },
        unlocks: {
          ...state.unlocks,
          execution: {
            "=": "true",
          },
        },
        completedUnlockIds: [],
      },
    }),
  );
  assert.equal(malformedUnlockSubtree.state, null, "malformed unlock subtree is rejected");
  assert.equal(
    malformedUnlockSubtree.reason,
    LoadFailureReason.MigrationFailed,
    "malformed unlock subtree fails validation during migration stage",
  );

  const outOfRangeLowCaps = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 2,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          pendingNegativeTotal: false,
          roll: [],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: defaultKeyLayout(),
        },
        unlocks: {
          ...state.unlocks,
          maxSlots: -1,
          maxTotalDigits: -5,
        },
        completedUnlockIds: [],
      },
    }),
  );
  assert.ok(outOfRangeLowCaps.state, "v2 payload with low out-of-range caps still hydrates");
  assert.equal(
    outOfRangeLowCaps.state?.unlocks.maxSlots,
    initialState().unlocks.maxSlots,
    "low out-of-range maxSlots normalizes to defaults",
  );
  assert.equal(
    outOfRangeLowCaps.state?.unlocks.maxTotalDigits,
    initialState().unlocks.maxTotalDigits,
    "low out-of-range maxTotalDigits normalizes to defaults",
  );

  const outOfRangeHighCaps = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 2,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          pendingNegativeTotal: false,
          roll: [],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: defaultKeyLayout(),
        },
        unlocks: {
          ...state.unlocks,
          maxSlots: 999,
          maxTotalDigits: 999,
        },
        completedUnlockIds: [],
      },
    }),
  );
  assert.ok(outOfRangeHighCaps.state, "v2 payload with high out-of-range caps still hydrates");
  assert.equal(
    outOfRangeHighCaps.state?.unlocks.maxSlots,
    initialState().unlocks.maxSlots,
    "high out-of-range maxSlots normalizes to defaults",
  );
  assert.equal(
    outOfRangeHighCaps.state?.unlocks.maxTotalDigits,
    initialState().unlocks.maxTotalDigits,
    "high out-of-range maxTotalDigits normalizes to defaults",
  );

  const inRangeCaps = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 2,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          pendingNegativeTotal: false,
          roll: [],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: defaultKeyLayout(),
        },
        unlocks: {
          ...state.unlocks,
          maxSlots: 2,
          maxTotalDigits: 12,
        },
        completedUnlockIds: [],
      },
    }),
  );
  assert.ok(inRangeCaps.state, "v2 payload with in-range caps hydrates");
  assert.equal(inRangeCaps.state?.unlocks.maxSlots, 2, "in-range maxSlots is preserved");
  assert.equal(inRangeCaps.state?.unlocks.maxTotalDigits, 12, "in-range maxTotalDigits is preserved");

  const unknownLayoutKey = loadFromRawSave(
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "0",
          pendingNegativeTotal: false,
          roll: [],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: [{ kind: "key", key: "BOGUS" }, ...defaultKeyLayout().slice(1)],
        },
        unlocks: state.unlocks,
        completedUnlockIds: [],
      },
    }),
  );
  assert.equal(unknownLayoutKey.state, null, "unknown layout keys are rejected");
  assert.equal(
    unknownLayoutKey.reason,
    LoadFailureReason.MigrationFailed,
    "unknown layout keys fail during migration validation",
  );
};
