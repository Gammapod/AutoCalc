import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { executeCommand } from "../src/domain/commands.js";
import { EXECUTION_PAUSE_EQUALS_FLAG, initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import {
  buildPreDispatchBlockedInputFeedback,
  hasFeedbackEffectiveGameplayChange,
  resolveFeedbackTargetCalculatorId,
} from "../src/domain/inputFeedback.js";
import { materializeCalculatorG, materializeCalculatorMenu } from "../src/domain/multiCalculator.js";
import { setCellAtIndex, toKeyLayoutArray } from "../src/domain/keypadLayoutModel.js";
import { createStore } from "../src/app/store.js";
import { createInteractionRuntime } from "../src/app/interactionRuntime.js";
import type { Action, GameState, Key, UiEffect } from "../src/domain/types.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";

const findInputFeedback = (effects: UiEffect[]): Extract<UiEffect, { type: "input_feedback" }> | null =>
  effects.find((effect): effect is Extract<UiEffect, { type: "input_feedback" }> => effect.type === "input_feedback") ?? null;

const baseState = (): GameState => normalizeRuntimeStateInvariants(initialState());

const withStorageKey = (state: GameState, key: Key): GameState["ui"]["storageLayout"] => {
  if (state.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === key)) {
    return state.ui.storageLayout;
  }
  const next = [...state.ui.storageLayout];
  const emptyIndex = next.findIndex((cell) => cell === null);
  if (emptyIndex >= 0) {
    next[emptyIndex] = { kind: "key", key };
    return next;
  }
  next.push({ kind: "key", key });
  return next;
};

const withSharedStorage = (state: GameState, storageLayout: GameState["ui"]["storageLayout"]): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    storageLayout,
  },
  calculators: state.calculators
    ? {
      ...state.calculators,
      f: state.calculators.f
        ? {
            ...state.calculators.f,
            ui: {
              ...state.calculators.f.ui,
              storageLayout,
            },
          }
        : state.calculators.f,
      g: state.calculators.g
        ? {
            ...state.calculators.g,
            ui: {
              ...state.calculators.g.ui,
              storageLayout,
            },
          }
        : state.calculators.g,
      menu: state.calculators.menu
        ? {
            ...state.calculators.menu,
            ui: {
              ...state.calculators.menu.ui,
              storageLayout,
            },
          }
        : state.calculators.menu,
    }
    : state.calculators,
});

const buildSyncedClearedState = (): GameState => {
  const seed = withUtilityUnlocked(baseState(), KEY_ID.util_clear_all);
  return executeCommand(seed, {
    type: "DispatchAction",
    action: { type: "PRESS_KEY", key: KEY_ID.util_clear_all },
  }).state;
};

const withUtilityUnlocked = (state: GameState, key: typeof KEY_ID.util_clear_all | typeof KEY_ID.util_backspace | typeof KEY_ID.util_undo): GameState => ({
  ...withSharedStorage(state, withStorageKey(state, key)),
  unlocks: {
    ...state.unlocks,
    utilities: {
      ...state.unlocks.utilities,
      [key]: true,
    },
  },
});

const withMemoryUnlocked = (
  state: GameState,
  key: typeof KEY_ID.memory_adjust_plus | typeof KEY_ID.memory_adjust_minus | typeof KEY_ID.memory_cycle_variable,
): GameState => ({
  ...withSharedStorage(state, withStorageKey(state, key)),
  unlocks: {
    ...state.unlocks,
    memory: {
      ...state.unlocks.memory,
      [key]: true,
    },
  },
});

