import assert from "node:assert/strict";
import { keyBehaviorCatalog } from "../src/content/keyBehavior.catalog.js";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { CHECKLIST_UNLOCK_ID, initialState } from "../src/domain/state.js";
import type { GameState, Key, RollEntry } from "../src/domain/types.js";
import { getSlotInputScenariosByTag } from "./helpers/slotInput.contractFixtures.js";
import { assertScenarioResult, runScenario, type SlotInputRuntimeAdapter } from "./helpers/slotInput.contractRunner.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

const runtimeKeysFromInitialUnlocks = (): Key[] => {
  const state = initialState();
  return [
    ...(Object.keys(state.unlocks.valueExpression) as Key[]),
    ...(Object.keys(state.unlocks.slotOperators) as Key[]),
    ...(Object.keys(state.unlocks.utilities) as Key[]),
    ...(Object.keys(state.unlocks.memory) as Key[]),
    ...(Object.keys(state.unlocks.steps) as Key[]),
    ...(Object.keys(state.unlocks.visualizers) as Key[]),
    ...(Object.keys(state.unlocks.execution) as Key[]),
  ].sort((a, b) => a.localeCompare(b));
};

const unlockKey = (state: GameState, key: Key): GameState => {
  if (key in state.unlocks.valueExpression) {
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
  if (key in state.unlocks.slotOperators) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        maxSlots: Math.max(state.unlocks.maxSlots, 1),
        slotOperators: {
          ...state.unlocks.slotOperators,
          [key]: true,
        },
      },
    };
  }
  if (key in state.unlocks.utilities) {
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
  if (key in state.unlocks.memory) {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        memory: {
          ...state.unlocks.memory,
          [key]: true,
        },
      },
    };
  }
  if (key in state.unlocks.steps) {
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
  if (key in state.unlocks.visualizers) {
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

const assertLockedBehavior = (key: Key): void => {
  const base = initialState();
  const next = applyKeyAction(base, key);
  assert.deepEqual(next, base, `locked key ${key} should be a no-op`);
  assert.equal(next.keyPressCounts[key] ?? 0, 0, `locked key ${key} should not increment key press count`);
};

const assertPrimaryExpectation = (key: Key, kind: string): void => {
  if (kind === "digit_sets_drafting_operand") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          draftingSlot: { operator: "+", operandInput: "", isNegative: false },
        },
      },
      key,
    );
    const next = applyKeyAction(state, key);
    assert.equal(next.calculator.draftingSlot?.operandInput, key, `digit ${key} should populate drafting operand`);
    return;
  }

  if (kind === "operator_starts_drafting") {
    const state = unlockKey(initialState(), key);
    const next = applyKeyAction(state, key);
    assert.equal(next.calculator.draftingSlot?.operator, key, `operator ${key} should start drafting`);
    return;
  }

  if (kind === "neg_toggles_pending_sign") {
    const state = unlockKey(initialState(), "NEG");
    const next = applyKeyAction(state, "NEG");
    assert.equal(next.calculator.pendingNegativeTotal, true, "NEG should toggle pending sign on zero total");
    return;
  }

  if (kind === "c_resets_calculator") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          total: r(7n),
          rollEntries: re(r(7n), r(9n)),
          operationSlots: [{ operator: "+", operand: 1n }],
          draftingSlot: { operator: "-", operandInput: "2", isNegative: false },
        },
      },
      "C",
    );
    const next = applyKeyAction(state, "C");
    assert.deepEqual(next.calculator.total, r(0n), "C should reset total");
    assert.equal(next.calculator.rollEntries.length, 0, "C should clear roll");
    assert.equal(next.calculator.operationSlots.length, 0, "C should clear slots");
    assert.equal(next.calculator.draftingSlot, null, "C should clear drafting slot");
    return;
  }

  if (kind === "ce_clears_entry") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          total: r(7n),
          rollEntries: re(r(1n), r(2n)),
          operationSlots: [{ operator: "+", operand: 1n }],
          draftingSlot: { operator: "-", operandInput: "2", isNegative: false },
        },
      },
      "CE",
    );
    const next = applyKeyAction(state, "CE");
    assert.deepEqual(next.calculator.total, r(7n), "CE should preserve total");
    assert.equal(next.calculator.rollEntries.length, 0, "CE should clear roll");
    assert.equal(next.calculator.operationSlots.length, 0, "CE should clear slots");
    assert.equal(next.calculator.draftingSlot, null, "CE should clear drafting slot");
    return;
  }

  if (kind === "undo_pops_roll") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          total: r(9n),
          rollEntries: re(r(3n), r(5n), r(9n)),
        },
      },
      "UNDO",
    );
    const next = applyKeyAction(state, "UNDO");
    assert.deepEqual(next.calculator.rollEntries, re(r(3n), r(5n)), "UNDO should pop one roll entry");
    assert.deepEqual(next.calculator.total, r(5n), "UNDO should set total to previous roll entry");
    return;
  }

  if (kind === "graph_counts_only") {
    const state = unlockKey(initialState(), key);
    const next = applyKeyAction(state, key);
    assert.equal(next.keyPressCounts[key] ?? 0, 1, `${key} should count key press when unlocked`);
    assert.deepEqual(next.calculator, state.calculator, `${key} should not mutate calculator state`);
    return;
  }

  if (kind === "equals_executes_drafted_plus_one") {
    let state = unlockKey(initialState(), "=");
    state = unlockKey(state, "+");
    state = unlockKey(state, "1");
    state = applyKeyAction(state, "+");
    state = applyKeyAction(state, "1");
    const next = applyKeyAction(state, "=");
    assert.deepEqual(next.calculator.total, r(1n), "= should execute drafted operation sequence");
    return;
  }

  if (kind === "increment_increases_total") {
    const state = initialState();
    const next = applyKeyAction(state, "++");
    assert.deepEqual(next.calculator.total, r(1n), "++ should increment total by one");
    assert.deepEqual(next.calculator.rollEntries, re(r(1n)), "++ should append incremented total to roll");
    return;
  }

  if (kind === "decrement_decreases_total") {
    const state = unlockKey(initialState(), "--");
    const next = applyKeyAction(state, "--");
    assert.deepEqual(next.calculator.total, r(-1n), "-- should decrement total by one");
    assert.deepEqual(next.calculator.rollEntries, re(r(-1n)), "-- should append decremented total to roll");
    return;
  }

  if (kind === "pause_counts_only") {
    const state = unlockKey(initialState(), "\u23EF");
    const next = applyKeyAction(state, "\u23EF");
    assert.equal(next.keyPressCounts["\u23EF"] ?? 0, 1, "play/pause should count key press when unlocked");
    assert.deepEqual(next.calculator, state.calculator, "play/pause should not mutate calculator state");
    return;
  }

  if (kind === "memory_recall_sets_input") {
    let state = unlockKey(initialState(), "M→");
    state = unlockKey(state, "α,β,γ");
    state = {
      ...state,
      lambdaControl: {
        ...state.lambdaControl,
        alpha: 4,
      },
      ui: {
        ...state.ui,
        memoryVariable: "α",
      },
      calculator: {
        ...state.calculator,
        draftingSlot: { operator: "+", operandInput: "", isNegative: false },
      },
    };
    const next = applyKeyAction(state, "M→");
    assert.equal(next.calculator.draftingSlot?.operandInput, "4", "M→ should inject selected memory value like a digit");
    return;
  }

  if (kind === "memory_adjusts_allocator") {
    if (key === "M+") {
      const base = initialState();
      const state = unlockKey({
        ...base,
        allocator: {
          ...base.allocator,
          maxPoints: 1,
        },
        ui: {
          ...base.ui,
          memoryVariable: "α",
        },
      }, "M+");
      const next = applyKeyAction(state, "M+");
      assert.equal(next.allocator.allocations.width, 1, "M+ should increase selected allocator dimension");
      assert.equal(next.ui.keypadColumns, 2, "M+ on α should project to keypad column growth");
      return;
    }
    if (key === "M–") {
      const base = initialState();
      const state = unlockKey({
        ...base,
        allocator: {
          ...base.allocator,
          maxPoints: 1,
          allocations: {
            ...base.allocator.allocations,
            width: 1,
          },
        },
        ui: {
          ...base.ui,
          memoryVariable: "α",
        },
      }, "M–");
      const next = applyKeyAction(state, "M–");
      assert.equal(next.allocator.allocations.width, 0, "M– should decrease selected allocator dimension");
      assert.equal(next.ui.keypadColumns, 1, "M– on α should project to keypad column reduction");
      return;
    }
  }

  throw new Error(`Unknown primary expectation kind: ${kind}`);
};

