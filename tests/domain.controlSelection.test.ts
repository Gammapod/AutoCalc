import assert from "node:assert/strict";
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";
import {
  getSettableControlFields,
  normalizeSelectedControlField,
  resolveSelectedControlContextFromUi,
} from "../src/domain/controlSelection.js";
import type { ControlProfile } from "../src/domain/types.js";

const withSettablePolicy = (
  profile: ControlProfile,
  settablePatch: Partial<ControlProfile["settable"]>,
): ControlProfile => ({
  ...profile,
  settable: {
    ...profile.settable,
    ...settablePatch,
  },
});

export const runDomainControlSelectionTests = (): void => {
  const deltaEpsilonSettableProfile = withSettablePolicy(controlProfiles.f, {
    alpha: false,
    beta: false,
    gamma: false,
    delta: true,
    epsilon: true,
  });

  assert.deepEqual(
    getSettableControlFields(deltaEpsilonSettableProfile),
    ["delta", "epsilon"],
    "settable-field projection keeps canonical control-field order across non-legacy fields",
  );

  assert.equal(
    normalizeSelectedControlField(deltaEpsilonSettableProfile, "epsilon", "\u03B2"),
    "epsilon",
    "normalization preserves valid non-alpha selection when profile policy marks it settable",
  );

  assert.equal(
    normalizeSelectedControlField(deltaEpsilonSettableProfile, "alpha", "\u03B2"),
    "delta",
    "legacy memory-variable fallback remains adapter-only and never narrows canonical field set",
  );

  const legacyFallbackProfile = withSettablePolicy(controlProfiles.f, {
    alpha: true,
    beta: true,
    gamma: true,
  });

  const legacyFallbackContext = resolveSelectedControlContextFromUi(legacyFallbackProfile, {
    selectedControlField: "epsilon",
    memoryVariable: "\u03B2",
  });
  assert.equal(
    legacyFallbackContext.selectedControlField,
    "beta",
    "legacy fallback chooses adapter-mapped beta when selectedControlField is invalid",
  );
};
