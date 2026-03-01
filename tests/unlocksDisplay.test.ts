import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { CHECKLIST_UNLOCK_ID, initialState } from "../src/domain/state.js";
import type { GameState, UnlockDefinition } from "../src/domain/types.js";
import { buildUnlockRows, isChecklistUnlocked } from "../src/ui/render.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));

export const runUnlocksDisplayTests = (): void => {
  const base = initialState();
  assert.equal(isChecklistUnlocked(base), false, "checklist drawer is locked when unlock id is absent");

  const checklistUnlockedState: GameState = {
    ...base,
    completedUnlockIds: [CHECKLIST_UNLOCK_ID],
  };
  assert.equal(isChecklistUnlocked(checklistUnlockedState), true, "checklist drawer is unlocked when unlock id is present");

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
  ];
  const mappedRows = buildUnlockRows(base, effectMappingCatalog);
  assert.deepEqual(
    mappedRows.map((row) => row.name),
    ["4", "+", "=", "×", "C", "maxTotalDigits"],
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

  const rollProgressState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      roll: [r(10n), r(11n), r(12n), r(13n)],
    },
  };
  const rollRow = buildUnlockRows(rollProgressState, unlockCatalog).find(
    (row) => row.id === "unlock_c_on_increment_run_4",
  );
  assert.equal(rollRow?.criteria.length, 1, "dynamic run predicates render a single criterion row");
  assert.deepEqual(
    rollRow?.criteria.map((criterion) => criterion.checked),
    [true],
    "incrementing run criterion checks true for [10,11,12,13] suffix",
  );

  const completedState: GameState = {
    ...rollProgressState,
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
  assert.deepEqual(
    rowsWhenDrawerUnlocked,
    rowsWhenDrawerLocked,
    "checklist row models are independent from checklist drawer visibility",
  );
};
