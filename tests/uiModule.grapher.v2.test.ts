import assert from "node:assert/strict";
import { HISTORY_FLAG, initialState } from "../src/domain/state.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../src/ui/modules/grapherRenderer.js";
import { toExplicitComplexCalculatorValue, toRationalCalculatorValue, toRationalScalarValue } from "../src/domain/calculatorValue.js";
import type { GameState } from "../src/domain/types.js";
import { installDomHarness } from "./helpers/domHarness.js";

type RootLike = {
  querySelector: (selector: string) => Element | null;
};

export const runUiModuleGrapherV2Tests = (): void => {
  const rootWithoutCanvas: RootLike = {
    querySelector: () => null,
  };

  assert.doesNotThrow(
    () => renderGrapherV2Module(rootWithoutCanvas as unknown as Element, initialState()),
    "grapher renderer safely handles missing grapher mount points",
  );

  const withGraphVisible: GameState = {
    ...initialState(),
    settings: {
      ...initialState().settings,
      visualizer: "graph",
    },
  };
  const withGraphComplex: GameState = {
    ...withGraphVisible,
    calculator: {
      ...withGraphVisible.calculator,
      rollEntries: [
        { y: toRationalCalculatorValue({ num: 0n, den: 1n }) },
        {
          y: toExplicitComplexCalculatorValue(
            toRationalScalarValue({ num: 7n, den: 1n }),
            toRationalScalarValue({ num: -3n, den: 1n }),
          ),
        },
      ],
    },
  };
  const withGraphStepForecast: GameState = {
    ...withGraphVisible,
    settings: {
      ...withGraphVisible.settings,
      stepExpansion: "on",
    },
    calculator: {
      ...withGraphVisible.calculator,
      total: toRationalCalculatorValue({ num: 5n, den: 1n }),
      rollEntries: [{ y: toRationalCalculatorValue({ num: 5n, den: 1n }) }],
      operationSlots: [{ operator: "op_add", operand: 3n }],
    },
  };
  const withGraphHistoryForecast: GameState = {
    ...withGraphVisible,
    settings: {
      ...withGraphVisible.settings,
      forecast: "on",
    },
    calculator: {
      ...withGraphVisible.calculator,
      total: toRationalCalculatorValue({ num: 5n, den: 1n }),
      rollEntries: [{ y: toRationalCalculatorValue({ num: 5n, den: 1n }) }],
      operationSlots: [{ operator: "op_add", operand: 3n }],
    },
  };
  assert.doesNotThrow(
    () => renderGrapherV2Module(rootWithoutCanvas as unknown as Element, withGraphVisible),
    "grapher renderer safely handles graph-visible state without canvas",
  );

  assert.doesNotThrow(() => clearGrapherV2Module(), "grapher clear helper is idempotent");

  const canvas = {
    getContext: () => ({} as CanvasRenderingContext2D),
    getBoundingClientRect: () => ({ width: 420, height: 250 }),
    clientWidth: 420,
    clientHeight: 250,
  } as unknown as Element;
  const rootA: RootLike = {
    querySelector: (selector: string) => (selector === "[data-grapher-canvas]" ? canvas : null),
  };
  const rootB: RootLike = {
    querySelector: (selector: string) => (selector === "[data-grapher-canvas]" ? canvas : null),
  };
  const previousWindow = (globalThis as { window?: unknown }).window;
  const destroyed: string[] = [];
  const capturedConfigs: unknown[] = [];
  (globalThis as { window?: unknown }).window = {
    Chart: class {
      update(): void {
        // no-op
      }
      destroy(): void {
        destroyed.push("destroy");
      }
      data = { datasets: [{ data: [], pointRadius: 0, pointBackgroundColor: "", pointBorderColor: "" }] };
      options = {} as unknown;
      constructor(_ctx: CanvasRenderingContext2D, config: unknown) {
        capturedConfigs.push(config);
      }
    },
  };
  try {
    renderGrapherV2Module(rootA as unknown as Element, withGraphComplex);
    const firstConfig = capturedConfigs[0] as
      | {
        options?: {
          layout?: { padding?: { bottom?: number; left?: number; right?: number } };
          plugins?: { tooltip?: { enabled?: boolean } };
          scales?: {
            x?: {
              display?: boolean;
              ticks?: { display?: boolean };
              grid?: { display?: boolean };
              border?: { display?: boolean };
            };
            y?: {
              display?: boolean;
              ticks?: { display?: boolean };
              grid?: { display?: boolean };
              border?: { display?: boolean };
            };
          };
        };
        data?: { datasets?: Array<{ pointRadius?: number | number[]; data?: Array<{ kind?: string }> }> };
      }
      | undefined;
    assert.equal(
      (firstConfig?.options?.layout?.padding?.bottom ?? 0) >= 20,
      true,
      "grapher chart reserves bottom canvas padding so x-axis labels remain visible",
    );
    assert.equal(
      (firstConfig?.options?.layout?.padding?.left ?? 0) > 0 && (firstConfig?.options?.layout?.padding?.right ?? 0) > 0,
      true,
      "grapher chart reserves side canvas padding for fixed overlay plot geometry",
    );
    assert.equal(
      firstConfig?.options?.plugins?.tooltip?.enabled,
      true,
      "tooltips remain enabled when points are present",
    );
    assert.equal(
      firstConfig?.options?.scales?.x?.display,
      false,
      "x axis is hidden so chart acts as points-only layer",
    );
    assert.equal(
      firstConfig?.options?.scales?.y?.display,
      false,
      "y axis is hidden so chart acts as points-only layer",
    );
    assert.equal(
      firstConfig?.options?.scales?.x?.ticks?.display,
      false,
      "x tick labels are disabled in chart layer",
    );
    assert.equal(
      firstConfig?.options?.scales?.y?.ticks?.display,
      false,
      "y tick labels are disabled in chart layer",
    );
    assert.equal(
      firstConfig?.options?.scales?.x?.grid?.display,
      false,
      "x grid lines are disabled in chart layer",
    );
    assert.equal(
      firstConfig?.options?.scales?.y?.grid?.display,
      false,
      "y grid lines are disabled in chart layer",
    );
    assert.equal(
      firstConfig?.options?.scales?.x?.border?.display,
      false,
      "x border is disabled in chart layer",
    );
    assert.equal(
      firstConfig?.options?.scales?.y?.border?.display,
      false,
      "y border is disabled in chart layer",
    );
    const firstDataset = firstConfig?.data?.datasets?.[0];
    const radii = Array.isArray(firstDataset?.pointRadius) ? firstDataset?.pointRadius : [];
    const kinds = (firstDataset?.data ?? []).map((point) => point.kind ?? "");
    const imaginaryIndex = kinds.lastIndexOf("imaginary");
    const rollIndex = kinds.indexOf("roll");
    assert.equal(imaginaryIndex > -1, true, "complex roll rows include imaginary point entries");
    assert.equal(rollIndex > -1, true, "complex roll rows include real roll point entries");
    assert.equal(
      imaginaryIndex > rollIndex,
      true,
      "imaginary points are appended after real points so they render on top",
    );
    assert.equal(
      imaginaryIndex > -1 && rollIndex > -1 ? radii[imaginaryIndex] < radii[rollIndex] : false,
      true,
      "imaginary points use a smaller radius than real points",
    );
    const stepForecastRoot: RootLike = {
      querySelector: (selector: string) => (selector === "[data-grapher-canvas]" ? canvas : null),
    };
    renderGrapherV2Module(stepForecastRoot as unknown as Element, withGraphStepForecast);
    const stepConfig = capturedConfigs[capturedConfigs.length - 1] as
      | { data?: { datasets?: Array<{ data?: Array<{ kind?: string; x?: number; y?: number }> }> } }
      | undefined;
    const stepPoints = stepConfig?.data?.datasets?.[0]?.data ?? [];
    const stepPoint = stepPoints.find((point) => point.kind === "forecast_step");
    assert.ok(stepPoint, "step expansion adds a forecast-step overlay point to the graph dataset");
    assert.equal(stepPoint?.x, 2, "forecast-step overlay point is plotted at current x + 1");
    assert.equal(stepPoint?.y, 8, "forecast-step overlay point y matches the latest step forecast value");
    renderGrapherV2Module(stepForecastRoot as unknown as Element, withGraphHistoryForecast);
    const historyForecastConfig = capturedConfigs[capturedConfigs.length - 1] as
      | { data?: { datasets?: Array<{ data?: Array<{ kind?: string; x?: number; y?: number }> }> } }
      | undefined;
    const historyForecastPoints = historyForecastConfig?.data?.datasets?.[0]?.data ?? [];
    const historyForecastPoint = historyForecastPoints.find((point) => point.kind === "forecast_history");
    assert.ok(historyForecastPoint, "Fcast adds a forecast-history overlay point to the graph dataset");
    assert.equal(historyForecastPoint?.x, 2, "forecast-history overlay point is plotted at current x + 1");
    assert.equal(historyForecastPoint?.y, 8, "forecast-history overlay point y matches next forecast roll result");
    renderGrapherV2Module(rootB as unknown as Element, withGraphVisible);
    clearGrapherV2Module(rootA as unknown as Element);
    assert.equal(destroyed.length, 1, "root-scoped grapher clear destroys only one runtime");
  } finally {
    (globalThis as { window?: unknown }).window = previousWindow;
    clearGrapherV2Module();
  }

  const harness = installDomHarness();
  const previousWindowForDom = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {
    ...(harness.window as unknown as object),
    Chart: class {
      update(): void {
        // no-op
      }
      destroy(): void {
        // no-op
      }
      data = { datasets: [{ data: [], pointRadius: 0, pointBackgroundColor: "", pointBorderColor: "" }] };
      options = {} as unknown;
      constructor() {
        // no-op
      }
    },
  };
  try {
    const canvasEl = harness.root.querySelector<HTMLCanvasElement>("[data-grapher-canvas]");
    assert.ok(canvasEl, "expected grapher canvas in dom harness");
    if (!canvasEl) {
      return;
    }
    (canvasEl as unknown as { getContext: () => CanvasRenderingContext2D }).getContext = () => ({} as CanvasRenderingContext2D);

    const withCycleOverlay: GameState = {
      ...withGraphVisible,
      ui: {
        ...withGraphVisible.ui,
        buttonFlags: {
          ...withGraphVisible.ui.buttonFlags,
          [HISTORY_FLAG]: true,
        },
      },
      calculator: {
        ...withGraphVisible.calculator,
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 3n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 4n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 5n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 6n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 7n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 4n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 5n, den: 1n }) },
        ],
        rollAnalysis: {
          stopReason: "cycle",
          cycle: { i: 3, j: 7, transientLength: 3, periodLength: 4 },
        },
      },
    };

    const withTargetYLineVisible: GameState = {
      ...withGraphVisible,
      settings: {
        ...withGraphVisible.settings,
        forecast: "on",
      },
      calculator: {
        ...withGraphVisible.calculator,
        total: toRationalCalculatorValue({ num: 0n, den: 1n }),
        rollEntries: [{ y: toRationalCalculatorValue({ num: 0n, den: 1n }) }],
      },
      completedUnlockIds: [],
    };
    renderGrapherV2Module(harness.root, withTargetYLineVisible);
    const visibleTargetLine = harness.root.querySelector<SVGLineElement>(".v2-grapher-target-y-line");
    const visibleTargetLineBorder = harness.root.querySelector<SVGLineElement>(".v2-grapher-target-y-line-border");
    assert.ok(visibleTargetLine, "graph target y-line hint renders when forecast is on and unresolved target is near");
    assert.ok(visibleTargetLineBorder, "graph target y-line hint renders a white border line");
    const visibleOpacity = Number(visibleTargetLine?.getAttribute("stroke-opacity") ?? "0");
    assert.equal(visibleOpacity > 0, true, "graph target y-line hint renders with non-zero opacity when in-range");

    const withTargetYLineForecastOff: GameState = {
      ...withTargetYLineVisible,
      settings: {
        ...withTargetYLineVisible.settings,
        forecast: "off",
      },
    };
    renderGrapherV2Module(harness.root, withTargetYLineForecastOff);
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-target-y-line").length,
      0,
      "graph target y-line hint is hidden when forecast is off",
    );

    const withTargetYLineFar: GameState = {
      ...withTargetYLineVisible,
      calculator: {
        ...withTargetYLineVisible.calculator,
        total: toRationalCalculatorValue({ num: 10n, den: 1n }),
      },
    };
    renderGrapherV2Module(harness.root, withTargetYLineFar);
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-target-y-line").length,
      0,
      "graph target y-line hint is hidden when outside nearness radius",
    );

    const withTargetYLineNearer: GameState = {
      ...withTargetYLineVisible,
      calculator: {
        ...withTargetYLineVisible.calculator,
        total: toRationalCalculatorValue({ num: 0n, den: 1n }),
      },
    };
    renderGrapherV2Module(harness.root, withTargetYLineNearer);
    const nearOpacity = Number(harness.root.querySelector<SVGLineElement>(".v2-grapher-target-y-line")?.getAttribute("stroke-opacity") ?? "0");
    const withTargetYLineFarther: GameState = {
      ...withTargetYLineVisible,
      calculator: {
        ...withTargetYLineVisible.calculator,
        total: toRationalCalculatorValue({ num: -1n, den: 1n }),
      },
    };
    renderGrapherV2Module(harness.root, withTargetYLineFarther);
    const fartherOpacity = Number(harness.root.querySelector<SVGLineElement>(".v2-grapher-target-y-line")?.getAttribute("stroke-opacity") ?? "0");
    assert.equal(
      nearOpacity > fartherOpacity,
      true,
      "graph target y-line hint opacity increases as current total gets closer to target",
    );

    const withTrendBandNear: GameState = {
      ...withGraphVisible,
      calculator: {
        ...withGraphVisible.calculator,
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 3n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 4n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 5n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 6n, den: 1n }) },
        ],
      },
    };
    const withTrendBandFar: GameState = {
      ...withTrendBandNear,
      calculator: {
        ...withTrendBandNear.calculator,
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 2n, den: 1n }) },
          { y: toRationalCalculatorValue({ num: 3n, den: 1n }) },
        ],
      },
    };
    renderGrapherV2Module(harness.root, withTrendBandNear);
    const trendBandNear = harness.root.querySelector<SVGPolylineElement>(".v2-grapher-trend-band");
    assert.ok(trendBandNear, "graph trend-band hint renders for unresolved trend predicates with suffix progress");
    const trendOpacityNear = Number(trendBandNear?.getAttribute("stroke-opacity") ?? "0");
    renderGrapherV2Module(harness.root, withTrendBandFar);
    const trendBandFar = harness.root.querySelector<SVGPolylineElement>(".v2-grapher-trend-band");
    const trendOpacityFar = Number(trendBandFar?.getAttribute("stroke-opacity") ?? "0");
    assert.equal(
      trendOpacityNear > trendOpacityFar,
      true,
      "graph trend-band opacity increases as suffix progress approaches required length",
    );

    renderGrapherV2Module(harness.root, withCycleOverlay);
    const cycleLines = harness.root.querySelectorAll<SVGLineElement>(".v2-grapher-cycle-line");
    const chainLines = harness.root.querySelectorAll<SVGLineElement>(".v2-grapher-cycle-line--chain");
    const closureLines = harness.root.querySelectorAll<SVGLineElement>(".v2-grapher-cycle-line--closure");
    assert.equal(cycleLines.length >= 1, true, "cycle overlay renders amber line segments when history and cycle are active");
    assert.equal(chainLines.length >= 1, true, "cycle overlay renders chain segments");
    assert.equal(closureLines.length, 1, "cycle overlay renders one closure line for equal-value span endpoints");

    const withCycleAndTargetHint: GameState = {
      ...withCycleOverlay,
      settings: {
        ...withCycleOverlay.settings,
        forecast: "on",
      },
      completedUnlockIds: [],
    };
    renderGrapherV2Module(harness.root, withCycleAndTargetHint);
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-cycle-line").length >= 1,
      true,
      "cycle overlay remains present when graph target y-line hint is active",
    );
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-target-y-line").length >= 1,
      true,
      "graph target y-line hint coexists with cycle overlay",
    );

    const withCycleTargetAndTrend: GameState = {
      ...withTrendBandNear,
      settings: {
        ...withTrendBandNear.settings,
        forecast: "on",
      },
      calculator: {
        ...withTrendBandNear.calculator,
        total: toRationalCalculatorValue({ num: 0n, den: 1n }),
        rollAnalysis: {
          stopReason: "cycle",
          cycle: { i: 1, j: 3, transientLength: 1, periodLength: 2 },
        },
      },
      completedUnlockIds: [],
    };
    renderGrapherV2Module(harness.root, withCycleTargetAndTrend);
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-cycle-line").length >= 1,
      true,
      "graph cycle overlay remains when trend-band and target-line hints are present",
    );
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-target-y-line").length >= 1,
      true,
      "graph target y-line remains when trend-band hint is present",
    );
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-trend-band").length >= 1,
      true,
      "graph trend-band coexists with cycle and target-line overlays",
    );

    const withComplexCycleOverlay: GameState = {
      ...withCycleOverlay,
      calculator: {
        ...withCycleOverlay.calculator,
        rollEntries: [
          { y: toRationalCalculatorValue({ num: 1n, den: 1n }) },
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: 5n, den: 1n }),
              toRationalScalarValue({ num: 2n, den: 1n }),
            ),
          },
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: 6n, den: 1n }),
              toRationalScalarValue({ num: 3n, den: 1n }),
            ),
          },
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: 7n, den: 1n }),
              toRationalScalarValue({ num: 4n, den: 1n }),
            ),
          },
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: 4n, den: 1n }),
              toRationalScalarValue({ num: 1n, den: 1n }),
            ),
          },
          {
            y: toExplicitComplexCalculatorValue(
              toRationalScalarValue({ num: 5n, den: 1n }),
              toRationalScalarValue({ num: 2n, den: 1n }),
            ),
          },
        ],
        rollAnalysis: {
          stopReason: "cycle",
          cycle: { i: 1, j: 5, transientLength: 1, periodLength: 4 },
        },
      },
    };
    renderGrapherV2Module(harness.root, withComplexCycleOverlay);
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-cycle-line--real").length >= 1,
      true,
      "complex cycle overlay keeps the existing real-channel cycle lines",
    );
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-cycle-line--imaginary").length >= 1,
      true,
      "complex cycle overlay renders additional imaginary-channel cycle lines",
    );

    const withoutHistory: GameState = {
      ...withCycleOverlay,
      ui: {
        ...withCycleOverlay.ui,
        buttonFlags: {
          ...withCycleOverlay.ui.buttonFlags,
          [HISTORY_FLAG]: false,
        },
      },
    };
    renderGrapherV2Module(harness.root, withoutHistory);
    assert.equal(
      harness.root.querySelectorAll(".v2-grapher-cycle-line").length,
      0,
      "cycle overlay does not render when history is disabled",
    );
  } finally {
    (globalThis as { window?: unknown }).window = previousWindowForDom;
    harness.teardown();
    clearGrapherV2Module();
  }
};
