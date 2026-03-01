import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import {
  deriveCatalogPredicateCapabilitySpecs,
  getPredicateCapabilitySpec,
  type PredicateType,
} from "../src/domain/predicateCapabilitySpec.js";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { evaluateUnlockPredicate } from "../src/domain/unlockEngine.js";
import type { GameState, Key, UnlockPredicate } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

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
  if (key === "C" || key === "CE" || key === "UNDO" || key === "GRAPH") {
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

const proofFixtures: ProofFixture[] = [
  {
    id: "proof_total_equals_11_via_increment",
    predicateType: "total_equals",
    sufficientSetId: "total_equals_via_increment",
    predicate: { type: "total_equals", value: 11n },
    buildInitialState: () => initialState(),
    script: Array.from({ length: 11 }, () => "++"),
  },
  {
    id: "proof_total_at_least_20_via_increment",
    predicateType: "total_at_least",
    sufficientSetId: "total_at_least_via_increment",
    predicate: { type: "total_at_least", value: 20n },
    buildInitialState: () => initialState(),
    script: Array.from({ length: 20 }, () => "++"),
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
          roll: [
            r(0n),
            r(0n),
            r(0n),
            r(0n),
            r(0n),
          ],
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
          roll: [
            r(1n),
            r(2n),
            r(3n),
            r(4n),
            r(5n),
          ],
          operationSlots: [{ operator: "+", operand: 1n }],
          draftingSlot: null,
        },
      };
    },
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
];

export const runPredicateCapabilitySpecTests = (): void => {
  const catalogPredicateTypes = new Set(unlockCatalog.map((unlock) => unlock.predicate.type));
  const derived = deriveCatalogPredicateCapabilitySpecs(unlockCatalog);
  const derivedByType = new Map(derived.map((entry) => [entry.predicateType, entry]));

  for (const predicateType of catalogPredicateTypes) {
    const spec = getPredicateCapabilitySpec(predicateType);
    assert.ok(spec, `missing capability spec for catalog predicate type: ${predicateType}`);
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
  }

  for (const fixture of proofFixtures) {
    const endingState = runScript(fixture.buildInitialState(), fixture.script);
    const rollSnapshot = endingState.calculator.roll.map((value) =>
      value.kind === "rational" ? `${value.value.num.toString()}/${value.value.den.toString()}` : "NaN",
    );
    assert.equal(
      evaluateUnlockPredicate(fixture.predicate, endingState),
      true,
      `fixture ${fixture.id} should satisfy predicate ${fixture.predicate.type} (roll=${rollSnapshot.join(",")})`,
    );
  }
};
