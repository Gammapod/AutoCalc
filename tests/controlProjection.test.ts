import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";
import { getLambdaDerivedValues } from "../src/domain/lambdaControl.js";
import { projectControlFromInputs, projectControlFromState } from "../src/domain/controlProjection.js";

export const runControlProjectionTests = (): void => {
  const base = initialState();
  const fProjection = projectControlFromState(base, "f");
  const fDerived = getLambdaDerivedValues(fProjection.control, controlProfiles.f);
  assert.deepEqual(fProjection.fields, fDerived.effectiveFields, "projection fields mirror lambda-derived effective fields");
  assert.equal(fProjection.keypadColumns, fDerived.effectiveFields.alpha, "f projection columns match derived alpha");
  assert.equal(fProjection.keypadRows, fDerived.effectiveFields.beta, "f projection rows match derived beta");
  assert.equal(fProjection.maxSlots, base.unlocks.maxSlots, "f projection slots match unlocks snapshot");
  assert.equal(fProjection.maxTotalDigits, base.unlocks.maxTotalDigits, "f projection range matches unlocks snapshot");
  assert.equal(fProjection.maxDenominatorDigits, fProjection.fields.delta_q, "projection maps delta_q to maxDenominatorDigits");
  assert.equal(fProjection.deltaQEffective, fProjection.fields.delta_q, "projection exposes delta_q effective field");
  assert.equal(fProjection.budget.maxPoints, 0, "projection budget maxPoints is currently fixed");
  assert.equal(fProjection.budget.unused + fProjection.budget.spent, 0, "projection budget is internally consistent");

  const gFlooring = projectControlFromInputs(
    { alpha: 99, beta: 99, gamma: 4, delta: 99, delta_q: 99, epsilon: 99 },
    controlProfiles.g,
    "g",
  );
  assert.equal(gFlooring.control.alpha, 12, "g alpha is clamped by hard bounds");
  assert.equal(gFlooring.control.beta, 12, "g beta is clamped by hard bounds");
  assert.equal(gFlooring.fields.delta_q, 24, "g delta_q is clamped by hard bounds");
  assert.equal(gFlooring.maxDenominatorDigits, 24, "g projection delta_q hook resolves from effective field");

  const sanitized = projectControlFromInputs(
    { alpha: 1, beta: 1, gamma: 1, delta: 1, delta_q: 1_000, epsilon: 0 },
    controlProfiles.f,
    "f",
  );
  assert.equal(sanitized.control.delta_q, 24, "delta_q uses hard-bound sanitization path");
};

