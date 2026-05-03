import assert from "node:assert/strict";
import { createStoreSubscriptionCoordinator } from "../src/app/bootstrap/subscriptionCoordinator.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, Store, UiEffect } from "../src/domain/types.js";

export const runBootstrapSubscriptionCoordinatorTests = async (): Promise<void> => {
  const state = initialState();
  const unlockEffect: Extract<UiEffect, { type: "unlock_completed" }> = {
    type: "unlock_completed",
    unlockId: "unlock_digit_1_portable_on_total_equals_9",
    description: "Make 1 portable when total equals 9.",
    effectType: "unlock_digit",
    targetLabel: "1",
    key: "digit_1",
  };
  let subscribed = false;
  let triggerSubscriber: (state: GameState) => void = () => {
    throw new Error("subscription coordinator did not register a store subscriber");
  };
  const store: Store = {
    getState: () => state,
    dispatch: (action) => action,
    enqueueUiEffects: () => undefined,
    subscribe: (nextSubscriber) => {
      subscribed = true;
      triggerSubscriber = nextSubscriber;
      return () => {
        subscribed = false;
      };
    },
    consumeUiEffects: () => [unlockEffect],
  };
  let cueState: GameState | null = null;
  let cueEffects: UiEffect[] | undefined;
  let renderedEffects: UiEffect[] | null = null;

  const unsubscribe = createStoreSubscriptionCoordinator(store, {
    unlockTracker: {
      hasNewUnlock: () => true,
    },
    unlockRevealCoordinator: {
      runUnlockRevealCue: async (nextState, uiEffects) => {
        cueState = nextState;
        cueEffects = uiEffects;
      },
    },
    renderAndPersistState: (_nextState, uiEffects) => {
      renderedEffects = uiEffects;
    },
    consumeUiEffects: () => store.consumeUiEffects?.() ?? [],
    initialState: state,
  });

  assert.equal(subscribed, true, "subscription coordinator registers a store subscriber");
  triggerSubscriber(state);
  await Promise.resolve();
  unsubscribe();

  assert.equal(cueState, state, "new-unlock subscription path invokes unlock reveal cue with latest state");
  assert.deepEqual(cueEffects, [unlockEffect], "new-unlock subscription path preserves UI effects for cue rendering");
  assert.equal(renderedEffects, null, "new-unlock subscription path defers rendering to cue coordinator");
};
