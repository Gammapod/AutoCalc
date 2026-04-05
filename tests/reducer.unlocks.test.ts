import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { applyKeyActionCore } from "../src/domain/reducer.input.core.js";
import { initialState, LAMBDA_POINTS_REFUNDED_SEEN_ID, LAMBDA_POINTS_SPENT_SEEN_ID } from "../src/domain/state.js";
import { applyUnlocks } from "../src/domain/unlocks.js";
import type { GameState } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runReducerUnlockTests = (): void => {
  const base = initialState();
  assert.ok(unlockCatalog.length >= 10, "catalog includes full progression chain");
  assert.equal(base.unlocks.valueExpression[valueExpr("digit_4")], false, "digit 4 starts locked");
  assert.equal(base.unlocks.slotOperators[op("op_add")], false, "+ starts locked");

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
  assert.equal(beforeLinearRun.unlocks.valueExpression[valueExpr("digit_4")], true, "digit 4 unlocks on linear run");
  assert.equal(beforeLinearRun.unlocks.slotOperators[op("op_add")], true, "+ unlocks on linear run");
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
  assert.equal(atTen.unlocks.unaryOperators[uop("unary_dec")], false, "-- does not unlock from total >= 10 alone");
  assert.equal(atTen.unlocks.unaryOperators[uop("unary_inc")], true, "++ unlocks at total >= 10");
  assert.equal(atTen.unlocks.utilities[utility("toggle_step_expansion")], true, "[ ??? ] unlocks at total >= 10");
  assert.equal(
    atTen.unlocks.execution[execution("exec_roll_inverse")],
    true,
    "roll inverse unlocks at total >= 10",
  );
  assert.equal(
    atTen.completedUnlockIds.includes("unlock_roll_inverse_on_undo_while_feed_visible"),
    true,
    "roll-inverse unlock id is recorded",
  );
  assert.equal(atTen.completedUnlockIds.includes("unlock_inc_on_total_at_least_10"), true, "++ unlock id is recorded");
  assert.equal(
    atTen.completedUnlockIds.includes("unlock_step_expansion_on_total_at_least_10"),
    true,
    "[ ??? ] unlock id is recorded",
  );
  assert.equal(
    atTen.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === uop("unary_inc")),
    true,
    "++ remains on keypad when unlocked",
  );
  assert.equal(
    atTen.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === utility("toggle_step_expansion")),
    false,
    "[ ??? ] does not auto-install on keypad when unlocked",
  );
  assert.equal(
    atTen.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === uop("unary_inc")),
    false,
    "++ is removed from storage when already installed on keypad",
  );
  assert.equal(
    atTen.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === utility("toggle_step_expansion")),
    true,
    "[ ??? ] remains in storage when unlocked but not pre-installed",
  );

  const withDecreasingPair = applyUnlocks(
    {
      ...base,
      calculator: {
        ...base.calculator,
        rollEntries: [{ y: r(5n) }, { y: r(4n) }],
      },
    },
    unlockCatalog,
  );
  assert.equal(
    withDecreasingPair.unlocks.unaryOperators[uop("unary_dec")],
    true,
    "-- unlocks when a roll entry is lower than the previous entry",
  );
  assert.equal(
    withDecreasingPair.completedUnlockIds.includes("unlock_dec_on_total_at_least_10"),
    true,
    "-- unlock id is recorded",
  );

  const withNegativeSlopeRun = applyUnlocks(
    {
      ...base,
      calculator: {
        ...base.calculator,
        rollEntries: [{ y: r(20n) }, { y: r(17n) }, { y: r(14n) }, { y: r(11n) }, { y: r(8n) }, { y: r(5n) }, { y: r(2n) }],
      },
    },
    unlockCatalog,
  );
  assert.equal(withNegativeSlopeRun.unlocks.slotOperators[op("op_sub")], true, "- unlocks on a run of 7 with negative slope");

  const memorySpendSeed: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      memory: {
        ...base.unlocks.memory,
        [memory("memory_adjust_plus")]: true,
      },
    },
    lambdaControl: {
      ...base.lambdaControl,
      maxPoints: base.lambdaControl.maxPoints + 1,
    },
  };
  const afterFirstLambdaSpend = applyKeyActionCore(memorySpendSeed, memory("memory_adjust_plus"));
  assert.equal(
    afterFirstLambdaSpend.completedUnlockIds.includes(LAMBDA_POINTS_SPENT_SEEN_ID),
    true,
    "first lambda spend records spent-marker unlock id",
  );
  assert.equal(
    afterFirstLambdaSpend.unlocks.memory[memory("memory_adjust_minus")],
    true,
    "first lambda spend unlocks memory adjust minus",
  );
  assert.equal(
    afterFirstLambdaSpend.unlocks.memory[memory("memory_cycle_variable")],
    false,
    "memory cycle variable remains locked until first lambda refund",
  );

  const withRefundMarker = applyUnlocks(
    {
      ...base,
      completedUnlockIds: [...base.completedUnlockIds, LAMBDA_POINTS_REFUNDED_SEEN_ID],
    },
    unlockCatalog,
  );
  assert.equal(
    withRefundMarker.unlocks.memory[memory("memory_cycle_variable")],
    true,
    "first lambda refund unlocks memory cycle variable",
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
  assert.equal(withError.unlocks.utilities[utility("util_clear_all")], true, "C unlocks when first error is seen");

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
  assert.equal(withFirstRationalResult.unlocks.slotOperators[op("op_euclid_div")], true, "# unlocks on first rational result");
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

    const powersOfTwoTail: GameState = {
    ...fOnly,
    calculator: {
      ...fOnly.calculator,
      rollEntries: [
        { y: r(1n) },
        { y: r(2n) },
        { y: r(4n) },
        { y: r(8n) },
        { y: r(16n) },
        { y: r(32n) },
        { y: r(64n) },
      ],
    },
  };
  const withG = applyUnlocks(powersOfTwoTail, unlockCatalog);
  assert.equal(Boolean(withG.calculators?.g), true, "g materializes once tail run of 7 is powers of 2");
  assert.equal(
    withG.completedUnlockIds.includes("unlock_calculator_g_on_tail_powers_of_two_run_7"),
    true,
    "g unlock completion is recorded",
  );

  const completedButMissingG: GameState = {
    ...fOnly,
    completedUnlockIds: [...new Set([...fOnly.completedUnlockIds, "unlock_calculator_g_on_tail_powers_of_two_run_7"])],
    calculators: {
      ...(fOnly.calculators ?? {}),
      g: undefined,
    },
    calculatorOrder: ["f"],
    activeCalculatorId: "f",
  };
  const repairedGFromCompletion = applyUnlocks(completedButMissingG, unlockCatalog);
  assert.equal(
    Boolean(repairedGFromCompletion.calculators?.g),
    true,
    "completed g unlock id re-materializes missing g calculator instance",
  );
  assert.deepEqual(
    repairedGFromCompletion.calculatorOrder,
    ["f", "g"],
    "re-materialized g is restored to calculator order",
  );

  const duplicateAndLockedStorage: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      execution: {
        ...base.unlocks.execution,
        [execution("exec_equals")]: true,
      },
      utilities: {
        ...base.unlocks.utilities,
        [utility("util_clear_all")]: true,
      },
    },
    ui: {
      ...base.ui,
      keyLayout: [
        { kind: "key", key: execution("exec_equals") },
        { kind: "placeholder", area: "empty" },
      ],
      keypadColumns: 2,
      keypadRows: 1,
      storageLayout: [
        { kind: "key", key: execution("exec_equals") },
        { kind: "key", key: op("op_max") },
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
    normalizedInventory.ui.keyLayout.filter((cell) => cell.kind === "key" && cell.key === execution("exec_equals")).length,
    1,
    "normalization keeps exactly one live instance of a key across keypad/storage",
  );
  assert.equal(
    normalizedInventory.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === execution("exec_equals")),
    false,
    "duplicate storage copy is removed when keypad instance has precedence",
  );
  assert.equal(
    normalizedInventory.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === op("op_max")),
    false,
    "storage strips keys that are still locked",
  );

  const unlockedMissingEverywhere: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      utilities: {
        ...base.unlocks.utilities,
        [utility("util_clear_all")]: true,
      },
    },
    ui: {
      ...base.ui,
      keyLayout: base.ui.keyLayout.map((cell) =>
        cell.kind === "key" && cell.key === utility("util_clear_all")
          ? { kind: "placeholder", area: "empty" as const }
          : cell,
      ),
      storageLayout: base.ui.storageLayout.map((cell) =>
        cell?.kind === "key" && cell.key === utility("util_clear_all") ? null : cell,
      ),
    },
  };
  const repairedUnlockedPresence = applyUnlocks(unlockedMissingEverywhere, []);
  assert.equal(
    repairedUnlockedPresence.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === utility("util_clear_all")),
    true,
    "missing unlocked key is auto-repaired into storage",
  );

  const sandboxBypassSeed: GameState = {
    ...base,
    ui: {
      ...base.ui,
      buttonFlags: {
        ...base.ui.buttonFlags,
        "mode.sandbox": true,
      },
    },
    calculator: {
      ...base.calculator,
      total: r(10n),
      rollEntries: Array.from({ length: 7 }, (_, index) => ({ y: r(BigInt(index)) })),
    },
  };
  const sandboxBypassResult = applyUnlocks(sandboxBypassSeed, unlockCatalog);
  assert.equal(
    sandboxBypassResult.unlocks.unaryOperators[uop("unary_inc")],
    base.unlocks.unaryOperators[uop("unary_inc")],
    "sandbox mode bypass keeps unlock booleans unchanged",
  );
  assert.deepEqual(
    sandboxBypassResult.completedUnlockIds,
    base.completedUnlockIds,
    "sandbox mode bypass does not mutate unlock completion ids",
  );
};


