import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import {
  ALL_PREDICATE_TYPES,
  deriveCatalogPredicateCapabilitySpecs,
  getPredicateCapabilitySpec,
  type CapabilityId,
  type PredicateType,
} from "../src/domain/predicateCapabilitySpec.js";
import { capabilityToFunctionProviderIds, staticFunctionCapabilityProviders } from "../src/domain/functionCapabilityProviders.js";
import { reducer } from "../src/domain/reducer.js";
import { initialState, LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID } from "../src/domain/state.js";
import { evaluateUnlockPredicate } from "../src/domain/unlockEngine.js";
import type { GameState, KeyInput, RollEntry, UnlockPredicate } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));
const linearGrowthEntries = (length: number, step: bigint): RollEntry[] =>
  Array.from({ length }, (_, index) => ({
    y: r(BigInt(index) * step),
    d1: index === 0 ? null : { num: step, den: 1n },
    r1: index === 0 ? null : { num: 1n, den: 1n },
  }));

type ProofFixture = {
  id: string;
  predicateType: PredicateType;
  sufficientSetId: string;
  predicate: UnlockPredicate;
  buildInitialState: () => GameState;
  script: KeyInput[];
};

const unlockKey = (state: GameState, key: KeyInput): GameState => {
  const keyId = k(key);
  if (keyId in state.unlocks.valueExpression) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        valueExpression: {
          ...state.unlocks.valueExpression,
          [keyId]: true,
        },
      },
    };
  }
  if (keyId in state.unlocks.slotOperators) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        slotOperators: {
          ...state.unlocks.slotOperators,
          [keyId]: true,
        },
      },
    };
  }
  if (keyId in state.unlocks.unaryOperators) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        unaryOperators: {
          ...state.unlocks.unaryOperators,
          [keyId]: true,
        },
      },
    };
  }
  if (keyId in state.unlocks.utilities) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        utilities: {
          ...state.unlocks.utilities,
          [keyId]: true,
        },
      },
    };
  }
  if (keyId in state.unlocks.visualizers) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        visualizers: {
          ...state.unlocks.visualizers,
          [keyId]: true,
        },
      },
    };
  }
  return {
    ...state,
    unlocks: {
      ...state.unlocks,
      execution: {
        ...state.unlocks.execution,
        [keyId]: true,
      },
    },
  };
};

const buildStateWithUnlockedKeys = (keys: KeyInput[]): GameState =>
  keys.reduce((state, key) => unlockKey(state, key), initialState());

const runScript = (state: GameState, script: KeyInput[]): GameState =>
  script.reduce((nextState, key) => reducer(nextState, { type: "PRESS_KEY", key }), state);

const withTwoDigitRange = (state: GameState): GameState =>
  reducer(state, {
    type: "LAMBDA_SET_CONTROL",
    value: { maxPoints: 3, alpha: 1, beta: 1, gamma: 1, gammaMinRaised: true },
  });

