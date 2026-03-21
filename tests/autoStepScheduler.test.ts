import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { createAutoStepScheduler } from "../src/app/autoStepScheduler.js";
import { EXECUTION_PAUSE_FLAG, initialState } from "../src/domain/state.js";
import { projectControlFromState } from "../src/domain/controlProjection.js";
import { reducer } from "../src/domain/reducer.js";
import type { Action, GameState, Store } from "../src/domain/types.js";

type TimerHandle = ReturnType<typeof setInterval>;

type FakeTimerApi = {
  timers: {
    setInterval: (callback: () => void, ms: number) => TimerHandle;
    clearInterval: (handle: TimerHandle) => void;
  };
  tick: () => void;
  setCalls: number;
  clearCalls: number;
  setMsHistory: number[];
  activeCount: () => number;
};

const createFakeTimerApi = (): FakeTimerApi => {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  let setCalls = 0;
  let clearCalls = 0;
  const setMsHistory: number[] = [];

  return {
    timers: {
      setInterval: (callback: () => void, ms: number): TimerHandle => {
        const id = nextId++;
        callbacks.set(id, callback);
        setCalls += 1;
        setMsHistory.push(ms);
        return id as unknown as TimerHandle;
      },
      clearInterval: (handle: TimerHandle): void => {
        callbacks.delete(handle as unknown as number);
        clearCalls += 1;
      },
    },
    tick: (): void => {
      for (const callback of [...callbacks.values()]) {
        callback();
      }
    },
    get setCalls() {
      return setCalls;
    },
    get clearCalls() {
      return clearCalls;
    },
    get setMsHistory() {
      return setMsHistory;
    },
    activeCount: () => callbacks.size,
  };
};

const createMockStore = (seed: GameState): Store & { actions: Action[] } => {
  let state = seed;
  const actions: Action[] = [];
  return {
    actions,
    getState: () => state,
    dispatch: (action: Action) => {
      actions.push(action);
      state = reducer(state, action);
      return action;
    },
    subscribe: () => () => {},
  };
};

const countAutoTicks = (actions: Action[]): number =>
  actions.filter((action) => action.type === "AUTO_STEP_TICK").length;

export const runAutoStepSchedulerTests = (): void => {
  const timers = createFakeTimerApi();
  const store = createMockStore(initialState());
  const scheduler = createAutoStepScheduler(store, { timers: timers.timers });

  scheduler.startIfNeeded();
  assert.equal(timers.activeCount(), 0, "scheduler stays idle while play/pause is off");

  store.dispatch({ type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG });
  const expectedInitialIntervalMs = 1000 / projectControlFromState(store.getState()).autoEqualsRateMultiplier;
  scheduler.sync(store.getState());
  assert.equal(timers.activeCount(), 1, "scheduler starts when play/pause turns on");
  assert.equal(timers.setMsHistory[0], expectedInitialIntervalMs, "tick rate is derived from epsilon multiplier");
  assert.equal(countAutoTicks(store.actions), 1, "enabling auto-step dispatches first AUTO_STEP_TICK immediately");

  const beforeTickCount = countAutoTicks(store.actions);
  timers.tick();
  assert.equal(countAutoTicks(store.actions), beforeTickCount + 1, "interval tick dispatches one AUTO_STEP_TICK action");

  store.dispatch({ type: "ALLOCATOR_SET_MAX_POINTS", value: 200 });
  for (let index = 0; index < 4; index += 1) {
    store.dispatch({ type: "ALLOCATOR_ADJUST", field: "width", delta: 1 });
    store.dispatch({ type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
    store.dispatch({ type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 });
  }
  scheduler.sync(store.getState());
  assert.equal(timers.setCalls, 2, "epsilon-driven speed changes retime interval");
  assert.equal(timers.clearCalls, 1, "retime clears prior interval");
  assert.equal(countAutoTicks(store.actions), beforeTickCount + 1, "retime does not dispatch an extra immediate AUTO_STEP_TICK");

  store.dispatch({ type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG });
  scheduler.sync(store.getState());
  assert.equal(timers.activeCount(), 0, "scheduler stops when play/pause turns off");

  scheduler.dispose();
  assert.equal(timers.activeCount(), 0, "dispose leaves no active timers");
};

