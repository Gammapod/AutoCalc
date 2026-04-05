import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { classifyExecutionPolicyAction } from "../src/domain/executionModePolicy.js";
import { DELTA_RANGE_CLAMP_FLAG, EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { GameState } from "../src/domain/types.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { legacyInitialState } from "./support/legacyState.js";
import { k, op } from "./support/keyCompat.js";

const buildExecutionPolicySeed = (): GameState => {
  const base = legacyInitialState();
  return {
    ...base,
    unlocks: {
      ...base.unlocks,
      valueExpression: {
        ...base.unlocks.valueExpression,
        [k("digit_1")]: true,
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        [op("op_add")]: true,
      },
      utilities: {
        ...base.unlocks.utilities,
        [k("util_backspace")]: true,
        [KEY_ID.toggle_delta_range_clamp]: true,
      },
      execution: {
        ...base.unlocks.execution,
        [KEY_ID.exec_play_pause]: true,
        [k("exec_equals")]: true,
      },
      visualizers: {
        ...base.unlocks.visualizers,
        [KEY_ID.viz_graph]: true,
      },
    },
    ui: {
      ...base.ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } },
        { kind: "key", key: k("digit_1") },
        { kind: "key", key: op("op_add") },
        { kind: "key", key: k("util_backspace") },
        { kind: "key", key: KEY_ID.toggle_delta_range_clamp, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
        { kind: "key", key: KEY_ID.viz_graph },
      ],
      keypadColumns: 6,
      keypadRows: 1,
    },
  };
};

