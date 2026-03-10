import assert from "node:assert/strict";
import { computeLayoutSnapshot, getActiveCalculatorSnapshot } from "../src/ui/layout/layoutEngine.js";
import type { LayoutEngineInput } from "../src/ui/layout/types.js";

const buildInput = (overrides: Partial<LayoutEngineInput> = {}): LayoutEngineInput => ({
  viewport: {
    widthPx: 1400,
    heightPx: 900,
  },
  shellMode: "desktop",
    inputBlocked: false,
  gapPx: 10,
  measuredVerticalChromePx: 260,
  calculatorInstances: [
    {
      id: "a",
      keypadColumns: 1,
      keypadRows: 1,
      baselineColumns: 4,
      baselineRows: 2,
      keyHeightRatioToViewport: 0.056,
      keyHeightMinPx: 46,
      keyHeightMaxPx: 56,
      keyMinWidthAspect: 1.5,
      horizontalChromePx: 32,
      verticalChromeFloorPx: 120,
      verticalChromeFallbackPx: 260,
      visualizerWidthMode: "coupled",
    },
  ],
  activeCalculatorId: "a",
  workbench: {
    activeCalculatorId: "a",
    order: ["a"],
    xOffsetPx: 0,
    minOffsetPx: 0,
    maxOffsetPx: 0,
  },
  ...overrides,
});

export const runUiLayoutEngineTests = (): void => {
  const floorSnapshot = computeLayoutSnapshot(buildInput());
  const floorActive = getActiveCalculatorSnapshot(floorSnapshot);
  assert.ok(floorActive, "active snapshot exists for floor case");
  assert.equal(floorActive?.keypad.shouldStretchKeypadHeight, true, "1x1 stretches to baseline keypad height");

  const baselineSnapshot = computeLayoutSnapshot(buildInput({
    calculatorInstances: [{
      ...buildInput().calculatorInstances[0],
      keypadColumns: 4,
      keypadRows: 2,
    }],
  }));
  const baselineActive = getActiveCalculatorSnapshot(baselineSnapshot);
  assert.ok(baselineActive, "active snapshot exists for baseline case");
  assert.equal(
    (baselineActive?.body.widthPx ?? 0) >= (floorActive?.body.widthPx ?? 0),
    true,
    "baseline width is not below 1x1 floor",
  );
  assert.equal(
    (baselineActive?.body.minHeightPx ?? 0) >= (floorActive?.body.minHeightPx ?? 0),
    true,
    "baseline height is not below 1x1 floor",
  );

  const wideSnapshot = computeLayoutSnapshot(buildInput({
    calculatorInstances: [{
      ...buildInput().calculatorInstances[0],
      keypadColumns: 6,
      keypadRows: 2,
    }],
  }));
  const wideActive = getActiveCalculatorSnapshot(wideSnapshot);
  assert.equal(
    (wideActive?.body.widthPx ?? 0) > (baselineActive?.body.widthPx ?? 0),
    true,
    "width grows once columns exceed baseline",
  );

  const fixedVisualizerSnapshot = computeLayoutSnapshot(buildInput({
    calculatorInstances: [{
      ...buildInput().calculatorInstances[0],
      keypadColumns: 6,
      keypadRows: 2,
      visualizerWidthMode: "fixed",
      visualizerWidthPx: 333,
    }],
  }));
  const fixedVisualizerActive = getActiveCalculatorSnapshot(fixedVisualizerSnapshot);
  assert.equal(fixedVisualizerActive?.visualizer.widthPx, 333, "visualizer width can be decoupled from body width");

  const multiSnapshot = computeLayoutSnapshot(buildInput({
    calculatorInstances: [
      {
        ...buildInput().calculatorInstances[0],
        id: "a",
        keypadColumns: 4,
        keypadRows: 2,
      },
      {
        ...buildInput().calculatorInstances[0],
        id: "b",
        keypadColumns: 7,
        keypadRows: 3,
      },
    ],
    activeCalculatorId: "b",
    workbench: {
      activeCalculatorId: "b",
      order: ["a", "b"],
      xOffsetPx: 120,
      minOffsetPx: 0,
      maxOffsetPx: 200,
    },
  }));
  const first = multiSnapshot.calculators.find((calc) => calc.id === "a");
  const second = multiSnapshot.calculators.find((calc) => calc.id === "b");
  assert.ok(first && second, "multi-calculator snapshots are generated");
  assert.equal((second?.body.widthPx ?? 0) > (first?.body.widthPx ?? 0), true, "instances are independently sized");
};

