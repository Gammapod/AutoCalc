import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { analyzeNumberDomains, analyzeUnlockSpecRows } from "../src/domain/analysis.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, UnlockDefinition } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runNumberDomainAnalysisTests = (): void => {
  const base = initialState();

  const initialReport = analyzeNumberDomains(base, new Date("2026-02-28T00:00:00.000Z"));
  assert.equal(initialReport.unlockSpecAnalysis.length, unlockCatalog.length, "analysis covers all unlock rows");
  assert.equal(initialReport.generatedAtIso, "2026-02-28T00:00:00.000Z", "timestamp is preserved");

  const linearRow = initialReport.unlockSpecAnalysis.find((row) => row.unlockId === "unlock_4_on_linear_growth_run_7");
  assert.ok(linearRow, "linear-growth unlock row is present");
  assert.equal(
    ["possible", "blocked", "satisfied", "unknown", "todo"].includes(linearRow!.status),
    true,
    "unlock row has a valid status",
  );

  const atFourState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: r(4n),
    },
  };
  const rowsAtFour = analyzeUnlockSpecRows(atFourState, {}, unlockCatalog);
  assert.equal(rowsAtFour.length, unlockCatalog.length, "unlock row analysis returns every catalog row");
  assert.equal(
    rowsAtFour.some((row) => row.unlockId === "unlock_dec_on_total_at_least_10"),
    true,
    "analysis includes total-at-least unlock rows",
  );

  const unaryIncrementCatalog: UnlockDefinition[] = [
    {
      id: "fixture_total_at_least",
      description: "fixture",
      predicate: { type: "total_at_least", value: 1n },
      effect: { type: "unlock_digit", key: valueExpr("digit_1") },
      sufficientKeySets: [[valueExpr("digit_1")]],
      once: true,
      domainNodeId: "NN",
      targetNodeId: "fixture",
    },
  ];
  const unaryIncrementOnly: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      unaryOperators: {
        ...base.unlocks.unaryOperators,
        [uop("unary_inc")]: true,
      },
      execution: {
        ...base.unlocks.execution,
        [execution("exec_equals")]: true,
      },
    },
  };
  const unaryRows = analyzeUnlockSpecRows(unaryIncrementOnly, { useAllUnlockedKeys: true }, unaryIncrementCatalog);
  assert.equal(unaryRows[0]?.status, "possible", "unary ++ plus execute keeps step_plus_one capability");
};

