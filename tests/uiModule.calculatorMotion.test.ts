import assert from "node:assert/strict";
import { installDomHarness } from "./helpers/domHarness.js";
import { collectKeypadCellRects, playKeypadFlip, shouldReduceMotion } from "../src/ui/modules/calculator/motion.js";

export const runUiModuleCalculatorMotionTests = (): void => {
  const harness = installDomHarness();
  try {
    const container = harness.document.createElement("div");
    const cell = harness.document.createElement("div");
    cell.dataset.keypadCellId = "kp:r1:c1";
    container.appendChild(cell);

    const rects = collectKeypadCellRects(container);
    assert.equal(rects.size, 1, "collects keyed cell rects");

    playKeypadFlip(container, new Map(), {
      keypadSlotEnterAnimationName: "keypad-slot-enter",
      keypadSlotEnterDurationMs: 760,
    });
    assert.equal(cell.classList.contains("keypad-slot-enter"), false, "no flip applied with empty before rects");

    playKeypadFlip(container, new Map([["other", {} as DOMRect]]), {
      keypadSlotEnterAnimationName: "keypad-slot-enter",
      keypadSlotEnterDurationMs: 760,
    });
    assert.equal(cell.classList.contains("keypad-slot-enter"), true, "flip class applied for newly inserted cells");

    assert.equal(typeof shouldReduceMotion(), "boolean", "reduce-motion utility returns boolean");
  } finally {
    harness.teardown();
  }
};
