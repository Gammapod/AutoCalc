import assert from "node:assert/strict";
import { createAutoEqualsScheduler, normalizeLoadedStateForRuntime } from "../src/app/autoEqualsScheduler.js";
import { AUTO_EQUALS_FLAG, GRAPH_VISIBLE_FLAG, initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { Action, GameState, Key, Store } from "../src/domain/types.js";

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

const withPlayPauseAbove = (state: GameState, keyBelow: Key): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    keypadColumns: 1,
    keypadRows: 2,
    keyLayout: [
      { kind: "key", key: "\u23EF", behavior: { type: "toggle_flag", flag: AUTO_EQUALS_FLAG } },
      { kind: "key", key: keyBelow },
    ],
  },
});

const countExecutorPresses = (actions: Action[]): number =>
  actions.filter((action) => action.type === "PRESS_KEY").length;

const countExecutorPressesForKey = (actions: Action[], key: Key): number =>
  actions.filter((action) => action.type === "PRESS_KEY" && action.key === key).length;

const countToggleActionsForFlag = (actions: Action[], flag: string): number =>
  actions.filter((action) => action.type === "TOGGLE_FLAG" && action.flag === flag).length;

export const runAutoEqualsSchedulerTests = (): void => {
  const timers = createFakeTimerApi();
  const store = createMockStore(initialState());
  const autoActivatedKeys: Key[] = [];
  const scheduler = createAutoEqualsScheduler(store, {
    timers: timers.timers,
    onAutoKeyActivated: (key) => {
      autoActivatedKeys.push(key);
    },
  });

  scheduler.startIfNeeded();
  assert.equal(countExecutorPresses(store.actions), 0, "startIfNeeded is idle when auto-equals flag is off");
  assert.equal(timers.activeCount(), 0, "no interval is created while off");

  store.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  scheduler.sync(store.getState());
  assert.equal(countExecutorPresses(store.actions), 1, "toggling on dispatches immediate executor press once");
  assert.equal(countExecutorPressesForKey(store.actions, "++"), 1, "fallback path presses first installed execution key");
  assert.equal(countExecutorPressesForKey(store.actions, "="), 0, "default scheduler path should not press =");
  assert.equal(timers.setCalls, 1, "toggling on creates one interval");
  assert.equal(timers.setMsHistory[0], 1000, "default speed starts at one executor press per second");
  assert.equal(timers.activeCount(), 1, "interval remains active while on");
  assert.equal(Boolean(store.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "toggle remains on after successful ++ attempt");

  store.dispatch({ type: "ALLOCATOR_SET_MAX_POINTS", value: 200 });
  for (let index = 0; index < 100; index += 1) {
    store.dispatch({ type: "ALLOCATOR_ADJUST", field: "speed", delta: 1 });
  }
  scheduler.sync(store.getState());
  assert.equal(timers.setCalls, 2, "speed changes while running should retime the interval");
  assert.equal(timers.clearCalls, 1, "retiming clears the previous interval");
  assert.equal(timers.setMsHistory[1], 500, "100 speed points doubles executor rate to twice per second");
  assert.equal(countExecutorPresses(store.actions), 1, "retiming should not dispatch an extra immediate executor press");

  timers.tick();
  assert.equal(countExecutorPresses(store.actions), 2, "each interval tick dispatches executor");
  assert.equal(countExecutorPressesForKey(store.actions, "++"), 2, "tick continues pressing ++");
  assert.deepEqual(autoActivatedKeys, ["++", "++"], "scheduler reports activated keys for press animation hooks");
  assert.equal(Boolean(store.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "successful ++ execution keeps toggle on");
  assert.equal(timers.activeCount(), 1, "successful ++ execution keeps interval active");

  const stateWithValidEquation: GameState = {
    ...withPlayPauseAbove(initialState(), "="),
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
    "when = is below play/pause, scheduler should not dispatch ++",
  );
  assert.equal(Boolean(validStore.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "toggle remains on while equation is valid");

  const stateWithInvalidEqualsExecutor: GameState = {
    ...withPlayPauseAbove(initialState(), "="),
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

  const stateWithNonExecutionBelowPlay = withPlayPauseAbove(initialState(), "C");
  const nonExecutionStore = createMockStore(stateWithNonExecutionBelowPlay);
  const nonExecutionTimers = createFakeTimerApi();
  const nonExecutionScheduler = createAutoEqualsScheduler(nonExecutionStore, { timers: nonExecutionTimers.timers });
  nonExecutionStore.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  nonExecutionScheduler.sync(nonExecutionStore.getState());
  assert.equal(
    countExecutorPressesForKey(nonExecutionStore.actions, "C"),
    1,
    "play/pause presses non-execution keys when they are directly below it",
  );
  assert.equal(
    Boolean(nonExecutionStore.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]),
    true,
    "non-execution below play/pause keeps auto toggle active after successful press",
  );

  const graphToggleState: GameState = {
    ...withPlayPauseAbove(initialState(), "GRAPH"),
    unlocks: {
      ...initialState().unlocks,
      visualizers: {
        ...initialState().unlocks.visualizers,
        GRAPH: true,
      },
    },
  };
  const graphToggleStore = createMockStore(graphToggleState);
  const graphToggleTimers = createFakeTimerApi();
  const graphToggleScheduler = createAutoEqualsScheduler(graphToggleStore, { timers: graphToggleTimers.timers });
  graphToggleStore.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  graphToggleScheduler.sync(graphToggleStore.getState());
  assert.equal(
    Boolean(graphToggleStore.getState().ui.buttonFlags[GRAPH_VISIBLE_FLAG]),
    true,
    "toggle key below play/pause is toggled on by immediate attempt",
  );
  graphToggleTimers.tick();
  assert.equal(
    Boolean(graphToggleStore.getState().ui.buttonFlags[GRAPH_VISIBLE_FLAG]),
    false,
    "toggle key below play/pause is toggled off on the next tick",
  );
  assert.equal(
    countToggleActionsForFlag(graphToggleStore.actions, GRAPH_VISIBLE_FLAG),
    2,
    "toggle key below play/pause dispatches toggle action each attempt",
  );

  scheduler.dispose();
  assert.equal(timers.clearCalls, 2, "dispose clears the current ++ scheduler interval once");
  assert.equal(timers.activeCount(), 0, "dispose leaves no timers active");
  validScheduler.dispose();
  invalidScheduler.dispose();
  noExecutorScheduler.dispose();
  nonExecutionScheduler.dispose();
  graphToggleScheduler.dispose();

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
