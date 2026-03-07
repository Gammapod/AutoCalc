import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
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
      effect: { type: "unlock_digit", key: "4" },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Idigits",
    },
    {
      id: "u_slot_op",
      description: "slot op",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_slot_operator", key: "+" },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Oplus",
    },
    {
      id: "u_exec",
      description: "exec",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_execution", key: "=" },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Ut_exec_eq",
      targetLabel: "=",
    },
    {
      id: "u_slot_op_mul",
      description: "slot op mul",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_slot_operator", key: "*" },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Omul",
    },
    {
      id: "u_utility",
      description: "utility",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_utility", key: "C" },
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
  const mappedRows = buildUnlockRows(base, effectMappingCatalog);
  assert.deepEqual(
    mappedRows.map((row) => row.name),
    ["4", "+", "=", "×", "C", "maxTotalDigits", "λ++"],
    "row names map from unlock effect keys/variables",
  );

  const totalCriteriaCatalog: UnlockDefinition[] = [
    {
      id: "u_total_eq",
      description: "total eq",
      predicate: { type: "total_equals", value: 11n },
      effect: { type: "unlock_digit", key: "4" },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Idigits",
    },
    {
      id: "u_total_at_least",
      description: "total at least",
      predicate: { type: "total_at_least", value: 25n },
      effect: { type: "unlock_slot_operator", key: "-" },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Ominus",
    },
    {
      id: "u_total_at_most",
      description: "total at most",
      predicate: { type: "total_at_most", value: -1n },
      effect: { type: "unlock_utility", key: "CE" },
      once: true,
      domainNodeId: "NZ",
      targetNodeId: "Uce",
    },
  ];
  const totalCriteriaRows = buildUnlockRows(base, totalCriteriaCatalog);
  assert.equal(totalCriteriaRows[0]?.criteria.length, 1, "total_equals uses a single criterion checkbox");
  assert.equal(totalCriteriaRows[0]?.criteria[0]?.label, "11", "total_equals checkbox label is required value");
  assert.equal(totalCriteriaRows[1]?.criteria.length, 1, "total_at_least uses a single criterion checkbox");
  assert.equal(totalCriteriaRows[1]?.criteria[0]?.label, "25", "total_at_least checkbox label is threshold value");
  assert.equal(totalCriteriaRows[2]?.criteria.length, 1, "total_at_most uses a single criterion checkbox");
  assert.equal(totalCriteriaRows[2]?.criteria[0]?.label, "-1", "total_at_most checkbox label is threshold value");
  const totalCriteriaVisibleRows = buildVisibleChecklistRows(base, { catalog: totalCriteriaCatalog });
  assert.equal(
    totalCriteriaVisibleRows.some((row) => row.id === "u_total_at_most"),
    true,
    "TODO capability rows remain visible by checklist policy",
  );

  const difficultScopeCatalog: UnlockDefinition[] = [
    {
      id: "u_normal_scope",
      description: "normal scope row",
      predicate: { type: "total_at_least", value: 2n },
      effect: { type: "unlock_digit", key: "4" },
      once: true,
      difficulty: "normal",
      domainNodeId: "NN",
      targetNodeId: "Idigits",
    },
    {
      id: "u_difficult_scope",
      description: "difficult scope row",
      predicate: { type: "total_at_least", value: 2n },
      effect: { type: "unlock_slot_operator", key: "\u27E1" },
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
        "++": false,
        "=": true,
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        "+": true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        "1": true,
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
    catalog: unlockCatalog,
    includeDebugMeta: true,
  });
  assert.equal(
    typeof debugRows[0]?.analysisStatus === "string" && typeof debugRows[0]?.visibilityReason === "string",
    true,
    "debug mode includes analysis status and visibility reason metadata",
  );
};
