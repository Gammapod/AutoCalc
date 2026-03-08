import type { Action, GameState } from "../../../domain/types.js";
import type { InteractionMode } from "../../../app/interactionRuntime.js";
import { syncInputDragSessionAfterRender } from "./dragDrop.js";

export const renderInputV2Module = (
  root: Element,
  _state: GameState,
  _dispatch: (action: Action) => unknown,
  _options: {
    interactionMode: InteractionMode;
    inputBlocked: boolean;
  },
): void => {
  syncInputDragSessionAfterRender(root);
};