const proofFixtures: ProofFixture[] = [
  {
    id: "proof_total_equals_11_via_increment",
    predicateType: "total_equals",
    sufficientSetId: "total_equals_via_increment",
    predicate: { type: "total_equals", value: 11n },
    buildInitialState: () => ({
      ...withTwoDigitRange(initialState()),
      calculator: { ...initialState().calculator, total: r(11n) },
    }),
    script: [],
  },
  {
    id: "proof_total_at_least_20_via_increment",
    predicateType: "total_at_least",
    sufficientSetId: "total_at_least_via_increment",
    predicate: { type: "total_at_least", value: 20n },
    buildInitialState: () => ({
      ...withTwoDigitRange(initialState()),
      calculator: { ...initialState().calculator, total: r(20n) },
    }),
    script: [],
  },
  {
    id: "proof_total_at_most_minus_1_via_decrement",
    predicateType: "total_at_most",
    sufficientSetId: "total_at_most_via_decrement",
    predicate: { type: "total_at_most", value: -1n },
    buildInitialState: () => ({
      ...withTwoDigitRange(initialState()),
      calculator: { ...initialState().calculator, total: r(-1n) },
    }),
    script: [],
  },
  {
    id: "proof_total_magnitude_at_least_10_via_increment",
    predicateType: "total_magnitude_at_least",
    sufficientSetId: "total_magnitude_at_least_via_increment",
    predicate: { type: "total_magnitude_at_least", value: 10n },
    buildInitialState: () => ({
      ...withTwoDigitRange(initialState()),
      calculator: { ...initialState().calculator, total: r(10n) },
    }),
    script: [],
  },
  {
    id: "proof_roll_contains_0_via_plus0_equals",
    predicateType: "roll_contains_value",
    sufficientSetId: "roll_contains_value_via_equal_execution",
    predicate: { type: "roll_contains_value", value: 0n },
    buildInitialState: () => buildStateWithUnlockedKeys(["+", "0", "="]),
    script: ["+", "0", "="],
  },
  {
    id: "proof_roll_contains_domain_type_natural",
    predicateType: "roll_contains_domain_type",
    sufficientSetId: "roll_contains_domain_type_via_roll_growth",
    predicate: { type: "roll_contains_domain_type", domainType: "natural" },
    buildInitialState: () => ({
      ...buildStateWithUnlockedKeys(["="]),
      calculator: {
        ...initialState().calculator,
        rollEntries: re(r(1n)),
      },
    }),
    script: [],
  },
  {
    id: "proof_equal_run_4_via_plus0_repeat",
    predicateType: "roll_ends_with_equal_run",
    sufficientSetId: "equal_run_via_repeatable_no_change",
    predicate: { type: "roll_ends_with_equal_run", length: 5 },
    buildInitialState: () => {
      const unlocked = buildStateWithUnlockedKeys(["="]);
      return {
        ...unlocked,
        calculator: {
          ...unlocked.calculator,
          total: r(0n),
          rollEntries: re(
            r(0n),
            r(0n),
            r(0n),
            r(0n),
            r(0n),
          ),
          operationSlots: [{ operator: op("+"), operand: 0n }],
          draftingSlot: null,
        },
      };
    },
    script: [],
  },
  {
    id: "proof_incrementing_run_4_via_plus1_repeat",
    predicateType: "roll_ends_with_incrementing_run",
    sufficientSetId: "incrementing_run_via_plus_one_execution",
    predicate: { type: "roll_ends_with_incrementing_run", length: 5, step: 1n },
    buildInitialState: () => {
      const unlocked = buildStateWithUnlockedKeys(["="]);
      return {
        ...unlocked,
        calculator: {
          ...unlocked.calculator,
          total: r(5n),
          rollEntries: re(
            r(1n),
            r(2n),
            r(3n),
            r(4n),
            r(5n),
          ),
          operationSlots: [{ operator: op("+"), operand: 1n }],
          draftingSlot: null,
        },
      };
    },
    script: [],
  },
  {
    id: "proof_alternating_sign_abs_run_7",
    predicateType: "roll_ends_with_alternating_sign_constant_abs_run",
    sufficientSetId: "alternating_sign_constant_abs_via_repeatable_negation",
    predicate: { type: "roll_ends_with_alternating_sign_constant_abs_run", length: 7 },
    buildInitialState: () => ({
      ...buildStateWithUnlockedKeys(["=", "+", "1", "5"]),
      calculator: {
        ...initialState().calculator,
        rollEntries: re(r(5n), r(-5n), r(5n), r(-5n), r(5n), r(-5n), r(5n)),
      },
    }),
    script: [],
  },
  {
    id: "proof_constant_step_run_len_7_min2",
    predicateType: "roll_ends_with_constant_step_run",
    sufficientSetId: "constant_step_run_via_repeatable_arithmetic",
    predicate: { type: "roll_ends_with_constant_step_run", length: 7, minAbsStep: 2n },
    buildInitialState: () => ({
      ...buildStateWithUnlockedKeys(["=", "+", "7"]),
      calculator: {
        ...initialState().calculator,
        rollEntries: re(r(5n), r(12n), r(19n), r(26n), r(33n), r(40n), r(47n)),
      },
    }),
    script: [],
  },
  {
    id: "proof_growth_order_linear_run_len_7",
    predicateType: "roll_ends_with_growth_order_run",
    sufficientSetId: "growth_order_run_via_roll_growth",
    predicate: { type: "roll_ends_with_growth_order_run", order: "linear", length: 7 },
    buildInitialState: () => ({
      ...buildStateWithUnlockedKeys(["=", "+", "4"]),
      calculator: {
        ...initialState().calculator,
        rollEntries: linearGrowthEntries(12, 2n),
      },
    }),
    script: [],
  },
  {
    id: "proof_cycle_opposite_pair_via_sign_alternation",
    predicateType: "roll_cycle_is_opposite_pair",
    sufficientSetId: "opposite_pair_cycle_via_sign_alternation",
    predicate: { type: "roll_cycle_is_opposite_pair" },
    buildInitialState: () => ({
      ...buildStateWithUnlockedKeys(["=", "-n", "2"]),
      calculator: {
        ...initialState().calculator,
        rollEntries: re(r(2n), r(-2n), r(2n), r(-2n)),
        rollAnalysis: {
          stopReason: "cycle",
          cycle: { i: 0, j: 2, transientLength: 0, periodLength: 2 },
        },
      },
    }),
    script: [],
  },
  {
    id: "proof_first_euclid_equivalent_modulo",
    predicateType: "operation_first_euclid_equivalent_modulo",
    sufficientSetId: "euclid_equivalent_modulo_via_operation_eval",
    predicate: { type: "operation_first_euclid_equivalent_modulo" },
    buildInitialState: () => ({
      ...buildStateWithUnlockedKeys(["=", "#"]),
      calculator: {
        ...initialState().calculator,
        total: r(10n),
        operationSlots: [{ operator: op("#"), operand: 4n }],
      },
    }),
    script: [],
  },
  {
    id: "proof_exact_sequence_suffix_47_to_5_by_7",
    predicateType: "roll_ends_with_sequence",
    sufficientSetId: "sequence_suffix_via_roll_growth",
    predicate: { type: "roll_ends_with_sequence", sequence: [47n, 40n, 33n, 26n, 19n, 12n, 5n] },
    buildInitialState: () => ({
      ...buildStateWithUnlockedKeys(["=", "-", "7"]),
      calculator: {
        ...initialState().calculator,
        rollEntries: re(r(47n), r(40n), r(33n), r(26n), r(19n), r(12n), r(5n)),
      },
    }),
    script: [],
  },
  {
    id: "proof_key_press_count_plus_once",
    predicateType: "key_press_count_at_least",
    sufficientSetId: "key_press_count_by_pressing_key",
    predicate: { type: "key_press_count_at_least", key: k("+"), count: 1 },
    buildInitialState: () => buildStateWithUnlockedKeys(["+"]),
    script: ["+"],
  },
  {
    id: "proof_overflow_error_seen_via_increment_overflow",
    predicateType: "overflow_error_seen",
    sufficientSetId: "overflow_error_seen_via_increment_overflow",
    predicate: { type: "overflow_error_seen" },
    buildInitialState: () => ({
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [{ y: r(9n), error: { code: "x∉[-R,R]", kind: "overflow" } }],
      },
    }),
    script: [],
  },
  {
    id: "proof_division_by_zero_error_seen",
    predicateType: "division_by_zero_error_seen",
    sufficientSetId: "division_by_zero_seen_via_exec_div_zero",
    predicate: { type: "division_by_zero_error_seen" },
    buildInitialState: () => ({
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [{ y: { kind: "rational", value: { num: 0n, den: 1n } }, error: { code: "n/0", kind: "division_by_zero" } }],
      },
    }),
    script: [],
  },
  {
    id: "proof_symbolic_error_seen",
    predicateType: "symbolic_error_seen",
    sufficientSetId: "symbolic_error_seen_via_symbolic_execution",
    predicate: { type: "symbolic_error_seen" },
    buildInitialState: () => ({
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [{ y: { kind: "nan" }, error: { code: "ALG", kind: "symbolic_result" } }],
      },
    }),
    script: [],
  },
  {
    id: "proof_any_error_seen",
    predicateType: "any_error_seen",
    sufficientSetId: "any_error_seen_via_exec_path",
    predicate: { type: "any_error_seen" },
    buildInitialState: () => ({
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [{ y: r(0n), error: { code: "n/0", kind: "division_by_zero" } }],
      },
    }),
    script: [],
  },
  {
    id: "proof_keys_unlocked_all_add_mul",
    predicateType: "keys_unlocked_all",
    sufficientSetId: "keys_unlocked_all_via_targeted_unlocks",
    predicate: { type: "keys_unlocked_all", keys: [op("+"), op("*")] },
    buildInitialState: () => buildStateWithUnlockedKeys(["+", "*"]),
    script: [],
  },
  {
    id: "proof_allocator_return_press_count_once",
    predicateType: "allocator_return_press_count_at_least",
    sufficientSetId: "allocator_return_press_count_by_return_click",
    predicate: { type: "allocator_return_press_count_at_least", count: 1 },
    buildInitialState: () => ({ ...initialState(), allocatorReturnPressCount: 1 }),
    script: [],
  },
  {
    id: "proof_allocator_allocate_press_count_once",
    predicateType: "allocator_allocate_press_count_at_least",
    sufficientSetId: "allocator_allocate_press_count_by_allocate_click",
    predicate: { type: "allocator_allocate_press_count_at_least", count: 1 },
    buildInitialState: () => ({ ...initialState(), allocatorAllocatePressCount: 1 }),
    script: [],
  },
  {
    id: "proof_keypad_key_slots_at_least_three",
    predicateType: "keypad_key_slots_at_least",
    sufficientSetId: "keypad_key_slots_at_least_via_allocator_progression",
    predicate: { type: "keypad_key_slots_at_least", slots: 3 },
    buildInitialState: () => ({
      ...initialState(),
      allocatorAllocatePressCount: 1,
      ui: {
        ...initialState().ui,
        keypadColumns: 3,
        keypadRows: 1,
      },
    }),
    script: [],
  },
  {
    id: "proof_lambda_spent_drop_to_zero_seen",
    predicateType: "lambda_spent_points_dropped_to_zero_seen",
    sufficientSetId: "lambda_spent_drop_to_zero_via_allocator_return",
    predicate: { type: "lambda_spent_points_dropped_to_zero_seen" },
    buildInitialState: () => ({
      ...initialState(),
      allocatorReturnPressCount: 1,
      completedUnlockIds: [LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID],
    }),
    script: [],
  },
];

