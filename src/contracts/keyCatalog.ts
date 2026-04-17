import type { KeyId } from "../domain/keyPresentation.js";

export type KeyUnlockGroup =
  | "valueAtoms"
  | "valueCompose"
  | "slotOperators"
  | "unaryOperators"
  | "utilities"
  | "memory"
  | "steps"
  | "visualizers"
  | "execution"
  | "none";

export type KeyBehaviorKind = "digit" | "operator" | "unary_operator" | "execute" | "utility" | "visualizer" | "toggle" | "noop";

export type KeyInputFamily =
  | "atom_digit"
  | "atom_constant"
  | "compose_unary"
  | "compose_binary"
  | "operator_slot"
  | "utility"
  | "visualizer"
  | "execution"
  | "toggle";

export type KeyValueRole = "none" | "literal" | "constant" | "unary_compose" | "binary_compose";

export type KeyHandlerOverrideId =
  | "utility_clear_all"
  | "utility_backspace"
  | "utility_undo"
  | "system_save_quit_main_menu"
  | "system_quit_game"
  | "system_switch_mode_game"
  | "system_new_game"
  | "system_switch_mode_sandbox"
  | "execute_equals"
  | "execute_step_through"
  | "execute_play_pause"
  | "execute_roll_inverse"
  | "unary_operator_commit_slot";

export type KeyTrait =
  | "counts_press"
  | "can_execute"
  | "can_change_total"
  | "can_form_slot"
  | "can_divide"
  | "can_euclid_divide"
  | "can_remainder"
  | "can_rotate_digits"
  | "can_gcd"
  | "can_lcm"
  | "can_reset"
  | "can_undo"
  | "is_digit"
  | "is_visualizer";

export type KeyVisualizerId =
  | "graph"
  | "circle"
  | "ratios"
  | "feed"
  | "number_line"
  | "algebraic"
  | "factorization"
  | "state"
  | "title"
  | "help"
  | "release_notes";

export type KeyCatalogEntry = {
  key: KeyId;
  category: string;
  unlockGroup: KeyUnlockGroup;
  defaultUnlocked: boolean;
  supportsPressCount: boolean;
  behaviorKind: KeyBehaviorKind;
  inputFamily: KeyInputFamily;
  valueRole: KeyValueRole;
  traits: readonly KeyTrait[];
  visualizerId?: KeyVisualizerId;
  handlerOverrideId?: KeyHandlerOverrideId;
};

const withBaseTraits = (traits: readonly KeyTrait[]): readonly KeyTrait[] =>
  traits.includes("counts_press") ? traits : [...traits, "counts_press"];

export const keyCatalog = [
  { key: "digit_0", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "digit_1", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "digit_2", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "digit_3", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "digit_4", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "digit_5", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "digit_6", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "digit_7", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "digit_8", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "digit_9", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "const_pi", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_constant", valueRole: "constant", traits: withBaseTraits(["is_digit"]) },
  { key: "const_e", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_constant", valueRole: "constant", traits: withBaseTraits(["is_digit"]) },
  { key: "const_bottom", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_constant", valueRole: "constant", traits: withBaseTraits(["is_digit"]) },
  { key: "const_roll_number", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_constant", valueRole: "constant", traits: withBaseTraits(["is_digit"]) },
  { key: "op_add", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "op_sub", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "op_mul", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "op_pow", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "op_div", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_divide"]) },
  { key: "op_euclid_div", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_euclid_divide"]) },
  { key: "op_mod", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_remainder"]) },
  { key: "op_rotate_left", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_rotate_digits"]) },
  { key: "op_rotate_15", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "op_gcd", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_gcd"]) },
  { key: "op_lcm", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_lcm"]) },
  { key: "op_max", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "op_min", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "unary_inc", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_dec", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_neg", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_sigma", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_phi", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_omega", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_not", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_collatz", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_sort_asc", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_floor", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_ceil", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_mirror_digits", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_i", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "unary_rotate_15", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "util_clear_all", category: "utility", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits(["can_reset"]), handlerOverrideId: "utility_clear_all" },
  { key: "util_backspace", category: "utility", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "utility_backspace" },
  { key: "util_undo", category: "utility", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits(["can_undo"]), handlerOverrideId: "utility_undo" },
  { key: "system_save_quit_main_menu", category: "global_system", unlockGroup: "utilities", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "system_save_quit_main_menu" },
  { key: "system_quit_game", category: "global_system", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "system_quit_game" },
  { key: "system_mode_game", category: "global_system", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "system_switch_mode_game" },
  { key: "system_new_game", category: "global_system", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "system_new_game" },
  { key: "system_mode_sandbox", category: "global_system", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "system_switch_mode_sandbox" },
  { key: "toggle_delta_range_clamp", category: "settings", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits([]) },
  { key: "toggle_mod_zero_to_delta", category: "settings", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits([]) },
  { key: "toggle_binary_octave_cycle", category: "settings", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits([]) },
  { key: "toggle_step_expansion", category: "settings", unlockGroup: "utilities", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits([]) },
  { key: "toggle_binary_mode", category: "settings", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits([]) },
  { key: "toggle_history", category: "settings", unlockGroup: "utilities", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits([]) },
  { key: "viz_graph", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "graph" },
  { key: "viz_feed", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "feed" },
  { key: "viz_title", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "title" },
  { key: "viz_release_notes", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "release_notes" },
  { key: "viz_help", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "help" },
  { key: "viz_factorization", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "factorization" },
  { key: "viz_state", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "state" },
  { key: "viz_number_line", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "number_line" },
  { key: "viz_circle", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "circle" },
  { key: "viz_ratios", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "ratios" },
  { key: "viz_algebraic", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "algebraic" },
  { key: "exec_equals", category: "execution", unlockGroup: "execution", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits(["can_execute", "can_change_total"]), handlerOverrideId: "execute_equals" },
  { key: "exec_play_pause", category: "execution", unlockGroup: "execution", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "execute", inputFamily: "execution", valueRole: "none", traits: withBaseTraits(["can_execute"]), handlerOverrideId: "execute_play_pause" },
  { key: "exec_step_through", category: "execution", unlockGroup: "execution", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "execute", inputFamily: "execution", valueRole: "none", traits: withBaseTraits(["can_execute"]), handlerOverrideId: "execute_step_through" },
  { key: "exec_roll_inverse", category: "execution", unlockGroup: "execution", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "execute", inputFamily: "execution", valueRole: "none", traits: withBaseTraits(["can_execute"]), handlerOverrideId: "execute_roll_inverse" },
] as const satisfies readonly KeyCatalogEntry[];

export type KeyCatalogRecord = (typeof keyCatalog)[number];


