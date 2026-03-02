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

const countExecutorPresses = (actions: Action[]): number =>
  actions.filter((action) => action.type === "PRESS_KEY" && (action.key === "=" || action.key === "++")).length;

const countExecutorPressesForKey = (actions: Action[], key: "=" | "++"): number =>
  actions.filter((action) => action.type === "PRESS_KEY" && action.key === key).length;

export const runAutoEqualsSchedulerTests = (): void => {
  const timers = createFakeTimerApi();
  const store = createMockStore(initialState());
  const scheduler = createAutoEqualsScheduler(store, { timers: timers.timers });

  scheduler.startIfNeeded();
  assert.equal(countExecutorPresses(store.actions), 0, "startIfNeeded is idle when auto-equals flag is off");
  assert.equal(timers.activeCount(), 0, "no interval is created while off");

  store.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  scheduler.sync(store.getState());
  assert.equal(countExecutorPresses(store.actions), 1, "toggling on dispatches immediate executor press once");
  assert.equal(countExecutorPressesForKey(store.actions, "++"), 1, "default keypad executor is ++");
  assert.equal(countExecutorPressesForKey(store.actions, "="), 0, "default scheduler path should not press =");
  assert.equal(timers.setCalls, 1, "toggling on creates one interval");
  assert.equal(timers.activeCount(), 1, "interval remains active while on");
  assert.equal(Boolean(store.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "toggle remains on after successful ++ attempt");

  timers.tick();
  assert.equal(countExecutorPresses(store.actions), 2, "each interval tick dispatches executor");
  assert.equal(countExecutorPressesForKey(store.actions, "++"), 2, "tick continues pressing ++");
  assert.equal(Boolean(store.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "successful ++ execution keeps toggle on");
  assert.equal(timers.activeCount(), 1, "successful ++ execution keeps interval active");

  const stateWithValidEquation: GameState = {
    ...initialState(),
    ui: {
      ...initialState().ui,
      keyLayout: [{ kind: "key", key: "=" }],
    },
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
    countExecutorPressesForKey(validStore.actions, "="),
    1,
    "valid equations still trigger immediate equals when toggled on",
  );
  validTimers.tick();
  validTimers.tick();
  assert.equal(
    countExecutorPressesForKey(validStore.actions, "="),
    3,
    "valid equations keep auto-equals running past the second attempt",
  );
  assert.equal(
    countExecutorPressesForKey(validStore.actions, "++"),
    0,
    "when = is the installed keypad executor, scheduler should not dispatch ++",
  );
  assert.equal(Boolean(validStore.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "toggle remains on while equation is valid");

  const stateWithInvalidEqualsExecutor: GameState = {
    ...initialState(),
    ui: {
      ...initialState().ui,
      keyLayout: [{ kind: "key", key: "=" }],
    },
    unlocks: {
      ...initialState().unlocks,
      execution: {
        ...initialState().unlocks.execution,
        "=": false,
      },
    },
  };
  const invalidStore = createMockStore(stateWithInvalidEqualsExecutor);
  const invalidTimers = createFakeTimerApi();
  const invalidScheduler = createAutoEqualsScheduler(invalidStore, { timers: invalidTimers.timers });
  invalidStore.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  invalidScheduler.sync(invalidStore.getState());
  assert.equal(
    countExecutorPressesForKey(invalidStore.actions, "="),
    1,
    "invalid equals path still attempts immediate = press once",
  );
  assert.equal(
    Boolean(invalidStore.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]),
    true,
    "first invalid equals attempt keeps auto toggle on",
  );
  invalidTimers.tick();
  assert.equal(
    countExecutorPressesForKey(invalidStore.actions, "="),
    2,
    "invalid equals path performs second attempt on first interval tick",
  );
  assert.equal(
    Boolean(invalidStore.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]),
    false,
    "invalid equals path auto-turns off after second failed attempt",
  );
  assert.equal(invalidTimers.activeCount(), 0, "invalid equals auto-turn-off clears active interval");
  assert.ok(
    invalidStore.actions.some((action) => action.type === "TOGGLE_FLAG" && action.flag === AUTO_EQUALS_FLAG),
    "invalid equals path dispatches TOGGLE_FLAG to untoggle itself",
  );

  const stateWithNoExecutorOnKeypad: GameState = {
    ...initialState(),
    ui: {
      ...initialState().ui,
      keyLayout: [{ kind: "placeholder", area: "empty" }],
    },
  };
  const noExecutorStore = createMockStore(stateWithNoExecutorOnKeypad);
  const noExecutorTimers = createFakeTimerApi();
  const noExecutorScheduler = createAutoEqualsScheduler(noExecutorStore, { timers: noExecutorTimers.timers });
  noExecutorStore.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  noExecutorScheduler.sync(noExecutorStore.getState());
  assert.equal(
    countExecutorPresses(noExecutorStore.actions),
    0,
    "when no executor is installed on keypad, scheduler dispatches no executor press",
  );
  assert.equal(
    Boolean(noExecutorStore.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]),
    false,
    "no installed keypad executor auto-turns toggle off immediately",
  );
  assert.equal(noExecutorTimers.activeCount(), 0, "no installed keypad executor stops interval immediately");

  scheduler.dispose();
  assert.equal(timers.clearCalls, 1, "dispose clears running ++ scheduler interval once");
  assert.equal(timers.activeCount(), 0, "dispose leaves no timers active");
  validScheduler.dispose();
  invalidScheduler.dispose();
  noExecutorScheduler.dispose();

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
