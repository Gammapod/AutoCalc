import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import {
  toAlgebraicScalarValue,
  toExplicitComplexCalculatorValue,
  toExpressionScalarValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { ALG_CONSTANTS } from "../src/domain/algebraicScalar.js";
import { symbolicExpr } from "../src/domain/expression.js";
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
    assert.equal(panel.querySelectorAll(".v2-circle-imag-axis").length, 1, "circle panel renders one imaginary-axis gridline");
    assert.equal(panel.querySelectorAll(".v2-circle-projection-imag").length, 1, "circle panel renders one imaginary projection line");
    assert.equal(panel.querySelectorAll(".v2-circle-projection-real").length, 1, "circle panel renders one real projection line");
    const thetaZeroLine = panel.querySelector<SVGLineElement>(".v2-circle-theta-zero");
    assert.equal(thetaZeroLine?.getAttribute("x1"), "9", "theta=0 guide starts at left perimeter");
    assert.equal(thetaZeroLine?.getAttribute("x2"), "91", "theta=0 guide ends at right perimeter");
    assert.equal(thetaZeroLine?.getAttribute("y1"), "46", "theta=0 guide stays on center y");
    assert.equal(thetaZeroLine?.getAttribute("y2"), "46", "theta=0 guide stays on center y");
    const imaginaryAxisLine = panel.querySelector<SVGLineElement>(".v2-circle-imag-axis");
    assert.equal(imaginaryAxisLine?.getAttribute("x1"), "50", "imaginary-axis guide stays on center x");
    assert.equal(imaginaryAxisLine?.getAttribute("x2"), "50", "imaginary-axis guide stays on center x");
    assert.equal(imaginaryAxisLine?.getAttribute("y1"), "5", "imaginary-axis guide starts at top perimeter");
    assert.equal(imaginaryAxisLine?.getAttribute("y2"), "87", "imaginary-axis guide ends at bottom perimeter");
    assert.equal(panel.querySelectorAll(".v2-circle-center-dot").length, 1, "circle panel renders a center dot");
    const initialLabel = panel.querySelector<SVGTextElement>(".v2-circle-radius-label");
    assert.equal(initialLabel?.textContent, "|r| = 0", "circle panel renders exact zero magnitude label");
    assert.equal(panel.querySelectorAll(".v2-number-line-vector").length, 0, "circle panel does not render a main current-total vector");
    assert.equal(panel.querySelectorAll(".v2-number-line-vector-tip").length, 0, "circle panel does not render a main current-total vector tip");

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
    const imaginaryProjectionAtPureImag = panel.querySelector<SVGLineElement>(".v2-circle-projection-imag");
    assert.equal(imaginaryProjectionAtPureImag?.getAttribute("x1"), "50", "pure imaginary total projects from top-center x");
    assert.equal(imaginaryProjectionAtPureImag?.getAttribute("y1"), "5", "pure imaginary total projects from top perimeter y");
    const imagLabel = panel.querySelector<SVGTextElement>(".v2-circle-radius-label");
    const imagLabelImaginaryPart = imagLabel?.querySelector<SVGTSpanElement>("tspan[data-ux-role='imaginary']");
    assert.equal(imagLabel?.textContent, "r\u00B2 = (0)\u00B2 + (2)\u00B2", "pure imaginary rational complex shows radius-squared decomposition");
    assert.equal(imagLabelImaginaryPart?.textContent, " + (2)\u00B2", "pure imaginary complex marks the full imaginary square term");

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
    assert.equal(radicalLabel?.textContent, "r\u00B2 = (1/2)\u00B2 + (1/2)\u00B2", "complex rational magnitude shows radius-squared decomposition");

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
    const algebraicLabel = panel.querySelector<SVGTextElement>(".v2-circle-radius-label");
    const algebraicImagProjection = panel.querySelector<SVGLineElement>(".v2-circle-projection-imag");
    const algebraicRealProjection = panel.querySelector<SVGLineElement>(".v2-circle-projection-real");
    assert.equal(
      algebraicLabel?.textContent,
      "r\u00B2 = (1\u20444\u00D7\u221A2 + 1\u20444\u00D7\u221A6)\u00B2 + (-1\u20444\u00D7\u221A2 + 1\u20444\u00D7\u221A6)\u00B2",
      "unit-magnitude algebraic complex values show radius-squared decomposition",
    );
    assert.equal(Number(algebraicImagProjection?.getAttribute("x1")) > 50, true, "15-degree algebraic projections originate on positive real side");
    assert.equal(Number(algebraicImagProjection?.getAttribute("y1")) < 50, true, "15-degree algebraic projections originate on positive imaginary side");
    assert.equal(algebraicImagProjection?.getAttribute("x2"), algebraicImagProjection?.getAttribute("x1"), "imaginary projection keeps constant x");
    assert.equal(algebraicImagProjection?.getAttribute("y2"), "46", "imaginary projection terminates on horizontal diameter");
    assert.equal(algebraicRealProjection?.getAttribute("x1"), algebraicImagProjection?.getAttribute("x1"), "real projection starts at the same tip x");
    assert.equal(algebraicRealProjection?.getAttribute("y1"), algebraicImagProjection?.getAttribute("y1"), "real projection starts at the same tip y");
    assert.equal(algebraicRealProjection?.getAttribute("x2"), "50", "real projection terminates on vertical diameter");
    assert.equal(algebraicRealProjection?.getAttribute("y2"), algebraicImagProjection?.getAttribute("y1"), "real projection keeps constant y");

    const withSymbolicComplexMagnitude = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExplicitComplexCalculatorValue(
          toExpressionScalarValue(symbolicExpr("a")),
          toExpressionScalarValue(symbolicExpr("b")),
        ),
      },
    };
    renderCircleVisualizerPanel(harness.root, withSymbolicComplexMagnitude);
    const symbolicMagnitudeLabel = panel.querySelector<SVGTextElement>(".v2-circle-radius-label");
    const symbolicImaginaryPart = symbolicMagnitudeLabel?.querySelector<SVGTSpanElement>("tspan[data-ux-role='imaginary']");
    assert.equal(symbolicMagnitudeLabel?.textContent, "r\u00B2 = (a)\u00B2 + (b)\u00B2", "symbolic complex magnitude uses radius-squared decomposition");
    assert.equal(symbolicMagnitudeLabel?.getAttribute("x"), "50", "circle magnitude label is centered under the circle");
    assert.equal(symbolicMagnitudeLabel?.getAttribute("y"), "89", "circle magnitude label sits below the circle perimeter");
    assert.equal(symbolicImaginaryPart?.textContent, " + (b)\u00B2", "circle magnitude fallback marks the operator, imaginary scalar, parentheses, and square with the imaginary UX role");
    assert.equal(symbolicImaginaryPart?.getAttribute("x"), "50", "imaginary radius term starts a centered second line");
    assert.equal(symbolicImaginaryPart?.getAttribute("dy"), "5", "imaginary radius term is split onto the second line");

    const withAlgebraicFallbackMagnitude = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExplicitComplexCalculatorValue(
          toAlgebraicScalarValue({ sqrt3: { num: 1n, den: 2n } }),
          toAlgebraicScalarValue({ one: { num: 1n, den: 2n }, sqrt3: { num: 2n, den: 1n } }),
        ),
      },
    };
    renderCircleVisualizerPanel(harness.root, withAlgebraicFallbackMagnitude);
    const algebraicFallbackLabel = panel.querySelector<SVGTextElement>(".v2-circle-radius-label");
    const algebraicFallbackImaginaryPart = algebraicFallbackLabel?.querySelector<SVGTSpanElement>("tspan[data-ux-role='imaginary']");
    assert.equal(
      algebraicFallbackLabel?.textContent,
      "r\u00B2 = (1\u20442\u00D7\u221A3)\u00B2 + (1\u20442 + 2\u00D7\u221A3)\u00B2",
      "algebraic complex magnitude uses radius-squared decomposition and algebraic scalar formatting",
    );
    assert.equal(
      algebraicFallbackImaginaryPart?.textContent,
      " + (1\u20442 + 2\u00D7\u221A3)\u00B2",
      "algebraic fallback colors the addition and full imaginary square term",
    );

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
      settings: {
        ...initialState().settings,
        forecast: "on" as const,
        history: "on" as const,
      },
    };
    renderCircleVisualizerPanel(harness.root, withHistoryAnalysis);
    assert.equal(panel.querySelectorAll(".v2-number-line-vector--history").length, 1, "history toggle adds previous-to-current segment");
    assert.equal(panel.querySelectorAll(".v2-number-line-vector--forecast").length, 1, "history toggle adds current-to-next segment");
    assert.equal(panel.querySelectorAll(".v2-number-line-cycle-line").length, 0, "cycle overlay is absent without cycle metadata");

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

    const withCycleOverlay = {
      ...withHistoryAnalysis,
      settings: {
        ...withHistoryAnalysis.settings,
        cycle: "on" as const,
      },
      calculator: {
        ...withHistoryAnalysis.calculator,
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: 0n, den: 1n }),
              toRationalScalarValue({ num: 1n, den: 1n }),
            ),
          },
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: -1n, den: 1n }),
              toRationalScalarValue({ num: 0n, den: 1n }),
            ),
          },
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: 0n, den: 1n }),
              toRationalScalarValue({ num: -1n, den: 1n }),
            ),
          },
          { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: 0n, den: 1n }),
              toRationalScalarValue({ num: 1n, den: 1n }),
            ),
          },
        ],
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 0n, den: 1n }),
          toRationalScalarValue({ num: 1n, den: 1n }),
        ),
        rollAnalysis: {
          stopReason: "cycle" as const,
          cycle: { i: 1, j: 5, transientLength: 1, periodLength: 4 },
        },
      },
    };
    renderCircleVisualizerPanel(harness.root, withCycleOverlay);
    assert.equal(panel.querySelectorAll(".v2-number-line-cycle-line").length, 5, "circle cycle overlay renders chain plus closure constellation");
    assert.equal(panel.querySelectorAll(".v2-number-line-cycle-line--chain").length, 4, "circle cycle overlay renders periodLength chain segments");
    assert.equal(panel.querySelectorAll(".v2-number-line-cycle-line--closure").length, 1, "circle cycle overlay renders closure for matching span endpoints");
    assert.equal(panel.querySelectorAll(".v2-number-line-vector--history").length, 1, "cycle overlay remains additive to history vector");

    const cycleWithCycleOff = {
      ...withCycleOverlay,
      ui: {
        ...withCycleOverlay.ui,
        buttonFlags: {
          ...withCycleOverlay.ui.buttonFlags,
          [HISTORY_FLAG]: false,
        },
      },
      settings: {
        ...withCycleOverlay.settings,
        cycle: "off" as const,
      },
    };
    renderCircleVisualizerPanel(harness.root, cycleWithCycleOff);
    assert.equal(panel.querySelectorAll(".v2-number-line-cycle-line").length, 0, "cycle-off disables circle cycle overlay");
  } finally {
    harness.teardown();
  }
};
