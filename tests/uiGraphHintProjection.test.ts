import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import {
  resolveGraphTargetYLineHint,
  resolveGraphTargetYLineNearness,
} from "../src/ui/modules/visualizers/graphHintProjection.js";
import type { GameState } from "../src/domain/types.js";

export const runUiGraphHintProjectionTests = (): void => {
  const nearness = resolveGraphTargetYLineNearness(0, 20);
  assert.equal(nearness.radius, 5, "radius formula uses max(3, |target|/4)");
  assert.equal(nearness.opacity01 >= 0 && nearness.opacity01 <= 1, true, "opacity clamps to [0,1]");

  const clampedLow = resolveGraphTargetYLineNearness(1000, 1);
  assert.equal(clampedLow.opacity01, 0, "opacity clamps to zero when far outside range");

  const clampedHigh = resolveGraphTargetYLineNearness(1, 1);
  assert.equal(clampedHigh.opacity01, 1, "opacity reaches one at zero distance");

  const base = initialState();
  const inRangeState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: toRationalCalculatorValue({ num: 0n, den: 1n }),
    },
    completedUnlockIds: [],
  };
  const inRangeHint = resolveGraphTargetYLineHint(inRangeState);
  assert.ok(inRangeHint, "projection resolves an unresolved total_equals target when in range");
  assert.equal(inRangeHint?.unlockId, "unlock_digit_1_installed_only_on_total_equals_1", "projection chooses deterministic smallest unlock id");

  const outOfRangeState: GameState = {
    ...inRangeState,
    calculator: {
      ...inRangeState.calculator,
      total: toRationalCalculatorValue({ num: 100n, den: 1n }),
    },
  };
  assert.equal(resolveGraphTargetYLineHint(outOfRangeState), null, "projection hides hint when no unresolved total_equals target is in range");
};

