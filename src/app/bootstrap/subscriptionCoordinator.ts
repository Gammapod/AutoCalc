import type { Action, GameState, Store, UiEffect } from "../../domain/types.js";

type UnlockTracker = {
  hasNewUnlock: (state: GameState) => boolean;
};

type AllocatorCueCoordinator = {
  runAllocatorIncreaseCue: () => Promise<void>;
};

type UnlockRevealCoordinator = {
  runUnlockRevealCue: (state: GameState) => Promise<void>;
};

export const createStoreSubscriptionCoordinator = (
  store: Store,
  options: {
    unlockTracker: UnlockTracker;
    allocatorCueCoordinator: AllocatorCueCoordinator;
    unlockRevealCoordinator: UnlockRevealCoordinator;
    getAllocatorIncreaseFromUnlocks: (previous: GameState, latest: GameState) => number;
    renderAndPersistState: (state: GameState, uiEffects: UiEffect[]) => void;
    syncAutoStepScheduler?: (state: GameState) => void;
    consumeUiEffects?: () => UiEffect[];
    initialState: GameState;
  },
): (() => void) => {
  let previousStateForCues = options.initialState;
  return store.subscribe(() => {
    const latestBeforeSync = store.getState();
    options.syncAutoStepScheduler?.(latestBeforeSync);
    const latest = store.getState();
    if (latest !== latestBeforeSync) {
      // syncAutoStepScheduler dispatched an action; nested subscription pass will process the newest state.
      return;
    }
    const previous = previousStateForCues;
    previousStateForCues = latest;
    const uiEffects = options.consumeUiEffects?.() ?? [];

    const hasNewUnlock = options.unlockTracker.hasNewUnlock(latest);
    const maxPointIncreaseFromUnlocks = options.getAllocatorIncreaseFromUnlocks(previous, latest);

    if (maxPointIncreaseFromUnlocks > 0 || hasNewUnlock) {
      if (maxPointIncreaseFromUnlocks > 0) {
        void (async () => {
          await options.allocatorCueCoordinator.runAllocatorIncreaseCue();
        })();
      }
      if (hasNewUnlock) {
        void (async () => {
          await options.unlockRevealCoordinator.runUnlockRevealCue(latest);
        })();
      }
      return;
    }

    options.renderAndPersistState(latest, uiEffects);
  });
};

type PersistRepo = {
  clear: () => void;
};

export const createResetRunHandler = (
  store: Store,
  storageRepo: PersistRepo,
): (() => void) =>
  () => {
    store.dispatch({ type: "RESET_RUN" });
    const reset = store.getState();
    store.dispatch({
      type: "HYDRATE_SAVE",
      state: {
        ...reset,
        calculator: {
          ...reset.calculator,
          singleDigitInitialTotalEntry: true,
        },
      },
    } satisfies Extract<Action, { type: "HYDRATE_SAVE" }>);
    storageRepo.clear();
  };
