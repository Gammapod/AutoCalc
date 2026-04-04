import type { GameState } from "../domain/types.js";

export const PERSISTENCE_SAVE_DEBOUNCE_MS = 250;

type TimerHandle = ReturnType<typeof setTimeout>;

type TimerApi = {
  setTimeout: (callback: () => void, ms: number) => TimerHandle;
  clearTimeout: (handle: TimerHandle) => void;
};

type SaveRepo = {
  save: (state: GameState) => void;
};

export type PersistenceSaveScheduler = {
  schedule: (state: GameState) => void;
  flushNow: () => void;
  cancel: () => void;
  hasPending: () => boolean;
};

export type PersistenceSaveSchedulerOptions = {
  debounceMs?: number;
  timers?: TimerApi;
};

const defaultTimers: TimerApi = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};

export const createPersistenceSaveScheduler = (
  repo: SaveRepo,
  options: PersistenceSaveSchedulerOptions = {},
): PersistenceSaveScheduler => {
  const timers = options.timers ?? defaultTimers;
  const debounceMs = options.debounceMs ?? PERSISTENCE_SAVE_DEBOUNCE_MS;

  let pendingState: GameState | null = null;
  let timeoutHandle: TimerHandle | null = null;

  const clearTimer = (): void => {
    if (timeoutHandle !== null) {
      timers.clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  };

  const flushNow = (): void => {
    if (!pendingState) {
      clearTimer();
      return;
    }
    const stateToPersist = pendingState;
    pendingState = null;
    clearTimer();
    repo.save(stateToPersist);
  };

  const schedule = (state: GameState): void => {
    pendingState = state;
    clearTimer();
    timeoutHandle = timers.setTimeout(() => {
      flushNow();
    }, debounceMs);
  };

  const cancel = (): void => {
    pendingState = null;
    clearTimer();
  };

  return {
    schedule,
    flushNow,
    cancel,
    hasPending: () => pendingState !== null,
  };
};