const assertEdgeExpectation = (key: Key, kind: string): void => {
  if (kind === "digit_replaces_full_operand_digit") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          draftingSlot: { operator: "+", operandInput: "9", isNegative: false },
        },
      },
      key,
    );
    const next = applyKeyAction(state, key);
    assert.equal(next.calculator.draftingSlot?.operandInput, key, `digit ${key} should replace full one-digit operand`);
    return;
  }

  if (kind === "operator_replaces_empty_drafting_operator") {
    let state = unlockKey(initialState(), key);
    state = {
      ...state,
      calculator: {
        ...state.calculator,
        draftingSlot: { operator: "+", operandInput: "", isNegative: false },
      },
    };
    const next = applyKeyAction(state, key);
    assert.equal(next.calculator.draftingSlot?.operator, key, `operator ${key} should replace empty drafting slot operator`);
    return;
  }

  if (kind === "neg_toggles_drafting_sign") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          draftingSlot: { operator: "+", operandInput: "", isNegative: false },
        },
      },
      "NEG",
    );
    const next = applyKeyAction(state, "NEG");
    assert.equal(next.calculator.draftingSlot?.isNegative, true, "NEG should toggle drafting sign");
    return;
  }

  if (kind === "c_checklist_recorded_once") {
    const state = unlockKey(initialState(), "C");
    const once = applyKeyAction(state, "C");
    const twice = applyKeyAction(once, "C");
    const count = twice.completedUnlockIds.filter((id) => id === CHECKLIST_UNLOCK_ID).length;
    assert.equal(count, 1, "C should only record checklist unlock once");
    return;
  }

  if (kind === "ce_preserves_total_when_clearing") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          total: r(42n),
          rollEntries: re(r(40n), r(42n)),
          operationSlots: [{ operator: "-", operand: 2n }],
        },
      },
      "CE",
    );
    const next = applyKeyAction(state, "CE");
    assert.deepEqual(next.calculator.total, r(42n), "CE should preserve total");
    assert.equal(next.calculator.rollEntries.length, 0, "CE should clear roll");
    return;
  }

  if (kind === "undo_noop_when_roll_empty") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          total: r(7n),
          rollEntries: [],
          operationSlots: [{ operator: "+", operand: 9n }],
          draftingSlot: { operator: "-", operandInput: "2", isNegative: false },
        },
        unlocks: {
          ...initialState().unlocks,
          utilities: {
            ...initialState().unlocks.utilities,
            C: false,
            UNDO: true,
          },
        },
      },
      "UNDO",
    );
    const next = applyKeyAction(state, "UNDO");
    assert.deepEqual(next.calculator, state.calculator, "UNDO should be a no-op when roll is empty");
    assert.equal(next.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID), false, "UNDO should not perform C-style checklist unlock when roll is empty");
    return;
  }

  if (kind === "graph_does_not_mutate_calculator_state") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          total: r(11n),
          rollEntries: re(r(11n)),
          draftingSlot: { operator: "+", operandInput: "1", isNegative: false },
        },
      },
      key,
    );
    const next = applyKeyAction(state, key);
    assert.deepEqual(next.calculator, state.calculator, `${key} should not mutate calculator state`);
    return;
  }

  if (kind === "equals_division_by_zero_sets_nan") {
    const base = initialState();
    const state: GameState = {
      ...unlockKey(base, "="),
      calculator: {
        ...base.calculator,
        total: r(10n),
        operationSlots: [{ operator: "/" as const, operand: 0n }],
      },
    };
    const next = applyKeyAction(state, "=");
    assert.deepEqual(next.calculator.total, toNanCalculatorValue(), "division by zero should set total to NaN");
    assert.equal(next.calculator.rollEntries.at(-1)?.error?.code, "n/0", "division by zero should record error code");
    return;
  }

  if (kind === "increment_clears_pending_negative") {
    const state = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        pendingNegativeTotal: true,
      },
    };
    const next = applyKeyAction(state, "++");
    assert.equal(next.calculator.pendingNegativeTotal, false, "++ should clear pending negative sign");
    return;
  }

  if (kind === "decrement_clears_pending_negative") {
    const state = unlockKey({
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        pendingNegativeTotal: true,
      },
    }, "--");
    const next = applyKeyAction(state, "--");
    assert.equal(next.calculator.pendingNegativeTotal, false, "-- should clear pending negative sign");
    return;
  }

  if (kind === "pause_does_not_mutate_calculator_state") {
    const state = unlockKey(
      {
        ...initialState(),
        calculator: {
          ...initialState().calculator,
          total: r(5n),
          rollEntries: re(r(5n)),
        },
      },
      "\u23EF",
    );
    const next = applyKeyAction(state, "\u23EF");
    assert.deepEqual(next.calculator, state.calculator, "play/pause should not mutate calculator state");
    return;
  }

  if (kind === "memory_recall_noop_on_active_roll") {
    const base = initialState();
    const state = unlockKey(
      {
        ...base,
        ui: {
          ...base.ui,
          memoryVariable: "β",
        },
        calculator: {
          ...base.calculator,
          rollEntries: re(r(3n)),
        },
      },
      "M→",
    );
    const next = applyKeyAction(state, "M→");
    assert.deepEqual(next.calculator, state.calculator, "M→ should no-op while roll is active, like digit entry");
    return;
  }

  if (kind === "memory_adjust_noop_without_budget_or_bounds") {
    if (key === "M+") {
      const base = initialState();
      const state = unlockKey({
        ...base,
        ui: {
          ...base.ui,
          memoryVariable: "α",
        },
      }, "M+");
      const next = applyKeyAction(state, "M+");
      assert.equal(next.allocator.allocations.width, state.allocator.allocations.width, "M+ should no-op with no spare allocator budget");
      assert.equal(next.ui.keypadColumns, state.ui.keypadColumns, "M+ no-op should keep projected keypad width unchanged");
      return;
    }
    if (key === "M–") {
      const base = initialState();
      const state = unlockKey({
        ...base,
        ui: {
          ...base.ui,
          memoryVariable: "α",
        },
      }, "M–");
      const next = applyKeyAction(state, "M–");
      assert.equal(next.allocator.allocations.width, 0, "M– should no-op at lower bound");
      assert.equal(next.ui.keypadColumns, 1, "M– no-op at lower bound should keep projected width");
      return;
    }
  }

  throw new Error(`Unknown edge expectation kind: ${kind}`);
};

