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
import { isMultiCalculatorSession, materializeCalculatorG, materializeCalculatorMenu } from "../src/domain/multiCalculator.js";
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

  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex += 1) {
    const seed = seeds[seedIndex];
    for (let traceIndex = 0; traceIndex < allTraces.length; traceIndex += 1) {
      const trace = allTraces[traceIndex];
      let viaPublic = seed;
      let viaPipeline = seed;
      for (let stepIndex = 0; stepIndex < trace.length; stepIndex += 1) {
        const action = trace[stepIndex];
        viaPublic = reducer(viaPublic, action);
        const reduced = (
          isMultiCalculatorSession(viaPipeline)
          && action.type === "SET_ACTIVE_CALCULATOR"
          && Boolean(viaPipeline.calculators?.[action.calculatorId])
        )
          ? { ...viaPipeline, activeCalculatorId: action.calculatorId }
          : reduceWithProjectionScope(viaPipeline, action);
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
