import { render as legacyRender } from "../../../src/ui/render.js";
import type { Action, GameState } from "../../../src/domain/types.js";

export const renderCalculatorStorageV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
): void => {
  // Keep calculator/storage on proven runtime renderer for now; v2 shell owns orchestration.
  legacyRender(root, state, dispatch, { skipChecklist: true, skipGraph: true });
};

