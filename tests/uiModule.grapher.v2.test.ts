import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../src/ui/modules/grapherRenderer.js";
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
    ui: {
      ...initialState().ui,
      activeVisualizer: "graph",
    },
  };
  assert.doesNotThrow(
    () => renderGrapherV2Module(rootWithoutCanvas as unknown as Element, withGraphVisible),
    "grapher renderer safely handles graph-visible state without canvas",
  );

  assert.doesNotThrow(() => clearGrapherV2Module(), "grapher clear helper is idempotent");

  const canvas = {
    getContext: () => ({} as CanvasRenderingContext2D),
  } as unknown as Element;
  const rootA: RootLike = {
    querySelector: (selector: string) => (selector === "[data-grapher-canvas]" ? canvas : null),
  };
  const rootB: RootLike = {
    querySelector: (selector: string) => (selector === "[data-grapher-canvas]" ? canvas : null),
  };
  const previousWindow = (globalThis as { window?: unknown }).window;
  const destroyed: string[] = [];
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
      constructor(_ctx: CanvasRenderingContext2D, _config: unknown) {
        // no-op
      }
    },
  };
  try {
    renderGrapherV2Module(rootA as unknown as Element, withGraphVisible);
    renderGrapherV2Module(rootB as unknown as Element, withGraphVisible);
    clearGrapherV2Module(rootA as unknown as Element);
    assert.equal(destroyed.length, 1, "root-scoped grapher clear destroys only one runtime");
  } finally {
    (globalThis as { window?: unknown }).window = previousWindow;
    clearGrapherV2Module();
  }
};

