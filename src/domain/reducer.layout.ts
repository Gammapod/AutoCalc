import type { GameState } from "./types.js";

// Layout-only reducer logic for key slot move/swap actions.
const isValidLayoutIndex = (layoutLength: number, index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < layoutLength;

export const applyMoveKeySlot = (state: GameState, fromIndex: number, toIndex: number): GameState => {
  const layout = state.ui.keyLayout;
  if (
    !isValidLayoutIndex(layout.length, fromIndex) ||
    !isValidLayoutIndex(layout.length, toIndex) ||
    fromIndex === toIndex
  ) {
    return state;
  }

  const nextLayout = [...layout];
  const [movedCell] = nextLayout.splice(fromIndex, 1);
  nextLayout.splice(toIndex, 0, movedCell);
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout: nextLayout,
    },
  };
};

export const applySwapKeySlots = (state: GameState, firstIndex: number, secondIndex: number): GameState => {
  const layout = state.ui.keyLayout;
  if (
    !isValidLayoutIndex(layout.length, firstIndex) ||
    !isValidLayoutIndex(layout.length, secondIndex) ||
    firstIndex === secondIndex
  ) {
    return state;
  }

  const nextLayout = [...layout];
  [nextLayout[firstIndex], nextLayout[secondIndex]] = [nextLayout[secondIndex], nextLayout[firstIndex]];
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout: nextLayout,
    },
  };
};
