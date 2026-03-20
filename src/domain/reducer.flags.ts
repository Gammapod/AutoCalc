import type { GameState } from "./types.js";
import { DELTA_RANGE_CLAMP_FLAG, MOD_ZERO_TO_DELTA_FLAG } from "./state.js";

// Toggle UI-level boolean flags used by toggle-style buttons.
const EXCLUSIVE_FLAG_GROUPS: readonly (readonly string[])[] = [
  [DELTA_RANGE_CLAMP_FLAG, MOD_ZERO_TO_DELTA_FLAG],
];

const clearExclusivePeers = (flags: Record<string, boolean>, flag: string): Record<string, boolean> => {
  const nextFlags = { ...flags };
  for (const group of EXCLUSIVE_FLAG_GROUPS) {
    if (!group.includes(flag)) {
      continue;
    }
    for (const candidate of group) {
      if (candidate !== flag) {
        delete nextFlags[candidate];
      }
    }
  }
  return nextFlags;
};

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
        ...clearExclusivePeers(state.ui.buttonFlags, trimmed),
        [trimmed]: true,
      },
    },
  };
};
