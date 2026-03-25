import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { keyBehaviorCatalog } from "../src/content/keyBehavior.catalog.js";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { reducer } from "../src/domain/reducer.js";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { executeCommand } from "../src/domain/commands.js";
import { CHECKLIST_UNLOCK_ID, EXECUTION_PAUSE_EQUALS_FLAG } from "../src/domain/state.js";
import { getButtonFace, isDigitKeyId, KEY_ID, resolveKeyId } from "../src/domain/keyPresentation.js";
import { resolveMemoryRecallDigit } from "../src/domain/memoryController.js";
import type { GameState, Key, KeyInput, RollEntry } from "../src/domain/types.js";
import { getSlotInputScenariosByTag } from "./helpers/slotInput.contractFixtures.js";
import { assertScenarioResult, runScenario, type SlotInputRuntimeAdapter } from "./helpers/slotInput.contractRunner.js";
import { legacyInitialState } from "./support/legacyState.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

const runEqualsToggleToCompletion = (state: GameState): GameState => {
  let next = reducer(state, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  for (let index = 0; index < 32; index += 1) {
    if (!next.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]) {
      break;
    }
    const stepped = reducer(next, { type: "AUTO_STEP_TICK" });
    if (stepped === next) {
      break;
    }
    next = stepped;
  }
  return next;
};

const runtimeKeysFromInitialUnlocks = (): Key[] => {
  const state = legacyInitialState();
  return [
    ...(Object.keys(state.unlocks.valueExpression) as Key[]),
    ...(Object.keys(state.unlocks.slotOperators) as Key[]),
    ...(Object.keys(state.unlocks.unaryOperators) as Key[]),
    ...(Object.keys(state.unlocks.utilities) as Key[]),
    ...(Object.keys(state.unlocks.memory) as Key[]),
    ...(Object.keys(state.unlocks.steps) as Key[]),
    ...(Object.keys(state.unlocks.visualizers) as Key[]),
    ...(Object.keys(state.unlocks.execution) as Key[]),
  ]
    .filter((key) => key !== KEY_ID.toggle_delta_range_clamp && key !== KEY_ID.toggle_mod_zero_to_delta)
    .filter((key) => key !== KEY_ID.toggle_binary_mode)
    .filter((key) => key !== KEY_ID.toggle_step_expansion && key !== KEY_ID.exec_step_through)
    .sort((a, b) => a.localeCompare(b));
};

const ensureKeyOnKeypad = (state: GameState, key: Key): GameState => {
  if (state.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === key)) {
    return state;
  }
  const placeholderIndex = state.ui.keyLayout.findIndex((cell) => cell.kind === "placeholder");
  if (placeholderIndex >= 0) {
    return {
      ...state,
      ui: {
        ...state.ui,
        keyLayout: state.ui.keyLayout.map((cell, index) => (index === placeholderIndex ? { kind: "key", key } : cell)),
      },
    };
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout: [...state.ui.keyLayout, { kind: "key", key }],
      keypadColumns: state.ui.keypadColumns + 1,
      keypadRows: 1,
    },
  };
};

const unlockKey = (state: GameState, keyLike: KeyInput): GameState => {
  const key = resolveKeyId(keyLike);
  const prepared = ensureKeyOnKeypad(state, key);
  if (key in prepared.unlocks.valueAtoms || key in prepared.unlocks.valueCompose || key in prepared.unlocks.valueExpression) {
    return {
      ...prepared,
      unlocks: {
        ...prepared.unlocks,
        valueAtoms: key in prepared.unlocks.valueAtoms
          ? {
            ...prepared.unlocks.valueAtoms,
            [key]: true,
          }
          : prepared.unlocks.valueAtoms,
        valueCompose: key in prepared.unlocks.valueCompose
          ? {
            ...prepared.unlocks.valueCompose,
            [key]: true,
          }
          : prepared.unlocks.valueCompose,
        valueExpression: {
          ...prepared.unlocks.valueExpression,
          [key]: true,
        },
      },
    };
  }
  if (key in prepared.unlocks.slotOperators) {
    return {
      ...prepared,
      unlocks: {
        ...prepared.unlocks,
        maxSlots: Math.max(prepared.unlocks.maxSlots, 1),
        slotOperators: {
          ...prepared.unlocks.slotOperators,
          [key]: true,
        },
      },
    };
  }
  if (key in prepared.unlocks.unaryOperators) {
    return {
      ...prepared,
      unlocks: {
        ...prepared.unlocks,
        maxSlots: Math.max(prepared.unlocks.maxSlots, 1),
        unaryOperators: {
          ...prepared.unlocks.unaryOperators,
          [key]: true,
        },
      },
    };
  }
  if (key in prepared.unlocks.utilities) {
    return {
      ...prepared,
      unlocks: {
        ...prepared.unlocks,
        utilities: {
          ...prepared.unlocks.utilities,
          [key]: true,
        },
      },
    };
  }
  if (key in prepared.unlocks.memory) {
    return {
      ...prepared,
      unlocks: {
        ...prepared.unlocks,
        memory: {
          ...prepared.unlocks.memory,
          [key]: true,
        },
      },
    };
  }
  if (key in prepared.unlocks.steps) {
    return {
      ...prepared,
      unlocks: {
        ...prepared.unlocks,
        steps: {
          ...prepared.unlocks.steps,
          [key]: true,
        },
      },
    };
  }
  if (key in prepared.unlocks.visualizers) {
    return {
      ...prepared,
      unlocks: {
        ...prepared.unlocks,
        visualizers: {
          ...prepared.unlocks.visualizers,
          [key]: true,
        },
      },
    };
  }
  return {
    ...prepared,
    unlocks: {
      ...prepared.unlocks,
      execution: {
        ...prepared.unlocks.execution,
        [key]: true,
      },
    },
  };
};

