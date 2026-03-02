import assert from "node:assert/strict";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));

const getSpent = (state: GameState): number => {
  const a = state.allocator.allocations;
  return a.width + a.height + a.range + a.speed + a.slots;
};

const getUnused = (state: GameState): number => state.allocator.maxPoints - getSpent(state);

const assertAllocatorInvariant = (state: GameState): void => {
  const a = state.allocator.allocations;
  assert.ok(a.width >= 0 && a.height >= 0 && a.range >= 0 && a.speed >= 0 && a.slots >= 0, "allocations stay non-negative");
  const spent = getSpent(state);
  const unused = getUnused(state);
  assert.ok(unused >= 0, "unused stays non-negative");
  assert.equal(unused + spent, state.allocator.maxPoints, "unused + spent equals maxPoints");
};

export const runReducerAllocatorDeviceTests = (): void => {
  const base = initialState();
  assert.equal(base.allocator.maxPoints, 1, "initial maxPoints defaults to 1");
  assertAllocatorInvariant(base);

  const widthPlus = reducer(base, { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 });
  assert.equal(widthPlus.allocator.allocations.width, 1, "+1 consumes one width allocation");
  assert.equal(getUnused(widthPlus), 0, "+1 consumes one unused point");
  assert.equal(widthPlus.ui.keypadColumns, 2, "width allocation updates effective keypad width (1 + alloc)");
  assertAllocatorInvariant(widthPlus);

  const noSparePlus = reducer(widthPlus, { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
  assert.equal(noSparePlus, widthPlus, "+1 no-ops when unused is zero");

  const noMinusBelowZero = reducer(base, { type: "ALLOCATOR_ADJUST", field: "speed", delta: -1 });
  assert.equal(noMinusBelowZero, base, "-1 no-ops when allocation is already zero");

  const maxRaised = reducer(base, { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 5 });
  assert.equal(maxRaised.allocator.maxPoints, 6, "add max points increases budget");
  assertAllocatorInvariant(maxRaised);

  const withSlots = reducer(maxRaised, { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 });
  assert.equal(withSlots.allocator.allocations.slots, 1, "slots allocation increments");
  assert.equal(withSlots.unlocks.maxSlots, 2, "slots allocation updates effective max slots (1 + alloc)");
  assertAllocatorInvariant(withSlots);

  const withRange = reducer(maxRaised, { type: "ALLOCATOR_ADJUST", field: "range", delta: 1 });
  assert.equal(withRange.allocator.allocations.range, 1, "range allocation increments");
  assert.equal(withRange.unlocks.maxTotalDigits, 2, "range allocation updates effective max digits (1 + alloc)");
  assertAllocatorInvariant(withRange);

  const withHeight = reducer(withRange, { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
  const withHeightActual = reducer(withHeight, { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 });
  assert.equal(withHeightActual.allocator.allocations.height, 2, "height allocation can be incremented multiple times");
  assert.equal(withHeightActual.ui.keypadRows, 3, "height allocation updates effective keypad height");
  assertAllocatorInvariant(withHeightActual);

  let trimFixture = reducer(withHeightActual, { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 1 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "speed", delta: 1 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "speed", delta: 1 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 });
  trimFixture = reducer(trimFixture, { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 });
  assertAllocatorInvariant(trimFixture);

  const trimmed = reducer(trimFixture, { type: "ALLOCATOR_SET_MAX_POINTS", value: 2 });
  assert.equal(trimmed.allocator.maxPoints, 2, "set max points applies new value");
  assert.equal(trimmed.allocator.allocations.speed, 0, "trim priority removes speed first");
  assert.equal(trimmed.allocator.allocations.range, 0, "trim priority removes range second");
  assert.equal(trimmed.allocator.allocations.slots, 0, "trim priority removes slots third");
  assert.equal(trimmed.allocator.allocations.height, 1, "trim priority removes height fourth (including partial trim)");
  assert.equal(trimmed.allocator.allocations.width, 1, "width is trimmed last");
  assertAllocatorInvariant(trimmed);

  const resized = reducer(base, { type: "ALLOCATOR_SET_MAX_POINTS", value: 6 });
  const configured = {
    ...reducer(reducer(reducer(resized, { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 }), { type: "ALLOCATOR_ADJUST", field: "range", delta: 1 }), { type: "ALLOCATOR_ADJUST", field: "speed", delta: 1 }),
    calculator: {
      ...base.calculator,
      total: r(42n),
      roll: [r(5n), r(42n)],
    },
  };

  const reset = reducer(configured, { type: "RESET_ALLOCATOR_DEVICE" });
  assert.deepEqual(
    reset.allocator.allocations,
    { width: 0, height: 0, range: 0, speed: 0, slots: 0 },
    "allocator reset zeroes all spends",
  );
  assert.equal(reset.allocator.maxPoints, configured.allocator.maxPoints, "allocator reset preserves maxPoints");
  assert.equal(reset.ui.keypadColumns, 1, "reset projection restores effective width baseline");
  assert.equal(reset.ui.keypadRows, 1, "reset projection restores effective height baseline");
  assert.equal(reset.unlocks.maxTotalDigits, 1, "reset projection restores effective range baseline");
  assert.equal(reset.unlocks.maxSlots, 1, "reset projection restores effective slots baseline");
  assert.deepEqual(reset.calculator, configured.calculator, "allocator reset does not alter calculator run state");
  assertAllocatorInvariant(reset);
};
