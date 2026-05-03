import type { Action, GameState, Store, TransitionSavePolicy, UiEffect } from "../../domain/types.js";
import type { AppMode } from "../../contracts/appMode.js";

type UnlockTracker = {
  hasNewUnlock: (state: GameState) => boolean;
};

type UnlockRevealCoordinator = {
  runUnlockRevealCue: (state: GameState, uiEffects?: UiEffect[]) => Promise<void>;
};

export const createStoreSubscriptionCoordinator = (
  store: Store,
  options: {
    unlockTracker: UnlockTracker;
    unlockRevealCoordinator: UnlockRevealCoordinator;
    renderAndPersistState: (state: GameState, uiEffects: UiEffect[]) => void;
    syncAutoStepScheduler?: (state: GameState) => void;
    consumeUiEffects?: () => UiEffect[];
    onQuitApplication?: () => void;
    onRequestModeTransition?: (mode: AppMode, savePolicy: TransitionSavePolicy) => void;
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
    const quitEffect = uiEffects.find((effect): effect is Extract<UiEffect, { type: "quit_application" }> =>
      effect.type === "quit_application");
    if (quitEffect) {
      options.onQuitApplication?.();
      return;
    }
    const modeTransitionEffect = uiEffects.find((effect): effect is Extract<UiEffect, { type: "request_mode_transition" }> =>
      effect.type === "request_mode_transition");
    if (modeTransitionEffect) {
      options.onRequestModeTransition?.(modeTransitionEffect.targetMode, modeTransitionEffect.savePolicy);
      return;
    }

    const hasNewUnlock = options.unlockTracker.hasNewUnlock(latest);
    if (hasNewUnlock) {
      void (async () => {
        await options.unlockRevealCoordinator.runUnlockRevealCue(latest, uiEffects);
      })();
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
