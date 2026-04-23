import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import type { GameState, UnlockDefinition, UnlockPredicate } from "../src/domain/types.js";
import {
  resolveFeedCycleDiameterHint,
  resolveFeedCycleLengthHint,
} from "../src/ui/modules/visualizers/feedHintProjection.js";

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

export const runUiFeedHintProjectionTests = (): void => {
  const base = initialState();
  const withCycle: GameState = {
    ...base,
    settings: {
      ...base.settings,
      visualizer: "feed",
    },
    calculator: {
      ...base.calculator,
      rollEntries: [
        { y: toRationalCalculatorValue({ num: 0n, den: 1n }) },
        { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
        { y: toRationalCalculatorValue({ num: 5n, den: 1n }) },
        { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
        { y: toRationalCalculatorValue({ num: 5n, den: 1n }) },
        { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
      ],
      rollAnalysis: {
        stopReason: "cycle",
        cycle: { i: 3, j: 3, transientLength: 3, periodLength: 2 },
      },
    },
  };

  const catalog: UnlockDefinition[] = [
    makeUnlock("a_period_4", { type: "roll_cycle_period_at_least", length: 4 }),
    makeUnlock("b_diameter_6", { type: "roll_cycle_diameter_at_least", diameter: 6n }),
  ];

  const lengthHint = resolveFeedCycleLengthHint(withCycle, catalog);
  assert.ok(lengthHint, "feed cycle-length hint resolves when cycle metadata is available and unresolved period target exists");
  assert.equal(lengthHint?.startX, 3, "cycle-length hint starts at the active cycle span start index");
  assert.equal(lengthHint?.endX, 5, "cycle-length hint ends at the latest cycle row index");
  assert.equal((lengthHint?.opacity01 ?? 0) > 0, true, "cycle-length hint opacity is non-zero when there is progress");

  const diameterHint = resolveFeedCycleDiameterHint(withCycle, catalog);
  assert.ok(diameterHint, "feed cycle-diameter hint resolves for unresolved diameter predicate on an active cycle span");
  assert.equal(diameterHint?.minX, 3, "cycle-diameter hint anchors min marker to the minimum y row index within the cycle span");
  assert.equal(diameterHint?.maxX, 4, "cycle-diameter hint anchors max marker to the maximum y row index within the cycle span");
  assert.equal((diameterHint?.opacity01 ?? 0) > 0, true, "cycle-diameter hint opacity is non-zero when diameter progress exists");

  const noCycleState: GameState = {
    ...withCycle,
    calculator: {
      ...withCycle.calculator,
      rollAnalysis: {
        stopReason: "none",
        cycle: null,
      },
    },
  };
  assert.equal(
    resolveFeedCycleLengthHint(noCycleState, catalog),
    null,
    "feed cycle-length hint is hidden when cycle metadata is unavailable",
  );
  assert.equal(
    resolveFeedCycleDiameterHint(noCycleState, catalog),
    null,
    "feed cycle-diameter hint is hidden when cycle metadata is unavailable",
  );
};
