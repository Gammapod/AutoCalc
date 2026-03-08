import type { Action, GameState } from "../../domain/types.js";
import type { InteractionMode } from "../../app/interactionRuntime.js";
import { renderStorageV2Module as renderStorageOwned } from "./storage/render.js";

export const renderStorageV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    interactionMode: InteractionMode;
    inputBlocked: boolean;
  },
): void => {
  renderStorageOwned(root, state, dispatch, {
    interactionMode: options.interactionMode,
    inputBlocked: options.inputBlocked,
  });
};
