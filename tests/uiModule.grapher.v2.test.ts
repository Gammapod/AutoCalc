import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../src_v2/ui/modules/grapherRenderer.js";
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
};

