import assert from "node:assert/strict";
import { analyzeNumberDomains } from "../src/domain/analysis.js";
import { initialState } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";

const withState = (state: GameState, partial: Partial<GameState>): GameState => ({
  ...state,
  ...partial,
});

export const runNumberDomainAnalysisTests = (): void => {
  const base = initialState();

  const initialReport = analyzeNumberDomains(base, new Date("2026-02-28T00:00:00.000Z"));
  assert.equal(initialReport.naturalNumbers, true, "initial state can prove natural numbers via ++ from 0");
  assert.equal(initialReport.integersNonNatural, false, "initial state cannot prove non-natural integers");
  assert.equal(initialReport.generatedAtIso, "2026-02-28T00:00:00.000Z", "report uses provided timestamp");

  const withResetAndMinus: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      valueExpression: {
        ...base.unlocks.valueExpression,
        "1": true,
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        "-": true,
      },
      utilities: {
        ...base.unlocks.utilities,
        C: true,
      },
      execution: {
        ...base.unlocks.execution,
        "=": true,
      },
    },
  };
  const reportWithResetAndMinus = analyzeNumberDomains(withResetAndMinus);
  assert.equal(
    reportWithResetAndMinus.naturalNumbers,
    true,
    "default scope still proves naturals via ++ present on keypad",
  );
  assert.equal(
    reportWithResetAndMinus.integersNonNatural,
    false,
    "default scope ignores unlocked-but-not-present keys for integer analysis",
  );

  const reportWithResetAndMinusAllUnlocked = analyzeNumberDomains(withResetAndMinus, new Date(), {
    useAllUnlockedKeys: true,
  });
  assert.equal(
    reportWithResetAndMinusAllUnlocked.naturalNumbers,
    true,
    "all-unlocked scope keeps natural numbers reachable",
  );
  assert.equal(
    reportWithResetAndMinusAllUnlocked.integersNonNatural,
    true,
    "all-unlocked scope enables non-natural integer proof",
  );

  const highPositiveOnlyIncrement = withState(base, {
    calculator: {
      ...base.calculator,
      total: { num: 42n, den: 1n },
    },
  });
  const highPositiveReport = analyzeNumberDomains(highPositiveOnlyIncrement);
  assert.equal(highPositiveReport.naturalNumbers, false, "cannot prove reaching 1 from high positive with only ++");
  assert.equal(highPositiveReport.integersNonNatural, false, "cannot prove reaching non-natural integers");

  const currentOneOnlyIncrement = withState(base, {
    calculator: {
      ...base.calculator,
      total: { num: 1n, den: 1n },
    },
  });
  const currentOneReport = analyzeNumberDomains(currentOneOnlyIncrement);
  assert.equal(currentOneReport.naturalNumbers, true, "current total 1 plus ++ proves all naturals");

  const nonIntegerNoReset = withState(base, {
    calculator: {
      ...base.calculator,
      total: { num: 3n, den: 2n },
    },
  });
  const nonIntegerReport = analyzeNumberDomains(nonIntegerNoReset);
  assert.equal(nonIntegerReport.naturalNumbers, false, "non-integer anchor without reset is conservative false for naturals");
  assert.equal(nonIntegerReport.integersNonNatural, false, "non-integer anchor without reset is conservative false for integers");

  const bidirectionalFromIntegerAnchor: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: { num: 37n, den: 1n },
    },
    unlocks: {
      ...base.unlocks,
      valueExpression: {
        ...base.unlocks.valueExpression,
        "1": true,
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        "-": true,
      },
      execution: {
        ...base.unlocks.execution,
        "=": true,
      },
    },
  };
  const bidirectionalReport = analyzeNumberDomains(bidirectionalFromIntegerAnchor, new Date(), {
    useAllUnlockedKeys: true,
  });
  assert.equal(bidirectionalReport.naturalNumbers, true, "bidirectional walk from integer anchor proves naturals");
  assert.equal(bidirectionalReport.integersNonNatural, true, "bidirectional walk from integer anchor proves integers");

  assert.equal(
    reportWithResetAndMinus.reasoning[0],
    "scope=present_on_keypad",
    "default reasoning reports keypad-only scope",
  );
  assert.equal(
    reportWithResetAndMinusAllUnlocked.reasoning[0],
    "scope=all_unlocked",
    "all-unlocked reasoning reports unlocked scope",
  );

  assert.equal(
    highPositiveReport.reasoning.some((line) => line.includes("canReachOne")),
    true,
    "reasoning includes canReachOne when naturals are false",
  );
  assert.equal(
    highPositiveReport.reasoning.some((line) => line.includes("canReachZero")),
    true,
    "reasoning includes canReachZero when integers are false",
  );
};
