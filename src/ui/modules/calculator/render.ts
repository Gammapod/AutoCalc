import type { Action, GameState } from "../../../domain/types.js";
import type { InteractionMode } from "../../../app/interactionRuntime.js";
import { render as renderCalculatorAndStorage } from "../calculatorModuleRenderer.js";

export const renderCalculatorV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    interactionMode: InteractionMode;
    inputBlocked: boolean;
  },
): void => {
  renderCalculatorAndStorage(root, state, dispatch, {
    interactionMode: options.interactionMode,
    inputBlocked: options.inputBlocked,
  });
};
