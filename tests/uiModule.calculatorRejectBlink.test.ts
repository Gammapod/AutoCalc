import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderCalculatorV2Module } from "../src/ui/modules/calculator/render.js";
import { disposeCalculatorV2Module } from "../src/ui/modules/calculator/runtime.js";
import type { Action } from "../src/domain/types.js";
import { installDomHarness } from "./helpers/domHarness.js";

const noopDispatch = (_action: Action): Action => _action;

export const runUiModuleCalculatorRejectBlinkTests = (): void => {
  const harness = installDomHarness();
  try {
    const displayWindow = harness.root.querySelector<HTMLElement>("[data-display-window]");
    const rejectLed = harness.root.querySelector<HTMLElement>("[data-calc-led='rejected']");
    const rollLed = harness.root.querySelector<HTMLElement>("[data-calc-led='roll_updated']");
    const unlockLed = harness.root.querySelector<HTMLElement>("[data-calc-led='unlock_completed']");
    assert.ok(displayWindow, "expected display window mount");
    assert.ok(rejectLed, "expected reject led mount");
    assert.ok(rollLed, "expected roll led mount");
    assert.ok(unlockLed, "expected unlock led mount");
    if (!displayWindow) {
      return;
    }
    if (!rejectLed || !rollLed || !unlockLed) {
      return;
    }

    renderCalculatorV2Module(harness.root, initialState(), noopDispatch, { inputBlocked: false });
    assert.equal(
      displayWindow.classList.contains("display--slot-reject-blink"),
      false,
      "baseline render has no reject blink class",
    );
    assert.equal(
      rejectLed.classList.contains("calc-led--pulse-red"),
      false,
      "baseline render has no reject led pulse",
    );
    assert.equal(
      rollLed.classList.contains("calc-led--pulse-green"),
      false,
      "baseline render has no roll-update led pulse",
    );
    assert.equal(
      unlockLed.classList.contains("calc-led--pulse-purple"),
      false,
      "baseline render has no unlock led pulse",
    );

    renderCalculatorV2Module(harness.root, initialState(), noopDispatch, {
      inputBlocked: false,
      executionGateRejectCount: 1,
      rejectedInputCount: 1,
    });
    assert.equal(
      displayWindow.classList.contains("display--slot-reject-blink"),
      true,
      "nonce increase applies reject blink class",
    );
    assert.equal(
      rejectLed.classList.contains("calc-led--pulse-red"),
      true,
      "reject input count applies red led pulse class",
    );

    displayWindow.classList.remove("display--slot-reject-blink");
    rejectLed.classList.remove("calc-led--pulse-red");
    rollLed.classList.remove("calc-led--pulse-green");
    unlockLed.classList.remove("calc-led--pulse-purple");
    renderCalculatorV2Module(harness.root, initialState(), noopDispatch, {
      inputBlocked: false,
      executionGateRejectCount: 0,
    });
    assert.equal(
      displayWindow.classList.contains("display--slot-reject-blink"),
      false,
      "unchanged nonce does not retrigger reject blink",
    );
    assert.equal(
      rejectLed.classList.contains("calc-led--pulse-red"),
      false,
      "zero rejected input count does not pulse red led",
    );
    assert.equal(
      rollLed.classList.contains("calc-led--pulse-green"),
      false,
      "zero roll-update count does not pulse green led",
    );
    assert.equal(
      unlockLed.classList.contains("calc-led--pulse-purple"),
      false,
      "zero unlock count does not pulse purple led",
    );

    renderCalculatorV2Module(harness.root, initialState(), noopDispatch, {
      inputBlocked: false,
      rollUpdatedCount: 1,
    });
    assert.equal(
      rollLed.classList.contains("calc-led--pulse-green"),
      true,
      "roll-update count applies green led pulse class",
    );

    renderCalculatorV2Module(harness.root, initialState(), noopDispatch, {
      inputBlocked: false,
      unlockCompletedCount: 1,
    });
    assert.equal(
      unlockLed.classList.contains("calc-led--pulse-purple"),
      true,
      "unlock-completed count applies purple led pulse class",
    );

    renderCalculatorV2Module(harness.root, initialState(), noopDispatch, {
      inputBlocked: false,
      executionGateRejectCount: 2,
    });
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

