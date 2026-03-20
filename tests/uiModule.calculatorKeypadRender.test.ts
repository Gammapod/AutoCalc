import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { installDomHarness } from "./helpers/domHarness.js";
import { EXECUTION_PAUSE_FLAG, initialState } from "../src/domain/state.js";
import { renderKeypadCells } from "../src/ui/modules/calculator/keypadRender.js";
import type { Action, GameState } from "../src/domain/types.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";

export const runUiModuleCalculatorKeypadRenderTests = (): void => {
  const harness = installDomHarness();
  try {
    harness.document.body.setAttribute("data-ui-shell", "mobile");
    const keysEl = harness.root.querySelector<HTMLElement>("[data-keys]");
    assert.ok(keysEl, "expected keypad mount");
    if (!keysEl) {
      return;
    }
    keysEl.innerHTML = "";

    const state = initialState();
    const dispatches: Action[] = [];
    const dispatch = (action: Action): Action => {
      dispatches.push(action);
      return action;
    };

    renderKeypadCells(harness.root, keysEl, state, dispatch, {
            calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });

    const button = keysEl.querySelector<HTMLButtonElement>("button.key");
    assert.ok(button, "renders unlocked keypad key as button");
    button?.click();
    assert.equal(dispatches.length, 1, "click dispatches one action");

    const singleKeyState: GameState = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        keyLayout: [{ kind: "key", key: k("1") }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        valueExpression: {
          ...initialState().unlocks.valueExpression,
          [k("1")]: true,
        },
      },
    };

    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, singleKeyState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const oneButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${k("1")}']`);
    assert.ok(oneButton, "renders configured single key");
    oneButton?.click();
    assert.equal(dispatches.length, 2, "single-key click dispatches normally");

    const withAutoEqualsOn: GameState = {
      ...singleKeyState,
      ui: {
        ...singleKeyState.ui,
        buttonFlags: {
          ...singleKeyState.ui.buttonFlags,
          [EXECUTION_PAUSE_FLAG]: true,
        },
      },
    };
    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, withAutoEqualsOn, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const autoOffButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${k("1")}']`);
    autoOffButton?.click();
    assert.equal(dispatches.length, 3, "non-toggle key press dispatches only key press while play/pause is active");

    const playPauseState: GameState = {
      ...singleKeyState,
      ui: {
        ...singleKeyState.ui,
        keyLayout: [{ kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...singleKeyState.unlocks,
        execution: {
          ...singleKeyState.unlocks.execution,
          [KEY_ID.exec_play_pause]: true,
        },
      },
    };
    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, playPauseState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const playPauseButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${KEY_ID.exec_play_pause}']`);
    playPauseButton?.click();
    assert.equal(dispatches.length, 4, "play/pause key click dispatches one toggle action");

    const unaryState: GameState = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        keyLayout: [{ kind: "key", key: k("++") }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        maxSlots: 1,
        unaryOperators: {
          ...initialState().unlocks.unaryOperators,
          [k("++")]: true,
        },
      },
    };
    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, unaryState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const unaryButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${k("++")}']`);
    assert.equal(unaryButton?.classList.contains("key--group-slot_operator"), true, "unary key uses operator color group");
    assert.equal(unaryButton?.classList.contains("key--unary-operator"), true, "unary key receives unary stripe class");
  } finally {
    harness.teardown();
  }
};





