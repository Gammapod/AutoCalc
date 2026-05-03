import type { Action, GameState, Store, TransitionSavePolicy, UiEffect } from "../../domain/types.js";
import type { AppMode } from "../../contracts/appMode.js";

type UnlockRevealCoordinator = {
  runUnlockRevealCue: (state: GameState, uiEffects?: UiEffect[]) => Promise<void>;
};

type UnlockCompletedEffect = Extract<UiEffect, { type: "unlock_completed" }>;

export const shouldRunStorageRevealForUnlock = (effect: UnlockCompletedEffect): boolean =>
  effect.effectType === "unlock_digit"
  || effect.effectType === "unlock_slot_operator"
  || effect.effectType === "unlock_execution"
  || effect.effectType === "unlock_visualizer"
  || effect.effectType === "unlock_utility"
  || effect.effectType === "unlock_memory"
  || effect.effectType === "move_key_to_coord";

export const createStoreSubscriptionCoordinator = (
  store: Store,
  options: {
    unlockRevealCoordinator: UnlockRevealCoordinator;
    renderAndPersistState: (state: GameState, uiEffects: UiEffect[]) => void;
    syncAutoStepScheduler?: (state: GameState) => void;
    consumeUiEffects?: () => UiEffect[];
    onQuitApplication?: () => void;
    onRequestModeTransition?: (mode: AppMode, savePolicy: TransitionSavePolicy) => void;
  },
): (() => void) => {
  return store.subscribe(() => {
    const latestBeforeSync = store.getState();
    options.syncAutoStepScheduler?.(latestBeforeSync);
    const latest = store.getState();
    if (latest !== latestBeforeSync) {
      // syncAutoStepScheduler dispatched an action; nested subscription pass will process the newest state.
      return;
    }
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

    const unlockEffects = uiEffects.filter((effect): effect is UnlockCompletedEffect => effect.type === "unlock_completed");
    if (unlockEffects.some(shouldRunStorageRevealForUnlock)) {
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
