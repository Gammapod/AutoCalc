import type { UnlockDefinition, UnlockPredicate } from "./types.js";

export type PredicateType = UnlockPredicate["type"];

export const ALL_PREDICATE_TYPES: PredicateType[] = [
  "roll_length_at_least",
  "total_equals",
  "total_at_least",
  "total_at_most",
  "total_magnitude_at_least",
  "operation_equals",
  "operation_first_euclid_equivalent_modulo",
  "roll_ends_with_sequence",
  "roll_contains_value",
  "roll_contains_domain_type",
  "roll_ends_with_equal_run",
  "roll_ends_with_incrementing_run",
  "roll_ends_with_alternating_sign_constant_abs_run",
  "roll_ends_with_constant_step_run",
  "key_press_count_at_least",
  "overflow_error_seen",
  "division_by_zero_error_seen",
  "symbolic_error_seen",
  "allocator_return_press_count_at_least",
  "allocator_allocate_press_count_at_least",
  "keypad_key_slots_at_least",
  "lambda_spent_points_dropped_to_zero_seen",
];

export type CapabilityId =
  | "execute_activation"
  | "step_plus_one"
  | "step_minus_one"
  | "reset_to_zero"
  | "form_operator_plus_operand"
  | "unary_slot_commit"
  | "press_target_key"
  | "allocator_return_press"
  | "allocator_allocate_press"
  | "roll_growth"
  | "roll_equal_run"
  | "roll_incrementing_run"
  | "roll_alternating_sign_constant_abs"
  | "roll_constant_step_run"
  | "division_by_zero_error"
  | "symbolic_result_error"
  | "euclid_division_operator";

export type NecessaryCapability = {
  capability: CapabilityId;
  reason: string;
};

export type SufficientCapabilitySet = {
  id: string;
  allOf: CapabilityId[];
  rationale: string;
};

export type PredicateCapabilitySpec<T extends PredicateType = PredicateType> = {
  predicateType: T;
  necessary: NecessaryCapability[];
  sufficientSets: SufficientCapabilitySet[];
  notes?: string;
};

export type PredicateCapabilitySpecRegistry = Partial<Record<PredicateType, PredicateCapabilitySpec>>;

export type CatalogPredicateCapabilityEntry = {
  predicateType: PredicateType;
  usedInCatalog: boolean;
  spec: PredicateCapabilitySpec | null;
  todo: boolean;
};

