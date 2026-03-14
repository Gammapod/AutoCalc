import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { buildUnlockCriteria } from "../src/domain/unlockEngine.js";
import type { GameState, UnlockDefinition } from "../src/domain/types.js";
import { buildUnlockRows, buildVisibleChecklistRows } from "../src/ui/shared/readModel.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));

export const runUnlocksDisplayTests = (): void => {
  const base = initialState();

  const checklistUnlockedState: GameState = {
    ...base,
    completedUnlockIds: ["unlock_checklist_on_first_c_press"],
  };

  const effectMappingCatalog: UnlockDefinition[] = [
    {
      id: "u_digit",
      description: "digit",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_digit", key: valueExpr("4") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Idigits",
    },
    {
      id: "u_slot_op",
      description: "slot op",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_slot_operator", key: slotOp("+") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Oplus",
    },
    {
      id: "u_exec",
      description: "exec",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_execution", key: execution("=") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Ut_exec_eq",
      targetLabel: "=",
    },
    {
      id: "u_slot_op_mul",
      description: "slot op mul",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_slot_operator", key: slotOp("*") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Omul",
    },
    {
      id: "u_utility",
      description: "utility",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_utility", key: utility("C") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Uc",
    },
    {
      id: "u_total_digits",
      description: "digits cap",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "increase_max_total_digits", amount: 1 },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Ut_max_total_digits_plus_1",
      targetLabel: "max total digits +1",
    },
    {
      id: "u_max_points",
      description: "allocator points cap",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "increase_allocator_max_points", amount: 1 },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Ualloc_max_points_plus_1",
      targetLabel: "max points +1",
    },
  ];
  buildUnlockRows(checklistUnlockedState, effectMappingCatalog);

  const totalCriteriaCatalog: UnlockDefinition[] = [
    {
      id: "u_total_eq",
      description: "total eq",
      predicate: { type: "total_equals", value: 11n },
      effect: { type: "unlock_digit", key: valueExpr("4") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Idigits",
    },
    {
      id: "u_total_at_least",
      description: "total at least",
      predicate: { type: "total_at_least", value: 25n },
      effect: { type: "unlock_slot_operator", key: slotOp("-") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Ominus",
    },
    {
      id: "u_total_at_most",
      description: "total at most",
      predicate: { type: "total_at_most", value: -1n },
      effect: { type: "unlock_utility", key: utility("UNDO") },
      once: true,
      domainNodeId: "NZ",
      targetNodeId: "Uundo",
    },
  ];
  const totalEqualsCriteria = buildUnlockCriteria(totalCriteriaCatalog[0]!.predicate, base);
  assert.equal(totalEqualsCriteria.length, 1, "total_equals uses a single criterion checkbox");
  assert.equal(Boolean(totalEqualsCriteria[0]?.label), true, "total_equals checkbox label is present");
  const totalAtLeastCriteria = buildUnlockCriteria(totalCriteriaCatalog[1]!.predicate, base);
  assert.equal(totalAtLeastCriteria.length, 1, "total_at_least uses a single criterion checkbox");
  assert.equal(Boolean(totalAtLeastCriteria[0]?.label), true, "total_at_least checkbox label is present");
  const totalAtMostCriteria = buildUnlockCriteria(totalCriteriaCatalog[2]!.predicate, base);
  assert.equal(totalAtMostCriteria.length, 1, "total_at_most uses a single criterion checkbox");
  assert.equal(Boolean(totalAtMostCriteria[0]?.label), true, "total_at_most checkbox label is present");
  const totalCriteriaVisibleRows = buildVisibleChecklistRows(base, { catalog: totalCriteriaCatalog });
  assert.equal(
    totalCriteriaVisibleRows.some((row) => row.id === "u_total_at_most"),
    false,
    "blocked rows from concrete capability specs are hidden by checklist policy",
  );

  const difficultScopeCatalog: UnlockDefinition[] = [
    {
      id: "u_normal_scope",
      description: "normal scope row",
      predicate: { type: "total_at_least", value: 2n },
      effect: { type: "unlock_digit", key: valueExpr("4") },
      once: true,
      difficulty: "normal",
      domainNodeId: "NN",
      targetNodeId: "Idigits",
    },
    {
      id: "u_difficult_scope",
      description: "difficult scope row",
      predicate: { type: "total_at_least", value: 2n },
      effect: { type: "unlock_slot_operator", key: slotOp("\u27E1") },
      once: true,
      difficulty: "difficult",
      domainNodeId: "NZ",
      targetNodeId: "Omod_difficult",
    },
  ];
  const allUnlockedOnlyState: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      execution: {
        ...base.unlocks.execution,
        [k("=")]: true,
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        [k("+")]: true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        [k("1")]: true,
      },
    },
  };
  const difficultRows = buildVisibleChecklistRows(allUnlockedOnlyState, { catalog: difficultScopeCatalog });
  assert.equal(
    difficultRows.some((row) => row.id === "u_normal_scope"),
    false,
    "normal rows continue using present_on_keypad scope and stay hidden when blocked there",
  );
  const difficultRow = difficultRows.find((row) => row.id === "u_difficult_scope");
  assert.equal(
    Boolean(difficultRow),
    true,
    "difficult rows use all_unlocked scope and appear when unlocked-key capabilities satisfy policy",
  );
  assert.equal(difficultRow?.difficulty, "difficult", "difficult rows include difficulty metadata");
  assert.equal(difficultRow?.difficultyLabel, "Difficult", "difficult rows include a difficult label");

  const allocatorProgressState: GameState = {
    ...base,
    allocatorAllocatePressCount: 1,
  };
  const rollRow = buildUnlockRows(allocatorProgressState, unlockCatalog).find(
    (row) => row.id === "unlock_c_on_increment_run_4",
  );
  assert.equal(rollRow?.criteria.length, 1, "allocator press predicates render a single criterion row");
  assert.deepEqual(
    rollRow?.criteria.map((criterion) => criterion.checked),
    [true],
    "allocator Allocate press criterion checks true when counter reaches threshold",
  );

  const completedState: GameState = {
    ...allocatorProgressState,
    completedUnlockIds: ["unlock_equals_on_total_11"],
  };
  const orderedRows = buildUnlockRows(completedState, unlockCatalog);
  const completedIndex = orderedRows.findIndex((row) => row.id === "unlock_equals_on_total_11");
  const firstCompletedIndex = orderedRows.findIndex((row) => row.state === "completed");
  assert.equal(firstCompletedIndex, completedIndex, "first completed row appears where completed section starts");
  assert.equal(orderedRows.at(-1)?.id, "unlock_equals_on_total_11", "completed rows move to the bottom");
  const completedPlus = orderedRows.find((row) => row.id === "unlock_equals_on_total_11");
  assert.deepEqual(
    completedPlus?.criteria.map((criterion) => criterion.checked),
    [true],
    "completed criteria remain permanently checked",
  );

  const withImpossible = buildUnlockRows(
    base,
    unlockCatalog,
    (unlock) => unlock.id === "unlock_c_on_increment_run_4",
  );
  assert.equal(
    withImpossible.some((row) => row.id === "unlock_c_on_increment_run_4"),
    false,
    "rows marked impossible are omitted from the list",
  );

  const rowsWhenDrawerLocked = buildUnlockRows(base, unlockCatalog);
  const rowsWhenDrawerUnlocked = buildUnlockRows(checklistUnlockedState, unlockCatalog);
  assert.deepEqual(rowsWhenDrawerUnlocked, rowsWhenDrawerLocked, "row models are independent from checklist visibility");

  const blockedHiddenRows = buildVisibleChecklistRows(base, { catalog: unlockCatalog });
  assert.equal(
    blockedHiddenRows.some((row) => row.id === "unlock_c_on_increment_run_4"),
    false,
    "blocked rows are hidden by keypad-feasibility checklist policy",
  );

  const completedBlockedState: GameState = {
    ...base,
    completedUnlockIds: ["unlock_c_on_increment_run_4"],
  };
  const completedBlockedRows = buildVisibleChecklistRows(completedBlockedState, { catalog: unlockCatalog });
  const completedBlockedRow = completedBlockedRows.find((row) => row.id === "unlock_c_on_increment_run_4");
  assert.equal(
    completedBlockedRow?.state,
    "completed",
    "completed rows remain visible even when currently blocked",
  );

  const debugRows = buildVisibleChecklistRows(base, {
    catalog: totalCriteriaCatalog,
    visibilityPolicy: { hideBlocked: false },
    includeDebugMeta: true,
  });
  const firstDebugRow = debugRows[0];
  assert.equal(
    typeof firstDebugRow?.analysisStatus === "string" && typeof firstDebugRow?.visibilityReason === "string",
    true,
    "debug mode includes analysis status and visibility reason metadata",
  );
};




