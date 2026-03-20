import { projectControlFromState } from "../domain/controlProjection.js";
import { isExecutionModeActive } from "../domain/executionModePolicy.js";
import type { Action, GameState, Store } from "../domain/types.js";

export const AUTO_STEP_INTERVAL_MS = 1000;

type TimerHandle = ReturnType<typeof setInterval>;

type TimerApi = {
  setInterval: (callback: () => void, ms: number) => TimerHandle;
  clearInterval: (handle: TimerHandle) => void;
};

export type AutoStepSchedulerOptions = {
  intervalMs?: number;
  timers?: TimerApi;
  dispatchAction?: (action: Action) => void;
};

const defaultTimers: TimerApi = {
  setInterval: (callback, ms) => setInterval(callback, ms),
  clearInterval: (handle) => clearInterval(handle),
};

const getAutoStepRateMultiplier = (state: GameState): number =>
  Math.max(0.001, projectControlFromState(state).autoEqualsRateMultiplier);

const getAutoStepIntervalMs = (state: GameState, baseIntervalMs: number): number =>
  baseIntervalMs / getAutoStepRateMultiplier(state);

const isAutoStepEnabled = (state: GameState): boolean =>
  isExecutionModeActive(state);

export const createAutoStepScheduler = (store: Store, options: AutoStepSchedulerOptions = {}) => {
  const baseIntervalMs = options.intervalMs ?? AUTO_STEP_INTERVAL_MS;
  const timers = options.timers ?? defaultTimers;
  const dispatchAction = options.dispatchAction ?? ((action: Action) => {
    store.dispatch(action);
  });
  let intervalHandle: TimerHandle | null = null;
  let activeIntervalMs: number | null = null;
  let starting = false;

  const stop = (): void => {
    if (intervalHandle !== null) {
      timers.clearInterval(intervalHandle);
      intervalHandle = null;
      activeIntervalMs = null;
    }
  };

  const ensureStarted = (state: GameState): void => {
    if (!isAutoStepEnabled(state)) {
      stop();
      return;
    }
    if (starting) {
      return;
    }

    const nextIntervalMs = getAutoStepIntervalMs(state, baseIntervalMs);
    if (intervalHandle !== null && activeIntervalMs === nextIntervalMs) {
      return;
    }

    starting = true;
    try {
      if (intervalHandle !== null) {
        timers.clearInterval(intervalHandle);
        intervalHandle = null;
      }
      intervalHandle = timers.setInterval(() => {
        dispatchAction({ type: "AUTO_STEP_TICK" });
      }, nextIntervalMs);
      activeIntervalMs = nextIntervalMs;
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
