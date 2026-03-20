import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderCalculatorV2Module } from "../src/ui/modules/calculator/render.js";
import { disposeCalculatorV2Module } from "../src/ui/modules/calculator/runtime.js";
import type { Action, GameState } from "../src/domain/types.js";
import { installDomHarness } from "./helpers/domHarness.js";

const noopDispatch = (_action: Action): Action => _action;

export const runUiModuleCalculatorRejectBlinkTests = (): void => {
  const harness = installDomHarness();
  try {
    const displayWindow = harness.root.querySelector<HTMLElement>("[data-display-window]");
    assert.ok(displayWindow, "expected display window mount");
    if (!displayWindow) {
      return;
    }

    renderCalculatorV2Module(harness.root, initialState(), noopDispatch, { inputBlocked: false });
    assert.equal(
      displayWindow.classList.contains("display--slot-reject-blink"),
      false,
      "baseline render has no reject blink class",
    );

    const firstRejected: GameState = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        invalidExecutionGateNonce: 1,
      },
    };
    renderCalculatorV2Module(harness.root, firstRejected, noopDispatch, { inputBlocked: false });
    assert.equal(
      displayWindow.classList.contains("display--slot-reject-blink"),
      true,
      "nonce increase applies reject blink class",
    );

    displayWindow.classList.remove("display--slot-reject-blink");
    renderCalculatorV2Module(harness.root, firstRejected, noopDispatch, { inputBlocked: false });
    assert.equal(
      displayWindow.classList.contains("display--slot-reject-blink"),
      false,
      "unchanged nonce does not retrigger reject blink",
    );

    const secondRejected: GameState = {
      ...firstRejected,
      ui: {
        ...firstRejected.ui,
        invalidExecutionGateNonce: 2,
      },
    };
    renderCalculatorV2Module(harness.root, secondRejected, noopDispatch, { inputBlocked: false });
    assert.equal(
      displayWindow.classList.contains("display--slot-reject-blink"),
      true,
      "subsequent nonce increase retriggers reject blink",
    );
  } finally {
    disposeCalculatorV2Module(harness.root);
    harness.teardown();
  }
};
