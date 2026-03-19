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
  assert.ok(unlockCatalog.length >= 10, "catalog includes full progression chain");
  assert.equal(base.unlocks.valueExpression[valueExpr("4")], false, "digit 4 starts locked");
  assert.equal(base.unlocks.slotOperators[op("+")], false, "+ starts locked");

  const beforeLinearRun = applyUnlocks(
    {
      ...base,
      calculator: {
        ...base.calculator,
        rollEntries: Array.from({ length: 12 }, (_, index) => ({
          y: r(BigInt(index * 2)),
          d1: index === 0 ? null : { num: 2n, den: 1n },
          r1: index === 0 ? null : { num: 1n, den: 1n },
        })),
      },
    },
    unlockCatalog,
  );
  assert.equal(beforeLinearRun.unlocks.valueExpression[valueExpr("4")], true, "digit 4 unlocks on linear run");
  assert.equal(beforeLinearRun.unlocks.slotOperators[op("+")], true, "+ unlocks on linear run");
  assert.equal(
    beforeLinearRun.completedUnlockIds.includes("unlock_4_on_linear_growth_run_7"),
    true,
    "linear-run digit unlock id is recorded",
  );
  assert.equal(
    beforeLinearRun.completedUnlockIds.includes("unlock_plus_on_linear_growth_run_7"),
    true,
    "linear-run plus unlock id is recorded",
  );

  const atTen = applyUnlocks(
    {
      ...base,
      calculator: {
        ...base.calculator,
        total: r(10n),
      },
    },
    unlockCatalog,
  );
  assert.equal(atTen.unlocks.unaryOperators[uop("--")], true, "-- unlocks at total >= 10");
  assert.equal(atTen.unlocks.unaryOperators[uop("++")], true, "++ unlocks at total >= 10");
  assert.equal(atTen.unlocks.execution[execution("=")], true, "= unlocks at total >= 10");
  assert.equal(atTen.completedUnlockIds.includes("unlock_dec_on_total_at_least_10"), true, "-- unlock id is recorded");
  assert.equal(atTen.completedUnlockIds.includes("unlock_inc_on_total_at_least_10"), true, "++ unlock id is recorded");
  assert.equal(atTen.completedUnlockIds.includes("unlock_equals_on_total_at_least_10"), true, "= unlock id is recorded");
  assert.equal(
    atTen.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === uop("++")),
    true,
    "++ remains on keypad when unlocked",
  );
  assert.equal(
    atTen.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === execution("=")),
    true,
    "= remains on keypad when unlocked",
  );
  assert.equal(
    atTen.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === uop("++")),
    false,
    "++ is removed from storage when already installed on keypad",
  );
  assert.equal(
    atTen.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === execution("=")),
    false,
    "= keyed storage variants are removed when = is already installed on keypad",
  );

  const withError = applyUnlocks(
    {
      ...base,
      calculator: {
        ...base.calculator,
        rollEntries: [{ y: r(0n), error: { code: "n/0", kind: "division_by_zero" } }],
      },
    },
    unlockCatalog,
  );
  assert.equal(withError.unlocks.utilities[utility("C")], true, "C unlocks when first error is seen");

  const withFirstRationalResult = applyUnlocks(
    {
      ...base,
      calculator: {
        ...base.calculator,
        rollEntries: [{ y: r(3n, 2n) }],
      },
    },
    unlockCatalog,
  );
  assert.equal(withFirstRationalResult.unlocks.slotOperators[op("#")], true, "# unlocks on first rational result");
  assert.equal(
    withFirstRationalResult.completedUnlockIds.includes("unlock_euclid_div_on_first_rational_result"),
    true,
    "euclidean-division unlock id is recorded",
  );

  const secondPass = applyUnlocks(beforeLinearRun, unlockCatalog);
  const completionCount = secondPass.completedUnlockIds.filter((id) => id === "unlock_4_on_linear_growth_run_7").length;
  assert.equal(completionCount, 1, "unlock completion remains once-only");

  const fOnly: GameState = initialState();
  assert.equal(Boolean(fOnly.calculators?.f), true, "f calculator is initialized");
  assert.equal(Boolean(fOnly.calculators?.g), false, "g calculator is hidden/uninitialized at start");

  const withAddAndMulUnlocked: GameState = {
    ...fOnly,
    unlocks: {
      ...fOnly.unlocks,
      slotOperators: {
        ...fOnly.unlocks.slotOperators,
        [op("+")]: true,
        [op("*")]: true,
      },
    },
  };
  const withG = applyUnlocks(withAddAndMulUnlocked, unlockCatalog);
  assert.equal(Boolean(withG.calculators?.g), true, "g materializes once + and × are unlocked");
  assert.equal(
    withG.completedUnlockIds.includes("unlock_calculator_g_on_add_and_mul"),
    true,
    "g unlock completion is recorded",
  );

  const duplicateAndLockedStorage: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      execution: {
        ...base.unlocks.execution,
        [execution("=")]: true,
      },
      utilities: {
        ...base.unlocks.utilities,
        [utility("C")]: true,
      },
    },
    ui: {
      ...base.ui,
      keyLayout: [
        { kind: "key", key: execution("=") },
        { kind: "placeholder", area: "empty" },
      ],
      keypadColumns: 2,
      keypadRows: 1,
      storageLayout: [
        { kind: "key", key: execution("=") },
        { kind: "key", key: op("MAX") },
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    },
  };
  const normalizedInventory = applyUnlocks(duplicateAndLockedStorage, []);
  assert.equal(
    normalizedInventory.ui.keyLayout.filter((cell) => cell.kind === "key" && cell.key === execution("=")).length,
    1,
    "normalization keeps exactly one live instance of a key across keypad/storage",
  );
  assert.equal(
    normalizedInventory.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === execution("=")),
    false,
    "duplicate storage copy is removed when keypad instance has precedence",
  );
  assert.equal(
    normalizedInventory.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === op("MAX")),
    false,
    "storage strips keys that are still locked",
  );

  const unlockedMissingEverywhere: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      utilities: {
        ...base.unlocks.utilities,
        [utility("C")]: true,
      },
    },
    ui: {
      ...base.ui,
      keyLayout: base.ui.keyLayout.map((cell) =>
        cell.kind === "key" && cell.key === utility("C")
          ? { kind: "placeholder", area: "empty" as const }
          : cell,
      ),
      storageLayout: base.ui.storageLayout.map((cell) =>
        cell?.kind === "key" && cell.key === utility("C") ? null : cell,
      ),
    },
  };
  const repairedUnlockedPresence = applyUnlocks(unlockedMissingEverywhere, []);
  assert.equal(
    repairedUnlockedPresence.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === utility("C")),
    true,
    "missing unlocked key is auto-repaired into storage",
  );
};
