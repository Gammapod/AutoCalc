import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import {
  toExplicitComplexCalculatorValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { ALG_CONSTANTS } from "../src/domain/algebraicScalar.js";
import { HISTORY_FLAG } from "../src/domain/state.js";
import { renderCircleVisualizerPanel } from "../src/ui/modules/visualizers/circleRenderer.js";
import { installDomHarness } from "./helpers/domHarness.js";

export const runUiModuleCircleRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-circle-panel]");
    assert.ok(panel, "expected circle visualizer mount");
    if (!panel) {
      return;
    }

    renderCircleVisualizerPanel(harness.root, initialState());
    assert.equal(panel.getAttribute("aria-hidden"), "false", "circle panel is visible after render");
    assert.equal(panel.querySelectorAll(".v2-circle-grid").length, 1, "circle panel renders one perimeter circle");
    assert.equal(panel.querySelectorAll(".v2-circle-theta-zero").length, 1, "circle panel renders one theta=0 gridline");
    assert.equal(panel.querySelectorAll(".v2-circle-center-dot").length, 1, "circle panel renders a center dot");
    const initialLabel = panel.querySelector<SVGTextElement>(".v2-circle-radius-label");
    assert.equal(initialLabel?.textContent, "|r| = 0", "circle panel renders exact zero magnitude label");
    assert.equal(panel.querySelectorAll(".v2-number-line-vector").length, 1, "circle panel renders one current-total vector");
    assert.equal(panel.querySelectorAll(".v2-number-line-vector-tip").length, 1, "circle panel renders one current-total vector tip");

    const vector = panel.querySelector<SVGLineElement>(".v2-number-line-vector");
    assert.equal(vector?.getAttribute("x1"), "50", "vector starts at center x");
    assert.equal(vector?.getAttribute("y1"), "50", "vector starts at center y");

    const withImaginaryTotal = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 0n, den: 1n }),
          toRationalScalarValue({ num: 2n, den: 1n }),
        ),
      },
    };
    renderCircleVisualizerPanel(harness.root, withImaginaryTotal);
    const upwardVector = panel.querySelector<SVGLineElement>(".v2-number-line-vector");
    assert.equal(upwardVector?.getAttribute("x2"), "50", "pure imaginary total points to top center x");
    assert.equal(upwardVector?.getAttribute("y2"), "5", "pure imaginary total points to top perimeter y");
    const imagLabel = panel.querySelector<SVGTextElement>(".v2-circle-radius-label");
    assert.equal(imagLabel?.textContent, "|r| = 2", "pure imaginary rational magnitude is exact");

    const withHalfComplex = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 1n, den: 2n }),
          toRationalScalarValue({ num: 1n, den: 2n }),
        ),
      },
    };
    renderCircleVisualizerPanel(harness.root, withHalfComplex);
    const radicalLabel = panel.querySelector<SVGTextElement>(".v2-circle-radius-label");
    assert.equal(radicalLabel?.textContent, "|r| = \u221A(1/2)", "complex rational magnitude renders exact radical form");

    const withAlgebraicUnitRotation = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExplicitComplexCalculatorValue(
          { kind: "alg", value: ALG_CONSTANTS.rotate15Cos },
          { kind: "alg", value: ALG_CONSTANTS.rotate15Sin },
        ),
      },
    };
    renderCircleVisualizerPanel(harness.root, withAlgebraicUnitRotation);
    const algebraicVector = panel.querySelector<SVGLineElement>(".v2-number-line-vector");
    const algebraicLabel = panel.querySelector<SVGTextElement>(".v2-circle-radius-label");
    assert.equal(algebraicLabel?.textContent, "|r| = 1", "unit-magnitude algebraic complex values simplify to exact unit radius label");
    assert.equal(Boolean(algebraicVector), true, "algebraic complex values render a vector");
    assert.equal(Number(algebraicVector?.getAttribute("x2")) > 50, true, "15-degree algebraic vector points to positive real side");
    assert.equal(Number(algebraicVector?.getAttribute("y2")) < 50, true, "15-degree algebraic vector points to positive imaginary side");

    const withHistoryAnalysis = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toRationalCalculatorValue({ num: 2n, den: 1n }),
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
        ],
        operationSlots: [{ kind: "unary" as const, operator: "unary_inc" as const }],
      },
      ui: {
        ...initialState().ui,
        buttonFlags: {
          ...initialState().ui.buttonFlags,
          [HISTORY_FLAG]: true,
        },
      },
    };
    renderCircleVisualizerPanel(harness.root, withHistoryAnalysis);
    assert.equal(panel.querySelectorAll(".v2-number-line-vector--history").length, 1, "history toggle adds previous-to-current segment");
    assert.equal(panel.querySelectorAll(".v2-number-line-vector--forecast").length, 1, "history toggle adds current-to-next segment");

    const withStepExpansion = {
      ...withHistoryAnalysis,
      settings: {
        ...withHistoryAnalysis.settings,
        stepExpansion: "on" as const,
      },
      calculator: {
        ...withHistoryAnalysis.calculator,
        operationSlots: [
          { kind: "unary" as const, operator: "unary_inc" as const },
          { kind: "unary" as const, operator: "unary_inc" as const },
          { kind: "unary" as const, operator: "unary_inc" as const },
        ],
      },
    };
    renderCircleVisualizerPanel(harness.root, withStepExpansion);
    assert.equal(
      panel.querySelectorAll(".v2-number-line-vector--forecast-step").length >= 1,
      true,
      "[ ??? ] toggle adds forecast step segments",
    );
  } finally {
    harness.teardown();
  }
};
