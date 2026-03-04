import { render as legacyRender } from "../../../src/ui/render.js";
import type { Action, GameState } from "../../../src/domain/types.js";
import type { InteractionMode } from "../../../src/app/interactionRuntime.js";

export const renderCalculatorStorageV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    interactionMode: InteractionMode;
    inputBlocked: boolean;
  },
): void => {
  // Keep calculator/storage on proven runtime renderer for now; v2 shell owns orchestration.
  legacyRender(root, state, dispatch, {
    skipChecklist: true,
    skipGraph: true,
    interactionMode: options.interactionMode,
    inputBlocked: options.inputBlocked,
  });
};

