import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { createAutoEqualsScheduler, normalizeLoadedStateForRuntime } from "../src/app/autoEqualsScheduler.js";
import { AUTO_EQUALS_FLAG, initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { projectControlFromState } from "../src/domain/controlProjection.js";
import { reducer } from "../src/domain/reducer.js";
import type { Action, GameState, Key, Store } from "../src/domain/types.js";
import { execution, op, executionUnlockPatch } from "./support/keyCompat.js";

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

const countExecutorPresses = (actions: Action[]): number =>
  actions.filter((action) => action.type === "PRESS_KEY").length;

const countExecutorPressesForKey = (actions: Action[], key: Key): number =>
  actions.filter((action) => action.type === "PRESS_KEY" && action.key === key).length;

export const runAutoEqualsSchedulerTests = (): void => {
  const timers = createFakeTimerApi();
  const store = createMockStore({
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      operationSlots: [{ operator: op("+"), operand: 1n }],
    },
  });
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
  const expectedInitialIntervalMs = 1000 / projectControlFromState(store.getState()).autoEqualsRateMultiplier;
  scheduler.sync(store.getState());
  assert.equal(countExecutorPresses(store.actions), 1, "toggling on dispatches immediate executor press once");
  assert.equal(countExecutorPressesForKey(store.actions, execution("=")), 1, "fallback path presses first installed execution key");
  assert.equal(timers.setCalls, 1, "toggling on creates one interval");
  assert.equal(timers.setMsHistory[0], expectedInitialIntervalMs, "default speed follows control-derived epsilon rate");
  assert.equal(timers.activeCount(), 1, "interval remains active while on");
  assert.equal(Boolean(store.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "toggle remains on after successful = attempt");

  store.dispatch({ type: "ALLOCATOR_SET_MAX_POINTS", value: 200 });
  for (let index = 0; index < 4; index += 1) {
    store.dispatch({ type: "ALLOCATOR_ADJUST", field: "width", delta: 1 });
    store.dispatch({ type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
    store.dispatch({ type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 });
  }
  scheduler.sync(store.getState());
  assert.equal(timers.setCalls, 2, "speed changes while running should retime the interval");
  assert.equal(timers.clearCalls, 1, "retiming clears the previous interval");
  assert.ok(timers.setMsHistory[1] < 1000, "control changes can increase executor rate");
  assert.equal(countExecutorPresses(store.actions), 1, "retiming should not dispatch an extra immediate executor press");

  const beforeTickPresses = countExecutorPresses(store.actions);
  timers.tick();
  const afterTickPresses = countExecutorPresses(store.actions);
  assert.ok(afterTickPresses >= beforeTickPresses, "interval tick never regresses executor press count");
  assert.ok(
    countExecutorPressesForKey(store.actions, execution("=")) >= 1,
    "auto scheduler uses equals key when available",
  );
  assert.ok(
    autoActivatedKeys.length >= 1 && autoActivatedKeys.every((key) => key === execution("=")),
    "scheduler reports activated executor keys for press animation hooks",
  );

  const stateWithValidEquation: GameState = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      operationSlots: [{ operator: op("+"), operand: 1n }],
    },
    completedUnlockIds: ["unlock_allocator_point_on_first_natural_result"],
    unlocks: {
      ...initialState().unlocks,
      execution: {
        ...initialState().unlocks.execution,
        ...executionUnlockPatch([["=", true]]),
      },
    },
  };
  const validStore = createMockStore(stateWithValidEquation);
  const validTimers = createFakeTimerApi();
  const validScheduler = createAutoEqualsScheduler(validStore, { timers: validTimers.timers });
  validStore.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  validScheduler.sync(validStore.getState());
  assert.equal(
    countExecutorPressesForKey(validStore.actions, execution("=")),
    1,
    "valid equations still trigger immediate equals when toggled on",
  );
  validTimers.tick();
  validTimers.tick();
  assert.equal(
    countExecutorPressesForKey(validStore.actions, execution("=")),
    3,
    "valid equations keep auto-equals running past the second attempt",
  );
  assert.equal(Boolean(validStore.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]), true, "toggle remains on while equation is valid");

  const stateWithInvalidEqualsExecutor: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      execution: {
        ...initialState().unlocks.execution,
        ...executionUnlockPatch([["=", false]]),
      },
    },
    ui: {
      ...initialState().ui,
      keyLayout: [{ kind: "placeholder", area: "empty" }],
    },
  };
  const invalidStore = createMockStore(stateWithInvalidEqualsExecutor);
  const invalidTimers = createFakeTimerApi();
  const invalidScheduler = createAutoEqualsScheduler(invalidStore, { timers: invalidTimers.timers });
  invalidStore.dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
  invalidScheduler.sync(invalidStore.getState());
  assert.equal(
    countExecutorPressesForKey(invalidStore.actions, execution("=")),
    0,
    "without an installed executor key, scheduler performs no immediate executor press",
  );
  assert.equal(
    Boolean(invalidStore.getState().ui.buttonFlags[AUTO_EQUALS_FLAG]),
    false,
    "missing installed executor key turns auto toggle off immediately",
  );
  assert.equal(invalidTimers.activeCount(), 0, "invalid equals auto-turn-off clears active interval");

  const stateWithNoExecutorOnKeypad: GameState = {
    ...initialState(),
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
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
  assert.equal(timers.clearCalls, 2, "dispose clears the current scheduler interval once");
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

  const missingCatalogKeyState: GameState = {
    ...initialState(),
    ui: {
      ...initialState().ui,
      storageLayout: initialState().ui.storageLayout.filter((cell) => cell?.kind !== "key" || cell.key !== KEY_ID.op_max),
    },
  };
  const normalizedWithBackfill = normalizeLoadedStateForRuntime(missingCatalogKeyState);
  if (!normalizedWithBackfill) {
    throw new Error("Expected normalized backfill state.");
  }
  assert.equal(
    normalizedWithBackfill.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === KEY_ID.op_max),
    true,
    "runtime load backfills missing catalog keys into storage",
  );
};

