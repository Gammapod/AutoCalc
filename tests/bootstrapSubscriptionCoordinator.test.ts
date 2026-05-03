import assert from "node:assert/strict";
import { createStoreSubscriptionCoordinator } from "../src/app/bootstrap/subscriptionCoordinator.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, Store, UiEffect } from "../src/domain/types.js";

export const runBootstrapSubscriptionCoordinatorTests = async (): Promise<void> => {
  const state = initialState();
  const installedOnlyUnlockEffect: Extract<UiEffect, { type: "unlock_completed" }> = {
    type: "unlock_completed",
    unlockId: "unlock_digit_1_installed_only_on_total_equals_1",
    description: "Install 1 when total equals 1.",
    effectType: "unlock_installed_only",
    targetLabel: "1",
    key: "digit_1",
  };
  const portableUnlockEffect: Extract<UiEffect, { type: "unlock_completed" }> = {
    type: "unlock_completed",
    unlockId: "unlock_digit_1_portable_on_total_equals_9",
    description: "Make 1 portable when total equals 9.",
    effectType: "unlock_digit",
    targetLabel: "1",
    key: "digit_1",
  };
  const addUnlockEffect: Extract<UiEffect, { type: "unlock_completed" }> = {
    type: "unlock_completed",
    unlockId: "unlock_add_on_total_equals_10",
    description: "Unlock + when total equals 10.",
    effectType: "unlock_slot_operator",
    targetLabel: "+",
    key: "op_add",
  };

  const runSubscriptionPass = async (uiEffects: UiEffect[]) => {
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
      consumeUiEffects: () => uiEffects,
    };
    let cueState: GameState | null = null;
    let cueEffects: UiEffect[] | undefined;
    let cueCount = 0;
    let renderedEffects: UiEffect[] | null = null;

    const unsubscribe = createStoreSubscriptionCoordinator(store, {
      unlockRevealCoordinator: {
        runUnlockRevealCue: async (nextState, nextUiEffects) => {
          cueCount += 1;
          cueState = nextState;
          cueEffects = nextUiEffects;
        },
      },
      renderAndPersistState: (_nextState, nextUiEffects) => {
        renderedEffects = nextUiEffects;
      },
      consumeUiEffects: () => store.consumeUiEffects?.() ?? [],
    });

    assert.equal(subscribed, true, "subscription coordinator registers a store subscriber");
    triggerSubscriber(state);
    await Promise.resolve();
    unsubscribe();

    return { cueCount, cueState, cueEffects, renderedEffects };
  };

  const installedOnlyResult = await runSubscriptionPass([installedOnlyUnlockEffect]);
  assert.equal(
    installedOnlyResult.cueCount,
    0,
    "installed-only unlock completion does not run storage reveal cue",
  );
  assert.deepEqual(
    installedOnlyResult.renderedEffects,
    [installedOnlyUnlockEffect],
    "installed-only unlock completion still renders UI effects for the purple LED",
  );

  const portableResult = await runSubscriptionPass([portableUnlockEffect]);
  assert.equal(portableResult.cueCount, 1, "portable unlock completion runs storage reveal cue");
  assert.equal(portableResult.cueState, state, "storage reveal cue receives latest state");
  assert.deepEqual(
    portableResult.cueEffects,
    [portableUnlockEffect],
    "storage reveal cue preserves UI effects for cue rendering",
  );
  assert.equal(portableResult.renderedEffects, null, "storage reveal path defers rendering to cue coordinator");

  const multiUnlockResult = await runSubscriptionPass([portableUnlockEffect, addUnlockEffect]);
  assert.equal(
    multiUnlockResult.cueCount,
    1,
    "multiple storage-visible unlock completions in one batch run one storage reveal cue",
  );
  assert.deepEqual(
    multiUnlockResult.cueEffects,
    [portableUnlockEffect, addUnlockEffect],
    "multi-unlock storage reveal preserves the full UI effect batch",
  );
};
