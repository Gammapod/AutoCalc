import type { AppMode } from "../contracts/appMode.js";
import type { Action, GameState, Store } from "../domain/types.js";

type SavePolicy = "none" | "save_current" | "clear_save";

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
  onLegacyNavigate: (mode: AppMode) => void;
  runtimeEnabled: () => boolean;
}) => {
  const applySavePolicy = (savePolicy: SavePolicy): void => {
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

  const requestModeTransition = (mode: AppMode, savePolicy: SavePolicy): void => {
    applySavePolicy(savePolicy);
    if (!options.runtimeEnabled()) {
      options.onLegacyNavigate(mode);
      return;
    }
    const nextState = options.buildBootStateForMode(mode);
    options.store.dispatch({
      type: "HYDRATE_SAVE",
      state: nextState,
    } satisfies Extract<Action, { type: "HYDRATE_SAVE" }>);
    options.setCurrentMode(mode);
  };

  return {
    requestModeTransition,
  };
};

