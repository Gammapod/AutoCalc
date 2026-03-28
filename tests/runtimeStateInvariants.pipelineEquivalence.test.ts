import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  RUNTIME_INVARIANT_NORMALIZER_ORDER,
  normalizeRuntimeStateInvariants,
} from "../src/domain/runtimeStateInvariants.js";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import type { GameState } from "../src/domain/types.js";
import { materializeCalculatorG, materializeCalculatorMenu } from "../src/domain/multiCalculator.js";
import { generateSeededMaintenanceTrace, SEEDED_MAINTENANCE_RUNS } from "./helpers/seededMaintenance.js";
import { ROUTINE_MAINTENANCE_GOLDEN } from "./contracts/fixtures/routineMaintenanceGolden.js";
import { stableSerialize } from "./helpers/stableSerialize.js";

type NamedFixture = {
  id: keyof typeof ROUTINE_MAINTENANCE_GOLDEN.runtimeInvariantHashesV1;
  state: GameState;
};

const withTrace = (seed: number, steps: number, state: GameState): GameState => {
  const actions = generateSeededMaintenanceTrace(seed, steps, state);
  let next = state;
  for (const action of actions) {
    next = reducer(next, action);
  }
  return next;
};

const fixtureStates = (): NamedFixture[] => {
  const base = initialState();
  const unlockedMemory = reducer(base, { type: "UNLOCK_ALL" });
  const dual = materializeCalculatorG(base);
  const menu = materializeCalculatorMenu(base);
  const dualMutated = reducer(
    {
      ...dual,
      ui: {
        ...dual.ui,
        storageLayout: [{ kind: "key", key: KEY_ID.exec_equals }, ...dual.ui.storageLayout],
      },
    },
    { type: "SET_ACTIVE_CALCULATOR", calculatorId: "f" },
  );
  const seeded1337 = withTrace(
    SEEDED_MAINTENANCE_RUNS[0]?.seed ?? 1337,
    SEEDED_MAINTENANCE_RUNS[0]?.steps ?? 72,
    base,
  );
  const seeded424242 = withTrace(
    SEEDED_MAINTENANCE_RUNS[1]?.seed ?? 424242,
    SEEDED_MAINTENANCE_RUNS[1]?.steps ?? 72,
    base,
  );
  const seeded9001 = withTrace(
    SEEDED_MAINTENANCE_RUNS[2]?.seed ?? 9001,
    SEEDED_MAINTENANCE_RUNS[2]?.steps ?? 72,
    dual,
  );
  const seeded7777 = withTrace(
    SEEDED_MAINTENANCE_RUNS[3]?.seed ?? 7777,
    SEEDED_MAINTENANCE_RUNS[3]?.steps ?? 72,
    menu,
  );
  return [
    { id: "base_single", state: base },
    { id: "unlocked_single", state: unlockedMemory },
    { id: "multi_f_g", state: dual },
    { id: "multi_menu", state: menu },
    { id: "multi_storage_perturbed", state: dualMutated },
    { id: "seeded_1337_single", state: seeded1337 },
    { id: "seeded_424242_single", state: seeded424242 },
    { id: "seeded_9001_multi", state: seeded9001 },
    { id: "seeded_7777_menu_multi", state: seeded7777 },
  ];
};

const signatureHash = (state: GameState): string =>
  createHash("sha256")
    .update(stableSerialize(state))
    .digest("hex");

export const runRuntimeStateInvariantsPipelineEquivalenceTests = (): void => {
  assert.deepEqual(
    [...RUNTIME_INVARIANT_NORMALIZER_ORDER],
    ["diagnostics", "layout_storage", "settings_selection"],
    "runtime invariant stages run in deterministic canonical order",
  );

  const expected = ROUTINE_MAINTENANCE_GOLDEN.runtimeInvariantHashesV1;
  for (const fixture of fixtureStates()) {
    const normalized = normalizeRuntimeStateInvariants(fixture.state);
    const actualHash = signatureHash(normalized);
    assert.equal(
      actualHash,
      expected[fixture.id],
      `runtime invariants golden hash mismatch fixture=${fixture.id}`,
    );
  }
};
