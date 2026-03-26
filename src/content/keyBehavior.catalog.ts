import { KEY_ID } from "../domain/keyPresentation.js";
import type { Key } from "../domain/types.js";

export type KeyLockModel = "always_unlocked" | "unlockable";
export type UnlockPathPolicy = "catalog" | "none_planned";

export type KeyPrimaryExpectationKind =
  | "digit_sets_drafting_operand"
  | "operator_starts_drafting"
  | "unary_operator_inserts_pair"
  | "c_resets_calculator"
  | "backspace_deletes_last_input"
  | "undo_pops_roll"
  | "graph_counts_only"
  | "equals_toggles_auto_step_mode"
  | "roll_inverse_executes_predecessor"
  | "memory_recall_sets_input"
  | "memory_adjusts_allocator"
  | "system_key_requests_mode_transition"
  | "system_key_requests_quit";

export type KeyEdgeExpectationKind =
  | "digit_replaces_full_operand_digit"
  | "operator_replaces_empty_drafting_operator"
  | "unary_operator_clears_active_roll_then_inserts_pair"
  | "c_checklist_recorded_once"
  | "backspace_noop_when_nothing_to_delete"
  | "undo_noop_when_roll_empty"
  | "graph_does_not_mutate_calculator_state"
  | "equals_toggle_division_by_zero_sets_nan"
  | "roll_inverse_rejects_on_error"
  | "memory_recall_noop_on_active_roll"
  | "memory_adjust_noop_without_budget_or_bounds"
  | "system_key_leaves_domain_state_unchanged";

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
  unlockPathPolicy: key === KEY_ID.digit_0 || key === KEY_ID.digit_1 || key === KEY_ID.digit_4 ? "catalog" : "none_planned",
  primaryExpectation: "digit_sets_drafting_operand",
  edgeCaseExpectation: "digit_replaces_full_operand_digit",
});

const op = (key: Key): KeyBehaviorSpec => ({
  key,
  lockModel: "unlockable",
  unlockPathPolicy: key === KEY_ID.op_add || key === KEY_ID.op_sub || key === KEY_ID.op_pow ? "catalog" : "none_planned",
  primaryExpectation: "operator_starts_drafting",
  edgeCaseExpectation: "operator_replaces_empty_drafting_operator",
});

const unary = (key: Key): KeyBehaviorSpec => ({
  key,
  lockModel: "unlockable",
  unlockPathPolicy: "none_planned",
  primaryExpectation: "unary_operator_inserts_pair",
  edgeCaseExpectation: "unary_operator_clears_active_roll_then_inserts_pair",
});

export const keyBehaviorCatalog: KeyBehaviorSpec[] = [
  d(KEY_ID.digit_0),
  d(KEY_ID.digit_1),
  d(KEY_ID.digit_2),
  d(KEY_ID.digit_3),
  d(KEY_ID.digit_4),
  d(KEY_ID.digit_5),
  d(KEY_ID.digit_6),
  d(KEY_ID.digit_7),
  d(KEY_ID.digit_8),
  d(KEY_ID.digit_9),
  d(KEY_ID.const_pi),
  d(KEY_ID.const_e),
  op(KEY_ID.op_add),
  op(KEY_ID.op_sub),
  op(KEY_ID.op_mul),
  op(KEY_ID.op_pow),
  op(KEY_ID.op_div),
  op(KEY_ID.op_euclid_div),
  op(KEY_ID.op_mod),
  op(KEY_ID.op_rotate_left),
  op(KEY_ID.op_gcd),
  op(KEY_ID.op_lcm),
  op(KEY_ID.op_max),
  op(KEY_ID.op_min),
  unary(KEY_ID.unary_inc),
  unary(KEY_ID.unary_dec),
  unary(KEY_ID.unary_neg),
  unary(KEY_ID.unary_sigma),
  unary(KEY_ID.unary_phi),
  unary(KEY_ID.unary_omega),
  unary(KEY_ID.unary_not),
  unary(KEY_ID.unary_collatz),
  unary(KEY_ID.unary_sort_asc),
  unary(KEY_ID.unary_floor),
  unary(KEY_ID.unary_ceil),
  unary(KEY_ID.unary_mirror_digits),
  {
    key: KEY_ID.util_clear_all,
    lockModel: "unlockable",
    unlockPathPolicy: "catalog",
    primaryExpectation: "c_resets_calculator",
    edgeCaseExpectation: "c_checklist_recorded_once",
  },
  {
    key: KEY_ID.util_backspace,
    lockModel: "unlockable",
    unlockPathPolicy: "catalog",
    primaryExpectation: "backspace_deletes_last_input",
    edgeCaseExpectation: "backspace_noop_when_nothing_to_delete",
  },
  {
    key: KEY_ID.util_undo,
    lockModel: "unlockable",
    unlockPathPolicy: "catalog",
    primaryExpectation: "undo_pops_roll",
    edgeCaseExpectation: "undo_noop_when_roll_empty",
  },
  {
    key: KEY_ID.system_save_quit_main_menu,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "system_key_requests_mode_transition",
    edgeCaseExpectation: "system_key_leaves_domain_state_unchanged",
  },
  {
    key: KEY_ID.system_quit_game,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "system_key_requests_quit",
    edgeCaseExpectation: "system_key_leaves_domain_state_unchanged",
  },
  {
    key: KEY_ID.system_mode_sandbox,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "system_key_requests_mode_transition",
    edgeCaseExpectation: "system_key_leaves_domain_state_unchanged",
  },
  {
    key: KEY_ID.system_mode_game,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "system_key_requests_mode_transition",
    edgeCaseExpectation: "system_key_leaves_domain_state_unchanged",
  },
  {
    key: KEY_ID.system_new_game,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "system_key_requests_mode_transition",
    edgeCaseExpectation: "system_key_leaves_domain_state_unchanged",
  },
  {
    key: KEY_ID.memory_cycle_variable,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.memory_adjust_plus,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "memory_adjusts_allocator",
    edgeCaseExpectation: "memory_adjust_noop_without_budget_or_bounds",
  },
  {
    key: KEY_ID.memory_adjust_minus,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "memory_adjusts_allocator",
    edgeCaseExpectation: "memory_adjust_noop_without_budget_or_bounds",
  },
  {
    key: KEY_ID.memory_recall,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "memory_recall_sets_input",
    edgeCaseExpectation: "memory_recall_noop_on_active_roll",
  },
  {
    key: KEY_ID.viz_graph,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.viz_feed,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.viz_title,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.viz_release_notes,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.viz_help,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.viz_factorization,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.viz_circle,
    lockModel: "always_unlocked",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.viz_eigen_allocator,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.viz_algebraic,
    lockModel: "unlockable",
    unlockPathPolicy: "catalog",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.exec_equals,
    lockModel: "always_unlocked",
    primaryExpectation: "equals_toggles_auto_step_mode",
    edgeCaseExpectation: "equals_toggle_division_by_zero_sets_nan",
  },
  {
    key: KEY_ID.exec_play_pause,
    lockModel: "always_unlocked",
    primaryExpectation: "graph_counts_only",
    edgeCaseExpectation: "graph_does_not_mutate_calculator_state",
  },
  {
    key: KEY_ID.exec_roll_inverse,
    lockModel: "unlockable",
    unlockPathPolicy: "none_planned",
    primaryExpectation: "roll_inverse_executes_predecessor",
    edgeCaseExpectation: "roll_inverse_rejects_on_error",
  },
];
