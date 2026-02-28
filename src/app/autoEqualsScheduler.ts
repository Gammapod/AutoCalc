import { AUTO_EQUALS_FLAG } from "../domain/state.js";
import { getOperationSnapshot } from "../domain/slotDrafting.js";
import type { GameState, Store } from "../domain/types.js";

export const AUTO_EQUALS_INTERVAL_MS = 1000;

type TimerHandle = ReturnType<typeof setInterval>;

type TimerApi = {
  setInterval: (callback: () => void, ms: number) => TimerHandle;
  clearInterval: (handle: TimerHandle) => void;
};

export type AutoEqualsSchedulerOptions = {
  intervalMs?: number;
  timers?: TimerApi;
};

const defaultTimers: TimerApi = {
  setInterval: (callback, ms) => setInterval(callback, ms),
  clearInterval: (handle) => clearInterval(handle),
};

const isAutoEqualsEnabled = (state: GameState): boolean => Boolean(state.ui.buttonFlags[AUTO_EQUALS_FLAG]);
const hasValidEquation = (state: GameState): boolean => getOperationSnapshot(state.calculator).length > 0;

export const clearAutoEqualsFlagForRuntime = (state: GameState): GameState => {
  if (!Object.prototype.hasOwnProperty.call(state.ui.buttonFlags, AUTO_EQUALS_FLAG)) {
    return state;
  }

  const nextFlags = { ...state.ui.buttonFlags };
  delete nextFlags[AUTO_EQUALS_FLAG];
  return {
    ...state,
    ui: {
      ...state.ui,
      buttonFlags: nextFlags,
    },
  };
};

export const normalizeLoadedStateForRuntime = (loaded: GameState | null): GameState | null =>
  loaded ? clearAutoEqualsFlagForRuntime(loaded) : loaded;

export const createAutoEqualsScheduler = (store: Store, options: AutoEqualsSchedulerOptions = {}) => {
  const intervalMs = options.intervalMs ?? AUTO_EQUALS_INTERVAL_MS;
  const timers = options.timers ?? defaultTimers;
  let intervalHandle: TimerHandle | null = null;
  let starting = false;
  let consecutiveInvalidAttempts = 0;

  const resetInvalidAttempts = (): void => {
    consecutiveInvalidAttempts = 0;
  };

  const stop = (): void => {
    if (intervalHandle !== null) {
      timers.clearInterval(intervalHandle);
      intervalHandle = null;
    }
    resetInvalidAttempts();
  };

  const dispatchAutoEqualsAttempt = (): void => {
    const beforeAttempt = store.getState();
    const validEquation = hasValidEquation(beforeAttempt);
    store.dispatch({ type: "PRESS_KEY", key: "=" });

    if (validEquation) {
      resetInvalidAttempts();
      return;
    }

    consecutiveInvalidAttempts += 1;
    if (consecutiveInvalidAttempts < 2) {
      return;
    }

    const afterAttempt = store.getState();
    if (!isAutoEqualsEnabled(afterAttempt)) {
      stop();
      return;
    }

    store.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
    stop();
  };

  const ensureStarted = (state: GameState): void => {
    if (!isAutoEqualsEnabled(state)) {
      stop();
      return;
    }
    if (intervalHandle !== null || starting) {
      return;
    }

    starting = true;
    try {
      // Install interval before any re-entrant subscriber activity can re-check scheduler state.
      intervalHandle = timers.setInterval(() => {
        dispatchAutoEqualsAttempt();
      }, intervalMs);
      dispatchAutoEqualsAttempt();
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
