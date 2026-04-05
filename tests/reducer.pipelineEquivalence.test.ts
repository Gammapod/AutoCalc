import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { EXECUTION_PAUSE_FLAG } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { reduceWithProjectionScope } from "../src/domain/reducer.pipeline.scope.js";
import { withRecordedDiagnosticsAction } from "../src/domain/reducer.pipeline.diagnostics.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";
import { buttonRegistry } from "../src/domain/buttonRegistry.js";
import type { Action, Key, VisualizerId } from "../src/domain/types.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { materializeCalculatorG, materializeCalculatorMenu } from "../src/domain/multiCalculator.js";
import { createSeededMaintenanceRng, SEEDED_MAINTENANCE_RUNS, chooseSeededMaintenanceAction } from "./helpers/seededMaintenance.js";

const visualizerKeyById = new Map<VisualizerId, Key>(
  buttonRegistry
    .filter((entry): entry is typeof buttonRegistry[number] & { visualizerId: VisualizerId } =>
      entry.behaviorKind === "visualizer" && typeof entry.visualizerId === "string")
    .map((entry) => [entry.visualizerId, entry.key]),
);

export const runReducerPipelineEquivalenceTests = (): void => {
  const base = initialState();
  const paused = reducer(
    {
      ...base,
      unlocks: {
        ...base.unlocks,
        execution: {
          ...base.unlocks.execution,
          [KEY_ID.exec_play_pause]: true,
        },
      },
    },
    { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG },
  );
  const multi = materializeCalculatorG(base);
  const menu = materializeCalculatorMenu(base);
  const traces: Action[][] = [
    [
      { type: "PRESS_KEY", key: KEY_ID.digit_1 },
      { type: "PRESS_KEY", key: KEY_ID.op_add },
      { type: "PRESS_KEY", key: KEY_ID.digit_2 },
      { type: "PRESS_KEY", key: KEY_ID.exec_equals },
    ],
    [
      { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 },
      { type: "SWAP_LAYOUT_CELLS", fromSurface: "storage", fromIndex: 0, toSurface: "storage", toIndex: 1 },
    ],
    [
      { type: "PRESS_KEY", key: KEY_ID.memory_cycle_variable },
      { type: "PRESS_KEY", key: KEY_ID.memory_adjust_plus },
    ],
    [
      { type: "PRESS_KEY", key: KEY_ID.memory_cycle_variable, calculatorId: "g" },
      { type: "SET_KEYPAD_DIMENSIONS", calculatorId: "g", columns: 3, rows: 2 },
    ],
    [
      { type: "PRESS_KEY", key: KEY_ID.digit_1 },
    ],
  ];
  const seededTraces: Action[][] = SEEDED_MAINTENANCE_RUNS.map((run) => {
    const rng = createSeededMaintenanceRng(run.seed);
    const seedState = run.seed % 2 === 0 ? multi : menu;
    const actions: Action[] = [];
    let cursor = seedState;
    for (let step = 0; step < run.steps; step += 1) {
      const action = chooseSeededMaintenanceAction(rng, cursor);
      actions.push(action);
      cursor = reducer(cursor, action);
    }
    return actions;
  });
  const allTraces = [...traces, ...seededTraces];
  const seeds = [base, paused, multi, menu];
  const setActiveAction: Action = { type: "SET_ACTIVE_CALCULATOR", calculatorId: "g" };
  const directPublic = reducer(multi, setActiveAction);
  const directReduced = reduceWithProjectionScope(multi, setActiveAction);
  const directWithTrace = withRecordedDiagnosticsAction(multi, directReduced, setActiveAction, visualizerKeyById);
  const directPipeline = normalizeRuntimeStateInvariants(directWithTrace);
  assert.deepEqual(directPipeline, directPublic, "direct SET_ACTIVE_CALCULATOR path matches public reducer projection+trace+invariant pipeline");
  assert.deepEqual(
    directPipeline.ui.diagnostics.lastAction,
    directPublic.ui.diagnostics.lastAction,
    "SET_ACTIVE_CALCULATOR diagnostics sequencing remains identical across public and pipeline paths",
  );
  assert.deepEqual(
    directPublic.calculators?.f?.calculator,
    multi.calculators?.f?.calculator,
    "SET_ACTIVE_CALCULATOR keeps non-target calculator runtime execution state unchanged (f)",
  );
  assert.deepEqual(
    directPublic.calculators?.f?.lambdaControl,
    multi.calculators?.f?.lambdaControl,
    "SET_ACTIVE_CALCULATOR keeps non-target calculator control state unchanged (f)",
  );
  assert.deepEqual(
    directPublic.calculators?.g?.calculator,
    multi.calculators?.g?.calculator,
    "SET_ACTIVE_CALCULATOR keeps target calculator runtime execution payload stable (g)",
  );
  const targetedLayoutAction: Action = { type: "SET_KEYPAD_DIMENSIONS", calculatorId: "g", columns: 3, rows: 2 };
  const targetedPublic = reducer(multi, targetedLayoutAction);
  const targetedReduced = reduceWithProjectionScope(multi, targetedLayoutAction);
  const targetedWithTrace = withRecordedDiagnosticsAction(multi, targetedReduced, targetedLayoutAction, visualizerKeyById);
  const targetedPipeline = normalizeRuntimeStateInvariants(targetedWithTrace);
  assert.deepEqual(
    targetedPipeline,
    targetedPublic,
    "targeted calculator action path matches public reducer projection+trace+invariant pipeline",
  );
  assert.deepEqual(
    targetedPublic.calculators?.f?.calculator,
    multi.calculators?.f?.calculator,
    "targeted calculator action keeps non-target runtime execution state unchanged (f)",
  );
  assert.deepEqual(
    targetedPublic.calculators?.f?.lambdaControl,
    multi.calculators?.f?.lambdaControl,
    "targeted calculator action keeps non-target control state unchanged (f)",
  );

  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex += 1) {
    const seed = seeds[seedIndex];
    for (let traceIndex = 0; traceIndex < allTraces.length; traceIndex += 1) {
      const trace = allTraces[traceIndex];
      let viaPublic = seed;
      let viaPipeline = seed;
      for (let stepIndex = 0; stepIndex < trace.length; stepIndex += 1) {
        const action = trace[stepIndex];
        viaPublic = reducer(viaPublic, action);
        const reduced = reduceWithProjectionScope(viaPipeline, action);
        const withTrace = withRecordedDiagnosticsAction(viaPipeline, reduced, action, visualizerKeyById);
        viaPipeline = normalizeRuntimeStateInvariants(withTrace);
        assert.deepEqual(
          viaPipeline,
          viaPublic,
          `pipeline mismatch seedIndex=${seedIndex.toString()} traceIndex=${traceIndex.toString()} stepIndex=${stepIndex.toString()} action=${action.type}`,
        );
      }
    }
  }
};
