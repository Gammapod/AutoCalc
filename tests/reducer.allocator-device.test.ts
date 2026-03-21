import assert from "node:assert/strict";
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";

const getSpent = (state: GameState): number =>
  state.lambdaControl.alpha + state.lambdaControl.beta + state.lambdaControl.gamma;

const getUnused = (state: GameState): number => state.lambdaControl.maxPoints - getSpent(state);

const assertAllocatorInvariant = (state: GameState): void => {
  const c = state.lambdaControl;
  assert.ok(c.alpha >= 0 && c.beta >= 0 && c.gamma >= 0, "canonical allocations stay non-negative");
  assert.ok(getUnused(state) >= 0, "unused stays non-negative");
  assert.equal(getUnused(state) + getSpent(state), state.lambdaControl.maxPoints, "unused + spent equals maxPoints");
};

export const runReducerAllocatorDeviceTests = (): void => {
  const base = initialState();
  assertAllocatorInvariant(base);

  const maxRaised = reducer(base, { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 5 });
  assert.equal(maxRaised.lambdaControl.maxPoints, base.lambdaControl.maxPoints + 5, "add max points increases budget");
  assertAllocatorInvariant(maxRaised);

  const withSlots = reducer(maxRaised, { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 });
  assert.equal(withSlots.lambdaControl.gamma, maxRaised.lambdaControl.gamma + 1, "slots allocation increments gamma");
  assertAllocatorInvariant(withSlots);

  const reset = reducer(withSlots, { type: "RESET_ALLOCATOR_DEVICE" });
  assert.equal(reset.lambdaControl.alpha, controlProfiles.f.starts.alpha, "reset restores alpha start");
  assert.equal(reset.lambdaControl.beta, controlProfiles.f.starts.beta, "reset restores beta start");
  assert.equal(reset.lambdaControl.gamma, controlProfiles.f.starts.gamma, "reset restores gamma start");
  assert.equal(reset.lambdaControl.maxPoints, withSlots.lambdaControl.maxPoints, "reset preserves max points");
  assertAllocatorInvariant(reset);
};

