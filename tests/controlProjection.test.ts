import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";
import { getLambdaDerivedValues } from "../src/domain/lambdaControl.js";
import { projectControlFromInputs, projectControlFromState } from "../src/domain/controlProjection.js";

export const runControlProjectionTests = (): void => {
  const base = initialState();
  const fProjection = projectControlFromState(base, "f");
  const fDerived = getLambdaDerivedValues(fProjection.control, fProjection.profile);
  assert.deepEqual(fProjection.fields, fDerived.effectiveFields, "projection fields mirror lambda-derived effective fields");
  assert.equal(fProjection.keypadColumns, base.calculators?.f?.ui.keypadColumns, "f projection columns match projected UI state");
  assert.equal(fProjection.keypadRows, base.calculators?.f?.ui.keypadRows, "f projection rows match projected UI state");
  assert.equal(fProjection.maxSlots, base.calculators?.f?.allocator.allocations.slots, "f projection slots match allocator snapshot");
  assert.equal(fProjection.maxTotalDigits, base.calculators?.f?.allocator.allocations.range, "f projection range matches allocator snapshot");
  assert.equal(fProjection.budget.maxPoints, fProjection.control.maxPoints, "projection budget maxPoints mirrors control");
  assert.equal(fProjection.budget.unused + fProjection.budget.spent, fProjection.budget.maxPoints, "projection budget is internally consistent");

  const gProjection = projectControlFromState(base, "g");
  assert.equal(gProjection.keypadColumns, base.calculators?.g?.ui.keypadColumns, "g projection columns match projected UI state");
  assert.equal(gProjection.keypadRows, base.calculators?.g?.ui.keypadRows, "g projection rows match projected UI state");
  assert.equal(gProjection.fields.alpha, gProjection.allocator.allocations.width, "g projection alpha tracks allocator width");
  assert.equal(gProjection.fields.beta, gProjection.allocator.allocations.height, "g projection beta tracks allocator height");

  const gFlooring = projectControlFromInputs(
    { maxPoints: 11, alpha: 99, beta: 99, gamma: 4, gammaMinRaised: true },
    controlProfiles.g,
    "g",
  );
  assert.equal(gFlooring.control.alpha, controlProfiles.g.starts.alpha, "non-settable g alpha is canonicalized to profile start");
  assert.equal(gFlooring.control.beta, controlProfiles.g.starts.beta, "non-settable g beta is canonicalized to profile start");
  assert.equal(gFlooring.fields.alpha, 4, "g alpha equation result is floor-clamped");
  assert.equal(gFlooring.fields.epsilon, 1, "g epsilon equation uses floor rounding");

  const gammaGateRaised = projectControlFromInputs(
    { maxPoints: 3, alpha: 1, beta: 1, gamma: 1, gammaMinRaised: true },
    controlProfiles.f,
    "f",
  );
  const gammaGateClamp = projectControlFromInputs(
    { ...gammaGateRaised.control, gamma: 0, gammaMinRaised: true },
    controlProfiles.f,
    "f",
  );
  assert.equal(gammaGateClamp.fields.gamma, 1, "f gamma min gate clamps below-1 decrements after gate is raised");
  assert.equal(gammaGateClamp.control.gamma, 1, "canonical control preserves gamma min gate clamp");
};
