import "./support/keyCompat.runtime.js";
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
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";
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
      rollEntries: re(r(9n), r(11n), r(12n)),
    },
    lambdaControl: {
      maxPoints: 9,
      alpha: 2,
      beta: 1,
      gamma: 2,
      gammaMinRaised: true,
    },
    sessionControlProfiles: {
      f: controlProfiles.f,
    },
    activeCalculatorId: "g",
    perCalculatorCompletedUnlockIds: {
      g: ["unlock_allocator_point_on_total_at_least_9"],
      f: [],
    },
  };
  repo.save(persisted);

  const rawSaved = storage.getItem(SAVE_KEY);
  assert.ok(rawSaved, "save writes payload");
  const parsedSaved = JSON.parse(rawSaved);
  assert.equal(parsedSaved.schemaVersion, SAVE_SCHEMA_VERSION, "save writes current schema");

  const loaded = repo.load();
  assert.ok(loaded, "saved payload hydrates");
  assert.deepEqual(loaded?.calculator.total, r(12n), "round-trip total");
  assert.deepEqual(loaded?.calculator.rollEntries[0]?.y, r(9n), "round-trip roll entries");
  assert.deepEqual(
    loaded?.lambdaControl,
    {
      maxPoints: 9,
      alpha: 2,
      beta: 1,
      gamma: 2,
      gammaMinRaised: true,
    },
    "round-trip lambda control",
  );
  assert.deepEqual(loaded?.sessionControlProfiles, {}, "session-only control profile edits are not persisted");
  assert.equal(loaded?.activeCalculatorId, "g", "active calculator selection round-trips");
  assert.deepEqual(
    loaded?.perCalculatorCompletedUnlockIds,
    persisted.perCalculatorCompletedUnlockIds,
    "per-calculator control unlock completion round-trips",
  );
  assert.ok(loaded?.calculators?.g && loaded?.calculators?.f, "dual calculators round-trip");

  const unsupported = loadFromRawSave(
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION - 1,
      savedAt: Date.now(),
      state: {},
    }),
  );
  assert.equal(unsupported.state, null, "unsupported legacy schema does not load");
  assert.equal(unsupported.reason, LoadFailureReason.UnsupportedSchemaVersion, "legacy schema failure reason is reported");

  const badJson = loadFromRawSave("{");
  assert.equal(badJson.state, null, "invalid JSON fails safely");
  assert.equal(badJson.reason, LoadFailureReason.InvalidJson, "invalid JSON reason is reported");

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
};
