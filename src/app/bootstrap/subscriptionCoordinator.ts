import type { Action, GameState, Store } from "../../domain/types.js";

type AutoEqualsScheduler = {
  sync: (state: GameState) => void;
};

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
    autoEqualsScheduler: AutoEqualsScheduler;
    unlockTracker: UnlockTracker;
    allocatorCueCoordinator: AllocatorCueCoordinator;
    unlockRevealCoordinator: UnlockRevealCoordinator;
    getAllocatorIncreaseFromUnlocks: (previous: GameState, latest: GameState) => number;
    renderAndPersistState: (state: GameState) => void;
    initialState: GameState;
  },
): (() => void) => {
  let previousStateForCues = options.initialState;
  return store.subscribe((state) => {
    options.autoEqualsScheduler.sync(state);
    const latest = store.getState();
    const previous = previousStateForCues;
    previousStateForCues = latest;

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

    options.renderAndPersistState(latest);
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
