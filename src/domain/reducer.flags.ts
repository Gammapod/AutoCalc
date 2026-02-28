import type { GameState } from "./types.js";

// Toggle UI-level boolean flags used by toggle-style buttons.
export const applyToggleFlag = (state: GameState, flag: string): GameState => {
  const trimmed = flag.trim();
  if (trimmed.length === 0) {
    return state;
  }

  const current = Boolean(state.ui.buttonFlags[trimmed]);
  if (current) {
    const nextFlags = { ...state.ui.buttonFlags };
    delete nextFlags[trimmed];
    return {
      ...state,
      ui: {
        ...state.ui,
        buttonFlags: nextFlags,
      },
    };
  }

  return {
    ...state,
    ui: {
      ...state.ui,
      buttonFlags: {
        ...state.ui.buttonFlags,
        [trimmed]: true,
      },
    },
  };
};
