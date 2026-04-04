import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import {
  NUMBER_LINE_GEOMETRY,
  calculatorValueToArgandPoint,
  resolvePlotRangeForState,
  resolveVectorEndpoint,
  resolveVectorSegmentForState,
} from "../src/ui/modules/visualizers/numberLineModel.js";
import {
  toRationalCalculatorValue,
  toRationalScalarValue,
  toExplicitComplexCalculatorValue,
} from "../src/domain/calculatorValue.js";

export const runUiModuleNumberLineModelV2Tests = (): void => {
  const decimalRangeState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      maxTotalDigits: 2,
    },
  };
  assert.equal(resolvePlotRangeForState(decimalRangeState), 99, "decimal range uses 10^maxDigits - 1");

  const binaryRangeState = {
    ...decimalRangeState,
    settings: {
      ...decimalRangeState.settings,
      base: "base2" as const,
    },
    unlocks: {
      ...decimalRangeState.unlocks,
      maxTotalDigits: 3,
    },
  };
  assert.equal(resolvePlotRangeForState(binaryRangeState), 7, "binary range uses 2^maxDigits - 1");

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
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      maxTotalDigits: 2,
    },
    calculator: {
      ...initialState().calculator,
      rollEntries: [{ y: toRationalCalculatorValue({ num: 99n, den: 1n }) }],
    },
  };
  const rollVector = resolveVectorSegmentForState(withRoll);
  assert.ok(rollVector, "vector segment is present when roll exists");
  assert.equal(rollVector?.from.x, NUMBER_LINE_GEOMETRY.origin.x, "vector starts at origin x");
  assert.equal(rollVector?.from.y, NUMBER_LINE_GEOMETRY.origin.y, "vector starts at origin y");
  assert.equal(rollVector?.to.x, NUMBER_LINE_GEOMETRY.plotBounds.maxX, "range-max roll value maps to rightmost bound");
  assert.equal(rollVector?.to.y, NUMBER_LINE_GEOMETRY.origin.y, "real roll value keeps zero-imaginary y");
};

