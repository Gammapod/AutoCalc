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
import type { GameState, RollEntry } from "../src/domain/types.js";

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

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
  const persisted: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: r(12n),
      seedSnapshot: r(9n),
      rollEntries: re(r(11n), r(12n)),
    },
    keyPressCounts: { "+": 3, "=": 2 },
    allocatorReturnPressCount: 2,
    allocatorAllocatePressCount: 3,
    allocator: {
      maxPoints: 9,
      allocations: {
        width: 2,
        height: 1,
        range: 3,
        speed: 0,
        slots: 2,
      },
    },
    lambdaControl: {
      maxPoints: 9,
      alpha: 2,
      beta: 1,
      gamma: 2,
      overrides: {
        delta: 3,
        epsilon: { num: 9n, den: 10n },
      },
    },
    unlocks: {
      ...base.unlocks,
      uiUnlocks: { storageVisible: true },
      visualizers: { ...base.unlocks.visualizers, FEED: true },
      execution: { ...base.unlocks.execution, "=": true },
    },
    ui: {
      ...base.ui,
      activeVisualizer: "feed",
    },
    completedUnlockIds: ["unlock_equals_on_total_11"],
  };
  repo.save(persisted);

  const rawSaved = storage.getItem(SAVE_KEY);
  assert.ok(rawSaved, "save writes payload");
  const parsedSaved = JSON.parse(rawSaved);
  assert.equal(parsedSaved.schemaVersion, SAVE_SCHEMA_VERSION, "save writes current schema");

  const loaded = repo.load();
  assert.ok(loaded, "saved payload hydrates");
  assert.deepEqual(loaded?.calculator.total, r(12n), "round-trip total");
  assert.deepEqual(loaded?.calculator.seedSnapshot, r(9n), "round-trip seed snapshot");
  assert.deepEqual(
    loaded?.calculator.rollEntries[0]?.factorization,
    {
      sign: 1,
      numerator: [{ prime: 11n, exponent: 1 }],
      denominator: [],
    },
    "round-trip persists/backfills roll-entry factorization payload",
  );
  assert.deepEqual(loaded?.keyPressCounts, { "+": 3, "=": 2 }, "round-trip key press counters");
  assert.equal(loaded?.allocatorReturnPressCount, 2, "round-trip allocator RETURN press counter");
  assert.equal(loaded?.allocatorAllocatePressCount, 3, "round-trip allocator Allocate press counter");
  assert.deepEqual(
    loaded?.allocator,
    { maxPoints: 9, allocations: { width: 2, height: 1, range: 3, speed: 0, slots: 2 } },
    "round-trip allocator snapshot fields",
  );
  assert.deepEqual(
    loaded?.lambdaControl,
    {
      maxPoints: 9,
      alpha: 2,
      beta: 1,
      gamma: 2,
      overrides: {
        delta: 3,
        epsilon: { num: 9n, den: 10n },
      },
    },
    "round-trip canonical lambda control",
  );
  assert.equal(loaded?.unlocks.uiUnlocks.storageVisible, true, "round-trip storage unlock");
  assert.equal(loaded?.unlocks.visualizers.FEED, true, "round-trip FEED visualizer unlock");
  assert.equal(loaded?.ui.activeVisualizer, "feed", "round-trip active visualizer");

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
  assert.equal(legacyV1.state?.calculator.seedSnapshot, undefined, "legacy payload defaults seed snapshot to undefined");

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
        completedUnlockIds: [],
      },
    }),
  );
  assert.ok(legacyV5.state, "v5 payload hydrates");
  assert.deepEqual(legacyV5.state, initialState(), "v5 payload is hard-reset to current initial state");

  const legacyV7 = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 7,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "11",
          pendingNegativeTotal: false,
          singleDigitInitialTotalEntry: false,
          roll: ["11"],
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
        keyPressCounts: {},
        unlocks: { ...initialState().unlocks, maxTotalDigits: 2, maxSlots: 2 },
        completedUnlockIds: [],
      },
    }),
  );
  assert.ok(legacyV7.state, "v7 payload hydrates");
  assert.deepEqual(
    legacyV7.state?.lambdaControl,
    { maxPoints: 0, alpha: 0, beta: 0, gamma: 0, overrides: {} },
    "v7 migration resets lambda control",
  );

  const legacyV8 = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 8,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "11",
          pendingNegativeTotal: false,
          singleDigitInitialTotalEntry: false,
          roll: ["11"],
          rollErrors: [],
          euclidRemainders: [],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: initialState().ui.keyLayout,
          keypadCells: initialState().ui.keypadCells,
          storageLayout: initialState().ui.storageLayout,
          keypadColumns: 3,
          keypadRows: 2,
          buttonFlags: {},
        },
        keyPressCounts: {},
        unlocks: { ...initialState().unlocks, maxTotalDigits: 5 },
        completedUnlockIds: [],
        allocator: {
          points: 7,
          speed: 4,
        },
      },
    }),
  );
  assert.ok(legacyV8.state, "v8 payload hydrates");
  assert.deepEqual(
    legacyV8.state?.lambdaControl,
    { maxPoints: 0, alpha: 0, beta: 0, gamma: 0, overrides: {} },
    "v8 migration resets lambda control",
  );

  const legacyV10WithVisualizerFlags = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 10,
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
          buttonFlags: {
            "graph.visible": true,
            "feed.visible": true,
          },
        },
        keyPressCounts: {},
        unlocks: initialState().unlocks,
        completedUnlockIds: [],
        allocatorReturnPressCount: 0,
        allocatorAllocatePressCount: 0,
        allocator: {
          maxPoints: 0,
          allocations: { width: 0, height: 0, range: 0, speed: 0, slots: 0 },
        },
      },
    }),
  );
  assert.ok(legacyV10WithVisualizerFlags.state, "v10 payload hydrates");
  assert.equal(
    legacyV10WithVisualizerFlags.state?.ui.activeVisualizer,
    "graph",
    "v10 migration maps legacy flags to activeVisualizer with graph precedence",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(legacyV10WithVisualizerFlags.state?.ui.buttonFlags ?? {}, "graph.visible"),
    false,
    "legacy graph visibility flag is removed from buttonFlags",
  );

  const legacyV11WithNoneVisualizer = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 11,
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
          activeVisualizer: "none",
          buttonFlags: {},
        },
        keyPressCounts: {},
        unlocks: initialState().unlocks,
        completedUnlockIds: [],
        allocatorReturnPressCount: 0,
        allocatorAllocatePressCount: 0,
        allocator: {
          maxPoints: 0,
          allocations: { width: 0, height: 0, range: 0, speed: 0, slots: 0 },
        },
      },
    }),
  );
  assert.ok(legacyV11WithNoneVisualizer.state, "v11 payload with none visualizer hydrates");
  assert.equal(
    legacyV11WithNoneVisualizer.state?.ui.activeVisualizer,
    "total",
    "v11 migration maps legacy none visualizer to total",
  );

  const legacyV11InvalidVisualizerWithFlags = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 11,
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
          activeVisualizer: "bogus",
          buttonFlags: {
            "feed.visible": true,
          },
        },
        keyPressCounts: {},
        unlocks: initialState().unlocks,
        completedUnlockIds: [],
        allocatorReturnPressCount: 0,
        allocatorAllocatePressCount: 0,
        allocator: {
          maxPoints: 0,
          allocations: { width: 0, height: 0, range: 0, speed: 0, slots: 0 },
        },
      },
    }),
  );
  assert.ok(legacyV11InvalidVisualizerWithFlags.state, "v11 payload with invalid visualizer hydrates");
  assert.equal(
    legacyV11InvalidVisualizerWithFlags.state?.ui.activeVisualizer,
    "feed",
    "v11 invalid visualizer falls back to legacy feed flag mapping",
  );

  const legacyV13ValueExpressionOnly = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 13,
      savedAt: Date.now(),
      state: {
        ...JSON.parse(JSON.stringify({
          calculator: {
            total: "0",
            pendingNegativeTotal: false,
            singleDigitInitialTotalEntry: false,
            rollEntries: [],
            operationSlots: [],
            draftingSlot: null,
          },
          ui: {
            keyLayout: initialState().ui.keyLayout,
            keypadCells: initialState().ui.keypadCells,
            storageLayout: initialState().ui.storageLayout,
            keypadColumns: 1,
            keypadRows: 1,
            activeVisualizer: "total",
            buttonFlags: {},
          },
          keyPressCounts: {},
          unlocks: {
            ...initialState().unlocks,
            valueExpression: { ...initialState().unlocks.valueExpression, NEG: true, "1": true },
          },
          completedUnlockIds: [],
          allocatorReturnPressCount: 0,
          allocatorAllocatePressCount: 0,
          allocator: {
            maxPoints: 0,
            allocations: { width: 0, height: 0, range: 0, speed: 0, slots: 0 },
          },
        })),
      },
    }),
  );
  assert.ok(legacyV13ValueExpressionOnly.state, "v13 payload hydrates under v14 runtime");
  assert.equal(
    legacyV13ValueExpressionOnly.state?.unlocks.valueAtoms["1"],
    true,
    "v13 valueExpression digit maps to split valueAtoms unlocks",
  );
  assert.equal(
    Object.keys(legacyV13ValueExpressionOnly.state?.unlocks.valueCompose ?? {}).length,
    0,
    "v13 valueExpression compose keys are removed from current runtime",
  );

  const legacyV15MissingFactorization = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 15,
      savedAt: Date.now(),
      state: {
        calculator: {
          total: "6/35",
          pendingNegativeTotal: false,
          singleDigitInitialTotalEntry: false,
          rollEntries: [{ y: "6/35" }, { y: "NaN" }],
          operationSlots: [],
          draftingSlot: null,
        },
        ui: {
          keyLayout: initialState().ui.keyLayout,
          keypadCells: initialState().ui.keypadCells,
          storageLayout: initialState().ui.storageLayout,
          keypadColumns: 1,
          keypadRows: 1,
          activeVisualizer: "total",
          memoryVariable: "Î±",
          buttonFlags: {},
        },
        keyPressCounts: {},
        unlocks: initialState().unlocks,
        completedUnlockIds: [],
        allocatorReturnPressCount: 0,
        allocatorAllocatePressCount: 0,
        allocator: {
          maxPoints: 0,
          allocations: { width: 0, height: 0, range: 0, speed: 0, slots: 0 },
        },
      },
    }),
  );
  assert.ok(legacyV15MissingFactorization.state, "v15 payload without factorization hydrates");
  assert.deepEqual(
    legacyV15MissingFactorization.state?.calculator.rollEntries[0]?.factorization,
    {
      sign: 1,
      numerator: [{ prime: 2n, exponent: 1 }, { prime: 3n, exponent: 1 }],
      denominator: [{ prime: 5n, exponent: 1 }, { prime: 7n, exponent: 1 }],
    },
    "missing factorization payload is backfilled during load normalization",
  );

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
        allocator: {
          maxPoints: 4,
          allocations: { width: 1, height: 1, range: 1, speed: 1, slots: 1 },
        },
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
      rollEntries: [{ y: r(5n) }, { y: toNanCalculatorValue(), error: { code: "n/0" as const, kind: "division_by_zero" as const } }],
    },
  };
  repo.save(nanRoundTrip);
  const loadedNan = repo.load();
  assert.ok(loadedNan, "NaN payload hydrates");
  assert.deepEqual(loadedNan?.calculator.total, toNanCalculatorValue(), "NaN total round-trips");
  assert.equal(loadedNan?.calculator.rollEntries[1]?.y.kind, "nan", "NaN roll entries round-trip");

  const overspentV9 = loadFromRawSave(
    JSON.stringify({
      schemaVersion: 9,
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
        keyPressCounts: {},
        unlocks: initialState().unlocks,
        completedUnlockIds: [],
        allocator: {
          maxPoints: 2,
          allocations: { width: 2, height: 2, range: 0, speed: 0, slots: 2 },
        },
      },
    }),
  );
  assert.ok(overspentV9.state, "overspent v9 payload hydrates");
  assert.deepEqual(
    overspentV9.state?.lambdaControl,
    { maxPoints: 0, alpha: 0, beta: 0, gamma: 0, overrides: {} },
    "overspent legacy allocator payload is ignored in favor of reset lambda control",
  );
};
