import type { UnlockDefinition, UnlockPredicate } from "./types.js";

export type PredicateType = UnlockPredicate["type"];

export const ALL_PREDICATE_TYPES: PredicateType[] = [
  "roll_length_at_least",
  "total_equals",
  "total_at_least",
  "total_at_most",
  "operation_equals",
  "roll_ends_with_sequence",
  "roll_contains_value",
  "roll_ends_with_equal_run",
  "roll_ends_with_incrementing_run",
  "key_press_count_at_least",
  "overflow_error_seen",
  "allocator_return_press_count_at_least",
];

export type CapabilityId =
  | "execute_activation"
  | "step_plus_one"
  | "step_minus_one"
  | "reset_to_zero"
  | "form_operator_plus_operand"
  | "press_target_key"
  | "allocator_return_press"
  | "roll_growth"
  | "roll_equal_run"
  | "roll_incrementing_run";

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

const TODO_NOTES = "TODO: add concrete capability spec and fixtures when this predicate enters unlockCatalog.";

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
  total_at_most: {
    predicateType: "total_at_most",
    necessary: [],
    sufficientSets: [],
    notes: TODO_NOTES,
  },
  operation_equals: {
    predicateType: "operation_equals",
    necessary: [],
    sufficientSets: [],
    notes: TODO_NOTES,
  },
  roll_ends_with_sequence: {
    predicateType: "roll_ends_with_sequence",
    necessary: [],
    sufficientSets: [],
    notes: TODO_NOTES,
  },
  roll_length_at_least: {
    predicateType: "roll_length_at_least",
    necessary: [],
    sufficientSets: [],
    notes: TODO_NOTES,
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
  }).filter((entry) => entry.usedInCatalog || entry.todo);
};
