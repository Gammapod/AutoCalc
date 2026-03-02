import assert from "node:assert/strict";
import { analyzeNumberDomains } from "../src/domain/analysis.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { initialState } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

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
  assert.equal(
    initialReport.unlockSpecAnalysis.length,
    unlockCatalog.length,
    "spec analysis reports one row per unlock in catalog",
  );
  const initialTotal11 = initialReport.unlockSpecAnalysis.find((row) => row.unlockId === "unlock_storage_on_total_11");
  assert.equal(initialTotal11?.status, "possible", "overflow unlock is possible from initial config via spec capabilities");

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
        "+": true,
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
  const plusPressPossibleAllUnlocked = reportWithResetAndMinusAllUnlocked.unlockSpecAnalysis.find(
    (row) => row.unlockId === "unlock_1_on_plus_press_first",
  );
  assert.equal(
    plusPressPossibleAllUnlocked?.status,
    "possible",
    "all-unlocked scope marks plus-press unlock as possible when + is unlocked in config",
  );
  const plusPressBlockedKeypadOnly = reportWithResetAndMinus.unlockSpecAnalysis.find(
    (row) => row.unlockId === "unlock_1_on_plus_press_first",
  );
  assert.equal(
    plusPressBlockedKeypadOnly?.status,
    "blocked",
    "keypad-only scope blocks plus-press unlock when + is not present on keypad",
  );

  const highPositiveOnlyIncrement = withState(base, {
    calculator: {
      ...base.calculator,
      total: r(42n),
    },
  });
  const highPositiveReport = analyzeNumberDomains(highPositiveOnlyIncrement);
  assert.equal(highPositiveReport.naturalNumbers, false, "cannot prove reaching 1 from high positive with only ++");
  assert.equal(highPositiveReport.integersNonNatural, false, "cannot prove reaching non-natural integers");

  const currentOneOnlyIncrement = withState(base, {
    calculator: {
      ...base.calculator,
      total: r(1n),
    },
  });
  const currentOneReport = analyzeNumberDomains(currentOneOnlyIncrement);
  assert.equal(currentOneReport.naturalNumbers, true, "current total 1 plus ++ proves all naturals");

  const nonIntegerNoReset = withState(base, {
    calculator: {
      ...base.calculator,
      total: r(3n, 2n),
    },
  });
  const nonIntegerReport = analyzeNumberDomains(nonIntegerNoReset);
  assert.equal(nonIntegerReport.naturalNumbers, false, "non-integer anchor without reset is conservative false for naturals");
  assert.equal(nonIntegerReport.integersNonNatural, false, "non-integer anchor without reset is conservative false for integers");

  const bidirectionalFromIntegerAnchor: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: r(37n),
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
