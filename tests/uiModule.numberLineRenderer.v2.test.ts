import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderNumberLineVisualizerPanel } from "../src/ui/modules/visualizers/numberLineRenderer.js";
import {
  toRationalCalculatorValue,
  toRationalScalarValue,
  toExplicitComplexCalculatorValue,
} from "../src/domain/calculatorValue.js";
import { HISTORY_FLAG } from "../src/domain/state.js";
import { installDomHarness } from "./helpers/domHarness.js";

export const runUiModuleNumberLineRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
    assert.ok(panel, "expected number line visualizer mount");
    if (!panel) {
      return;
    }

    renderNumberLineVisualizerPanel(harness.root, initialState());
    assert.equal(panel.getAttribute("aria-hidden"), "false", "number line panel is visible after render");
    assert.ok(panel.querySelector(".v2-number-line-center-tick"), "real totals render center tick");
    assert.equal(panel.querySelectorAll(".v2-number-line-axis").length, 1, "real totals render one axis");
    assert.equal(panel.querySelectorAll(".v2-number-line-arrowhead").length, 2, "real totals render two arrowheads");
    assert.equal(panel.querySelectorAll(".v2-number-line-grid-mark").length, 18, "real totals render 18 nonzero subdivision ticks");
    assert.equal(panel.querySelector(".v2-number-line-vector"), null, "no roll means no vector");
    assert.equal(panel.querySelector(".v2-number-line-vector-tip"), null, "no roll means no vector tip");
    assert.equal(panel.querySelector(".v2-number-line-vector--forecast"), null, "no roll means no forecast vector");
    const realScaleLabels = panel.querySelectorAll<SVGTextElement>(".v2-number-line-scale-label");
    assert.equal(realScaleLabels.length, 2, "real mode renders two scale labels for horizontal extremes");
    assert.equal(realScaleLabels[0]?.textContent, "-9", "left real scale label reflects current range");
    assert.equal(realScaleLabels[1]?.textContent, "9", "right real scale label reflects current range");

    const withRealRoll = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toRationalCalculatorValue({ num: 3n, den: 1n }),
        rollEntries: [{ y: toRationalCalculatorValue({ num: 3n, den: 1n }) }],
        operationSlots: [{ operator: "op_add" as const, operand: 2n }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withRealRoll);
    assert.ok(panel.querySelector(".v2-number-line-vector"), "roll values render vector");
    assert.ok(panel.querySelector(".v2-number-line-vector-tip"), "roll values render vector tip");
    assert.equal(panel.querySelector(".v2-number-line-vector--forecast"), null, "forecast remains hidden while history toggle is off");
    assert.equal(panel.querySelector(".v2-number-line-vector-tip--forecast"), null, "forecast tip remains hidden while history toggle is off");
    assert.equal(panel.querySelector(".v2-number-line-vector--history"), null, "history vector remains hidden while history toggle is off");
    assert.equal(panel.querySelector(".v2-number-line-plot--error"), null, "non-error roll keeps default plane styling");

    const withImaginaryTotal = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [{
          y: toExplicitComplexCalculatorValue(
            toRationalScalarValue({ num: 3n, den: 1n }),
            toRationalScalarValue({ num: 2n, den: 1n }),
          ),
        }],
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 3n, den: 1n }),
          toRationalScalarValue({ num: 2n, den: 1n }),
        ),
        operationSlots: [{ operator: "op_add" as const, operand: 1n }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withImaginaryTotal);
    assert.equal(panel.querySelector(".v2-number-line-center-tick"), null, "nonzero imaginary totals replace center tick");
    assert.equal(panel.querySelectorAll(".v2-number-line-axis").length, 2, "nonzero imaginary totals render horizontal and vertical axes");
    assert.equal(panel.querySelectorAll(".v2-number-line-arrowhead").length, 4, "nonzero imaginary totals render both axis arrowheads");
    assert.equal(panel.querySelectorAll(".v2-number-line-grid-mark").length, 36, "nonzero imaginary totals render 18x2 grid subdivisions");
    assert.ok(panel.querySelector(".v2-number-line-vector"), "complex roll values render vector");
    assert.ok(panel.querySelector(".v2-number-line-vector-tip"), "complex roll values render vector tip");
    const complexScaleLabels = panel.querySelectorAll<SVGTextElement>(".v2-number-line-scale-label");
    assert.equal(complexScaleLabels.length, 4, "complex mode renders real and imaginary extreme labels");

    const withHistoryEnabled = {
      ...withImaginaryTotal,
      ui: {
        ...withImaginaryTotal.ui,
        buttonFlags: {
          ...withImaginaryTotal.ui.buttonFlags,
          [HISTORY_FLAG]: true,
        },
      },
      calculator: {
        ...withImaginaryTotal.calculator,
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
          ...withImaginaryTotal.calculator.rollEntries,
        ],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withHistoryEnabled);
    assert.ok(panel.querySelector(".v2-number-line-vector--history"), "history toggle renders previous-roll vector");
    assert.ok(panel.querySelector(".v2-number-line-vector-tip--history"), "history toggle renders previous-roll vector tip");
    assert.ok(panel.querySelector(".v2-number-line-vector--forecast"), "history mode also renders forecast vector");
    const historyLine = panel.querySelector<SVGLineElement>(".v2-number-line-vector--history");
    const currentLine = panel.querySelector<SVGLineElement>(".v2-number-line-vector");
    const forecastLine = panel.querySelector<SVGLineElement>(".v2-number-line-vector--forecast");
    assert.equal(historyLine?.getAttribute("x2"), currentLine?.getAttribute("x2"), "history line ends at current point x");
    assert.equal(historyLine?.getAttribute("y2"), currentLine?.getAttribute("y2"), "history line ends at current point y");
    assert.equal(forecastLine?.getAttribute("x1"), currentLine?.getAttribute("x2"), "forecast line starts at current point x");
    assert.equal(forecastLine?.getAttribute("y1"), currentLine?.getAttribute("y2"), "forecast line starts at current point y");
    const layeredLines = panel.querySelectorAll<SVGLineElement>(".v2-number-line-vector, .v2-number-line-vector--history");
    assert.equal(layeredLines.length >= 2, true, "history mode renders at least two layered vectors");
    assert.equal(
      layeredLines[layeredLines.length - 1]?.classList.contains("v2-number-line-vector--history"),
      true,
      "shorter-magnitude history vector renders on top of longer current vector",
    );

    const withThreeLayerTie = {
      ...withHistoryEnabled,
      calculator: {
        ...withHistoryEnabled.calculator,
        total: toRationalCalculatorValue({ num: -2n, den: 1n }),
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: -2n, den: 1n }) },
        ],
        operationSlots: [{ operator: "op_add" as const, operand: 0n }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withThreeLayerTie);
    const tieLayers = panel.querySelectorAll<SVGLineElement>(".v2-number-line-vector--history, .v2-number-line-vector, .v2-number-line-vector--forecast");
    assert.equal(
      tieLayers[tieLayers.length - 1]?.classList.contains("v2-number-line-vector--forecast"),
      true,
      "shortest-magnitude forecast vector renders on top",
    );

    const withTieMagnitudes = {
      ...withHistoryEnabled,
      calculator: {
        ...withHistoryEnabled.calculator,
        total: toRationalCalculatorValue({ num: 2n, den: 1n }),
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 0n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
        ],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withTieMagnitudes);
    const tieLayeredLines = panel.querySelectorAll<SVGLineElement>(".v2-number-line-vector, .v2-number-line-vector--history");
    assert.equal(
      tieLayeredLines[tieLayeredLines.length - 1]?.classList.contains("v2-number-line-vector"),
      true,
      "equal magnitudes render newer current vector on top",
    );

    const withCurrentError = {
      ...withHistoryEnabled,
      calculator: {
        ...withHistoryEnabled.calculator,
        rollEntries: [{
          ...withHistoryEnabled.calculator.rollEntries[0],
          error: { code: "op_div" as const, kind: "division_by_zero" as const },
        }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withCurrentError);
    assert.ok(panel.querySelector(".v2-number-line-plot--error"), "error on current roll switches plane into error styling mode");
  } finally {
    harness.teardown();
  }
};
