import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { installDomHarness } from "./helpers/domHarness.js";
import { EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG, initialState } from "../src/domain/state.js";
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
        keyLayout: [{ kind: "key", key: k("digit_1") }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        valueExpression: {
          ...initialState().unlocks.valueExpression,
          [k("digit_1")]: true,
        },
      },
    };

    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, singleKeyState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const oneButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${k("digit_1")}']`);
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
    const autoOffButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${k("digit_1")}']`);
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

    const equalsToggleState: GameState = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        keyLayout: [{ kind: "key", key: KEY_ID.exec_equals }],
        keypadColumns: 1,
        keypadRows: 1,
        buttonFlags: {
          ...initialState().ui.buttonFlags,
          [EXECUTION_PAUSE_EQUALS_FLAG]: true,
        },
      },
      unlocks: {
        ...initialState().unlocks,
        execution: {
          ...initialState().unlocks.execution,
          [KEY_ID.exec_equals]: true,
        },
      },
    };
    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, equalsToggleState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const equalsButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${KEY_ID.exec_equals}']`);
    assert.equal(equalsButton?.classList.contains("key--toggle-active"), true, "= key renders as physically toggled while auto-step mode is active");
    assert.equal(equalsButton?.getAttribute("aria-pressed"), "true", "= key sets aria-pressed while auto-step mode is active");

    const unaryState: GameState = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        keyLayout: [{ kind: "key", key: k("unary_inc") }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        maxSlots: 1,
        unaryOperators: {
          ...initialState().unlocks.unaryOperators,
          [k("unary_inc")]: true,
        },
      },
    };
    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, unaryState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const unaryButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${k("unary_inc")}']`);
    assert.equal(unaryButton?.classList.contains("key--group-slot_operator"), true, "unary key uses operator color group");
    assert.equal(unaryButton?.classList.contains("key--unary-operator"), true, "unary key receives unary stripe class");

    const binaryState: GameState = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        keyLayout: [{ kind: "key", key: k("op_add") }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        maxSlots: 1,
        slotOperators: {
          ...initialState().unlocks.slotOperators,
          [k("op_add")]: true,
        },
      },
    };
    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, binaryState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const binaryButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${k("op_add")}']`);
    assert.equal(binaryButton?.classList.contains("key--group-slot_operator"), true, "binary key uses operator group styling");
    assert.equal(binaryButton?.classList.contains("key--unary-operator"), false, "binary key does not receive unary-only stripe class");
    const cssRules = Array.from(harness.document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from((sheet as CSSStyleSheet).cssRules).map((rule) => rule.cssText);
        } catch {
          return [];
        }
      });
    const binaryAccentRule = cssRules.find((text) => text.includes(".key.key--group-slot_operator:not(.key--unary-operator)::after"));
    assert.equal(Boolean(binaryAccentRule), true, "binary-only corner-accent pseudo-element CSS rule exists at runtime");
    assert.equal(
      binaryAccentRule?.includes("aspect-ratio: 1 / 1") && binaryAccentRule?.includes("clip-path: polygon(100% 0, 100% 100%, 0 100%)"),
      true,
      "binary-only corner-accent runtime rule keeps width-independent 45-degree triangle geometry",
    );

    const visualizerState: GameState = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        keyLayout: [{ kind: "key", key: k("viz_feed") }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        visualizers: {
          ...initialState().unlocks.visualizers,
          [k("viz_feed")]: true,
        },
      },
    };
    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, visualizerState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const visualizerButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${k("viz_feed")}']`);
    assert.equal(visualizerButton?.classList.contains("key--group-settings"), true, "visualizer key uses unified settings color group");

    const binaryModeState: GameState = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        keyLayout: [{ kind: "key", key: KEY_ID.toggle_binary_mode }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        utilities: {
          ...initialState().unlocks.utilities,
          [KEY_ID.toggle_binary_mode]: true,
        },
      },
    };
    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, binaryModeState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const binaryModeButton = keysEl.querySelector<HTMLButtonElement>(`button[data-key='${KEY_ID.toggle_binary_mode}']`);
    assert.equal(binaryModeButton?.classList.contains("key--group-settings"), true, "binary mode key stays in settings group");
  } finally {
    harness.teardown();
  }
};