export const runKeyBehaviorContractTests = (): void => {
  const runtimeKeys = runtimeKeysFromInitialUnlocks();
  const catalogKeys = keyBehaviorCatalog.map((spec) => spec.key).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(catalogKeys, runtimeKeys, "key behavior catalog must define exactly one entry per runtime key");

  const uniqueCount = new Set(catalogKeys).size;
  assert.equal(uniqueCount, catalogKeys.length, "key behavior catalog must not contain duplicate key entries");

  const unlockEffectKeys = new Set<Key>();
  for (const unlock of unlockCatalog) {
    if (
      unlock.effect.type === "unlock_digit"
      || unlock.effect.type === "unlock_slot_operator"
      || unlock.effect.type === "unlock_utility"
      || unlock.effect.type === "unlock_execution"
    ) {
      unlockEffectKeys.add(unlock.effect.key);
    }
  }

  for (const spec of keyBehaviorCatalog) {
    if (spec.lockModel !== "unlockable") {
      continue;
    }
    assert.ok(spec.unlockPathPolicy, `unlockable key ${spec.key} must declare unlockPathPolicy`);
    if (spec.unlockPathPolicy === "catalog") {
      assert.ok(unlockEffectKeys.has(spec.key), `unlockable key ${spec.key} marked catalog must exist in unlock catalog effects`);
    }
  }

  for (const spec of keyBehaviorCatalog) {
    if (spec.lockModel === "unlockable") {
      assertLockedBehavior(spec.key);
    }
    assertPrimaryExpectation(spec.key, spec.primaryExpectation);
    assertEdgeExpectation(spec.key, spec.edgeCaseExpectation);
  }

  const legacySlotAdapter: SlotInputRuntimeAdapter = {
    name: "legacy.applyKeyAction",
    applyKeyAction,
  };
  const slotScenarios = getSlotInputScenariosByTag("legacy_contract");
  for (const scenario of slotScenarios) {
    const result = runScenario(legacySlotAdapter, scenario);
    if (scenario.expectedProjection) {
      assertScenarioResult(result, scenario.expectedProjection);
    }
  }
};