const assertLockedBehavior = (key: Key): void => {
  const base = legacyInitialState();
  if (base.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === key)) {
    return;
  }
  const next = applyKeyAction(base, key);
  assert.deepEqual(next, base, `locked key ${key} should be a no-op`);
  assert.equal(next.keyPressCounts[key] ?? 0, 0, `locked key ${key} should not increment key press count`);
};

const assertPrimaryExpectation = (key: Key, kind: string): void => {
  if (kind === "digit_sets_drafting_operand") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          draftingSlot: { operator: op("op_add"), operandInput: "", isNegative: false },
        },
      },
      key,
    );
    const next = applyKeyAction(state, key);
    const expectedInput = isDigitKeyId(key) ? getButtonFace(key) : key;
    assert.equal(next.calculator.draftingSlot?.operandInput, expectedInput, `digit ${key} should populate drafting operand`);
    return;
  }

  if (kind === "operator_starts_drafting") {
    const state = unlockKey(legacyInitialState(), key);
    const next = applyKeyAction(state, key);
    assert.equal(next.calculator.draftingSlot?.operator, key, `operator ${key} should start drafting`);
    return;
  }

  if (kind === "unary_operator_inserts_pair") {
    const state = unlockKey(legacyInitialState(), key);
    const next = applyKeyAction(state, key);
    assert.equal(next.calculator.draftingSlot, null, `${key} does not create binary drafting state`);
    assert.deepEqual(next.calculator.operationSlots.at(-1), { kind: "unary", operator: key }, `${key} appends unary slot`);
    return;
  }

  if (kind === "c_resets_calculator") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          total: r(7n),
          rollEntries: re(r(7n), r(9n)),
          operationSlots: [{ operator: op("op_add"), operand: 1n }],
          draftingSlot: { operator: op("op_sub"), operandInput: "2", isNegative: false },
        },
      },
      "util_clear_all",
    );
    const next = applyKeyAction(state, "util_clear_all");
    assert.deepEqual(next.calculator.total, r(0n), "C should reset total");
    assert.equal(next.calculator.rollEntries.length, 0, "C should clear roll");
    assert.equal(next.calculator.operationSlots.length, 0, "C should clear slots");
    assert.equal(next.calculator.draftingSlot, null, "C should clear drafting slot");
    return;
  }

  if (kind === "backspace_deletes_last_input") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          draftingSlot: { operator: op("op_add"), operandInput: "9", isNegative: false },
        },
      },
      "util_backspace",
    );
    const next = applyKeyAction(state, "util_backspace");
    assert.equal(next.calculator.draftingSlot?.operandInput, "", "backspace should delete the last drafting digit");
    return;
  }

  if (kind === "undo_pops_roll") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          total: r(9n),
          rollEntries: re(r(3n), r(5n), r(9n)),
        },
      },
      "util_undo",
    );
    const next = applyKeyAction(state, "util_undo");
    assert.deepEqual(
      next.calculator.rollEntries.map((entry) => entry.y),
      [r(3n), r(5n)],
      "UNDO should pop one roll entry",
    );
    assert.deepEqual(next.calculator.total, r(5n), "UNDO should set total to previous roll entry");
    return;
  }

  if (kind === "graph_counts_only") {
    const state = unlockKey(legacyInitialState(), key);
    const next = applyKeyAction(state, key);
    assert.equal(next.keyPressCounts[key] ?? 0, 1, `${key} should count key press when unlocked`);
    assert.deepEqual(next.calculator, state.calculator, `${key} should not mutate calculator state`);
    return;
  }

  if (kind === "equals_toggles_auto_step_mode") {
    let state = unlockKey(legacyInitialState(), "exec_equals");
    state = unlockKey(state, "op_add");
    state = unlockKey(state, "digit_1");
    state = applyKeyAction(state, "op_add");
    state = applyKeyAction(state, "digit_1");
    const next = runEqualsToggleToCompletion(state);
    assert.deepEqual(next.calculator.total, r(1n), "= should execute drafted operation sequence");
    assert.equal(Boolean(next.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), false, "= toggle clears after terminal commit");
    return;
  }

  if (kind === "roll_inverse_executes_predecessor") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          total: r(3n),
          rollEntries: re(r(1n), r(2n), r(3n)),
        },
      },
      KEY_ID.exec_roll_inverse,
    );
    const next = applyKeyAction(state, KEY_ID.exec_roll_inverse);
    assert.deepEqual(next.calculator.total, r(2n), "[ _ _ ]^-1 should set total to predecessor of first matching current value");
    assert.deepEqual(next.calculator.rollEntries.at(-1)?.y, r(2n), "[ _ _ ]^-1 should append predecessor row value");
    return;
  }

  if (kind === "memory_recall_sets_input") {
    let state = unlockKey(legacyInitialState(), KEY_ID.memory_recall);
    state = unlockKey(state, KEY_ID.memory_cycle_variable);
    state = unlockKey(state, "op_add");
    state = {
      ...state,
      lambdaControl: {
        ...state.lambdaControl,
        alpha: 4,
      },
      ui: {
        ...state.ui,
        memoryVariable: state.ui.memoryVariable,
      },
      completedUnlockIds: unlockCatalog.map((unlock) => unlock.id),
      calculator: {
        ...state.calculator,
        draftingSlot: { operator: op("op_add"), operandInput: "", isNegative: false },
      },
    };
    const next = applyKeyAction(state, KEY_ID.memory_recall);
    assert.equal(
      next.calculator.draftingSlot?.operandInput,
      resolveMemoryRecallDigit(state),
      "M\u2192 should inject selected memory value like a digit",
    );
    return;
  }

  if (kind === "memory_adjusts_allocator") {
    if (key === k("memory_adjust_plus")) {
      const base = legacyInitialState();
      const state = unlockKey({
        ...base,
        lambdaControl: {
          ...base.lambdaControl,
          maxPoints: 5,
        },
        allocator: {
          ...base.allocator,
          maxPoints: 5,
        },
        ui: {
          ...base.ui,
          memoryVariable: base.ui.memoryVariable,
        },
      }, "memory_adjust_plus");
      const next = applyKeyAction(state, "memory_adjust_plus");
      assert.equal(next.allocator.allocations.width, 3, "M+ should increase selected allocator dimension");
      assert.equal(next.ui.keypadColumns, 3, "M+ on α should project to keypad column growth");
      return;
    }
    if (key === k("memory_adjust_minus")) {
      const base = legacyInitialState();
      const state = unlockKey({
        ...base,
        lambdaControl: {
          ...base.lambdaControl,
          maxPoints: 5,
          alpha: 2,
        },
        allocator: {
          ...base.allocator,
          maxPoints: 5,
          allocations: {
            ...base.allocator.allocations,
            width: 2,
          },
        },
        ui: {
          ...base.ui,
          keypadColumns: 2,
          memoryVariable: base.ui.memoryVariable,
        },
      }, "memory_adjust_minus");
      const next = applyKeyAction(state, "memory_adjust_minus");
      assert.equal(next.allocator.allocations.width, 1, "M\u2013 should decrease selected allocator dimension");
      assert.equal(next.ui.keypadColumns, 1, "M\u2013 on α should project to keypad column reduction");
      return;
    }
  }

  if (kind === "system_key_requests_mode_transition") {
    const state = unlockKey(legacyInitialState(), key);
    const result = executeCommand(state, { type: "DispatchAction", action: { type: "PRESS_KEY", key } });
    assert.equal(
      result.uiEffects.some((effect) => effect.type === "request_mode_transition"),
      true,
      `${key} should emit request_mode_transition intent`,
    );
    return;
  }

  if (kind === "system_key_requests_quit") {
    const state = unlockKey(legacyInitialState(), key);
    const result = executeCommand(state, { type: "DispatchAction", action: { type: "PRESS_KEY", key } });
    assert.equal(
      result.uiEffects.some((effect) => effect.type === "quit_application"),
      true,
      `${key} should emit quit_application intent`,
    );
    return;
  }

  throw new Error(`Unknown primary expectation kind: ${kind}`);
};

