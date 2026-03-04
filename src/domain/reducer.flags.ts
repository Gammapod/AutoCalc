import type { GameState } from "./types.js";
import { FEED_VISIBLE_FLAG, GRAPH_VISIBLE_FLAG } from "./state.js";

const VISUALIZER_FLAGS = new Set<string>([GRAPH_VISIBLE_FLAG, FEED_VISIBLE_FLAG]);

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

  if (VISUALIZER_FLAGS.has(trimmed)) {
    const nextFlags = { ...state.ui.buttonFlags };
    for (const visualizerFlag of VISUALIZER_FLAGS) {
      if (visualizerFlag !== trimmed) {
        delete nextFlags[visualizerFlag];
      }
    }
    nextFlags[trimmed] = true;
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
