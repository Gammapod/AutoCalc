import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import {
  resolveGraphTargetYLineHint,
  resolveGraphTargetYLineNearness,
  resolveGraphTrendBandHint,
} from "../src/ui/modules/visualizers/graphHintProjection.js";
import { resolveUnresolvedHintCandidates } from "../src/ui/modules/visualizers/hintProjectionShared.js";
import type { GameState, UnlockDefinition, UnlockPredicate } from "../src/domain/types.js";

const makeUnlock = (id: string, predicate: UnlockPredicate): UnlockDefinition => ({
  id,
  description: id,
  predicate,
  effect: { type: "unlock_digit", key: "digit_1" },
  sufficientKeySets: [],
  once: true,
  domainNodeId: "NN",
  targetNodeId: id,
});

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
  const selectionCatalog: UnlockDefinition[] = [
    makeUnlock("b_total_equals_4", { type: "total_equals", value: 4n }),
    makeUnlock("a_total_equals_3", { type: "total_equals", value: 3n }),
    makeUnlock("z_total_at_least_10", { type: "total_at_least", value: 10n }),
  ];
  const selection = resolveUnresolvedHintCandidates(inRangeState, ["total_equals"], selectionCatalog);
  assert.deepEqual(
    selection.map((candidate) => candidate.id),
    ["a_total_equals_3", "b_total_equals_4"],
    "shared hint candidate selection filters by type and returns deterministic id order",
  );

  const withCompleted: GameState = {
    ...inRangeState,
    completedUnlockIds: ["a_total_equals_3"],
  };
  const filteredSelection = resolveUnresolvedHintCandidates(withCompleted, ["total_equals"], selectionCatalog);
  assert.deepEqual(
    filteredSelection.map((candidate) => candidate.id),
    ["b_total_equals_4"],
    "shared hint candidate selection excludes completed unlocks",
  );

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

  const trendCatalog: UnlockDefinition[] = [
    makeUnlock("unlock_incrementing_trend_4", { type: "roll_ends_with_incrementing_run", length: 4, step: 1n }),
  ];
  const trendNearState: GameState = {
    ...base,
    settings: {
      ...base.settings,
      visualizer: "graph",
    },
    calculator: {
      ...base.calculator,
      rollEntries: [
        { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
        { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
        { y: toRationalCalculatorValue({ num: 3n, den: 1n }) },
      ],
    },
  };
  const trendFarState: GameState = {
    ...trendNearState,
    calculator: {
      ...trendNearState.calculator,
      rollEntries: [
        { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
        { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
      ],
    },
  };
  const nearTrend = resolveGraphTrendBandHint(trendNearState, trendCatalog);
  const farTrend = resolveGraphTrendBandHint(trendFarState, trendCatalog);
  assert.ok(nearTrend, "graph trend-band resolves when suffix progress exists for unresolved trend predicate");
  assert.ok(farTrend, "graph trend-band keeps partial visibility for lower suffix progress");
  assert.equal(
    (nearTrend?.opacity01 ?? 0) > (farTrend?.opacity01 ?? 0),
    true,
    "graph trend-band opacity increases with suffix progress",
  );
};
