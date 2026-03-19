import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { applyUnlocks } from "../src/domain/unlocks.js";
import type { GameState } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runReducerUnlockTests = (): void => {
  const base = initialState();
  assert.equal(unlockCatalog.length, 1, "catalog is reduced to one unlock");
  assert.equal(base.unlocks.valueExpression[valueExpr("4")], false, "digit 4 starts locked");

  const before = applyUnlocks(
    {
      ...base,
      calculator: {
        ...base.calculator,
        total: r(3n),
      },
    },
    unlockCatalog,
  );
  assert.equal(before.unlocks.valueExpression[valueExpr("4")], false, "digit 4 remains locked before total=4");

  const atFour = applyUnlocks(
    {
      ...base,
      calculator: {
        ...base.calculator,
        total: r(4n),
      },
    },
    unlockCatalog,
  );
  assert.equal(atFour.unlocks.valueExpression[valueExpr("4")], true, "digit 4 unlocks at total=4");
  assert.equal(atFour.completedUnlockIds.includes("unlock_4_on_total_4"), true, "unlock id is recorded");

  const secondPass = applyUnlocks(atFour, unlockCatalog);
  const completionCount = secondPass.completedUnlockIds.filter((id) => id === "unlock_4_on_total_4").length;
  assert.equal(completionCount, 1, "unlock completion remains once-only");

  const fOnly: GameState = initialState();
  assert.equal(Boolean(fOnly.calculators?.f), true, "f calculator is initialized");
  assert.equal(Boolean(fOnly.calculators?.g), false, "g calculator is hidden/uninitialized at start");
};
