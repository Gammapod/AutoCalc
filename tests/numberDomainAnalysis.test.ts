import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { analyzeNumberDomains, analyzeUnlockSpecRows } from "../src/domain/analysis.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, UnlockDefinition } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

const withState = (state: GameState, partial: Partial<GameState>): GameState => ({
  ...state,
  ...partial,
});

export const runNumberDomainAnalysisTests = (): void => {
  const base = initialState();

  const initialReport = analyzeNumberDomains(base, new Date("2026-02-28T00:00:00.000Z"));
  assert.equal(typeof initialReport.naturalNumbers, "boolean", "initial report exposes natural-number reachability");
  assert.equal(initialReport.integersNonNatural, false, "initial state cannot prove non-natural integers");
  assert.equal(initialReport.generatedAtIso, "2026-02-28T00:00:00.000Z", "report uses provided timestamp");
  assert.equal(
    initialReport.unlockSpecAnalysis.length,
    unlockCatalog.length,
    "spec analysis reports one row per unlock in catalog",
  );
  const initialEqualsUnlock = initialReport.unlockSpecAnalysis.find((row) => row.unlockId === "unlock_equals_on_total_11");
  assert.equal(initialEqualsUnlock?.status, "blocked", "equals unlock is blocked until allocator progression enables column growth");

  const withResetAndMinus: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      valueExpression: {
        ...base.unlocks.valueExpression,
        ...valueExpressionUnlockPatch([["1", true]]),
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        ...slotOperatorUnlockPatch([["+", true], ["-", true]]),
      },
      utilities: {
        ...base.unlocks.utilities,
        ...utilityUnlockPatch([["C", true]]),
      },
      execution: {
        ...base.unlocks.execution,
        ...executionUnlockPatch([["=", true]]),
      },
    },
  };
  const reportWithResetAndMinus = analyzeNumberDomains(withResetAndMinus);
  assert.equal(typeof reportWithResetAndMinus.naturalNumbers, "boolean", "default scope computes naturals reachability");
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
  const oneUnlockPossibleAllUnlocked = reportWithResetAndMinusAllUnlocked.unlockSpecAnalysis.find(
    (row) => row.unlockId === "unlock_1_on_plus_press_first",
  );
  assert.equal(
    oneUnlockPossibleAllUnlocked?.status,
    "possible",
    "all-unlocked scope marks total>=9 unlock as possible via increment path",
  );
  const oneUnlockPossibleKeypadOnly = reportWithResetAndMinus.unlockSpecAnalysis.find(
    (row) => row.unlockId === "unlock_1_on_plus_press_first",
  );
  assert.ok(oneUnlockPossibleKeypadOnly, "keypad-only scope returns analysis row for total>=9 unlock");

  const highPositiveOnlyIncrement = withState(base, {
    calculator: {
      ...base.calculator,
      total: r(42n),
    },
  });
  const highPositiveReport = analyzeNumberDomains(highPositiveOnlyIncrement);
  assert.equal(typeof highPositiveReport.naturalNumbers, "boolean", "high positive report computes naturals reachability");
  assert.equal(highPositiveReport.integersNonNatural, false, "cannot prove reaching non-natural integers");

  const currentOneOnlyIncrement = withState(base, {
    calculator: {
      ...base.calculator,
      total: r(1n),
    },
  });
  const currentOneReport = analyzeNumberDomains(currentOneOnlyIncrement);
  assert.equal(typeof currentOneReport.naturalNumbers, "boolean", "current total report computes naturals reachability");

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
        ...valueExpressionUnlockPatch([["1", true]]),
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        ...slotOperatorUnlockPatch([["-", true]]),
      },
      execution: {
        ...base.unlocks.execution,
        ...executionUnlockPatch([["=", true]]),
      },
    },
  };
  const bidirectionalReport = analyzeNumberDomains(bidirectionalFromIntegerAnchor, new Date(), {
    useAllUnlockedKeys: true,
  });
  assert.equal(typeof bidirectionalReport.naturalNumbers, "boolean", "bidirectional report computes naturals reachability");
  assert.equal(typeof bidirectionalReport.integersNonNatural, "boolean", "bidirectional report computes integer reachability");

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

  const reportWithScopeOverride = analyzeNumberDomains(withResetAndMinus, new Date(), {
    useAllUnlockedKeys: true,
    capabilityScope: "present_on_keypad",
  });
  assert.equal(
    reportWithScopeOverride.reasoning[0],
    "scope=present_on_keypad",
    "capabilityScope overrides legacy useAllUnlockedKeys when both are provided",
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

  const unaryIncrementOnly: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      unaryOperators: {
        ...base.unlocks.unaryOperators,
        [uop("++")]: true,
      },
      execution: {
        ...base.unlocks.execution,
        ...executionUnlockPatch([["=", true]]),
      },
    },
  };
  const unaryIncrementCatalog: UnlockDefinition[] = [
    {
      id: "fixture_total_at_least",
      description: "fixture",
      predicate: { type: "total_at_least", value: 1n },
      effect: { type: "unlock_digit", key: valueExpr("1") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "fixture",
    },
  ];
  const unaryIncrementRows = analyzeUnlockSpecRows(unaryIncrementOnly, { useAllUnlockedKeys: true }, unaryIncrementCatalog);
  assert.equal(unaryIncrementRows[0]?.status, "possible", "unary ++ plus execute satisfies step_plus_one capability");

  const unaryDecrementOnly: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      unaryOperators: {
        ...base.unlocks.unaryOperators,
        [uop("--")]: true,
      },
      execution: {
        ...base.unlocks.execution,
        ...executionUnlockPatch([["=", true]]),
      },
    },
  };
  const unaryDecrementCatalog: UnlockDefinition[] = [
    {
      id: "fixture_total_at_most",
      description: "fixture",
      predicate: { type: "total_at_most", value: -1n },
      effect: { type: "unlock_digit", key: valueExpr("1") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "fixture",
    },
  ];
  const unaryDecrementRows = analyzeUnlockSpecRows(unaryDecrementOnly, { useAllUnlockedKeys: true }, unaryDecrementCatalog);
  assert.equal(unaryDecrementRows[0]?.status, "possible", "unary -- plus execute satisfies step_minus_one capability");

  const unaryNegateOnly: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      unaryOperators: {
        ...base.unlocks.unaryOperators,
        [uop("-n")]: true,
      },
      execution: {
        ...base.unlocks.execution,
        ...executionUnlockPatch([["=", true]]),
      },
    },
  };
  const alternatingSignCatalog: UnlockDefinition[] = [
    {
      id: "fixture_alt_sign",
      description: "fixture",
      predicate: { type: "roll_ends_with_alternating_sign_constant_abs_run", length: 3 },
      effect: { type: "unlock_digit", key: valueExpr("1") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "fixture",
    },
  ];
  const alternatingRows = analyzeUnlockSpecRows(unaryNegateOnly, { useAllUnlockedKeys: true }, alternatingSignCatalog);
  assert.equal(
    alternatingRows[0]?.status,
    "possible",
    "unary -n plus execute makes alternating-sign constant-abs capability available",
  );

  const unaryOnlyBinaryFormCatalog: UnlockDefinition[] = [
    {
      id: "fixture_roll_contains_value",
      description: "fixture",
      predicate: {
        type: "roll_contains_value",
        value: 1n,
      },
      effect: { type: "unlock_digit", key: valueExpr("1") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "fixture",
    },
  ];
  const unaryOnlyRows = analyzeUnlockSpecRows(unaryIncrementOnly, { useAllUnlockedKeys: true }, unaryOnlyBinaryFormCatalog);
  assert.equal(
    unaryOnlyRows[0]?.status,
    "blocked",
    "form_operator_plus_operand stays binary-only when only unary operators are unlocked",
  );
};

