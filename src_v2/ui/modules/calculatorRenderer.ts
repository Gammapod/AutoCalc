import type { Action, GameState } from "../../../src/domain/types.js";
import type { InteractionMode } from "../../../src/app/interactionRuntime.js";
import { render as renderParity } from "./calculatorStorageLegacyParity.js";

export const renderCalculatorV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    interactionMode: InteractionMode;
    inputBlocked: boolean;
  },
): void => {
  renderParity(root, state, dispatch, {
    skipChecklist: true,
    skipGraph: true,
    interactionMode: options.interactionMode,
    inputBlocked: options.inputBlocked,
  });
};
