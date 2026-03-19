import { getAutoEqualsRateMultiplier as getLambdaAutoEqualsRateMultiplier } from "../domain/lambdaControl.js";
import type { GameState, Key, Store } from "../domain/types.js";
import { KEY_ID } from "../domain/keyPresentation.js";
import { AUTO_EQUALS_FLAG } from "../domain/state.js";
import {
  getInstalledExecutorKey,
  hasValidAutoEqualsEquation,
  isAutoEqualsEnabled,
} from "../domain/autoEqualsPolicy.js";
import { getEffectiveControlProfile } from "../domain/controlProfileRuntime.js";
import { stableSignature } from "../infra/stateSignature.js";

export const AUTO_EQUALS_INTERVAL_MS = 1000;
export const AUTO_EQUALS_POINT_BONUS = 0.01;

type TimerHandle = ReturnType<typeof setInterval>;

type TimerApi = {
  setInterval: (callback: () => void, ms: number) => TimerHandle;
  clearInterval: (handle: TimerHandle) => void;
};

export type AutoEqualsSchedulerOptions = {
  intervalMs?: number;
  timers?: TimerApi;
  dispatchAction?: (
    action:
      | { type: "PRESS_KEY"; key: Key }
      | { type: "TOGGLE_FLAG"; flag: string },
  ) => void;
  onAutoKeyActivated?: (key: Key) => void;
};

const defaultTimers: TimerApi = {
  setInterval: (callback, ms) => setInterval(callback, ms),
  clearInterval: (handle) => clearInterval(handle),
};

const getAutoEqualsRateMultiplier = (state: GameState): number => {
  return getLambdaAutoEqualsRateMultiplier(state.lambdaControl, getEffectiveControlProfile(state));
};

const getAutoEqualsIntervalMs = (state: GameState, baseIntervalMs: number): number =>
  baseIntervalMs / getAutoEqualsRateMultiplier(state);

type AutoActionPlan = {
  action: { type: "PRESS_KEY"; key: Key };
  key: Key;
};

const getAutoActionPlan = (state: GameState): AutoActionPlan | null => {
  const fallbackExecutorKey = getInstalledExecutorKey(state);
  return fallbackExecutorKey ? { action: { type: "PRESS_KEY", key: fallbackExecutorKey }, key: fallbackExecutorKey } : null;
};

export { normalizeLoadedStateForRuntime } from "../infra/persistence/runtimeLoadNormalizer.js";

export const createAutoEqualsScheduler = (store: Store, options: AutoEqualsSchedulerOptions = {}) => {
  const baseIntervalMs = options.intervalMs ?? AUTO_EQUALS_INTERVAL_MS;
  const timers = options.timers ?? defaultTimers;
  const dispatchAction = options.dispatchAction ?? ((action) => {
    store.dispatch(action);
  });
  const onAutoKeyActivated = options.onAutoKeyActivated ?? (() => undefined);
  let intervalHandle: TimerHandle | null = null;
  let activeIntervalMs: number | null = null;
  let starting = false;
  let consecutiveInvalidAttempts = 0;

  const resetInvalidAttempts = (): void => {
    consecutiveInvalidAttempts = 0;
  };

  const stop = (): void => {
    if (intervalHandle !== null) {
      timers.clearInterval(intervalHandle);
      intervalHandle = null;
      activeIntervalMs = null;
    }
    resetInvalidAttempts();
  };

  const dispatchAutoEqualsAttempt = (): void => {
    const beforeAttempt = store.getState();
    const beforeSignature = stableSignature(beforeAttempt);
    const autoPlan = getAutoActionPlan(beforeAttempt);
    if (!autoPlan) {
      if (isAutoEqualsEnabled(beforeAttempt)) {
        dispatchAction({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
      }
      stop();
      return;
    }

    const autoAction = autoPlan.action;
    const validEquation =
      autoAction.type === "PRESS_KEY" && autoAction.key === KEY_ID.exec_equals
        ? hasValidAutoEqualsEquation(beforeAttempt)
        : true;
    dispatchAction(autoAction);
    onAutoKeyActivated(autoPlan.key);
    const afterAttempt = store.getState();
    if (stableSignature(afterAttempt) !== beforeSignature) {
      resetInvalidAttempts();
      return;
    }

    if (validEquation) {
      resetInvalidAttempts();
      return;
    }

    consecutiveInvalidAttempts += 1;
    if (consecutiveInvalidAttempts < 2) {
      return;
    }

    if (!isAutoEqualsEnabled(afterAttempt)) {
      stop();
      return;
    }

    dispatchAction({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
    stop();
  };

  const ensureStarted = (state: GameState): void => {
    if (!isAutoEqualsEnabled(state)) {
      stop();
      return;
    }
    if (starting) {
      return;
    }

    const nextIntervalMs = getAutoEqualsIntervalMs(state, baseIntervalMs);
    if (intervalHandle !== null && activeIntervalMs === nextIntervalMs) {
      return;
    }

    const wasRunning = intervalHandle !== null;
    starting = true;
    try {
      if (intervalHandle !== null) {
        timers.clearInterval(intervalHandle);
        intervalHandle = null;
      }
      // Install interval before any re-entrant subscriber activity can re-check scheduler state.
      intervalHandle = timers.setInterval(() => {
        dispatchAutoEqualsAttempt();
      }, nextIntervalMs);
      activeIntervalMs = nextIntervalMs;
      if (!wasRunning) {
        dispatchAutoEqualsAttempt();
      }
    } finally {
      starting = false;
    }
  };

  return {
    startIfNeeded: (): void => {
      ensureStarted(store.getState());
    },
    sync: (state: GameState): void => {
      ensureStarted(state);
    },
    dispose: (): void => {
      stop();
    },
  };
};
