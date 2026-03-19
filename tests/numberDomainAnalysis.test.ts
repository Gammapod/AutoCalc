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

  const onlyRow = initialReport.unlockSpecAnalysis.find((row) => row.unlockId === "unlock_4_on_total_4");
  assert.ok(onlyRow, "single unlock row is present");
  assert.equal(["possible", "blocked", "satisfied", "unknown", "todo"].includes(onlyRow!.status), true, "unlock row has a valid status");

  const atFourState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: r(4n),
    },
  };
  const rowsAtFour = analyzeUnlockSpecRows(atFourState, {}, unlockCatalog);
  assert.equal(rowsAtFour[0]?.status === "satisfied" || rowsAtFour[0]?.status === "possible", true, "total=4 makes the unlock satisfiable");

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
        [execution("=")]: true,
      },
    },
  };
  const unaryRows = analyzeUnlockSpecRows(unaryIncrementOnly, { useAllUnlockedKeys: true }, unaryIncrementCatalog);
  assert.equal(unaryRows[0]?.status, "possible", "unary ++ plus execute keeps step_plus_one capability");
};
