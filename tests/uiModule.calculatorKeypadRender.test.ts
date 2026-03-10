import assert from "node:assert/strict";
import { installDomHarness } from "./helpers/domHarness.js";
import { initialState } from "../src/domain/state.js";
import { renderKeypadCells } from "../src/ui/modules/calculator/keypadRender.js";
import type { Action, GameState } from "../src/domain/types.js";

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
        keyLayout: [{ kind: "key", key: "1" as const }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        valueExpression: {
          ...initialState().unlocks.valueExpression,
          "1": true,
        },
      },
    };

    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, singleKeyState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const oneButton = keysEl.querySelector<HTMLButtonElement>("button[data-key='1']");
    assert.ok(oneButton, "renders configured single key");
    oneButton?.click();
    assert.equal(dispatches.length, 2, "single-key click dispatches normally");

    const unaryState: GameState = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        keyLayout: [{ kind: "key", key: "++" as const }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        maxSlots: 1,
        unaryOperators: {
          ...initialState().unlocks.unaryOperators,
          "++": true,
        },
      },
    };
    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, unaryState, dispatch, {
      calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const unaryButton = keysEl.querySelector<HTMLButtonElement>("button[data-key='++']");
    assert.equal(unaryButton?.classList.contains("key--group-slot_operator"), true, "unary key uses operator color group");
    assert.equal(unaryButton?.classList.contains("key--unary-operator"), true, "unary key receives unary stripe class");
  } finally {
    harness.teardown();
  }
};

