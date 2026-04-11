import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { executeCommand } from "../src/domain/commands.js";
import { EXECUTION_PAUSE_FLAG, initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { fromKeyLayoutArray } from "../src/domain/keypadLayoutModel.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";
import type { Action, GameState, Key, UiEffect } from "../src/domain/types.js";

const hasEffect = (effects: UiEffect[], effectType: UiEffect["type"]): boolean =>
  effects.some((effect) => effect.type === effectType);

const baseState = (): GameState => normalizeRuntimeStateInvariants(initialState());

const withKeyOnPrimaryKeypad = (state: GameState, key: Key): GameState => {
  const nextLayout = [...state.ui.keyLayout];
  nextLayout[0] = { kind: "key", key };
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout: nextLayout,
      keypadCells: fromKeyLayoutArray(nextLayout, state.ui.keypadColumns, state.ui.keypadRows),
    },
  };
};

const withUtilityUnlocked = (state: GameState, key: typeof KEY_ID.util_clear_all | typeof KEY_ID.util_backspace): GameState => ({
  ...state,
  unlocks: {
    ...state.unlocks,
    utilities: {
      ...state.unlocks.utilities,
      [key]: true,
    },
  },
});

const withExecutionUnlocked = (state: GameState, key: typeof KEY_ID.exec_step_through): GameState => ({
  ...state,
  unlocks: {
    ...state.unlocks,
    execution: {
      ...state.unlocks.execution,
      [key]: true,
    },
  },
});

export const runUiFeedbackPathwaysEffectsTests = (): void => {
  {
    const state = withUtilityUnlocked(
      withKeyOnPrimaryKeypad(
        {
          ...baseState(),
          calculator: {
            ...baseState().calculator,
            draftingSlot: { operator: KEY_ID.op_add, operandInput: "12", isNegative: false },
          },
        },
        KEY_ID.util_backspace,
      ),
      KEY_ID.util_backspace,
    );
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.util_backspace },
    });
    assert.equal(hasEffect(result.uiEffects, "builder_changed"), true, "builder-mutating keypress emits blue pathway");
  }

  {
    const state = withKeyOnPrimaryKeypad(
      {
        ...baseState(),
        unlocks: {
          ...baseState().unlocks,
          valueAtoms: {
            ...baseState().unlocks.valueAtoms,
            [KEY_ID.digit_1]: true,
          },
          valueExpression: {
            ...baseState().unlocks.valueExpression,
            [KEY_ID.digit_1]: true,
          },
        },
      },
      KEY_ID.digit_1,
    );
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.digit_1 },
    });
    assert.equal(hasEffect(result.uiEffects, "builder_changed"), true, "seed-total set input emits blue pathway");
  }

  {
    const state = withUtilityUnlocked(
      withKeyOnPrimaryKeypad(
        {
          ...baseState(),
          unlocks: {
            ...baseState().unlocks,
            valueAtoms: {
              ...baseState().unlocks.valueAtoms,
              [KEY_ID.digit_1]: true,
            },
            valueExpression: {
              ...baseState().unlocks.valueExpression,
              [KEY_ID.digit_1]: true,
            },
          },
        },
        KEY_ID.util_backspace,
      ),
      KEY_ID.util_backspace,
    );
    const withSeedSet = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.digit_1 },
    }).state;
    const result = executeCommand(withSeedSet, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.util_backspace },
    });
    assert.equal(hasEffect(result.uiEffects, "builder_changed"), true, "seed backspace emits blue pathway");
  }

  {
    const base = baseState();
    const result = executeCommand(base, {
      type: "DispatchAction",
      action: { type: "SET_CONTROL_FIELD", field: "alpha", value: base.lambdaControl.alpha + 1 },
    });
    assert.equal(hasEffect(result.uiEffects, "settings_changed"), true, "monitored setting value changes emit orange pathway");
  }

  {
    const base = baseState();
    const result = executeCommand(base, {
      type: "DispatchAction",
      action: { type: "SET_CONTROL_FIELD", field: "alpha", value: base.lambdaControl.alpha },
    });
    assert.equal(hasEffect(result.uiEffects, "settings_changed"), false, "setting no-op does not emit orange pathway");
  }

  {
    const state: GameState = {
      ...baseState(),
      calculator: {
        ...baseState().calculator,
        operationSlots: [{ kind: "unary", operator: KEY_ID.unary_inc }],
      },
    };
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.exec_equals },
    });
    assert.equal(hasEffect(result.uiEffects, "roll_updated"), true, "roll append emits green pathway");
  }

  {
    const state = withExecutionUnlocked(
      withKeyOnPrimaryKeypad(
        {
          ...baseState(),
          calculator: {
            ...baseState().calculator,
            operationSlots: [{ kind: "unary", operator: KEY_ID.unary_inc }],
          },
        },
        KEY_ID.exec_step_through,
      ),
      KEY_ID.exec_step_through,
    );
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.exec_step_through },
    });
    assert.equal(hasEffect(result.uiEffects, "substep_executed"), true, "step-through substep emits white pathway");
  }

  {
    const base = baseState();
    const state: GameState = {
      ...base,
      calculator: {
        ...base.calculator,
        operationSlots: [{ kind: "unary", operator: KEY_ID.unary_inc }],
      },
      ui: {
        ...base.ui,
        buttonFlags: {
          ...base.ui.buttonFlags,
          [EXECUTION_PAUSE_FLAG]: true,
        },
      },
    };
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "AUTO_STEP_TICK" } satisfies Action,
    });
    assert.equal(hasEffect(result.uiEffects, "substep_executed"), true, "auto-step substep emits white pathway");
  }

  {
    const state: GameState = {
      ...baseState(),
      calculator: {
        ...baseState().calculator,
        operationSlots: [{ kind: "unary", operator: KEY_ID.unary_inc }],
      },
    };
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.exec_equals },
    });
    assert.equal(hasEffect(result.uiEffects, "substep_executed"), false, "normal equals does not emit white pathway");
  }
};