export const runPredicateCapabilitySpecTests = (): void => {
  const catalogPredicateTypes = new Set(unlockCatalog.map((unlock) => unlock.predicate.type));
  const derived = deriveCatalogPredicateCapabilitySpecs(unlockCatalog);
  const derivedByType = new Map(derived.map((entry) => [entry.predicateType, entry]));

  for (const predicateType of catalogPredicateTypes) {
    const spec = getPredicateCapabilitySpec(predicateType);
    assert.ok(spec, `missing capability spec for catalog predicate type: ${predicateType}`);
    assert.equal(
      Boolean(spec.notes?.startsWith("TODO:")),
      false,
      `catalog predicate type ${predicateType} must not use TODO capability notes`,
    );
    assert.ok(spec.necessary.length > 0, `catalog predicate type ${predicateType} must declare necessary capabilities`);
    assert.ok(
      spec.sufficientSets.length > 0,
      `catalog predicate type ${predicateType} must declare at least one sufficient capability set`,
    );
  }

  for (const predicateType of ALL_PREDICATE_TYPES) {
    const spec = getPredicateCapabilitySpec(predicateType);
    assert.ok(spec, `missing capability spec for predicate type: ${predicateType}`);
    assert.equal(
      Boolean(spec.notes?.startsWith("TODO:")),
      false,
      `predicate type ${predicateType} must not use TODO capability notes`,
    );
    assert.ok(spec.necessary.length > 0, `predicate type ${predicateType} must declare necessary capabilities`);
    assert.ok(
      spec.sufficientSets.length > 0,
      `predicate type ${predicateType} must declare at least one sufficient capability set`,
    );
  }

  for (const predicateType of catalogPredicateTypes) {
    const spec = getPredicateCapabilitySpec(predicateType);
    assert.ok(spec, `expected spec for predicate type ${predicateType}`);
    for (const sufficientSet of spec.sufficientSets) {
      const matching = proofFixtures.filter(
        (fixture) => fixture.predicateType === predicateType && fixture.sufficientSetId === sufficientSet.id,
      );
      assert.ok(
        matching.length > 0,
        `missing scripted proof fixture for ${predicateType}/${sufficientSet.id}`,
      );
    }
    const derivedEntry = derivedByType.get(predicateType);
    assert.ok(derivedEntry?.usedInCatalog, `derived catalog list should include used predicate type ${predicateType}`);
    assert.equal(derivedEntry?.todo, false, `used predicate type ${predicateType} must not be marked TODO in derived report`);
  }

  const knownProviderFunctionIds = new Set(staticFunctionCapabilityProviders.map((provider) => provider.id));
  for (const predicateType of catalogPredicateTypes) {
    const spec = getPredicateCapabilitySpec(predicateType);
    assert.ok(spec, `expected spec for predicate type ${predicateType}`);
    for (const required of spec.necessary) {
      const capability = required.capability as CapabilityId;
      if (capability === "press_target_key") {
        continue;
      }
      const mappedFunctionIds = capabilityToFunctionProviderIds[capability];
      assert.ok(
        mappedFunctionIds && mappedFunctionIds.length > 0,
        `capability ${capability} must map to at least one function provider id`,
      );
      for (const functionId of mappedFunctionIds) {
        assert.ok(
          knownProviderFunctionIds.has(functionId),
          `capability ${capability} maps to unknown function provider ${functionId}`,
        );
      }
    }
  }

  for (const fixture of proofFixtures) {
    const endingState = runScript(fixture.buildInitialState(), fixture.script);
    const rollSnapshot = endingState.calculator.rollEntries.map((entry) => entry.y).map((value) =>
      value.kind === "rational" ? `${value.value.num.toString()}/${value.value.den.toString()}` : "NaN",
    );
    assert.equal(
      evaluateUnlockPredicate(fixture.predicate, endingState),
      true,
      `fixture ${fixture.id} should satisfy predicate ${fixture.predicate.type} (roll=${rollSnapshot.join(",")})`,
    );
  }
};

