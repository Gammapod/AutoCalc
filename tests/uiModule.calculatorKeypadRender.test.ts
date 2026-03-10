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

    const rejectState: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        draftingSlot: { operator: "#" as const, operandInput: "3", isNegative: false },
      },
      ui: {
        ...initialState().ui,
        keyLayout: [{ kind: "key", key: "NEG" as const }],
        keypadColumns: 1,
        keypadRows: 1,
      },
      unlocks: {
        ...initialState().unlocks,
        valueExpression: {
          ...initialState().unlocks.valueExpression,
          NEG: true,
        },
      },
    };

    keysEl.innerHTML = "";
    renderKeypadCells(harness.root, keysEl, rejectState, dispatch, {
            calculatorKeysLocked: false,
      newlyUnlockedKeys: new Set(),
      bindUnlockAnimationLock: () => {},
    });
    const negButton = keysEl.querySelector<HTMLButtonElement>("button[data-key='NEG']");
    assert.ok(negButton, "renders NEG key when present on keypad");
    negButton?.click();
    assert.equal(dispatches.length, 1, "rejected NEG press does not dispatch an action");
    const slotDisplay = harness.root.querySelector<HTMLElement>("[data-slot]");
    assert.ok(slotDisplay?.classList.contains("display--slot-reject-blink"), "rejected NEG press blinks operation slot");
  } finally {
    harness.teardown();
  }
};