export const runExecutionModePolicyTests = (): void => {
  const base = buildExecutionPolicySeed();
  const active = reducer(base, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG });

  assert.deepEqual(
    classifyExecutionPolicyAction(base, { type: "PRESS_KEY", key: k("digit_1") }),
    { decision: "allow" },
    "inactive execution mode allows value input",
  );
  const rollInverseAnyState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries: [
        { y: { kind: "rational", value: { num: 1n, den: 1n } } },
      ],
    },
  };
  assert.deepEqual(
    classifyExecutionPolicyAction(rollInverseAnyState, { type: "PRESS_KEY", key: k("exec_roll_inverse") }),
    { decision: "allow" },
    "roll-inverse input is execution-allowed and resolves ambiguity in execution, not policy gating",
  );
  const rollInverseAllowedState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries: [
        { y: { kind: "rational", value: { num: 1n, den: 1n } } },
        { y: { kind: "rational", value: { num: 2n, den: 1n } } },
        { y: { kind: "rational", value: { num: 3n, den: 1n } } },
      ],
    },
  };
  assert.deepEqual(
    classifyExecutionPolicyAction(rollInverseAllowedState, { type: "PRESS_KEY", key: k("exec_roll_inverse") }),
    { decision: "allow" },
    "roll-inverse policy allows valid semantic input when execution mode is inactive",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "PRESS_KEY", key: k("digit_1") }),
    { decision: "reject" },
    "active execution mode rejects value input",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "PRESS_KEY", key: k("util_backspace") }),
    { decision: "interrupt_and_run", interrupt: { type: "clear_all_except_key", key: KEY_ID.util_backspace } },
    "utility input interrupts execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG }),
    { decision: "interrupt_and_run", interrupt: { type: "clear_all_except_flag", flag: EXECUTION_PAUSE_FLAG } },
    "execution toggle keeps itself while clearing other execution flags",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "TOGGLE_FLAG", flag: DELTA_RANGE_CLAMP_FLAG }),
    { decision: "interrupt_and_run", interrupt: { type: "clear_all" } },
    "designated settings toggle interrupts execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "TOGGLE_FLAG", flag: "sticky.negate" }),
    { decision: "allow" },
    "non-designated flags pass through",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(
      active,
      { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 },
    ),
    { decision: "reject" },
    "active-surface layout mutation is rejected during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(
      active,
      { type: "MOVE_LAYOUT_CELL", fromSurface: "storage", fromIndex: 0, toSurface: "storage", toIndex: 1 },
    ),
    { decision: "allow" },
    "storage-only layout mutation is allowed during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 2 }),
    { decision: "reject" },
    "keypad dimension mutation is rejected during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "TOGGLE_VISUALIZER", visualizer: "graph" }),
    { decision: "allow" },
    "visualizer toggle remains allowed during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(
      active,
      { type: "SWAP_LAYOUT_CELLS", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 },
    ),
    { decision: "reject" },
    "swap touching active keypad surface is rejected during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(
      active,
      { type: "INSTALL_KEY_FROM_STORAGE", key: k("digit_1"), toSurface: "keypad", toIndex: 0 },
    ),
    { decision: "reject" },
    "install touching active keypad surface is rejected during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(
      active,
      { type: "UNINSTALL_LAYOUT_KEY", fromSurface: "keypad", fromIndex: 0 },
    ),
    { decision: "reject" },
    "uninstall touching active keypad surface is rejected during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "UPGRADE_KEYPAD_ROW" }),
    { decision: "reject" },
    "keypad row upgrade is rejected during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "UPGRADE_KEYPAD_COLUMN" }),
    { decision: "reject" },
    "keypad column upgrade is rejected during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(active, { type: "AUTO_STEP_TICK" }),
    { decision: "allow" },
    "AUTO_STEP_TICK passes through policy classifier",
  );
  const nanLocked: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries: [
        { y: { kind: "rational", value: { num: 1n, den: 1n } } },
        { y: { kind: "nan" }, error: { code: "seed_nan", kind: "nan_input" } },
      ],
    },
  };
  assert.deepEqual(
    classifyExecutionPolicyAction(nanLocked, { type: "PRESS_KEY", key: k("exec_roll_inverse") }),
    { decision: "allow" },
    "NaN tail allows roll-inverse input when execution mode is inactive",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(nanLocked, { type: "PRESS_KEY", key: k("exec_step_through") }),
    { decision: "allow" },
    "NaN tail allows step-through input when execution mode is inactive",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(nanLocked, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG }),
    { decision: "interrupt_and_run", interrupt: { type: "clear_all_except_flag", flag: EXECUTION_PAUSE_FLAG } },
    "NaN tail allows play/pause toggle execution behavior",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(nanLocked, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG }),
    { decision: "interrupt_and_run", interrupt: { type: "clear_all_except_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } },
    "NaN tail allows equals-toggle execution behavior",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(nanLocked, { type: "PRESS_KEY", key: op("op_add") }),
    { decision: "allow" },
    "NaN tail allows binary operator input when execution mode is inactive",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(nanLocked, { type: "PRESS_KEY", key: KEY_ID.unary_sigma }),
    { decision: "allow" },
    "NaN tail allows unary operator input when execution mode is inactive",
  );

  const dual = reducer(reducer(base, { type: "UNLOCK_ALL" }), { type: "SET_ACTIVE_CALCULATOR", calculatorId: "f" });
  const dualActive: GameState = {
    ...dual,
    ui: {
      ...dual.ui,
      buttonFlags: {
        ...dual.ui.buttonFlags,
        [EXECUTION_PAUSE_FLAG]: true,
      },
    },
  };
  assert.deepEqual(
    classifyExecutionPolicyAction(
      dualActive,
      { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad_g", fromIndex: 0, toSurface: "storage", toIndex: 0 },
    ),
    { decision: "allow" },
    "dual-calculator layout mutation on non-active keypad is allowed during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(
      dualActive,
      { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad_f", fromIndex: 0, toSurface: "storage", toIndex: 0 },
    ),
    { decision: "reject" },
    "dual-calculator layout mutation on active keypad is rejected during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(
      dualActive,
      { type: "INSTALL_KEY_FROM_STORAGE", key: k("digit_1"), toSurface: "keypad_g", toIndex: 0 },
    ),
    { decision: "allow" },
    "dual-calculator install on non-active keypad is allowed during execution mode",
  );
  assert.deepEqual(
    classifyExecutionPolicyAction(
      dualActive,
      { type: "UNINSTALL_LAYOUT_KEY", fromSurface: "keypad_g", fromIndex: 0 },
    ),
    { decision: "allow" },
    "dual-calculator uninstall on non-active keypad is allowed during execution mode",
  );
};

