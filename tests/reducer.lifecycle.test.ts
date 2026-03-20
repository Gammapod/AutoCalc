import assert from "node:assert/strict";
import { applyLifecycleAction } from "../src/domain/reducer.lifecycle.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";
import { DELTA_RANGE_CLAMP_FLAG, MOD_ZERO_TO_DELTA_FLAG, STEP_EXPANSION_FLAG, initialState } from "../src/domain/state.js";
import { projectControlFromState } from "../src/domain/controlProjection.js";
import { reducer } from "../src/domain/reducer.js";
import type { Action, GameState } from "../src/domain/types.js";
import { legacyInitialState } from "./support/legacyState.js";

export const runReducerLifecycleTests = (): void => {
  const base = normalizeRuntimeStateInvariants(legacyInitialState());

  const reset = applyLifecycleAction(base, { type: "RESET_RUN" });
  assert.deepEqual(reset, initialState(), "RESET_RUN returns initial state");
  const baseline = initialState();
  const baselineProjection = projectControlFromState(baseline, "f");
  assert.equal(baseline.ui.keypadColumns, baselineProjection.keypadColumns, "initial columns match projected alpha");
  assert.equal(baseline.ui.keypadRows, baselineProjection.keypadRows, "initial rows match projected beta");

  const hydratedState: GameState = {
    ...base,
    completedUnlockIds: ["hydrate-marker"],
  };
  const hydrated = applyLifecycleAction(base, { type: "HYDRATE_SAVE", state: hydratedState });
  assert.equal(Boolean(hydrated), true, "HYDRATE_SAVE returns a state");
  assert.equal(hydrated?.completedUnlockIds.includes("hydrate-marker"), true, "HYDRATE_SAVE preserves provided unlock ids");

  const mismatchedHydrateInput: GameState = {
    ...baseline,
    ui: {
      ...baseline.ui,
      keypadColumns: baseline.ui.keypadColumns + 1,
      keypadRows: baseline.ui.keypadRows + 1,
    },
  };
  const normalizedHydrate = applyLifecycleAction(base, { type: "HYDRATE_SAVE", state: mismatchedHydrateInput });
  assert.equal(
    normalizedHydrate?.ui.keypadColumns,
    baselineProjection.keypadColumns,
    "HYDRATE_SAVE normalizes columns to projected alpha",
  );
  assert.equal(
    normalizedHydrate?.ui.keypadRows,
    baselineProjection.keypadRows,
    "HYDRATE_SAVE normalizes rows to projected beta",
  );

  const unlockedAll = applyLifecycleAction(base, { type: "UNLOCK_ALL" });
  if (!unlockedAll) {
    throw new Error("UNLOCK_ALL should be handled by lifecycle reducer.");
  }
  assert.ok(Object.values(unlockedAll.unlocks.valueExpression).every(Boolean), "UNLOCK_ALL unlocks all digits");
  assert.ok(Object.values(unlockedAll.unlocks.slotOperators).every(Boolean), "UNLOCK_ALL unlocks all operators");
  assert.ok(Object.values(unlockedAll.unlocks.unaryOperators).every(Boolean), "UNLOCK_ALL unlocks all unary operators");
  assert.ok(Object.values(unlockedAll.unlocks.utilities).every(Boolean), "UNLOCK_ALL unlocks all utilities");
  assert.ok(Object.values(unlockedAll.unlocks.steps).every(Boolean), "UNLOCK_ALL unlocks all step keys");
  assert.ok(Object.values(unlockedAll.unlocks.execution).every(Boolean), "UNLOCK_ALL unlocks execution keys");
  assert.equal(unlockedAll.unlocks.maxSlots, 4, "UNLOCK_ALL projects allocator-backed slot capacity to 4");
  assert.equal(unlockedAll.allocator.allocations.slots, 4, "UNLOCK_ALL allocates slots budget to reach effective 4");

  const unhandled = applyLifecycleAction(base, { type: "MOVE_KEY_SLOT", fromIndex: 0, toIndex: 1 } as Action);
  assert.equal(unhandled, null, "non-lifecycle actions return null (unhandled)");

  const toggledOn = reducer(base, { type: "TOGGLE_FLAG", flag: "sticky.negate" });
  assert.equal(toggledOn.ui.buttonFlags["sticky.negate"], true, "TOGGLE_FLAG sets an unset flag");

  const toggledOff = reducer(toggledOn, { type: "TOGGLE_FLAG", flag: "sticky.negate" });
  assert.equal(Boolean(toggledOff.ui.buttonFlags["sticky.negate"]), false, "TOGGLE_FLAG clears a set flag");
  assert.equal(
    Object.prototype.hasOwnProperty.call(toggledOff.ui.buttonFlags, "sticky.negate"),
    false,
    "cleared flags are removed from the map",
  );

  const blankNoop = reducer(base, { type: "TOGGLE_FLAG", flag: "   " });
  assert.deepEqual(blankNoop, base, "blank flag names are ignored");

  const settingsToggleBase: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      utilities: {
        ...base.unlocks.utilities,
        [KEY_ID.toggle_delta_range_clamp]: true,
        [KEY_ID.toggle_mod_zero_to_delta]: true,
        [KEY_ID.toggle_step_expansion]: true,
      },
    },
  };

  const deltaOn = reducer(settingsToggleBase, { type: "TOGGLE_FLAG", flag: DELTA_RANGE_CLAMP_FLAG });
  assert.equal(deltaOn.ui.buttonFlags[DELTA_RANGE_CLAMP_FLAG], true, "delta-range settings toggle turns on");
  const modOn = reducer(deltaOn, { type: "TOGGLE_FLAG", flag: MOD_ZERO_TO_DELTA_FLAG });
  assert.equal(Boolean(modOn.ui.buttonFlags[DELTA_RANGE_CLAMP_FLAG]), false, "mod-range toggle clears delta-range toggle");
  assert.equal(modOn.ui.buttonFlags[MOD_ZERO_TO_DELTA_FLAG], true, "mod-range settings toggle turns on");
  const deltaBackOn = reducer(modOn, { type: "TOGGLE_FLAG", flag: DELTA_RANGE_CLAMP_FLAG });
  assert.equal(deltaBackOn.ui.buttonFlags[DELTA_RANGE_CLAMP_FLAG], true, "delta-range toggle can be re-enabled");
  assert.equal(Boolean(deltaBackOn.ui.buttonFlags[MOD_ZERO_TO_DELTA_FLAG]), false, "delta-range toggle clears mod-range toggle");
  const stepExpansionOn = reducer(deltaBackOn, { type: "TOGGLE_FLAG", flag: STEP_EXPANSION_FLAG });
  assert.equal(stepExpansionOn.ui.buttonFlags[STEP_EXPANSION_FLAG], true, "step expansion toggle turns on");
  assert.equal(Boolean(stepExpansionOn.ui.buttonFlags[DELTA_RANGE_CLAMP_FLAG]), false, "step expansion clears delta-range toggle");
  assert.equal(Boolean(stepExpansionOn.ui.buttonFlags[MOD_ZERO_TO_DELTA_FLAG]), false, "step expansion clears mod-range toggle");

  const graphOn = reducer(base, { type: "TOGGLE_VISUALIZER", visualizer: "graph" });
  assert.equal(graphOn.ui.activeVisualizer, "graph", "GRAPH visualizer toggles on");

  const feedOn = reducer(graphOn, { type: "TOGGLE_VISUALIZER", visualizer: "feed" });
  assert.equal(feedOn.ui.activeVisualizer, "feed", "FEED visualizer toggles on and replaces graph");

  const feedOff = reducer(feedOn, { type: "TOGGLE_VISUALIZER", visualizer: "feed" });
  assert.equal(feedOff.ui.activeVisualizer, "total", "pressing active visualizer toggles off to total");

  const eigenOn = reducer(feedOff, { type: "TOGGLE_VISUALIZER", visualizer: "eigen_allocator" });
  assert.equal(eigenOn.ui.activeVisualizer, "eigen_allocator", "\u03BB visualizer toggles on");

  const eigenOff = reducer(eigenOn, { type: "TOGGLE_VISUALIZER", visualizer: "eigen_allocator" });
  assert.equal(eigenOff.ui.activeVisualizer, "total", "pressing active \u03BB visualizer toggles off to total");

  const lockedSettingsInstalled: GameState = {
    ...base,
    ui: {
      ...base.ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.toggle_delta_range_clamp, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
        { kind: "key", key: KEY_ID.toggle_mod_zero_to_delta, behavior: { type: "toggle_flag", flag: MOD_ZERO_TO_DELTA_FLAG } },
      ],
      keypadColumns: 2,
      keypadRows: 1,
      buttonFlags: {
        [MOD_ZERO_TO_DELTA_FLAG]: true,
      },
    },
    unlocks: {
      ...base.unlocks,
      utilities: {
        ...base.unlocks.utilities,
        [KEY_ID.toggle_delta_range_clamp]: false,
        [KEY_ID.toggle_mod_zero_to_delta]: false,
      },
    },
  };
  const forcedLockedSettings = reducer(lockedSettingsInstalled, { type: "TOGGLE_FLAG", flag: MOD_ZERO_TO_DELTA_FLAG });
  assert.equal(
    forcedLockedSettings.ui.buttonFlags[DELTA_RANGE_CLAMP_FLAG],
    true,
    "with multiple locked settings toggles installed, first keypad-order toggle is forced ON",
  );
  assert.equal(
    Boolean(forcedLockedSettings.ui.buttonFlags[MOD_ZERO_TO_DELTA_FLAG]),
    false,
    "locked settings forcing clears later settings toggles in the exclusive group",
  );

  const lockedPlayPauseInstalled: GameState = {
    ...base,
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: "execution.pause" } }],
      keypadColumns: 1,
      keypadRows: 1,
      buttonFlags: {},
    },
    unlocks: {
      ...base.unlocks,
      execution: {
        ...base.unlocks.execution,
        [KEY_ID.exec_play_pause]: false,
      },
    },
  };
  const playPauseNotForced = reducer(lockedPlayPauseInstalled, { type: "TOGGLE_FLAG", flag: "   " });
  assert.equal(
    Boolean(playPauseNotForced.ui.buttonFlags["execution.pause"]),
    false,
    "locked installed play/pause is excluded from forced-ON behavior",
  );

  const lockedVisualizersInstalled: GameState = {
    ...base,
    ui: {
      ...base.ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.viz_feed },
        { kind: "key", key: KEY_ID.viz_graph },
      ],
      keypadColumns: 2,
      keypadRows: 1,
      activeVisualizer: "graph",
    },
    unlocks: {
      ...base.unlocks,
      visualizers: {
        ...base.unlocks.visualizers,
        [KEY_ID.viz_feed]: false,
        [KEY_ID.viz_graph]: false,
      },
    },
  };
  const visualizerForcedByKeypadOrder = reducer(lockedVisualizersInstalled, { type: "TOGGLE_VISUALIZER", visualizer: "graph" });
  assert.equal(
    visualizerForcedByKeypadOrder.ui.activeVisualizer,
    "feed",
    "locked installed visualizers force a single active visualizer by keypad scan order",
  );
};





