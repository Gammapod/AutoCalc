import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../src/ui/modules/grapherRenderer.js";
import { toExplicitComplexCalculatorValue, toRationalCalculatorValue, toRationalScalarValue } from "../src/domain/calculatorValue.js";
import type { GameState } from "../src/domain/types.js";

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
    const imaginaryIndex = kinds.indexOf("imaginary");
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
    renderGrapherV2Module(rootB as unknown as Element, withGraphVisible);
    clearGrapherV2Module(rootA as unknown as Element);
    assert.equal(destroyed.length, 1, "root-scoped grapher clear destroys only one runtime");
  } finally {
    (globalThis as { window?: unknown }).window = previousWindow;
    clearGrapherV2Module();
  }
};