const assertEdgeExpectation = (key: Key, kind: string): void => {
  if (kind === "digit_replaces_full_operand_digit") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          draftingSlot: { operator: op("op_add"), operandInput: "9", isNegative: false },
        },
      },
      key,
    );
    const next = applyKeyAction(state, key);
    const expectedInput = isDigitKeyId(key) ? getButtonFace(key) : key;
    assert.equal(next.calculator.draftingSlot?.operandInput, expectedInput, `digit ${key} should replace full one-digit operand`);
    return;
  }

  if (kind === "operator_replaces_empty_drafting_operator") {
    let state = unlockKey(legacyInitialState(), key);
    state = {
      ...state,
      calculator: {
        ...state.calculator,
        draftingSlot: { operator: op("op_add"), operandInput: "", isNegative: false },
      },
    };
    const next = applyKeyAction(state, key);
    assert.equal(next.calculator.draftingSlot?.operator, key, `operator ${key} should replace empty drafting slot operator`);
    return;
  }

  if (kind === "unary_operator_clears_active_roll_then_inserts_pair") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          total: r(5n),
          rollEntries: re(r(5n)),
          operationSlots: [{ operator: op("op_add"), operand: 9n }],
          draftingSlot: { operator: op("op_sub"), operandInput: "2", isNegative: false },
        },
      },
      key,
    );
    const next = applyKeyAction(state, key);
    assert.equal(next.calculator.rollEntries.length, 0, "unary operator clears active roll before insertion");
    assert.equal(next.calculator.draftingSlot, null, "unary operator keeps drafting cleared after active-roll preprocess");
    assert.deepEqual(next.calculator.operationSlots, [{ kind: "unary", operator: key }], "unary operator appends unary slot after clear");
    return;
  }

  if (kind === "c_checklist_recorded_once") {
    const state = unlockKey(legacyInitialState(), "util_clear_all");
    const once = applyKeyAction(state, "util_clear_all");
    const twice = applyKeyAction(once, "util_clear_all");
    const count = twice.completedUnlockIds.filter((id) => id === CHECKLIST_UNLOCK_ID).length;
    assert.equal(count, 1, "C should only record checklist unlock once");
    return;
  }

  if (kind === "backspace_noop_when_nothing_to_delete") {
    const state = unlockKey(legacyInitialState(), "util_backspace");
    const next = applyKeyAction(state, "util_backspace");
    assert.deepEqual(next.calculator, state.calculator, "backspace should no-op when nothing is deletable");
    return;
  }

  if (kind === "undo_noop_when_roll_empty") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          total: r(7n),
          rollEntries: [],
          operationSlots: [{ operator: op("op_add"), operand: 9n }],
          draftingSlot: { operator: op("op_sub"), operandInput: "2", isNegative: false },
        },
        unlocks: {
          ...legacyInitialState().unlocks,
        utilities: {
          ...legacyInitialState().unlocks.utilities,
          ...utilityUnlockPatch([["util_clear_all", false], ["util_undo", true]]),
        },
      },
      },
      "util_undo",
    );
    const next = applyKeyAction(state, "util_undo");
    assert.deepEqual(next.calculator, state.calculator, "UNDO should be a no-op when roll is empty");
    assert.equal(next.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID), false, "UNDO should not perform C-style checklist unlock when roll is empty");
    return;
  }

  if (kind === "graph_does_not_mutate_calculator_state") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          total: r(11n),
          rollEntries: re(r(11n)),
          draftingSlot: { operator: op("op_add"), operandInput: "1", isNegative: false },
        },
      },
      key,
    );
    const next = applyKeyAction(state, key);
    assert.deepEqual(next.calculator, state.calculator, `${key} should not mutate calculator state`);
    return;
  }

  if (kind === "equals_toggle_division_by_zero_sets_nan") {
    const base = legacyInitialState();
    const state: GameState = {
      ...unlockKey(base, "exec_equals"),
      calculator: {
        ...base.calculator,
        total: r(10n),
        operationSlots: [{ operator: op("op_div"), operand: 0n }],
      },
    };
    const next = runEqualsToggleToCompletion(state);
    assert.deepEqual(next.calculator.total, toNanCalculatorValue(), "division by zero should set total to NaN");
    assert.equal(next.calculator.rollEntries.at(-1)?.error?.code, "n/0", "division by zero should record error code");
    assert.equal(Boolean(next.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), false, "= toggle clears after terminal error commit");
    return;
  }

  if (kind === "roll_inverse_rejects_on_error") {
    const base = legacyInitialState();
    const state = unlockKey(
      {
        ...base,
        calculator: {
          ...base.calculator,
          total: r(4n),
          rollEntries: [
            { y: r(1n) },
            { y: toNanCalculatorValue(), error: { code: "NaN", kind: "nan_input" } },
            { y: r(4n) },
          ],
        },
      },
      KEY_ID.exec_roll_inverse,
    );
    const next = applyKeyAction(state, KEY_ID.exec_roll_inverse);
    assert.deepEqual(next, state, "[ _ _ ]^-1 should reject when any roll row has an error");
    return;
  }

  if (kind === "memory_recall_noop_on_active_roll") {
    const base = legacyInitialState();
    const state = unlockKey(
      {
        ...base,
        ui: {
          ...base.ui,
          keypadColumns: 2,
          memoryVariable: base.ui.memoryVariable,
        },
        completedUnlockIds: unlockCatalog.map((unlock) => unlock.id),
        calculator: {
          ...base.calculator,
          rollEntries: re(r(3n)),
        },
      },
      KEY_ID.memory_recall,
    );
    const next = applyKeyAction(state, KEY_ID.memory_recall);
    assert.deepEqual(next.calculator, state.calculator, "M\u2192 should no-op while roll is active, like digit entry");
    return;
  }

  if (kind === "memory_adjust_noop_without_budget_or_bounds") {
    if (key === k("memory_adjust_plus")) {
      const base = legacyInitialState();
      const state = unlockKey({
        ...base,
        ui: {
          ...base.ui,
          keypadColumns: 2,
          memoryVariable: base.ui.memoryVariable,
        },
      }, "memory_adjust_plus");
      const next = applyKeyAction(state, "memory_adjust_plus");
      assert.equal(next.allocator.allocations.width, state.allocator.allocations.width, "M+ should no-op with no spare allocator budget");
      assert.equal(next.ui.keypadColumns, state.ui.keypadColumns, "M+ no-op should keep projected keypad width unchanged");
      return;
    }
    if (key === k("memory_adjust_minus")) {
      const base = legacyInitialState();
      const state = unlockKey({
        ...base,
        lambdaControl: {
          ...base.lambdaControl,
          maxPoints: 2,
          alpha: 1,
        },
        allocator: {
          ...base.allocator,
          maxPoints: 2,
          allocations: {
            ...base.allocator.allocations,
            width: 1,
          },
        },
        ui: {
          ...base.ui,
          memoryVariable: base.ui.memoryVariable,
        },
      }, "memory_adjust_minus");
      const next = applyKeyAction(state, "memory_adjust_minus");
      assert.equal(next.allocator.allocations.width, 1, "M\u2013 should no-op at lower bound");
      assert.equal(next.ui.keypadColumns, state.ui.keypadColumns, "M\u2013 no-op at lower bound should keep projected width");
      return;
    }
  }

  if (kind === "system_key_leaves_domain_state_unchanged") {
    const state = unlockKey(
      {
        ...legacyInitialState(),
        calculator: {
          ...legacyInitialState().calculator,
          total: r(11n),
          rollEntries: re(r(11n)),
          draftingSlot: { operator: op("op_add"), operandInput: "1", isNegative: false },
        },
      },
      key,
    );
    const next = applyKeyAction(state, key);
    assert.deepEqual(next.calculator, state.calculator, `${key} should not mutate calculator domain state`);
    return;
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
      || unlock.effect.type === "unlock_memory"
      || unlock.effect.type === "unlock_execution"
      || unlock.effect.type === "unlock_visualizer"
    ) {
      unlockEffectKeys.add(unlock.effect.key);
    }
  }

  for (const spec of keyBehaviorCatalog) {
    if (spec.lockModel !== "unlockable") {
      continue;
    }
    assert.ok(spec.unlockPathPolicy, `unlockable key ${spec.key} must declare unlockPathPolicy`);
  }
  assert.ok(unlockEffectKeys.size >= 1, "current catalog retains at least one unlockable key effect");

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













