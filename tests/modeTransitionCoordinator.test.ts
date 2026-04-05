import assert from "node:assert/strict";
import { createModeTransitionCoordinator } from "../src/app/modeTransitionCoordinator.js";
import { initialState } from "../src/domain/state.js";
import type { Action, GameState, Store, TransitionSavePolicy } from "../src/domain/types.js";
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

const modeTargets: AppMode[] = ["game", "sandbox", "main_menu"];
const savePolicies: TransitionSavePolicy[] = ["none", "save_current", "clear_save"];

export const runModeTransitionCoordinatorTests = (): void => {
  const baseline = initialState();

  for (const targetMode of modeTargets) {
    for (const savePolicy of savePolicies) {
      const eventOrder: string[] = [];
      const store = createMockStore(baseline);
      const originalDispatch = store.dispatch;
      store.dispatch = (action: Action) => {
        eventOrder.push(`dispatch:${action.type}`);
        return originalDispatch(action);
      };
      const scheduled: GameState[] = [];
      let flushed = 0;
      let cancelled = 0;
      let cleared = 0;
      const setModeCalls: AppMode[] = [];
      const buildCalls: AppMode[] = [];

      const coordinator = createModeTransitionCoordinator({
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
        buildBootStateForMode: (mode) => {
          buildCalls.push(mode);
          return makeStateForMode(mode);
        },
        setCurrentMode: (mode) => {
          setModeCalls.push(mode);
          eventOrder.push(`set_mode:${mode}`);
        },
      });

      coordinator.requestModeTransition(targetMode, savePolicy);

      assert.deepEqual(
        buildCalls,
        [targetMode],
        `transition ${savePolicy}->${targetMode} builds exactly one boot state`,
      );

      const last = store.actions.at(-1);
      assert.equal(last?.type, "HYDRATE_SAVE", `transition ${savePolicy}->${targetMode} hydrates`);
      assert.deepEqual(setModeCalls, [targetMode], `transition ${savePolicy}->${targetMode} updates current mode once`);
      assert.equal(
        eventOrder.findIndex((token) => token.startsWith("set_mode:")) < eventOrder.findIndex((token) => token === "dispatch:HYDRATE_SAVE"),
        true,
        `transition ${savePolicy}->${targetMode} updates app mode before HYDRATE_SAVE dispatch`,
      );

      if (last?.type === "HYDRATE_SAVE") {
        assert.equal(
          Boolean(last.state.ui.buttonFlags["mode.main_menu"]),
          targetMode === "main_menu",
          `transition ${savePolicy}->${targetMode} preserves main-menu parity flags`,
        );
        assert.equal(
          Boolean(last.state.ui.buttonFlags["mode.storage_content_visible"]),
          targetMode === "game",
          `transition ${savePolicy}->${targetMode} preserves storage-visibility parity flags`,
        );
      }

      assert.equal(
        savePolicy === "save_current" ? scheduled.length >= 1 : scheduled.length === 0,
        true,
        `transition ${savePolicy}->${targetMode} save scheduling semantics are correct`,
      );
      assert.equal(
        savePolicy === "save_current" ? flushed >= 1 : flushed === 0,
        true,
        `transition ${savePolicy}->${targetMode} flush semantics are correct`,
      );
      assert.equal(
        savePolicy === "clear_save" ? cancelled >= 1 : cancelled === 0,
        true,
        `transition ${savePolicy}->${targetMode} cancel semantics are correct`,
      );
      assert.equal(
        savePolicy === "clear_save" ? cleared >= 1 : cleared === 0,
        true,
        `transition ${savePolicy}->${targetMode} clear semantics are correct`,
      );
    }
  }
};
