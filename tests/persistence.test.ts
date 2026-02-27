import assert from "node:assert/strict";
import { SAVE_KEY, SAVE_SCHEMA_VERSION, defaultKeyLayout, initialState } from "../src/domain/state.js";
import { createLocalStorageRepo } from "../src/infra/persistence/localStorageRepo.js";

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
      keyLayout: [state.ui.keyLayout[1], state.ui.keyLayout[0], ...state.ui.keyLayout.slice(2)],
    },
  };

  repo.save(nextState);
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
  assert.equal(loadedLegacy.unlocks.execution["="], false, "legacy unlock payload hydrates default execution unlocks");
  assert.equal(loadedLegacy.unlocks.slotOperators["-"], false, "legacy unlock payload hydrates default minus unlock");
  assert.equal(loadedLegacy.unlocks.slotOperators["*"], false, "legacy unlock payload hydrates default mul unlock");
  assert.equal(loadedLegacy.unlocks.slotOperators["/"], false, "legacy unlock payload hydrates default div unlock");
  assert.equal(loadedLegacy.unlocks.slotOperators["⟡"], false, "legacy unlock payload hydrates default modulo unlock");
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

  const legacyDivLayoutStorage = createMemoryStorage();
  const legacyDivLayout = defaultKeyLayout().map((cell) =>
    cell.kind === "key" && cell.key === "/" ? { kind: "placeholder" as const, area: "div" } : cell,
  );
  legacyDivLayoutStorage.setItem(
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
};
