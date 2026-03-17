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
  | "memory_cycle_variable"
  | "memory_recall_into_input"
  | "memory_adjust_plus"
  | "memory_adjust_minus"
  | "execute_equals"
  | "execute_step_through"
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

export type KeyVisualizerId = "graph" | "feed" | "circle" | "eigen_allocator" | "algebraic" | "factorization";

export type KeyCatalogEntry = {
  key: string;
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
  { key: "0", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "1", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "2", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "3", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "4", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "5", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "6", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "7", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "8", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "9", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_digit", valueRole: "literal", traits: withBaseTraits(["is_digit"]) },
  { key: "pi", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_constant", valueRole: "constant", traits: withBaseTraits(["is_digit"]) },
  { key: "e", category: "value_expression", unlockGroup: "valueAtoms", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit", inputFamily: "atom_constant", valueRole: "constant", traits: withBaseTraits(["is_digit"]) },
  { key: "+", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "-", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "*", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot"]) },
  { key: "/", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_divide"]) },
  { key: "#", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_euclid_divide"]) },
  { key: "\u27E1", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_remainder"]) },
  { key: "\u21BA", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_rotate_digits"]) },
  { key: "\u2A51", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_gcd"]) },
  { key: "\u2A52", category: "slot_operator", unlockGroup: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator", inputFamily: "operator_slot", valueRole: "none", traits: withBaseTraits(["can_form_slot", "can_lcm"]) },
  { key: "++", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "--", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "-n", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "\u03C3", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "\u03C6", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "\u03A9", category: "unary_operator", unlockGroup: "unaryOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "unary_operator", inputFamily: "compose_unary", valueRole: "unary_compose", traits: withBaseTraits(["can_form_slot"]), handlerOverrideId: "unary_operator_commit_slot" },
  { key: "C", category: "utility", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits(["can_reset"]), handlerOverrideId: "utility_clear_all" },
  { key: "\u2190", category: "utility", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "utility_backspace" },
  { key: "UNDO", category: "utility", unlockGroup: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", inputFamily: "utility", valueRole: "none", traits: withBaseTraits(["can_undo"]), handlerOverrideId: "utility_undo" },
  { key: "\u03B1,\u03B2,\u03B3", category: "memory", unlockGroup: "memory", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "noop", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "memory_cycle_variable" },
  { key: "M+", category: "memory", unlockGroup: "memory", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "noop", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "memory_adjust_plus" },
  { key: "M\u2013", category: "memory", unlockGroup: "memory", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "noop", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "memory_adjust_minus" },
  { key: "M\u2192", category: "memory", unlockGroup: "memory", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "noop", inputFamily: "utility", valueRole: "none", traits: withBaseTraits([]), handlerOverrideId: "memory_recall_into_input" },
  { key: "\u27E1[-\u{1D6FF}, \u{1D6FF})", category: "settings", unlockGroup: "utilities", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits([]) },
  { key: "\u27E1[0, \u{1D6FF})", category: "settings", unlockGroup: "utilities", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits([]) },
  { key: "[ ??? ]", category: "settings", unlockGroup: "utilities", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "toggle", inputFamily: "toggle", valueRole: "none", traits: withBaseTraits([]) },
  { key: "GRAPH", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "graph" },
  { key: "FEED", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "feed" },
  { key: "\u{1D6B7}\u{1D45D}\u{1D49}", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "factorization" },
  { key: "CIRCLE", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "circle" },
  { key: "\u03BB", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "eigen_allocator" },
  { key: "ALG", category: "visualizer", unlockGroup: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer", inputFamily: "visualizer", valueRole: "none", traits: withBaseTraits(["is_visualizer"]), visualizerId: "algebraic" },
  { key: "=", category: "execution", unlockGroup: "execution", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "execute", inputFamily: "execution", valueRole: "none", traits: withBaseTraits(["can_execute", "can_change_total"]), handlerOverrideId: "execute_equals" },
  { key: "\u25BB", category: "execution", unlockGroup: "execution", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "execute", inputFamily: "execution", valueRole: "none", traits: withBaseTraits(["can_execute"]), handlerOverrideId: "execute_step_through" },
] as const satisfies readonly KeyCatalogEntry[];

export type KeyCatalogRecord = (typeof keyCatalog)[number];
