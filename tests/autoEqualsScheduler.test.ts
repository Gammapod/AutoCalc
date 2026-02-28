import assert from "node:assert/strict";
import { createAutoEqualsScheduler, normalizeLoadedStateForRuntime } from "../src/app/autoEqualsScheduler.js";
import { AUTO_EQUALS_FLAG, initialState } from "../src/domain/state.js";
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
  activeCount: () => number;
};

const createFakeTimerApi = (): FakeTimerApi => {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  let setCalls = 0;
  let clearCalls = 0;

  return {
    timers: {
      setInterval: (callback: () => void): TimerHandle => {
        const id = nextId++;
        callbacks.set(id, callback);
        setCalls += 1;
        return id as unknown as TimerHandle;
      },
      clearInterval: (handle: TimerHandle): void => {
        const id = handle as unknown as number;
        callbacks.delete(id);
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

const countEqualsPresses = (actions: Action[]): number =>
  actions.filter((action) => action.type === "PRESS_KEY" && action.key === "=").length;

export const runAutoEqualsSchedulerTests = (): void => {
  const timers = createFakeTimerApi();
  const store = createMockStore(initialState());
  const scheduler = createAutoEqualsScheduler(store, { timers: timers.timers });

  scheduler.startIfNeeded();
  assert.equal(countEqualsPresses(store.actions), 0, "startIfNeeded is idle when auto-equals flag is off");
  assert.equal(timers.activeCount(), 0, "no interval is created while off");

  store.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  scheduler.sync(store.getState());
  assert.equal(countEqualsPresses(store.actions), 1, "toggling on dispatches immediate equals once");
  assert.equal(timers.setCalls, 1, "toggling on creates one interval");
  assert.equal(timers.activeCount(), 1, "interval remains active while on");
  assert.equal(Boolean(store.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "toggle stays on after first failed attempt");

  timers.tick();
  assert.equal(countEqualsPresses(store.actions), 2, "each interval tick dispatches equals");
  assert.equal(
    Boolean(store.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]),
    false,
    "toggle auto-turns off after second failed equals attempt",
  );
  assert.equal(timers.activeCount(), 0, "auto-turn-off clears the running interval");
  assert.ok(
    store.actions.some((action) => action.type === "TOGGLE_FLAG" && action.flag === AUTO_EQUALS_FLAG),
    "scheduler dispatches TOGGLE_FLAG to untoggle itself",
  );

  timers.tick();
  assert.equal(countEqualsPresses(store.actions), 2, "ticks after off do not dispatch equals");

  const stateWithValidEquation: GameState = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      operationSlots: [{ operator: "+", operand: 1n }],
    },
    unlocks: {
      ...initialState().unlocks,
      execution: {
        ...initialState().unlocks.execution,
        "=": true,
      },
    },
  };
  const validStore = createMockStore(stateWithValidEquation);
  const validTimers = createFakeTimerApi();
  const validScheduler = createAutoEqualsScheduler(validStore, { timers: validTimers.timers });
  validStore.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  validScheduler.sync(validStore.getState());
  assert.equal(
    countEqualsPresses(validStore.actions),
    1,
    "valid equations still trigger immediate equals when toggled on",
  );
  validTimers.tick();
  validTimers.tick();
  assert.equal(
    countEqualsPresses(validStore.actions),
    3,
    "valid equations keep auto-equals running past the second attempt",
  );
  assert.equal(Boolean(validStore.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "toggle remains on while equation is valid");

  store.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  scheduler.sync(store.getState());
  assert.equal(countEqualsPresses(store.actions), 3, "turning on again dispatches immediate equals again");
  assert.equal(timers.setCalls, 2, "turning on again creates a fresh interval");
  assert.equal(timers.activeCount(), 1, "exactly one interval stays active");

  timers.tick();
  assert.equal(countEqualsPresses(store.actions), 4, "restart cycle still performs second attempt before auto-turn-off");
  assert.equal(Boolean(store.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), false, "restart cycle auto-turns off again on second failure");
  assert.equal(timers.activeCount(), 0, "restart cycle clears interval again after auto-turn-off");

  scheduler.dispose();
  assert.equal(timers.clearCalls, 2, "dispose is safe even when interval is already cleared");
  assert.equal(timers.activeCount(), 0, "dispose leaves no timers active");
  validScheduler.dispose();

  const loadedWithAuto: GameState = {
    ...initialState(),
    ui: {
      ...initialState().ui,
      buttonFlags: {
        [AUTO_EQUALS_FLAG]: true,
        "another.flag": true,
      },
    },
  };
  const normalized = normalizeLoadedStateForRuntime(loadedWithAuto);
  if (!normalized) {
    throw new Error("Expected normalized state.");
  }
  assert.equal(Boolean(normalized.ui.buttonFlags[AUTO_EQUALS_FLAG]), false, "runtime load clears auto-equals flag");
  assert.equal(Boolean(normalized.ui.buttonFlags["another.flag"]), true, "runtime load preserves other flags");
};
