import assert from "node:assert/strict";
import {
  toComplexCalculatorValue,
  toNanCalculatorValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
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
import { serializeEnvelope } from "../src/infra/persistence/saveEnvelope.js";
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
      rollEntries: [
        { y: r(9n) },
        {
          y: r(11n),
          error: { code: "overflow_q", kind: "overflow_q" },
          limitMetadata: {
            rawY: r(8n, 11n),
            components: {
              re: "overflow_q",
              im: "none",
            },
          },
        },
        { y: r(12n) },
      ],
    },
    lambdaControl: {
      alpha: 2,
      beta: 1,
      gamma: 2,
      delta: 5,
      delta_q: 5,
      epsilon: 3,
    },
    activeCalculatorId: "f",
    perCalculatorCompletedUnlockIds: {
      f: [],
    },
    calculators: {
      ...base.calculators,
      f: base.calculators?.f
        ? {
            ...base.calculators.f,
            calculator: {
              ...base.calculators.f.calculator,
              total: r(12n),
            },
          }
        : undefined,
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
    loaded?.calculator.rollEntries[1]?.limitMetadata,
    persisted.calculator.rollEntries[1]?.limitMetadata,
    "round-trip preserves optional generic roll-entry limit metadata",
  );
  assert.deepEqual(
    loaded?.lambdaControl,
    {
      alpha: 2,
      beta: 1,
      gamma: 2,
      delta: 5,
      delta_q: 5,
      epsilon: 3,
    },
    "round-trip lambda control",
  );
  assert.equal(loaded?.activeCalculatorId, "f", "active calculator selection round-trips");
  assert.deepEqual(
    loaded?.perCalculatorCompletedUnlockIds,
    persisted.perCalculatorCompletedUnlockIds,
    "per-calculator control unlock completion round-trips",
  );
  assert.ok(loaded?.calculators?.f, "f calculator round-trips");
  assert.equal(Boolean(loaded?.calculators?.g), false, "g calculator remains absent when not initialized");
  assert.deepEqual(loaded?.calculators?.f?.calculator.total, r(12n), "f calculator state round-trips");

  const migratedLegacy = loadFromRawSave(
    serializeEnvelope({
      schemaVersion: SAVE_SCHEMA_VERSION - 1,
      savedAt: Date.now(),
      state: {
        ...base,
        ui: {
          ...base.ui,
          activeVisualizer: "graph",
          buttonFlags: {
            ...base.ui.buttonFlags,
            "settings.binary_mode": true,
            "settings.delta_range_clamp": true,
            "settings.step_expansion": true,
            "settings.history": true,
            "settings.forecast": true,
            "settings.cycle": true,
          },
        },
      },
    }),
  );
  assert.ok(migratedLegacy.state, "legacy schema migrates forward");
  assert.equal(migratedLegacy.reason, null, "legacy schema migration resolves without error");
  assert.equal(migratedLegacy.state?.settings.visualizer, "total", "legacy migration resets visualizer setting to default");
  assert.equal(migratedLegacy.state?.settings.wrapper, "none", "legacy migration resets wrapper setting to default");
  assert.equal(migratedLegacy.state?.settings.base, "decimal", "legacy migration resets base setting to default");
  assert.equal(migratedLegacy.state?.settings.stepExpansion, "off", "legacy migration resets step expansion setting to default");
  assert.equal(migratedLegacy.state?.settings.history, "off", "legacy migration adds history setting default");
  assert.equal(migratedLegacy.state?.settings.forecast, "off", "legacy migration adds forecast setting default");
  assert.equal(migratedLegacy.state?.settings.cycle, "off", "legacy migration adds cycle setting default");
  assert.equal(Boolean(migratedLegacy.state?.ui.buttonFlags["settings.binary_mode"]), false, "legacy migration drops obsolete settings flags");
  assert.equal(Boolean(migratedLegacy.state?.ui.buttonFlags["settings.step_expansion"]), false, "legacy migration drops obsolete analytics flags");
  assert.equal(Boolean(migratedLegacy.state?.ui.buttonFlags["settings.history"]), false, "legacy migration drops obsolete analytics flags");
  assert.equal(Boolean(migratedLegacy.state?.ui.buttonFlags["settings.forecast"]), false, "legacy migration drops obsolete analytics flags");
  assert.equal(Boolean(migratedLegacy.state?.ui.buttonFlags["settings.cycle"]), false, "legacy migration drops obsolete analytics flags");

  const unsupported = loadFromRawSave(
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION - 2,
      savedAt: Date.now(),
      state: {},
    }),
  );
  assert.equal(unsupported.state, null, "unsupported old schema does not load");
  assert.equal(unsupported.reason, LoadFailureReason.UnsupportedSchemaVersion, "unsupported schema failure reason is reported");

  const malformedLegacy = loadFromRawSave(
    JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION - 1,
      savedAt: Date.now(),
      state: null,
    }),
  );
  assert.equal(malformedLegacy.state, null, "malformed legacy payload does not hydrate");
  assert.equal(malformedLegacy.reason, LoadFailureReason.MigrationFailed, "legacy migration failure reason is reported");

  const badJson = loadFromRawSave("{");
  assert.equal(badJson.state, null, "invalid JSON fails safely");
  assert.equal(badJson.reason, LoadFailureReason.InvalidJson, "invalid JSON reason is reported");

  const payloadMissingDiagnostics = structuredClone(base) as unknown as Record<string, unknown>;
  const payloadMissingDiagnosticsUi = payloadMissingDiagnostics.ui as Record<string, unknown> | undefined;
  if (payloadMissingDiagnosticsUi) {
    delete payloadMissingDiagnosticsUi.diagnostics;
  }
  const missingDiagnostics = loadFromRawSave(serializeEnvelope({
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    state: payloadMissingDiagnostics,
  }));
  assert.ok(missingDiagnostics.state, "state without diagnostics metadata still loads");
  assert.equal(
    missingDiagnostics.state?.calculator.rollEntries[0]?.limitMetadata,
    undefined,
    "legacy payloads without roll-entry limit metadata remain valid",
  );
  assert.deepEqual(
    missingDiagnostics.state?.ui.diagnostics.lastAction,
    { sequence: 0, actionKind: "none" },
    "missing diagnostics metadata falls back to neutral trace defaults",
  );

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

  const complexRoundTrip = {
    ...base,
    calculator: {
      ...base.calculator,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 0n, den: 1n }),
        toRationalScalarValue({ num: 34n, den: 1n }),
      ),
      rollEntries: [{
        y: toComplexCalculatorValue(
          toRationalScalarValue({ num: 0n, den: 1n }),
          toRationalScalarValue({ num: 34n, den: 1n }),
        ),
      }],
    },
  };
  repo.save(complexRoundTrip);
  const loadedComplex = repo.load();
  assert.ok(loadedComplex, "complex payload hydrates");
  assert.deepEqual(
    loadedComplex?.calculator.total,
    complexRoundTrip.calculator.total,
    "complex total round-trips",
  );
};

