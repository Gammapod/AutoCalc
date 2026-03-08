import type { Key } from "../domain/types.js";

export type KeyLockModel = "always_unlocked" | "unlockable";
export type UnlockPathPolicy = "catalog" | "none_planned";

export type KeyPrimaryExpectationKind =
  | "digit_sets_drafting_operand"
  | "operator_starts_drafting"
  | "neg_toggles_pending_sign"
  | "c_resets_calculator"
  | "ce_clears_entry"
  | "backspace_deletes_last_input"
  | "undo_pops_roll"
  | "graph_counts_only"
  | "equals_executes_drafted_plus_one"
  | "increment_increases_total"
  | "decrement_decreases_total"
  | "pause_counts_only"
  | "memory_recall_sets_input"
  | "memory_adjusts_allocator";

export type KeyEdgeExpectationKind =
  | "digit_replaces_full_operand_digit"
  | "operator_replaces_empty_drafting_operator"
  | "neg_toggles_drafting_sign"
  | "c_checklist_recorded_once"
  | "ce_preserves_total_when_clearing"
  | "backspace_noop_when_nothing_to_delete"
  | "undo_noop_when_roll_empty"
  | "graph_does_not_mutate_calculator_state"
  | "equals_division_by_zero_sets_nan"
  | "increment_clears_pending_negative"
  | "decrement_clears_pending_negative"
  | "pause_does_not_mutate_calculator_state"
  | "memory_recall_noop_on_active_roll"
  | "memory_adjust_noop_without_budget_or_bounds";

export type KeyBehaviorSpec = {
  key: Key;
  lockModel: KeyLockModel;
  unlockPathPolicy?: UnlockPathPolicy;
  primaryExpectation: KeyPrimaryExpectationKind;
  edgeCaseExpectation: KeyEdgeExpectationKind;
};

const d = (key: Key): KeyBehaviorSpec => ({
  key,
  lockModel: "unlockable",
  unlockPathPolicy: key === "0" || key === "1" || key === "4" ? "catalog" : "none_planned",
  primaryExpectation: "digit_sets_drafting_operand",
  edgeCaseExpectation: "digit_replaces_full_operand_digit",
});

const op = (key: Key): KeyBehaviorSpec => ({
  key,
  lockModel: "unlockable",
  unlockPathPolicy: key === "+" || key === "-" ? "catalog" : "none_planned",
  primaryExpectation: "operator_starts_drafting",
  edgeCaseExpectation: "operator_replaces_empty_drafting_operator",
});

export const keyBehaviorCatalog: KeyBehaviorSpec[] = [
  d("0"),
  d("1"),
  d("2"),
  d("3"),
  d("4"),
  d("5"),
  d("6"),
  d("7"),
  d("8"),
  d("9"),
  d("pi"),
  d("e"),
  {
    key: "NEG",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "neg_toggles_pending_sign",
    edgeCaseExpectation: "neg_toggles_drafting_sign",
  },
  op("+"),
  op("-"),
  op("*"),
  op("/"),
  op("#"),
  op("\u27E1"),
  {
    key: "C",
    lockModel: "unlockable",
    unlockPathPolicy: "catalog",
    primaryExpectation: "c_resets_calculator",
    edgeCaseExpectation: "c_checklist_recorded_once",
  },
  {
    key: "CE",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "ce_clears_entry",
    edgeCaseExpectation: "ce_preserves_total_when_clearing",
  },
  {
    key: "\u2190",
    lockModel: "unlockable",
    unlockPathPolicy: "catalog",
    primaryExpectation: "backspace_deletes_last_input",
    edgeCaseExpectation: "backspace_noop_when_nothing_to_delete",
  },
  {
    key: "UNDO",
    lockModel: "unlockable",
    unlockPathPolicy: "catalog",
    primaryExpectation: "undo_pops_roll",
    edgeCaseExpectation: "undo_noop_when_roll_empty",
  },
  {
    key: "\u03B1,\u03B2,\u03B3",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: "M+",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "memory_adjusts_allocator",
    edgeCaseExpectation: "memory_adjust_noop_without_budget_or_bounds",
  },
  {
    key: "M\u2013",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "memory_adjusts_allocator",
    edgeCaseExpectation: "memory_adjust_noop_without_budget_or_bounds",
  },
  {
    key: "M\u2192",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "memory_recall_sets_input",
    edgeCaseExpectation: "memory_recall_noop_on_active_roll",
  },
  {
    key: "GRAPH",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: "FEED",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: "CIRCLE",
    lockModel: "always_unlocked",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: "\u03BB",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: "=",
    lockModel: "unlockable",
    unlockPathPolicy: "catalog",
    primaryExpectation: "equals_executes_drafted_plus_one",
    edgeCaseExpectation: "equals_division_by_zero_sets_nan",
  },
  {
    key: "++",
    lockModel: "always_unlocked",
    primaryExpectation: "increment_increases_total",
    edgeCaseExpectation: "increment_clears_pending_negative",
  },
  {
    key: "--",
    lockModel: "unlockable",
    unlockPathPolicy: "catalog",
    primaryExpectation: "decrement_decreases_total",
    edgeCaseExpectation: "decrement_clears_pending_negative",
  },
  {
    key: "\u23EF",
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "pause_counts_only",
    edgeCaseExpectation: "pause_does_not_mutate_calculator_state",
  },
];