export const predicateCapabilitySpecRegistry: PredicateCapabilitySpecRegistry = {
  total_equals: {
    predicateType: "total_equals",
    necessary: [
      { capability: "step_plus_one", reason: "Need monotonic integer movement to hit an exact target." },
    ],
    sufficientSets: [
      {
        id: "total_equals_via_increment",
        allOf: ["step_plus_one"],
        rationale: "From zero, repeated +1 reaches any positive threshold used in current content.",
      },
    ],
  },
  total_at_least: {
    predicateType: "total_at_least",
    necessary: [
      { capability: "step_plus_one", reason: "Need an increasing step to cross a positive threshold." },
    ],
    sufficientSets: [
      {
        id: "total_at_least_via_increment",
        allOf: ["step_plus_one"],
        rationale: "Repeated +1 can exceed the threshold.",
      },
    ],
  },
  total_magnitude_at_least: {
    predicateType: "total_magnitude_at_least",
    necessary: [
      { capability: "step_plus_one", reason: "Need absolute growth from zero to reach a two-digit magnitude." },
    ],
    sufficientSets: [
      {
        id: "total_magnitude_at_least_via_increment",
        allOf: ["step_plus_one"],
        rationale: "Repeated +1 reaches magnitude thresholds such as 10.",
      },
    ],
  },
  roll_contains_value: {
    predicateType: "roll_contains_value",
    necessary: [
      { capability: "execute_activation", reason: "Roll entries are only appended by execution." },
      { capability: "form_operator_plus_operand", reason: "Need to stage an operation producing the target value." },
    ],
    sufficientSets: [
      {
        id: "roll_contains_value_via_equal_execution",
        allOf: ["execute_activation", "form_operator_plus_operand"],
        rationale: "A staged operation and execution append values into roll.",
      },
    ],
  },
  roll_ends_with_equal_run: {
    predicateType: "roll_ends_with_equal_run",
    necessary: [
      { capability: "execute_activation", reason: "Run suffixes require repeated executions." },
      { capability: "roll_equal_run", reason: "Need a repeatable operation preserving total." },
    ],
    sufficientSets: [
      {
        id: "equal_run_via_repeatable_no_change",
        allOf: ["execute_activation", "roll_equal_run"],
        rationale: "A no-change operation can produce equal successive roll values.",
      },
    ],
  },
  roll_ends_with_incrementing_run: {
    predicateType: "roll_ends_with_incrementing_run",
    necessary: [
      { capability: "execute_activation", reason: "Run suffixes require repeated executions." },
      { capability: "roll_incrementing_run", reason: "Need a repeatable +1 style execution pattern." },
    ],
    sufficientSets: [
      {
        id: "incrementing_run_via_plus_one_execution",
        allOf: ["execute_activation", "roll_incrementing_run"],
        rationale: "Repeated +1 execution yields step-1 incrementing suffixes.",
      },
    ],
  },
  roll_contains_domain_type: {
    predicateType: "roll_contains_domain_type",
    necessary: [
      { capability: "execute_activation", reason: "Domain classification depends on values appended into roll by execution." },
      { capability: "roll_growth", reason: "Need roll-producing behavior to observe at least one classified value." },
    ],
    sufficientSets: [
      {
        id: "roll_contains_domain_type_via_roll_growth",
        allOf: ["execute_activation", "roll_growth"],
        rationale: "With executable roll growth, at least one domain-typed result can be produced and observed.",
      },
    ],
  },
  roll_ends_with_alternating_sign_constant_abs_run: {
    predicateType: "roll_ends_with_alternating_sign_constant_abs_run",
    necessary: [
      { capability: "execute_activation", reason: "Run suffixes require repeated executions." },
      { capability: "roll_alternating_sign_constant_abs", reason: "Need repeated alternating-sign values at equal magnitude." },
    ],
    sufficientSets: [
      {
        id: "alternating_sign_constant_abs_via_repeatable_negation",
        allOf: ["execute_activation", "roll_alternating_sign_constant_abs"],
        rationale: "Alternating equal-magnitude values can be produced by repeated sign inversion patterns.",
      },
    ],
  },
  roll_ends_with_constant_step_run: {
    predicateType: "roll_ends_with_constant_step_run",
    necessary: [
      { capability: "execute_activation", reason: "Run suffixes require repeated executions." },
      { capability: "roll_constant_step_run", reason: "Need a repeatable arithmetic-step operation pattern." },
    ],
    sufficientSets: [
      {
        id: "constant_step_run_via_repeatable_arithmetic",
        allOf: ["execute_activation", "roll_constant_step_run"],
        rationale: "A fixed operation pattern can produce a constant-difference suffix.",
      },
    ],
  },
  operation_first_euclid_equivalent_modulo: {
    predicateType: "operation_first_euclid_equivalent_modulo",
    necessary: [
      { capability: "execute_activation", reason: "Need execution semantics for evaluating operation outcomes." },
      { capability: "euclid_division_operator", reason: "First committed slot must use #." },
      { capability: "form_operator_plus_operand", reason: "Need to form operand-bearing operations to compare outcomes." },
    ],
    sufficientSets: [
      {
        id: "euclid_equivalent_modulo_via_operation_eval",
        allOf: ["execute_activation", "euclid_division_operator", "form_operator_plus_operand"],
        rationale: "With # and execution available, operation outcomes can be compared to the modulo baseline.",
      },
    ],
  },
  key_press_count_at_least: {
    predicateType: "key_press_count_at_least",
    necessary: [
      { capability: "press_target_key", reason: "Predicate counts presses of a specific key." },
    ],
    sufficientSets: [
      {
        id: "key_press_count_by_pressing_key",
        allOf: ["press_target_key"],
        rationale: "Pressing the key increments the tracked count.",
      },
    ],
  },
  allocator_return_press_count_at_least: {
    predicateType: "allocator_return_press_count_at_least",
    necessary: [
      { capability: "allocator_return_press", reason: "Predicate counts allocator RETURN button presses." },
    ],
    sufficientSets: [
      {
        id: "allocator_return_press_count_by_return_click",
        allOf: ["allocator_return_press"],
        rationale: "Pressing RETURN increments the tracked allocator-return counter.",
      },
    ],
  },
  allocator_allocate_press_count_at_least: {
    predicateType: "allocator_allocate_press_count_at_least",
    necessary: [
      { capability: "allocator_allocate_press", reason: "Predicate counts allocator Allocate button presses." },
    ],
    sufficientSets: [
      {
        id: "allocator_allocate_press_count_by_allocate_click",
        allOf: ["allocator_allocate_press"],
        rationale: "Pressing Allocate increments the tracked allocator-allocate counter.",
      },
    ],
  },
  keypad_key_slots_at_least: {
    predicateType: "keypad_key_slots_at_least",
    necessary: [
      { capability: "allocator_allocate_press", reason: "Keypad growth is driven by allocator interaction in current progression." },
    ],
    sufficientSets: [
      {
        id: "keypad_key_slots_at_least_via_allocator_progression",
        allOf: ["allocator_allocate_press"],
        rationale: "Allocator progression enables keypad slot expansion milestones.",
      },
    ],
  },
  lambda_spent_points_dropped_to_zero_seen: {
    predicateType: "lambda_spent_points_dropped_to_zero_seen",
    necessary: [
      { capability: "allocator_return_press", reason: "Returning allocator points is required to observe a spent-points drop." },
    ],
    sufficientSets: [
      {
        id: "lambda_spent_drop_to_zero_via_allocator_return",
        allOf: ["allocator_return_press"],
        rationale: "Allocator return operations can drive spent points from 1 down to 0.",
      },
    ],
  },
  overflow_error_seen: {
    predicateType: "overflow_error_seen",
    necessary: [
      { capability: "step_plus_one", reason: "Need a growth path that can exceed finite digit range and overflow." },
    ],
    sufficientSets: [
      {
        id: "overflow_error_seen_via_increment_overflow",
        allOf: ["step_plus_one"],
        rationale: "Repeated +1 reaches the boundary and then triggers overflow on the next step.",
      },
    ],
  },
  division_by_zero_error_seen: {
    predicateType: "division_by_zero_error_seen",
    necessary: [
      { capability: "execute_activation", reason: "Execution must occur for division by zero to be evaluated." },
      { capability: "division_by_zero_error", reason: "Need a path that can produce a division-by-zero execution error." },
    ],
    sufficientSets: [
      {
        id: "division_by_zero_seen_via_exec_div_zero",
        allOf: ["execute_activation", "division_by_zero_error"],
        rationale: "Executing with a zero divisor records a division-by-zero error.",
      },
    ],
  },
  symbolic_error_seen: {
    predicateType: "symbolic_error_seen",
    necessary: [
      { capability: "execute_activation", reason: "Symbolic outcomes are recorded on execution." },
      { capability: "symbolic_result_error", reason: "Need a path that produces symbolic-output error entries." },
    ],
    sufficientSets: [
      {
        id: "symbolic_error_seen_via_symbolic_execution",
        allOf: ["execute_activation", "symbolic_result_error"],
        rationale: "Executing a symbolic expression records a symbolic-result error entry.",
      },
    ],
  },
  total_at_most: {
    predicateType: "total_at_most",
    necessary: [
      { capability: "step_minus_one", reason: "Need a decrementing step to reach lower-or-equal thresholds." },
    ],
    sufficientSets: [
      {
        id: "total_at_most_via_decrement",
        allOf: ["step_minus_one"],
        rationale: "Repeated -1 reaches or stays below any finite upper bound from an integer anchor.",
      },
    ],
  },
  operation_equals: {
    predicateType: "operation_equals",
    necessary: [
      { capability: "execute_activation", reason: "Operation matching is meaningful in executable function-chain context." },
    ],
    sufficientSets: [
      {
        id: "operation_equals_via_binary_slots",
        allOf: ["execute_activation", "form_operator_plus_operand"],
        rationale: "Binary operator+operand construction can realize binary target slot chains.",
      },
      {
        id: "operation_equals_via_unary_slots",
        allOf: ["execute_activation", "unary_slot_commit"],
        rationale: "Unary slot commit capability can realize unary target slot chains.",
      },
      {
        id: "operation_equals_via_mixed_slots",
        allOf: ["execute_activation", "form_operator_plus_operand", "unary_slot_commit"],
        rationale: "Combined binary and unary slot construction can realize mixed slot chains.",
      },
    ],
  },
  roll_ends_with_sequence: {
    predicateType: "roll_ends_with_sequence",
    necessary: [
      { capability: "execute_activation", reason: "Sequence suffixes only grow when execution appends roll entries." },
      { capability: "roll_growth", reason: "Need any execution-driven roll progression to pursue a target suffix." },
    ],
    sufficientSets: [
      {
        id: "sequence_suffix_via_roll_growth",
        allOf: ["execute_activation", "roll_growth"],
        rationale: "With execution and roll growth available, a designed path can realize exact suffix targets.",
      },
    ],
  },
  roll_length_at_least: {
    predicateType: "roll_length_at_least",
    necessary: [
      { capability: "execute_activation", reason: "Roll length only increases via execution." },
      { capability: "roll_growth", reason: "Need an executable function chain to append repeated entries." },
    ],
    sufficientSets: [
      {
        id: "roll_length_at_least_via_roll_growth",
        allOf: ["execute_activation", "roll_growth"],
        rationale: "With roll growth capability, repeated executions can reach any finite minimum length.",
      },
    ],
  },
};

export const getPredicateCapabilitySpec = (type: PredicateType): PredicateCapabilitySpec | undefined =>
  predicateCapabilitySpecRegistry[type];

const isTodoSpec = (spec: PredicateCapabilitySpec | null): boolean => Boolean(spec?.notes?.startsWith("TODO:"));

export const deriveCatalogPredicateCapabilitySpecs = (
  unlocks: UnlockDefinition[],
): CatalogPredicateCapabilityEntry[] => {
  const usedTypes = new Set(unlocks.map((unlock) => unlock.predicate.type));
  return ALL_PREDICATE_TYPES.map((predicateType) => {
    const spec = getPredicateCapabilitySpec(predicateType) ?? null;
    return {
      predicateType,
      usedInCatalog: usedTypes.has(predicateType),
      spec,
      todo: isTodoSpec(spec),
    };
  });
};
