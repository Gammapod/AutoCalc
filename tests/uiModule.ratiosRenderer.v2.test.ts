import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { toExplicitComplexCalculatorValue, toRationalScalarValue } from "../src/domain/calculatorValue.js";
import { clearRatiosVisualizerPanel, renderRatiosVisualizerPanel } from "../src/ui/modules/visualizers/ratiosRenderer.js";
import { installDomHarness } from "./helpers/domHarness.js";

export const runUiModuleRatiosRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-ratios-panel]");
    assert.ok(panel, "expected ratios visualizer mount");
    if (!panel) {
      return;
    }

    renderRatiosVisualizerPanel(harness.root, initialState());
    assert.equal(panel.getAttribute("aria-hidden"), "false", "ratios panel is visible after render");
    const table = panel.querySelector<HTMLElement>(".v2-ratios-table");
    assert.ok(table, "ratios panel renders table scaffold");
    assert.equal(panel.querySelectorAll(".v2-ratios-row").length, 2, "ratios panel renders imaginary and real rows");
    assert.equal(panel.querySelectorAll(".v2-ratios-separator").length, 2, "ratios panel renders one ':' separator per row");
    const imaginaryRow = panel.querySelector<HTMLElement>(".v2-ratios-row--imaginary");
    assert.equal(imaginaryRow?.getAttribute("data-ux-role"), "imaginary", "imaginary row uses imaginary feedback channel role");
    const initialTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(initialTokens, ["0", "1", "0", "1"], "initial ratios display defaults to Im 0:1 and Re 0:1");
    const initialSlotCounts = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-slot-count"));
    assert.deepEqual(initialSlotCounts, ["3", "1", "3", "1"], "initial ratios slots use delta for numerators and delta_q for denominators");

    const withComplexRationalTotal = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 7n, den: 5n }),
          toRationalScalarValue({ num: -2n, den: 3n }),
        ),
      },
      unlocks: {
        ...initialState().unlocks,
        maxTotalDigits: 6,
      },
      lambdaControl: {
        ...initialState().lambdaControl,
        delta_q: 4,
      },
    };
    renderRatiosVisualizerPanel(harness.root, withComplexRationalTotal);
    const complexTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(complexTokens, ["-2", "3", "7", "5"], "ratios panel maps Im num:den on top row and Re num:den on bottom row");
    const complexSlotCounts = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-slot-count"));
    assert.deepEqual(complexSlotCounts, ["6", "4", "6", "4"], "ratios slots track configured delta and delta_q");
    assert.equal(
      panel.querySelectorAll(".v2-ratios-display .seg--on").length > 0,
      true,
      "ratios panel renders seven-segment active glyphs",
    );

    const withWideDigitBudgets = {
      ...withComplexRationalTotal,
      unlocks: {
        ...withComplexRationalTotal.unlocks,
        maxTotalDigits: 11,
      },
      lambdaControl: {
        ...withComplexRationalTotal.lambdaControl,
        delta_q: 10,
      },
    };
    renderRatiosVisualizerPanel(harness.root, withWideDigitBudgets);
    const wideSlotCounts = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-slot-count"));
    assert.deepEqual(wideSlotCounts, ["11", "10", "11", "10"], "ratios supports slots above 8 up to total-display cap");

    clearRatiosVisualizerPanel(harness.root);
    assert.equal(panel.getAttribute("aria-hidden"), "true", "clear helper hides ratios panel");
    assert.equal((panel.textContent ?? "").trim(), "", "clear helper empties ratios panel content");
  } finally {
    harness.teardown();
  }
};