export const runInputFeedbackOutcomeTests = (): void => {
  {
    const base = baseState();
    const diagnosticsOnly: GameState = {
      ...base,
      keyPressCounts: {
        ...base.keyPressCounts,
        [KEY_ID.digit_1]: 1,
      },
      ui: {
        ...base.ui,
        diagnostics: {
          lastAction: {
            ...base.ui.diagnostics.lastAction,
            sequence: base.ui.diagnostics.lastAction.sequence + 1,
          },
        },
      },
    };
    assert.equal(
      hasFeedbackEffectiveGameplayChange(base, diagnosticsOnly),
      false,
      "feedback comparator ignores diagnostics/key-press counters",
    );
  }

  {
    const afterFirstClear = buildSyncedClearedState();
    const result = executeCommand(afterFirstClear, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.util_clear_all },
    });
    const feedback = findInputFeedback(result.uiEffects);
    assert.ok(feedback, "C no-op emits input feedback");
    assert.equal(feedback?.outcome, "rejected", "C on cleared state is rejected");
    assert.equal(feedback?.source, "domain_dispatch", "domain dispatch source recorded");
  }

  {
    const state = withUtilityUnlocked(buildSyncedClearedState(), KEY_ID.util_backspace);
    const result = executeCommand(state, { type: "DispatchAction", action: { type: "PRESS_KEY", key: KEY_ID.util_backspace } });
    const feedback = findInputFeedback(result.uiEffects);
    assert.equal(feedback?.outcome, "rejected", "backspace with no removable input is rejected");
  }

  {
    const state = withUtilityUnlocked(buildSyncedClearedState(), KEY_ID.util_undo);
    const result = executeCommand(state, { type: "DispatchAction", action: { type: "PRESS_KEY", key: KEY_ID.util_undo } });
    const feedback = findInputFeedback(result.uiEffects);
    assert.equal(feedback?.outcome, "rejected", "undo with empty roll is rejected");
  }

  {
    const base = baseState();
    const prepared: GameState = {
      ...base,
      lambdaControl: {
        ...base.lambdaControl,
        maxPoints: 12,
        alpha: 8,
        beta: 3,
        gamma: 1,
        gammaMinRaised: true,
      },
      allocator: {
        ...base.allocator,
        maxPoints: 12,
        allocations: {
          ...base.allocator.allocations,
          width: 8,
          height: 3,
          slots: 1,
        },
      },
      ui: {
        ...base.ui,
        keypadColumns: 8,
        keypadRows: 3,
        selectedControlField: "alpha",
      },
      calculators: base.calculators?.f
        ? {
            ...base.calculators,
            f: {
              ...base.calculators.f,
              lambdaControl: {
                ...base.calculators.f.lambdaControl,
                maxPoints: 12,
                alpha: 8,
                beta: 3,
                gamma: 1,
                gammaMinRaised: true,
              },
              allocator: {
                ...base.calculators.f.allocator,
                maxPoints: 12,
                allocations: {
                  ...base.calculators.f.allocator.allocations,
                  width: 8,
                  height: 3,
                  slots: 1,
                },
              },
              ui: {
                ...base.calculators.f.ui,
                keypadColumns: 8,
                keypadRows: 3,
                selectedControlField: "alpha",
              },
            },
          }
        : base.calculators,
    };
    const state = withMemoryUnlocked(prepared, KEY_ID.memory_adjust_plus);
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.memory_adjust_plus, calculatorId: "f" },
    });
    const feedback = findInputFeedback(result.uiEffects);
    assert.equal(feedback?.outcome, "rejected", "memory adjust with no effective value change is rejected");
  }

  {
    const base = withMemoryUnlocked(materializeCalculatorMenu(baseState()), KEY_ID.memory_cycle_variable);
    const state: GameState = {
      ...base,
      activeCalculatorId: "menu",
    };
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.memory_cycle_variable, calculatorId: "menu" },
    });
    const feedback = findInputFeedback(result.uiEffects);
    assert.equal(feedback?.outcome, "rejected", "memory cycle with no settable menu fields is rejected");
  }

  {
    const base = materializeCalculatorG(baseState());
    const gUi = base.calculators?.g?.ui;
    const gColumns = Math.max(1, gUi?.keypadColumns ?? 0);
    const gRows = Math.max(1, gUi?.keypadRows ?? 0);
    const gCells = gUi?.keypadCells ?? [];
    const withDestinationEmpty = setCellAtIndex(gCells, 0, gColumns, gRows, { kind: "placeholder", area: "empty" });
    const state: GameState = {
      ...base,
      unlocks: {
        ...base.unlocks,
        valueExpression: {
          ...base.unlocks.valueExpression,
          [KEY_ID.digit_1]: true,
        },
      },
      calculators: {
        ...base.calculators,
        g: base.calculators?.g
          ? {
              ...base.calculators.g,
              ui: {
                ...base.calculators.g.ui,
                keypadCells: withDestinationEmpty,
                keyLayout: toKeyLayoutArray(withDestinationEmpty, gColumns, gRows),
              },
            }
          : base.calculators?.g,
      },
    };
    state.ui = {
      ...state.ui,
      storageLayout: [{ kind: "key", key: KEY_ID.digit_1 }, ...state.ui.storageLayout.slice(1)],
    };
    const syncedState = withSharedStorage(state, state.ui.storageLayout);
    const action: Action = { type: "INSTALL_KEY_FROM_STORAGE", key: KEY_ID.digit_1, toSurface: "keypad_g", toIndex: 0 };
    const result = executeCommand(syncedState, { type: "DispatchAction", action });
    const feedback = findInputFeedback(result.uiEffects);
    assert.equal(feedback?.outcome, "accepted", "successful install is accepted");
    assert.equal(feedback?.calculatorId, "g", "successful install targets destination calculator");
  }

  {
    const base = materializeCalculatorG(baseState());
    const state: GameState = {
      ...base,
      unlocks: {
        ...base.unlocks,
        valueExpression: {
          ...base.unlocks.valueExpression,
          [KEY_ID.digit_1]: true,
        },
      },
    };
    state.ui = {
      ...state.ui,
      storageLayout: [{ kind: "key", key: KEY_ID.digit_1 }, ...state.ui.storageLayout.slice(1)],
    };
    const syncedState = withSharedStorage(state, state.ui.storageLayout);
    const action: Action = { type: "INSTALL_KEY_FROM_STORAGE", key: KEY_ID.digit_1, toSurface: "keypad_g", toIndex: 999 };
    const primed = executeCommand(syncedState, { type: "DispatchAction", action }).state;
    const result = executeCommand(primed, { type: "DispatchAction", action });
    const feedback = findInputFeedback(result.uiEffects);
    assert.equal(feedback?.outcome, "rejected", "rejected install is rejected");
    assert.equal(feedback?.calculatorId, "g", "rejected install targets destination calculator");
    assert.equal(feedback?.reasonCode, "layout_invalid_or_noop", "rejected install uses layout/noop reason");
  }

  {
    const base = materializeCalculatorG(baseState());
    const moveTargetedAction: Action = {
      type: "SWAP_LAYOUT_CELLS",
      fromSurface: "keypad_f",
      fromIndex: 999,
      toSurface: "keypad_g",
      toIndex: 0,
    };
    const feedbackTarget = resolveFeedbackTargetCalculatorId(base, moveTargetedAction);
    assert.equal(feedbackTarget, "g", "move/swap feedback resolves to destination calculator");

    const uninstallAction: Action = { type: "UNINSTALL_LAYOUT_KEY", fromSurface: "keypad_g", fromIndex: 999 };
    assert.equal(
      resolveFeedbackTargetCalculatorId(base, uninstallAction),
      "g",
      "uninstall feedback resolves to source calculator",
    );

    const activeSwitchAction: Action = { type: "SET_ACTIVE_CALCULATOR", calculatorId: "g" };
    assert.equal(
      resolveFeedbackTargetCalculatorId(base, activeSwitchAction),
      "g",
      "set active calculator feedback resolves to selected calculator",
    );
  }

  {
    const base = baseState();
    const state: GameState = {
      ...base,
      calculators: undefined,
      calculatorOrder: undefined,
      activeCalculatorId: undefined,
      perCalculatorCompletedUnlockIds: undefined,
      sessionControlProfiles: undefined,
      calculator: {
        ...base.calculator,
        rollEntries: [
          { y: { kind: "rational", value: { num: 1n, den: 1n } } },
          { y: { kind: "nan" }, error: { code: "seed_nan", kind: "nan_input" } },
        ],
      },
    };
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG },
    });
    const feedback = findInputFeedback(result.uiEffects);
    assert.equal(feedback?.outcome, "accepted", "execution toggle on NaN tail is accepted");
  }
  {
    const base = baseState();
    const state: GameState = {
      ...base,
      calculators: undefined,
      calculatorOrder: undefined,
      activeCalculatorId: undefined,
      perCalculatorCompletedUnlockIds: undefined,
      sessionControlProfiles: undefined,
      unlocks: {
        ...base.unlocks,
        maxSlots: Math.max(base.unlocks.maxSlots, 1),
        slotOperators: {
          ...base.unlocks.slotOperators,
          [KEY_ID.op_add]: true,
        },
      },
      calculator: {
        ...base.calculator,
        rollEntries: [
          { y: { kind: "rational", value: { num: 1n, den: 1n } } },
          { y: { kind: "nan" }, error: { code: "seed_nan", kind: "nan_input" } },
        ],
      },
    };
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: KEY_ID.op_add },
    });
    const feedback = findInputFeedback(result.uiEffects);
    assert.equal(feedback?.outcome, "accepted", "operator input on NaN tail is accepted");
  }

  {
    const store = createStore(baseState());
    let subscriberCalls = 0;
    const unsubscribe = store.subscribe(() => {
      subscriberCalls += 1;
    });
    const beforeState = store.getState();
    const blockedAction: Action = { type: "PRESS_KEY", key: KEY_ID.digit_1 };
    const runtime = createInteractionRuntime();
    runtime.setInputBlocked(true);
    assert.equal(runtime.shouldBlockAction(blockedAction), true, "interaction runtime blocks action when input is locked");
    const blockedFeedback = buildPreDispatchBlockedInputFeedback(beforeState, blockedAction);
    store.enqueueUiEffects([blockedFeedback]);
    const consumed = store.consumeUiEffects?.() ?? [];
    const feedback = findInputFeedback(consumed);
    assert.equal(store.getState(), beforeState, "enqueueing pre-dispatch feedback does not mutate reducer state");
    assert.equal(subscriberCalls, 1, "enqueueing pre-dispatch feedback still notifies subscribers");
    assert.equal(feedback?.outcome, "rejected", "blocked pre-dispatch attempt emits rejected feedback");
    assert.equal(feedback?.source, "pre_dispatch_block", "blocked pre-dispatch attempt source is tagged");
    assert.equal(feedback?.reasonCode, "pre_dispatch_block", "blocked pre-dispatch attempt reason is tagged");
    unsubscribe();
  }
};
