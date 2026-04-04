import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";
import {
  createPersistenceSaveScheduler,
  PERSISTENCE_SAVE_DEBOUNCE_MS,
} from "../src/app/persistenceSaveScheduler.js";

type TimerHandle = ReturnType<typeof setTimeout>;

type FakeTimerApi = {
  timers: {
    setTimeout: (callback: () => void, ms: number) => TimerHandle;
    clearTimeout: (handle: TimerHandle) => void;
  };
  tick: () => void;
  setCalls: number;
  clearCalls: number;
  activeCount: () => number;
  msHistory: number[];
};

const createFakeTimerApi = (): FakeTimerApi => {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  let setCalls = 0;
  let clearCalls = 0;
  const msHistory: number[] = [];

  return {
    timers: {
      setTimeout: (callback: () => void, ms: number): TimerHandle => {
        const id = nextId++;
        callbacks.set(id, callback);
        setCalls += 1;
        msHistory.push(ms);
        return id as unknown as TimerHandle;
      },
      clearTimeout: (handle: TimerHandle): void => {
        callbacks.delete(handle as unknown as number);
        clearCalls += 1;
      },
    },
    tick: (): void => {
      const active = [...callbacks.values()];
      callbacks.clear();
      for (const callback of active) {
        callback();
      }
    },
    get setCalls() {
      return setCalls;
    },
    get clearCalls() {
      return clearCalls;
    },
    activeCount: () => callbacks.size,
    msHistory,
  };
};

const withTotal = (state: GameState, total: bigint): GameState => ({
  ...state,
  calculator: {
    ...state.calculator,
    total: { kind: "rational", value: { num: total, den: 1n } },
  },
});

export const runPersistenceSaveSchedulerTests = (): void => {
  const timers = createFakeTimerApi();
  const savedTotals: bigint[] = [];
  const scheduler = createPersistenceSaveScheduler({
    save: (state) => {
      if (state.calculator.total.kind !== "rational") {
        throw new Error("test expects rational total");
      }
      savedTotals.push(state.calculator.total.value.num);
    },
  }, { timers: timers.timers });

  const stateA = withTotal(initialState(), 1n);
  const stateB = withTotal(initialState(), 2n);

  scheduler.schedule(stateA);
  scheduler.schedule(stateB);
  assert.equal(timers.setCalls, 2, "each schedule arms/reset debounce timer");
  assert.equal(timers.msHistory.at(-1), PERSISTENCE_SAVE_DEBOUNCE_MS, "scheduler uses default debounce interval");
  assert.equal(scheduler.hasPending(), true, "scheduler reports pending save before debounce fires");
  timers.tick();
  assert.deepEqual(savedTotals, [2n], "coalesced debounce saves only latest state");
  assert.equal(scheduler.hasPending(), false, "pending state clears after debounce save");

  const stateC = withTotal(initialState(), 3n);
  scheduler.schedule(stateC);
  scheduler.flushNow();
  assert.deepEqual(savedTotals, [2n, 3n], "flushNow persists pending save immediately");
  assert.equal(scheduler.hasPending(), false, "flushNow clears pending state");

  const stateD = withTotal(initialState(), 4n);
  scheduler.schedule(stateD);
  scheduler.cancel();
  timers.tick();
  assert.deepEqual(savedTotals, [2n, 3n], "cancel prevents pending debounce save");
  assert.equal(scheduler.hasPending(), false, "cancel clears pending state");

  const stateE = withTotal(initialState(), 5n);
  scheduler.schedule(stateE);
  scheduler.cancel();
  scheduler.schedule(withTotal(initialState(), 6n));
  scheduler.flushNow();
  assert.deepEqual(savedTotals, [2n, 3n, 6n], "cancel plus new schedule plus flush persists only newest state");

  scheduler.flushNow();
  assert.deepEqual(savedTotals, [2n, 3n, 6n], "flushNow is a no-op when no pending state exists");
};

