import type { AppMode } from "../contracts/appMode.js";
import type { Action, GameState, Store, TransitionSavePolicy } from "../domain/types.js";

type PersistRepo = {
  clear: () => void;
};

type SaveScheduler = {
  schedule: (state: GameState) => void;
  flushNow: () => void;
  cancel: () => void;
};

export const createModeTransitionCoordinator = (options: {
  store: Store;
  storageRepo: PersistRepo;
  saveScheduler: SaveScheduler;
  buildBootStateForMode: (mode: AppMode) => GameState;
  setCurrentMode: (mode: AppMode) => void;
}) => {
  const applySavePolicy = (savePolicy: TransitionSavePolicy): void => {
    if (savePolicy === "save_current") {
      options.saveScheduler.schedule(options.store.getState());
      options.saveScheduler.flushNow();
      return;
    }
    if (savePolicy === "clear_save") {
      options.saveScheduler.cancel();
      options.storageRepo.clear();
    }
  };

  const requestModeTransition = (mode: AppMode, savePolicy: TransitionSavePolicy): void => {
    applySavePolicy(savePolicy);
    options.setCurrentMode(mode);
    const nextState = options.buildBootStateForMode(mode);
    options.store.dispatch({
      type: "HYDRATE_SAVE",
      state: nextState,
    } satisfies Extract<Action, { type: "HYDRATE_SAVE" }>);
  };

  return {
    requestModeTransition,
  };
};
