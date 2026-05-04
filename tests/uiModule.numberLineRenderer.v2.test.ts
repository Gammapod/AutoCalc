import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import {
  renderNumberLineVisualizerPanel,
  resolveNumberLineLabels,
} from "../src/ui/modules/visualizers/numberLineRenderer.js";
import {
  toRationalCalculatorValue,
  toRationalScalarValue,
  toExplicitComplexCalculatorValue,
} from "../src/domain/calculatorValue.js";
import { HISTORY_FLAG } from "../src/domain/state.js";
import { installDomHarness } from "./helpers/domHarness.js";

const parseQuadraticPath = (pathData: string): {
  start: { x: number; y: number };
  control: { x: number; y: number };
  end: { x: number; y: number };
} | null => {
  const match = /^M\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Q\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/u.exec(pathData.trim());
  if (!match) {
    return null;
  }
  return {
    start: { x: Number(match[1]), y: Number(match[2]) },
    control: { x: Number(match[3]), y: Number(match[4]) },
    end: { x: Number(match[5]), y: Number(match[6]) },
  };
};

export const runUiModuleNumberLineRendererV2Tests = (): void => {
  const realSpecs = resolveNumberLineLabels("real", 9);
  assert.equal(realSpecs.length, 2, "real mode label resolver returns left/right labels only");
  assert.deepEqual(
    realSpecs.map((spec) => spec.zone),
    ["real_left", "real_right"],
    "real mode emits labels in real-left then real-right order",
  );
  assert.equal(realSpecs[0]?.text, "-9", "real-left label text includes negative range value");
  assert.equal(realSpecs[1]?.text, "9", "real-right label text includes positive range value");
  assert.equal(realSpecs[0]?.fitPolicy, "constrain_spacing", "real labels use spacing-only fit policy");

  const complexSpecs = resolveNumberLineLabels("complex_grid", 99);
  assert.equal(complexSpecs.length, 4, "complex-grid label resolver returns real and imaginary labels");
  assert.deepEqual(
    complexSpecs.map((spec) => spec.zone),
    ["real_left", "real_right", "imag_top", "imag_bottom"],
    "complex-grid emits all label zones in deterministic order",
  );
  assert.equal(complexSpecs[2]?.text, "99", "imag-top label shows imaginary magnitude without suffix");
  assert.equal(complexSpecs[3]?.text, "-99", "imag-bottom label shows imaginary magnitude without suffix");
  assert.equal(complexSpecs[2]?.fitPolicy, "natural", "imaginary labels preserve natural glyph width");

  const midRangeSpecs = resolveNumberLineLabels("real", 99_999);
  assert.equal(
    midRangeSpecs[0]?.text.length > (midRangeSpecs[0]?.fitMinLength ?? 0),
    false,
    "mid-range real labels stay below spacing-constrain threshold",
  );

  const largeRangeSpecs = resolveNumberLineLabels("real", 9_999_999_999);
  assert.equal(
    largeRangeSpecs[0]?.text.length > (largeRangeSpecs[0]?.fitMinLength ?? 0),
    true,
    "large real labels exceed spacing-constrain threshold",
  );

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
    assert.equal(panel.querySelectorAll(".v2-number-line-axis--imaginary").length, 0, "real mode does not apply imaginary axis styling");
    assert.equal(panel.querySelectorAll(".v2-number-line-arrowhead--imaginary").length, 0, "real mode does not apply imaginary arrowhead styling");
    assert.equal(panel.querySelectorAll(".v2-number-line-grid-mark").length, 18, "real totals render 18 nonzero subdivision ticks");
    const realGridMarks = panel.querySelectorAll<SVGLineElement>(".v2-number-line-grid-mark");
    const realAxis = panel.querySelector<SVGLineElement>(".v2-number-line-axis");
    const realLastGridMark = realGridMarks[realGridMarks.length - 1];
    assert.equal(
      Boolean(realLastGridMark && realAxis && (realLastGridMark.compareDocumentPosition(realAxis) & Node.DOCUMENT_POSITION_FOLLOWING)),
      true,
      "real-mode horizontal axis is rendered after grid marks so it stays visually on top",
    );
    assert.equal(panel.querySelector(".v2-number-line-vector"), null, "no roll means no vector");
    assert.equal(panel.querySelector(".v2-number-line-vector-tip"), null, "no roll means no vector tip");
    assert.equal(panel.querySelector(".v2-number-line-vector--forecast"), null, "no roll means no forecast vector");
    const realScaleLabels = panel.querySelectorAll<SVGTextElement>(".v2-number-line-scale-label");
    assert.equal(realScaleLabels.length, 2, "real mode renders two scale labels for horizontal extremes");
    assert.equal(realScaleLabels[0]?.textContent, "-9", "left real scale label reflects current range");
    assert.equal(realScaleLabels[1]?.textContent, "9", "right real scale label reflects current range");
    assert.equal(realScaleLabels[0]?.getAttribute("x"), "-4", "left real scale label is pushed to the draw-space border");
    assert.equal(realScaleLabels[0]?.getAttribute("text-anchor"), "start", "left real scale label anchors inward to avoid clipping");
    assert.equal(realScaleLabels[1]?.getAttribute("x"), "104", "right real scale label is pushed to the draw-space border");
    assert.equal(realScaleLabels[1]?.getAttribute("text-anchor"), "end", "right real scale label anchors inward to avoid clipping");

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
    assert.equal(panel.querySelector(".v2-number-line-vector")?.tagName.toLowerCase(), "line", "current vector remains straight line primitive");
    assert.ok(panel.querySelector(".v2-number-line-vector-tip"), "roll values render vector tip");
    assert.equal(panel.querySelector(".v2-number-line-vector--forecast"), null, "forecast remains hidden while history toggle is off");
    assert.equal(panel.querySelector(".v2-number-line-vector-tip--forecast"), null, "forecast tip remains hidden while history toggle is off");
    assert.equal(panel.querySelector(".v2-number-line-vector--forecast-step"), null, "step-forecast remains hidden while [ ??? ] is off");
    assert.equal(panel.querySelector(".v2-number-line-vector-tip--forecast-step"), null, "step-forecast tip remains hidden while [ ??? ] is off");
    assert.equal(panel.querySelector(".v2-number-line-vector--history"), null, "history vector remains hidden while history toggle is off");
    assert.equal(panel.querySelector(".v2-number-line-vector--current-error"), null, "non-error roll keeps current vector in default styling");
    const goalPlotNearState = {
      ...withRealRoll,
      calculator: {
        ...withRealRoll.calculator,
        total: toRationalCalculatorValue({ num: 8n, den: 1n }),
      },
      completedUnlockIds: [],
    };
    const goalPlotFarState = {
      ...goalPlotNearState,
      calculator: {
        ...goalPlotNearState.calculator,
        total: toRationalCalculatorValue({ num: 3n, den: 1n }),
      },
    };
    renderNumberLineVisualizerPanel(harness.root, goalPlotNearState);
    const goalPlotNear = panel.querySelector<SVGPathElement>(".v2-number-line-goal-plot");
    assert.ok(goalPlotNear, "number-line goal-plot hint renders a star marker for in-range unresolved total_equals target");
    const goalPlotNearOpacity = Number(goalPlotNear?.getAttribute("opacity") ?? "0");
    renderNumberLineVisualizerPanel(harness.root, goalPlotFarState);
    assert.equal(panel.querySelectorAll(".v2-number-line-goal-plot").length, 0, "number-line goal-plot hint hides outside nearness window");
    const goalPlotMidState = {
      ...goalPlotNearState,
      calculator: {
        ...goalPlotNearState.calculator,
        total: toRationalCalculatorValue({ num: 7n, den: 1n }),
      },
    };
    renderNumberLineVisualizerPanel(harness.root, goalPlotMidState);
    const goalPlotMidOpacity = Number(panel.querySelector<SVGPathElement>(".v2-number-line-goal-plot")?.getAttribute("opacity") ?? "0");
    assert.equal(
      goalPlotNearOpacity > goalPlotMidOpacity,
      true,
      "number-line goal-plot opacity increases as current total approaches target",
    );

    const withStepExpansionForecast = {
      ...withRealRoll,
      settings: {
        ...withRealRoll.settings,
        stepExpansion: "on" as const,
      },
      calculator: {
        ...withRealRoll.calculator,
        operationSlots: [
          { kind: "unary" as const, operator: "unary_inc" as const },
          { kind: "unary" as const, operator: "unary_inc" as const },
          { kind: "unary" as const, operator: "unary_inc" as const },
        ],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withStepExpansionForecast);
    assert.ok(panel.querySelector(".v2-number-line-vector--forecast-step"), "step expansion shows first-step forecast before progress starts");
    assert.equal(
      panel.querySelector(".v2-number-line-vector--forecast-step")?.tagName.toLowerCase(),
      "path",
      "long step-forecast vectors render as curved path primitives",
    );
    assert.equal(
      panel.querySelector(".v2-number-line-vector--forecast-step")?.getAttribute("fill"),
      "none",
      "curved step-forecast paths do not render the implicit SVG fill chord",
    );
    const withStepExpansionActive = {
      ...withStepExpansionForecast,
      calculator: {
        ...withStepExpansionForecast.calculator,
        stepProgress: {
          active: true,
          seedTotal: withStepExpansionForecast.calculator.total,
          currentTotal: toRationalCalculatorValue({ num: 4n, den: 1n }),
          nextSlotIndex: 1,
          executedSlotResults: [toRationalCalculatorValue({ num: 4n, den: 1n })],
        },
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withStepExpansionActive);
    assert.equal(
      panel.querySelectorAll(".v2-number-line-vector--forecast-step").length >= 2,
      true,
      "active step expansion renders chained white step forecast vectors",
    );
    assert.ok(panel.querySelector(".v2-number-line-vector-tip--forecast-step"), "active step expansion renders white step forecast tip");
    assert.equal(panel.querySelector(".v2-number-line-vector--forecast"), null, "history forecast remains hidden when history toggle is off");

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
    assert.equal(panel.querySelectorAll(".v2-number-line-axis--imaginary").length, 1, "complex mode marks vertical axis with imaginary styling class");
    assert.equal(panel.querySelectorAll(".v2-number-line-arrowhead--imaginary").length, 2, "complex mode marks vertical axis arrowheads with imaginary styling class");
    const imaginaryAxis = panel.querySelector<SVGLineElement>(".v2-number-line-axis--imaginary");
    assert.equal(imaginaryAxis?.getAttribute("x1"), imaginaryAxis?.getAttribute("x2"), "imaginary axis remains vertical (constant x)");
    assert.equal(panel.querySelectorAll(".v2-number-line-grid-mark").length, 36, "nonzero imaginary totals render 18x2 grid subdivisions");
    const complexGridMarks = panel.querySelectorAll<SVGLineElement>(".v2-number-line-grid-mark");
    const complexAxes = panel.querySelectorAll<SVGLineElement>(".v2-number-line-axis");
    const complexLastGridMark = complexGridMarks[complexGridMarks.length - 1];
    assert.equal(
      Boolean(
        complexLastGridMark
        && complexAxes[0]
        && complexAxes[1]
        && (complexLastGridMark.compareDocumentPosition(complexAxes[0]) & Node.DOCUMENT_POSITION_FOLLOWING)
        && (complexLastGridMark.compareDocumentPosition(complexAxes[1]) & Node.DOCUMENT_POSITION_FOLLOWING),
      ),
      true,
      "complex-mode horizontal and vertical axes are rendered after grid marks so they stay visually on top",
    );
    assert.ok(panel.querySelector(".v2-number-line-vector"), "complex roll values render vector");
    assert.ok(panel.querySelector(".v2-number-line-vector-tip"), "complex roll values render vector tip");
    const complexScaleLabels = panel.querySelectorAll<SVGTextElement>(".v2-number-line-scale-label");
    assert.equal(complexScaleLabels.length, 4, "complex mode renders real and imaginary extreme labels");
    assert.equal(complexScaleLabels[2]?.textContent, "9", "complex top scale label omits imaginary-unit suffix");
    assert.equal(complexScaleLabels[3]?.textContent, "-9", "complex bottom scale label omits imaginary-unit suffix");
    assert.equal(complexScaleLabels[2]?.classList.contains("v2-number-line-scale-label--imaginary"), true, "complex top scale label uses imaginary style class");
    assert.equal(complexScaleLabels[3]?.classList.contains("v2-number-line-scale-label--imaginary"), true, "complex bottom scale label uses imaginary style class");
    assert.equal(complexScaleLabels[2]?.getAttribute("x"), "50", "complex top scale label left edge aligns to vertical axis arrow x");
    assert.equal(complexScaleLabels[3]?.getAttribute("x"), "50", "complex bottom scale label left edge aligns to vertical axis arrow x");
    assert.equal(complexScaleLabels[2]?.hasAttribute("textLength"), false, "complex top scale label keeps natural glyph width");
    assert.equal(complexScaleLabels[3]?.hasAttribute("textLength"), false, "complex bottom scale label keeps natural glyph width");
    assert.equal(complexScaleLabels[2]?.getAttribute("y"), "-40.6", "complex top scale label is positioned beyond top vertical axis end");
    assert.equal(complexScaleLabels[3]?.getAttribute("y"), "66.2", "complex bottom scale label is positioned beyond bottom vertical axis end");
    const withComplexGridGoalPlot = {
      ...withImaginaryTotal,
      calculator: {
        ...withImaginaryTotal.calculator,
        total: toRationalCalculatorValue({ num: 8n, den: 1n }),
        rollEntries: [
          ...withImaginaryTotal.calculator.rollEntries,
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: 8n, den: 1n }),
              toRationalScalarValue({ num: 1n, den: 1n }),
            ),
          },
        ],
      },
      completedUnlockIds: [],
    };
    renderNumberLineVisualizerPanel(harness.root, withComplexGridGoalPlot);
    assert.equal(
      panel.querySelectorAll(".v2-number-line-goal-plot").length >= 1,
      true,
      "number-line goal-plot hint remains available in complex-grid mode on the real axis",
    );

    const withMidRange = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toRationalCalculatorValue({ num: 99_999n, den: 1n }),
        rollEntries: [{ y: toRationalCalculatorValue({ num: 99_999n, den: 1n }) }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withMidRange);
    const midRangeLabels = panel.querySelectorAll<SVGTextElement>(".v2-number-line-scale-label");
    assert.equal(midRangeLabels[0]?.textContent, "-99999", "left mid-range label reflects current range");
    assert.equal(midRangeLabels[1]?.textContent, "99999", "right mid-range label reflects current range");
    assert.equal(midRangeLabels[0]?.hasAttribute("textLength"), false, "mid-range real labels keep natural glyph width");
    assert.equal(midRangeLabels[1]?.hasAttribute("textLength"), false, "mid-range real labels do not apply width squeeze");

    const withLargeRange = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toRationalCalculatorValue({ num: 9_999_999_999n, den: 1n }),
        rollEntries: [{ y: toRationalCalculatorValue({ num: 9_999_999_999n, den: 1n }) }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withLargeRange);
    const largeRangeLabels = panel.querySelectorAll<SVGTextElement>(".v2-number-line-scale-label");
    assert.equal(largeRangeLabels[0]?.textContent, "-9999999999", "left large-range label reflects expanded range");
    assert.equal(largeRangeLabels[1]?.textContent, "9999999999", "right large-range label reflects expanded range");
    assert.equal(largeRangeLabels[0]?.getAttribute("textLength"), "16", "left large-range label applies width clamp");
    assert.equal(largeRangeLabels[1]?.getAttribute("textLength"), "16", "right large-range label applies width clamp");
    assert.equal(
      largeRangeLabels[0]?.getAttribute("lengthAdjust"),
      "spacing",
      "left large-range label uses spacing-only adjustment to prevent glyph squish",
    );

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
    assert.ok(panel.querySelector(".v2-number-line-vector--forecast"), "history mode renders full-function forecast vector");
    assert.equal(panel.querySelector(".v2-number-line-vector--forecast-step"), null, "history mode alone does not render step forecast");
    assert.equal(panel.querySelectorAll(".v2-number-line-cycle-line").length, 0, "history mode without cycle metadata does not render cycle constellation");
    const historyVector = panel.querySelector<SVGPathElement>(".v2-number-line-vector--history");
    const currentLine = panel.querySelector<SVGLineElement>(".v2-number-line-vector");
    const forecastVector = panel.querySelector<SVGPathElement>(".v2-number-line-vector--forecast");
    assert.equal(historyVector?.tagName.toLowerCase(), "path", "history vector uses curved path primitive");
    assert.equal(forecastVector?.tagName.toLowerCase(), "path", "forecast vector uses curved path primitive");
    assert.equal(historyVector?.getAttribute("fill"), "none", "history curve does not render the implicit SVG fill chord");
    assert.equal(forecastVector?.getAttribute("fill"), "none", "forecast curve does not render the implicit SVG fill chord");
    const historyPath = parseQuadraticPath(historyVector?.getAttribute("d") ?? "");
    const forecastPath = parseQuadraticPath(forecastVector?.getAttribute("d") ?? "");
    assert.ok(historyPath, "history vector path uses quadratic format");
    assert.ok(forecastPath, "forecast vector path uses quadratic format");
    assert.equal(historyPath?.end.x, Number(currentLine?.getAttribute("x2") ?? Number.NaN), "history curve ends at current point x");
    assert.equal(historyPath?.end.y, Number(currentLine?.getAttribute("y2") ?? Number.NaN), "history curve ends at current point y");
    assert.equal(forecastPath?.start.x, Number(currentLine?.getAttribute("x2") ?? Number.NaN), "forecast curve starts at current point x");
    assert.equal(forecastPath?.start.y, Number(currentLine?.getAttribute("y2") ?? Number.NaN), "forecast curve starts at current point y");
    assert.equal(
      Math.abs((historyPath?.control.y ?? 0) - (((historyPath?.start.y ?? 0) + (historyPath?.end.y ?? 0)) / 2)) > 0,
      true,
      "history curve control point deviates from midpoint to create curvature",
    );
    const historyMidpoint = {
      x: ((historyPath?.start.x ?? 0) + (historyPath?.end.x ?? 0)) / 2,
      y: ((historyPath?.start.y ?? 0) + (historyPath?.end.y ?? 0)) / 2,
    };
    assert.equal(
      (historyPath?.control.x ?? 0) < historyMidpoint.x && (historyPath?.control.y ?? 0) < historyMidpoint.y,
      true,
      "history curve bends in the configured opposite direction for the reference history vector",
    );
    const layeredLines = panel.querySelectorAll<SVGElement>(".v2-number-line-vector, .v2-number-line-vector--history");
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
    const tieLayers = panel.querySelectorAll<SVGElement>(".v2-number-line-vector--history, .v2-number-line-vector, .v2-number-line-vector--forecast");
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
    const tieLayeredLines = panel.querySelectorAll<SVGElement>(".v2-number-line-vector, .v2-number-line-vector--history");
    assert.equal(
      tieLayeredLines[tieLayeredLines.length - 1]?.classList.contains("v2-number-line-vector"),
      true,
      "equal magnitudes render newer current vector on top",
    );

    const withShortHistorySegment = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        buttonFlags: {
          ...initialState().ui.buttonFlags,
          [HISTORY_FLAG]: true,
        },
      },
      calculator: {
        ...initialState().calculator,
        total: toRationalCalculatorValue({ num: 2n, den: 10n }),
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 1n, den: 10n }) },
          { y: toRationalCalculatorValue({ num: 2n, den: 10n }) },
        ],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withShortHistorySegment);
    const shortHistoryVector = panel.querySelector<SVGElement>(".v2-number-line-vector--history");
    assert.equal(shortHistoryVector?.tagName.toLowerCase(), "line", "short history vectors fall back to straight line primitive");
    const shortHistoryTip = panel.querySelector<SVGPolygonElement>(".v2-number-line-vector-tip--history");
    assert.ok(shortHistoryTip, "history arrow tip remains rendered for short-segment fallback");
    const shortHistoryLine = panel.querySelector<SVGLineElement>(".v2-number-line-vector--history");
    const shortHistoryTipPoints = (shortHistoryTip?.getAttribute("points") ?? "").trim().split(/\s+/u)[0] ?? "";
    assert.equal(
      shortHistoryTipPoints,
      `${shortHistoryLine?.getAttribute("x2") ?? ""},${shortHistoryLine?.getAttribute("y2") ?? ""}`,
      "history arrow tip remains anchored at the history segment endpoint",
    );
    const withCycleOverlay = {
      ...initialState(),
      ui: {
        ...initialState().ui,
        buttonFlags: {
          ...initialState().ui.buttonFlags,
          [HISTORY_FLAG]: true,
        },
      },
      calculator: {
        ...initialState().calculator,
        total: toRationalCalculatorValue({ num: 3n, den: 1n }),
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 3n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 4n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 3n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 4n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 3n, den: 1n }) },
        ],
        rollAnalysis: {
          stopReason: "cycle" as const,
          cycle: { i: 1, j: 4, transientLength: 1, periodLength: 3 },
        },
        operationSlots: [{ operator: "op_add" as const, operand: 1n }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withCycleOverlay);
    assert.equal(panel.querySelectorAll(".v2-number-line-cycle-line").length >= 3, true, "cycle metadata renders cycle constellation overlay lines");
    assert.equal(panel.querySelectorAll(".v2-number-line-cycle-line--chain").length, 3, "cycle overlay renders chain segments");
    assert.equal(panel.querySelectorAll(".v2-number-line-cycle-line--closure").length, 1, "cycle overlay renders closure segment for equal span endpoints");
    assert.ok(panel.querySelector(".v2-number-line-vector--history"), "cycle overlay is additive and keeps history vector rendering");
    assert.ok(panel.querySelector(".v2-number-line-vector--forecast"), "cycle overlay is additive and keeps forecast vector rendering");

    const withCurrentError = {
      ...withHistoryEnabled,
      calculator: {
        ...withHistoryEnabled.calculator,
        rollEntries: withHistoryEnabled.calculator.rollEntries.map((entry, index, source) => (
          index === source.length - 1
            ? { ...entry, error: { code: "op_div" as const, kind: "division_by_zero" as const } }
            : entry
        )),
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withCurrentError);
    assert.ok(panel.querySelector(".v2-number-line-vector--current-error"), "latest errored current vector is styled in error color");
    assert.ok(panel.querySelector(".v2-number-line-vector-tip--current-error"), "latest errored current tip is styled in error color");
    assert.equal(panel.querySelector(".v2-number-line-vector--history")?.classList.contains("v2-number-line-vector--current-error"), false, "history vector remains non-error styled");
    assert.equal(panel.querySelector(".v2-number-line-vector--forecast")?.classList.contains("v2-number-line-vector--current-error"), false, "forecast vector remains non-error styled");
    assert.equal(panel.querySelector(".v2-number-line-axis")?.classList.contains("v2-number-line-vector--current-error"), false, "axes remain non-error styled");

    const withNanError = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: { kind: "nan" as const },
        rollEntries: [{ y: { kind: "nan" as const }, error: { code: "seed_nan" as const, kind: "nan_input" as const } }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withNanError);
    assert.equal(panel.querySelector(".v2-number-line-vector"), null, "NaN current roll does not render a current vector");
    assert.ok(panel.querySelector(".v2-number-line-error-center-marker"), "NaN error fallback renders hollow red center marker");
  } finally {
    harness.teardown();
  }
};
