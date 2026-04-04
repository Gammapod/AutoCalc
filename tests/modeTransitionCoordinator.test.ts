import assert from "node:assert/strict";
import { createModeTransitionCoordinator } from "../src/app/modeTransitionCoordinator.js";
import { initialState } from "../src/domain/state.js";
import type { Action, GameState, Store } from "../src/domain/types.js";
import type { AppMode } from "../src/contracts/appMode.js";

const makeStateForMode = (mode: AppMode): GameState => ({
  ...initialState(),
  ui: {
    ...initialState().ui,
    buttonFlags: {
      ...initialState().ui.buttonFlags,
      "mode.main_menu": mode === "main_menu",
      "mode.storage_content_visible": mode === "game",
    },
  },
});

type MockStore = Store & {
  actions: Action[];
  setState: (state: GameState) => void;
};

const createMockStore = (seed: GameState): MockStore => {
  let state = seed;
  const actions: Action[] = [];
  return {
    actions,
    getState: () => state,
    dispatch: (action: Action) => {
      actions.push(action);
      if (action.type === "HYDRATE_SAVE") {
        state = action.state;
      }
      return action;
    },
    setState: (next) => {
      state = next;
    },
    enqueueUiEffects: () => {},
    subscribe: () => () => {},
  };
};

export const runModeTransitionCoordinatorTests = (): void => {
  const state = initialState();
  const store = createMockStore(state);
  const scheduled: GameState[] = [];
  let flushed = 0;
  let cancelled = 0;
  let cleared = 0;
  const legacyNavigations: AppMode[] = [];
  const setModeCalls: AppMode[] = [];
  const buildCalls: AppMode[] = [];

  const buildBootStateForMode = (mode: AppMode): GameState => {
    buildCalls.push(mode);
    return makeStateForMode(mode);
  };

  const runtimeCoordinator = createModeTransitionCoordinator({
    store,
    storageRepo: {
      clear: () => {
        cleared += 1;
      },
    },
    saveScheduler: {
      schedule: (nextState) => {
        scheduled.push(nextState);
      },
      flushNow: () => {
        flushed += 1;
      },
      cancel: () => {
        cancelled += 1;
      },
    },
    buildBootStateForMode,
    setCurrentMode: (mode) => {
      setModeCalls.push(mode);
    },
    onLegacyNavigate: (mode) => {
      legacyNavigations.push(mode);
    },
    runtimeEnabled: () => true,
  });

  runtimeCoordinator.requestModeTransition("sandbox", "none");
  assert.deepEqual(buildCalls.at(-1), "sandbox", "none policy still builds target mode boot state");
  assert.equal(store.actions.at(-1)?.type, "HYDRATE_SAVE", "runtime path hydrates store for target mode");
  assert.deepEqual(setModeCalls.at(-1), "sandbox", "runtime path updates current mode");
  assert.equal(legacyNavigations.length, 0, "runtime-enabled transitions do not legacy navigate");

  runtimeCoordinator.requestModeTransition("main_menu", "save_current");
  assert.equal(scheduled.length >= 1, true, "save_current schedules latest state before transition");
  assert.equal(flushed >= 1, true, "save_current flushes pending state before transition");

  runtimeCoordinator.requestModeTransition("game", "clear_save");
  assert.equal(cancelled >= 1, true, "clear_save cancels pending scheduled persistence");
  assert.equal(cleared >= 1, true, "clear_save clears persisted state");

  const legacyStore = createMockStore(state);
  const legacyModes: AppMode[] = [];
  const legacyOnlyCoordinator = createModeTransitionCoordinator({
    store: legacyStore,
    storageRepo: {
      clear: () => {},
    },
    saveScheduler: {
      schedule: () => {},
      flushNow: () => {},
      cancel: () => {},
    },
    buildBootStateForMode,
    setCurrentMode: () => {},
    onLegacyNavigate: (mode) => {
      legacyModes.push(mode);
    },
    runtimeEnabled: () => false,
  });

  legacyOnlyCoordinator.requestModeTransition("sandbox", "none");
  assert.deepEqual(legacyModes, ["sandbox"], "legacy-disabled coordinator falls back to URL navigation");
  assert.equal(legacyStore.actions.length, 0, "legacy-disabled coordinator does not dispatch hydrate action");

  const parityStore = createMockStore(state);
  const parityTargets: AppMode[] = ["game", "sandbox", "main_menu"];
  const parityCoordinator = createModeTransitionCoordinator({
    store: parityStore,
    storageRepo: {
      clear: () => {},
    },
    saveScheduler: {
      schedule: () => {},
      flushNow: () => {},
      cancel: () => {},
    },
    buildBootStateForMode: (mode) => makeStateForMode(mode),
    setCurrentMode: () => {},
    onLegacyNavigate: () => {},
    runtimeEnabled: () => true,
  });

  for (const mode of parityTargets) {
    parityCoordinator.requestModeTransition(mode, "none");
    const last = parityStore.actions.at(-1);
    assert.equal(last?.type, "HYDRATE_SAVE", `parity transition to ${mode} hydrates target boot state`);
    if (last?.type === "HYDRATE_SAVE") {
      assert.equal(
        Boolean(last.state.ui.buttonFlags["mode.main_menu"]),
        mode === "main_menu",
        `target ${mode} main-menu flag parity is preserved`,
      );
    }
  }
};

