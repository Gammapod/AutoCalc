import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import {
  deriveCatalogPredicateCapabilitySpecs,
  getPredicateCapabilitySpec,
  type CapabilityId,
  type PredicateType,
} from "../src/domain/predicateCapabilitySpec.js";
import { capabilityToFunctionProviderIds, staticFunctionCapabilityProviders } from "../src/domain/functionCapabilityProviders.js";
import { reducer } from "../src/domain/reducer.js";
import { initialState, LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID } from "../src/domain/state.js";
import { evaluateUnlockPredicate } from "../src/domain/unlockEngine.js";
import type { GameState, Key, RollEntry, UnlockPredicate } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

type ProofFixture = {
  id: string;
  predicateType: PredicateType;
  sufficientSetId: string;
  predicate: UnlockPredicate;
  buildInitialState: () => GameState;
  script: Key[];
};

const unlockKey = (state: GameState, key: Key): GameState => {
  if (/^\d$/.test(key) || key === "NEG") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        valueExpression: {
          ...state.unlocks.valueExpression,
          [key]: true,
        },
      },
    };
  }
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "\u27E1") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        slotOperators: {
          ...state.unlocks.slotOperators,
          [key]: true,
        },
      },
    };
  }
  if (key === "C" || key === "CE" || key === "UNDO" || key === "\u2190") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        utilities: {
          ...state.unlocks.utilities,
          [key]: true,
        },
      },
    };
  }
  if (key === "\u23EF") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        steps: {
          ...state.unlocks.steps,
          [key]: true,
        },
      },
    };
  }
  if (key === "GRAPH" || key === "FEED" || key === "CIRCLE" || key === "\u03BB") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        visualizers: {
          ...state.unlocks.visualizers,
          [key]: true,
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
        [key]: true,
      },
    },
  };
};

const buildStateWithUnlockedKeys = (keys: Key[]): GameState =>
  keys.reduce((state, key) => unlockKey(state, key), initialState());

const runScript = (state: GameState, script: Key[]): GameState =>
  script.reduce((nextState, key) => reducer(nextState, { type: "PRESS_KEY", key }), state);

const withTwoDigitRange = (state: GameState): GameState =>
  reducer(state, {
    type: "LAMBDA_SET_OVERRIDE_DELTA",
    value: 1,
  });

const proofFixtures: ProofFixture[] = [
  {
    id: "proof_total_equals_11_via_increment",
    predicateType: "total_equals",
    sufficientSetId: "total_equals_via_increment",
    predicate: { type: "total_equals", value: 11n },
    buildInitialState: () => withTwoDigitRange(initialState()),
    script: Array.from({ length: 11 }, () => "++"),
  },
  {
    id: "proof_total_at_least_20_via_increment",
    predicateType: "total_at_least",
    sufficientSetId: "total_at_least_via_increment",
    predicate: { type: "total_at_least", value: 20n },
    buildInitialState: () => withTwoDigitRange(initialState()),
    script: Array.from({ length: 20 }, () => "++"),
  },
  {
    id: "proof_total_magnitude_at_least_10_via_increment",
    predicateType: "total_magnitude_at_least",
    sufficientSetId: "total_magnitude_at_least_via_increment",
    predicate: { type: "total_magnitude_at_least", value: 10n },
    buildInitialState: () => withTwoDigitRange(initialState()),
    script: Array.from({ length: 10 }, () => "++"),
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
      ...buildStateWithUnlockedKeys(["++"]),
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
          operationSlots: [{ operator: "+", operand: 0n }],
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
          operationSlots: [{ operator: "+", operand: 1n }],
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
      ...buildStateWithUnlockedKeys(["=", "+", "NEG", "5"]),
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
    id: "proof_first_euclid_equivalent_modulo",
    predicateType: "operation_first_euclid_equivalent_modulo",
    sufficientSetId: "euclid_equivalent_modulo_via_operation_eval",
    predicate: { type: "operation_first_euclid_equivalent_modulo" },
    buildInitialState: () => ({
      ...buildStateWithUnlockedKeys(["=", "#"]),
      calculator: {
        ...initialState().calculator,
        total: r(10n),
        operationSlots: [{ operator: "#", operand: 4n }],
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
    predicate: { type: "key_press_count_at_least", key: "+", count: 1 },
    buildInitialState: () => buildStateWithUnlockedKeys(["+"]),
    script: ["+"],
  },
  {
    id: "proof_overflow_error_seen_via_increment_overflow",
    predicateType: "overflow_error_seen",
    sufficientSetId: "overflow_error_seen_via_increment_overflow",
    predicate: { type: "overflow_error_seen" },
    buildInitialState: () => initialState(),
    script: Array.from({ length: 10 }, () => "++"),
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

  const warnOnlyTodoTypes = derived
    .filter((entry) => entry.todo && !entry.usedInCatalog)
    .map((entry) => entry.predicateType);
  if (warnOnlyTodoTypes.length > 0) {
    console.warn(`WARN predicate capability TODO stubs (not in catalog yet): ${warnOnlyTodoTypes.join(", ")}`);
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
