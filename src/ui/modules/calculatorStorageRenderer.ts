import type { Action, GameState } from "../../domain/types.js";
import type { InteractionMode } from "../../app/interactionRuntime.js";
import { renderCalculatorV2Module } from "./calculatorRenderer.js";
import { renderStorageV2Module } from "./storageRenderer.js";
import { renderInputV2Module } from "./input/render.js";

export const renderCalculatorStorageV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    interactionMode: InteractionMode;
    inputBlocked: boolean;
  },
): void => {
  renderCalculatorV2Module(root, state, dispatch, {
    interactionMode: options.interactionMode,
    inputBlocked: options.inputBlocked,
  });
  renderStorageV2Module(root, state, dispatch, {
    interactionMode: options.interactionMode,
    inputBlocked: options.inputBlocked,
  });
  renderInputV2Module(root, state, dispatch, {
    interactionMode: options.interactionMode,
    inputBlocked: options.inputBlocked,
  });
};

