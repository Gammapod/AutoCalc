import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderNumberLineVisualizerPanel } from "../src/ui/modules/visualizers/numberLineRenderer.js";
import {
  toRationalCalculatorValue,
  toRationalScalarValue,
  toExplicitComplexCalculatorValue,
} from "../src/domain/calculatorValue.js";
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

    const withRealRoll = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [{ y: toRationalCalculatorValue({ num: 3n, den: 1n }) }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withRealRoll);
    assert.ok(panel.querySelector(".v2-number-line-vector"), "roll values render vector");
    assert.ok(panel.querySelector(".v2-number-line-vector-tip"), "roll values render vector tip");

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
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withImaginaryTotal);
    assert.equal(panel.querySelector(".v2-number-line-center-tick"), null, "nonzero imaginary totals replace center tick");
    assert.equal(panel.querySelectorAll(".v2-number-line-axis").length, 2, "nonzero imaginary totals render horizontal and vertical axes");
    assert.equal(panel.querySelectorAll(".v2-number-line-arrowhead").length, 4, "nonzero imaginary totals render both axis arrowheads");
    assert.equal(panel.querySelectorAll(".v2-number-line-grid-mark").length, 36, "nonzero imaginary totals render 18x2 grid subdivisions");
    assert.ok(panel.querySelector(".v2-number-line-vector"), "complex roll values render vector");
    assert.ok(panel.querySelector(".v2-number-line-vector-tip"), "complex roll values render vector tip");
  } finally {
    harness.teardown();
  }
};
