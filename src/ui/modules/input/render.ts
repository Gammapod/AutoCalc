import type { Action, GameState } from "../../../domain/types.js";
import { syncInputDragSessionAfterRender } from "./dragDrop.js";

export const renderInputV2Module = (
  root: Element,
  _state: GameState,
  _dispatch: (action: Action) => unknown,
  _options: {
    inputBlocked: boolean;
  },
): void => {
  syncInputDragSessionAfterRender(root);
};
