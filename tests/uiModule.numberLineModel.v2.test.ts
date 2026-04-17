import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import {
  resolveNumberLineMode,
  NUMBER_LINE_GEOMETRY,
  calculatorValueToArgandPoint,
  resolveNumberLineCycleOverlaySegmentsForState,
  resolveHistoryForecastVectorSegmentForState,
  resolvePlotRangeForState,
  resolveForecastVectorSegmentForState,
  resolveStepForecastVectorSegmentsForState,
  resolveStepForecastValuesForState,
  resolveVectorLayersForState,
  resolveVectorEndpoint,
  resolveVectorSegmentForState,
} from "../src/ui/modules/visualizers/numberLineModel.js";
import {
  toRationalCalculatorValue,
  toRationalScalarValue,
  toExplicitComplexCalculatorValue,
} from "../src/domain/calculatorValue.js";
import { HISTORY_FLAG } from "../src/domain/state.js";

export const runUiModuleNumberLineModelV2Tests = (): void => {
  const decimalBaseline = initialState();
  assert.equal(resolvePlotRangeForState(decimalBaseline), 9, "decimal baseline uses first dynamic tier (9)");

  const binaryRangeState = {
    ...decimalBaseline,
    settings: {
      ...decimalBaseline.settings,
      base: "base2" as const,
    },
  };
  assert.equal(resolvePlotRangeForState(binaryRangeState), 1, "binary baseline uses first dynamic tier (1)");

  const withDecimal99 = {
    ...decimalBaseline,
    calculator: {
      ...decimalBaseline.calculator,
      rollEntries: [{ y: toRationalCalculatorValue({ num: 99n, den: 1n }) }],
    },
  };
  assert.equal(resolvePlotRangeForState(withDecimal99), 99, "decimal tier expands to 99 when plotted values exceed 9");

  const withBinaryThree = {
    ...binaryRangeState,
    calculator: {
      ...binaryRangeState.calculator,
      rollEntries: [{ y: toRationalCalculatorValue({ num: 3n, den: 1n }) }],
    },
  };
  assert.equal(resolvePlotRangeForState(withBinaryThree), 3, "binary tier expands to 3 when plotted values exceed 1");

  const withHistoryRange = {
    ...decimalBaseline,
    ui: {
      ...decimalBaseline.ui,
      buttonFlags: {
        ...decimalBaseline.ui.buttonFlags,
        [HISTORY_FLAG]: true,
      },
    },
    calculator: {
      ...decimalBaseline.calculator,
      rollEntries: [
        { y: toRationalCalculatorValue({ num: 120n, den: 1n }) },
        { y: toRationalCalculatorValue({ num: 3n, den: 1n }) },
      ],
    },
  };
  assert.equal(resolvePlotRangeForState(withHistoryRange), 999, "history-enabled range includes previous plotted value magnitudes");

  const withForecastRange = {
    ...decimalBaseline,
    calculator: {
      ...decimalBaseline.calculator,
      total: toRationalCalculatorValue({ num: 9n, den: 1n }),
      rollEntries: [{ y: toRationalCalculatorValue({ num: 9n, den: 1n }) }],
      operationSlots: [{ operator: "op_add" as const, operand: 1n }],
    },
  };
  assert.equal(resolvePlotRangeForState(withForecastRange), 9, "forecast is hidden when history toggle is off");

  const withForecastRangeHistoryOn = {
    ...withForecastRange,
    ui: {
      ...withForecastRange.ui,
      buttonFlags: {
        ...withForecastRange.ui.buttonFlags,
        [HISTORY_FLAG]: true,
      },
    },
  };
  assert.equal(resolvePlotRangeForState(withForecastRangeHistoryOn), 99, "forecast-plotted next value expands dynamic range tiers when history is on");

  const withStepForecastOn = {
    ...decimalBaseline,
    settings: {
      ...decimalBaseline.settings,
      stepExpansion: "on" as const,
    },
    calculator: {
      ...decimalBaseline.calculator,
      total: toRationalCalculatorValue({ num: 6n, den: 1n }),
      rollEntries: [{ y: toRationalCalculatorValue({ num: 6n, den: 1n }) }],
      operationSlots: [
        { operator: "op_add" as const, operand: 1n },
        { operator: "op_add" as const, operand: 2n },
        { operator: "op_add" as const, operand: 3n },
      ],
    },
  };
  assert.equal(resolvePlotRangeForState(withStepForecastOn), 9, "step-expansion shows first-step forecast before progress activates");
  const withStepForecastActive = {
    ...withStepForecastOn,
    calculator: {
      ...withStepForecastOn.calculator,
      stepProgress: {
        active: true,
        seedTotal: withStepForecastOn.calculator.total,
        currentTotal: toRationalCalculatorValue({ num: 7n, den: 1n }),
        nextSlotIndex: 1,
        executedSlotResults: [toRationalCalculatorValue({ num: 7n, den: 1n })],
      },
    },
  };
  assert.equal(resolveStepForecastValuesForState(withStepForecastActive).length, 2, "step-expansion forecast shows executed chain plus current highlighted-step forecast");
  assert.equal(resolvePlotRangeForState(withStepForecastActive), 9, "active step-expansion forecast contributes to dynamic range");

  assert.deepEqual(
    calculatorValueToArgandPoint(toRationalCalculatorValue({ num: 5n, den: 1n })),
    { re: 5, im: 0 },
    "rational calculator values map to real-only Argand points",
  );
  assert.deepEqual(
    calculatorValueToArgandPoint(
      toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 3n, den: 1n }),
        toRationalScalarValue({ num: -2n, den: 1n }),
      ),
    ),
    { re: 3, im: -2 },
    "complex calculator values map to (Re, Im) Argand points",
  );

  const endpointAtRange = resolveVectorEndpoint(NUMBER_LINE_GEOMETRY, { re: 99, im: 99 }, 99);
  assert.equal(endpointAtRange.x, NUMBER_LINE_GEOMETRY.plotBounds.maxX, "max real range maps to rightmost plot bound");
  assert.equal(endpointAtRange.y, NUMBER_LINE_GEOMETRY.plotBounds.minY, "max imaginary range maps to top plot bound");

  const clampedEndpoint = resolveVectorEndpoint(NUMBER_LINE_GEOMETRY, { re: 999, im: -999 }, 99);
  assert.equal(clampedEndpoint.x, NUMBER_LINE_GEOMETRY.plotBounds.maxX, "out-of-range real values clamp to plot bounds");
  assert.equal(clampedEndpoint.y, NUMBER_LINE_GEOMETRY.plotBounds.maxY, "out-of-range imaginary values clamp to plot bounds");

  const noRollVector = resolveVectorSegmentForState(initialState());
  assert.equal(noRollVector, null, "vector segment is omitted when no roll exists");

  const withRoll = {
    ...decimalBaseline,
    calculator: {
      ...decimalBaseline.calculator,
      rollEntries: [{ y: toRationalCalculatorValue({ num: 99n, den: 1n }) }],
    },
  };
  const rollVector = resolveVectorSegmentForState(withRoll);
  assert.ok(rollVector, "vector segment is present when roll exists");
  assert.equal(rollVector?.from.x, NUMBER_LINE_GEOMETRY.origin.x, "vector starts at origin x");
  assert.equal(rollVector?.from.y, NUMBER_LINE_GEOMETRY.origin.y, "vector starts at origin y");
  assert.equal(rollVector?.to.x, NUMBER_LINE_GEOMETRY.plotBounds.maxX, "range-max roll value maps to rightmost bound");
  assert.equal(rollVector?.to.y, NUMBER_LINE_GEOMETRY.origin.y, "real roll value keeps zero-imaginary y");

  const historyForecastOff = resolveHistoryForecastVectorSegmentForState(withForecastRange);
  assert.equal(historyForecastOff, null, "history forecast vector is hidden when history toggle is off");

  const historyForecastVector = resolveHistoryForecastVectorSegmentForState(withForecastRangeHistoryOn);
  assert.ok(historyForecastVector, "history forecast vector is present when history toggle is on");
  const forecastVector = resolveForecastVectorSegmentForState(withStepForecastActive);
  assert.ok(forecastVector, "step-expansion forecast vector is present when step expansion is on");
  const stepForecastSegments = resolveStepForecastVectorSegmentsForState(withStepForecastActive);
  assert.equal(stepForecastSegments.length >= 2, true, "multi-slot active step expansion renders chained forecast segments");
  assert.equal(
    stepForecastSegments[0]?.from.x,
    resolveVectorSegmentForState(withStepForecastActive)?.to.x,
    "first chained step segment starts at current roll point",
  );
  const currentVectorForForecast = resolveVectorSegmentForState(withForecastRangeHistoryOn);
  assert.ok(currentVectorForForecast, "current vector exists for forecast baseline");
  assert.equal(
    historyForecastVector?.from.x,
    currentVectorForForecast?.to.x,
    "history forecast vector starts at current point x",
  );
  assert.equal(
    historyForecastVector?.from.y,
    currentVectorForForecast?.to.y,
    "history forecast vector starts at current point y",
  );
  assert.equal(
    forecastVector?.to.x > NUMBER_LINE_GEOMETRY.origin.x,
    true,
    "positive next execution forecast projects to the right side of the plane",
  );

  const withAllLayers = {
    ...withForecastRangeHistoryOn,
    calculator: {
      ...withForecastRangeHistoryOn.calculator,
      rollEntries: [
        { y: toRationalCalculatorValue({ num: 8n, den: 1n }) },
        ...withForecastRangeHistoryOn.calculator.rollEntries,
      ],
    },
  };
  const layers = resolveVectorLayersForState(withAllLayers);
  assert.deepEqual(
    new Set(layers.map((layer) => layer.kind)),
    new Set(["current", "history", "forecast_history"]),
    "vector layers include current, history, and history-forecast entries",
  );
  for (let index = 1; index < layers.length; index += 1) {
    const previous = layers[index - 1];
    const next = layers[index];
    assert.equal(
      previous.magnitudeSq >= next.magnitudeSq,
      true,
      "vector layers are sorted by descending magnitude",
    );
    if (previous.magnitudeSq === next.magnitudeSq) {
      assert.equal(
        previous.recencyOrder <= next.recencyOrder,
        true,
        "tied magnitudes are sorted by increasing recency order",
      );
    }
  }

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
    },
  };
  const cycleSegments = resolveNumberLineCycleOverlaySegmentsForState(withCycleOverlay);
  assert.equal(cycleSegments.length, 4, "cycle overlay emits chain plus closure segments for latest period span");
  assert.equal(cycleSegments.filter((segment) => segment.kind === "chain").length, 3, "cycle overlay emits periodLength chain segments");
  assert.equal(cycleSegments.filter((segment) => segment.kind === "closure").length, 1, "cycle overlay emits closure segment when span endpoints match");

  const cycleSegmentsHistoryOff = resolveNumberLineCycleOverlaySegmentsForState({
    ...withCycleOverlay,
    ui: {
      ...withCycleOverlay.ui,
      buttonFlags: {},
    },
  });
  assert.equal(cycleSegmentsHistoryOff.length, 0, "history-off disables cycle overlay segment generation");

  const cycleSegmentsNoMetadata = resolveNumberLineCycleOverlaySegmentsForState({
    ...withCycleOverlay,
    calculator: {
      ...withCycleOverlay.calculator,
      rollAnalysis: { stopReason: "none", cycle: null },
    },
  });
  assert.equal(cycleSegmentsNoMetadata.length, 0, "missing cycle metadata disables cycle overlay segment generation");

  assert.equal(resolveNumberLineMode(initialState()), "real", "real totals use real mode");
  const withComplexTotal = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 0n, den: 1n }),
        toRationalScalarValue({ num: 1n, den: 1n }),
      ),
    },
  };
  assert.equal(resolveNumberLineMode(withComplexTotal), "complex_grid", "nonzero imaginary totals use complex-grid mode");

  const withComplexRollHistoryAndRealTotal = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toRationalCalculatorValue({ num: 7n, den: 1n }),
      rollEntries: [
        {
          y: toExplicitComplexCalculatorValue(
            toRationalScalarValue({ num: 2n, den: 1n }),
            toRationalScalarValue({ num: 3n, den: 1n }),
          ),
        },
      ],
    },
  };
  assert.equal(
    resolveNumberLineMode(withComplexRollHistoryAndRealTotal),
    "complex_grid",
    "any complex value on roll history keeps complex-grid mode even when current total is real",
  );
};
