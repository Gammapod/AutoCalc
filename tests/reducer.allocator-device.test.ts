import assert from "node:assert/strict";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, RollEntry } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

const getSpent = (state: GameState): number => {
  return state.lambdaControl.alpha + state.lambdaControl.beta + state.lambdaControl.gamma;
};

const getUnused = (state: GameState): number => state.lambdaControl.maxPoints - getSpent(state);

const assertAllocatorInvariant = (state: GameState): void => {
  const c = state.lambdaControl;
  assert.ok(c.alpha >= 0 && c.beta >= 0 && c.gamma >= 0, "canonical allocations stay non-negative");
  const spent = getSpent(state);
  const unused = getUnused(state);
  assert.ok(unused >= 0, "unused stays non-negative");
  assert.equal(unused + spent, state.lambdaControl.maxPoints, "unused + spent equals maxPoints");
};

export const runReducerAllocatorDeviceTests = (): void => {
  const base = initialState();
  assert.equal(base.lambdaControl.maxPoints, 0, "initial maxPoints defaults to 0");
  assertAllocatorInvariant(base);

  const withOnePoint = reducer(base, { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 1 });
  assert.equal(withOnePoint.lambdaControl.maxPoints, 1, "adding one point enables first allocation");
  assertAllocatorInvariant(withOnePoint);

  const widthPlus = reducer(withOnePoint, { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 });
  assert.equal(widthPlus.lambdaControl.alpha, 1, "+1 consumes one alpha allocation");
  assert.equal(widthPlus.allocator.allocations.width, 1, "legacy snapshot width tracks alpha");
  assert.equal(getUnused(widthPlus), 0, "+1 consumes one unused point");
  assert.equal(widthPlus.ui.keypadColumns, 2, "width allocation updates effective keypad width (1 + alloc)");
  assertAllocatorInvariant(widthPlus);

  const noSparePlus = reducer(widthPlus, { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
  assert.equal(noSparePlus, widthPlus, "+1 no-ops when unused is zero");

  const noMinusBelowZero = reducer(base, { type: "ALLOCATOR_ADJUST", field: "slots", delta: -1 });
  assert.equal(noMinusBelowZero, base, "-1 no-ops when allocation is already zero");

  const maxRaised = reducer(withOnePoint, { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 5 });
  assert.equal(maxRaised.lambdaControl.maxPoints, 6, "add max points increases budget");
  assertAllocatorInvariant(maxRaised);

  const withSlots = reducer(maxRaised, { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 });
  assert.equal(withSlots.lambdaControl.gamma, 1, "slots allocation increments gamma");
  assert.equal(withSlots.unlocks.maxSlots, 1, "slots allocation updates effective max slots (alloc)");
  assertAllocatorInvariant(withSlots);

  const withRange = reducer(maxRaised, { type: "ALLOCATOR_ADJUST", field: "range", delta: 1 });
  assert.equal(withRange, maxRaised, "range compatibility adjust is a no-op");

  const withSpeed = reducer(maxRaised, { type: "ALLOCATOR_ADJUST", field: "speed", delta: 1 });
  assert.equal(withSpeed, maxRaised, "speed compatibility adjust is a no-op");

  const withHeight = reducer(maxRaised, { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
  const withHeightActual = reducer(withHeight, { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
  assert.equal(withHeightActual.lambdaControl.beta, 2, "height allocation can be incremented multiple times");
  assert.equal(withHeightActual.ui.keypadRows, 3, "height allocation updates effective keypad height");
  assertAllocatorInvariant(withHeightActual);

  let trimFixture = reducer(base, { type: "ALLOCATOR_SET_MAX_POINTS", value: 6 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 });
  assertAllocatorInvariant(trimFixture);

  const trimmed = reducer(trimFixture, { type: "ALLOCATOR_SET_MAX_POINTS", value: 2 });
  assert.equal(trimmed.lambdaControl.maxPoints, 2, "set max points applies new value");
  assert.equal(trimmed.lambdaControl.gamma, 0, "trim priority removes gamma first");
  assert.equal(trimmed.lambdaControl.beta, 1, "trim priority removes beta second (including partial trim)");
  assert.equal(trimmed.lambdaControl.alpha, 1, "alpha is trimmed last");
  assertAllocatorInvariant(trimmed);

  const resized = reducer(base, { type: "ALLOCATOR_SET_MAX_POINTS", value: 6 });
  const configured = {
    ...reducer(reducer(resized, { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 }), {
      type: "LAMBDA_SET_OVERRIDE_DELTA",
      value: 9,
    }),
    calculator: {
      ...base.calculator,
      total: r(42n),
      rollEntries: re(r(5n), r(42n)),
    },
  };

  const reset = reducer(configured, { type: "RESET_ALLOCATOR_DEVICE" });
  assert.deepEqual(
    reset.lambdaControl,
    { ...configured.lambdaControl, alpha: 0, beta: 0, gamma: 0, overrides: {} },
    "allocator reset zeroes canonical spends and clears overrides",
  );
  assert.equal(reset.lambdaControl.maxPoints, configured.lambdaControl.maxPoints, "allocator reset preserves maxPoints");
  assert.equal(reset.ui.keypadColumns, 1, "reset projection restores effective width baseline");
  assert.equal(reset.ui.keypadRows, 1, "reset projection restores effective height baseline");
  assert.equal(reset.unlocks.maxTotalDigits, 1, "reset projection restores effective range baseline");
  assert.equal(reset.unlocks.maxSlots, 0, "reset projection restores effective slots baseline");
  assert.deepEqual(reset.calculator, configured.calculator, "allocator reset does not alter calculator run state");
  assertAllocatorInvariant(reset);
};
