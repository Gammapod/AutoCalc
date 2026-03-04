import type { GameState, Key } from "./types.js";

export const isKeyUnlocked = (state: GameState, key: Key): boolean => {
  if (/^\d$/.test(key) || key === "NEG") {
    return state.unlocks.valueExpression[key as keyof GameState["unlocks"]["valueExpression"]];
  }
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "\u27E1") {
    return state.unlocks.slotOperators[key];
  }
  if (key === "C" || key === "CE" || key === "UNDO") {
    return state.unlocks.utilities[key];
  }
  if (key === "\u23EF") {
    return state.unlocks.steps[key];
  }
  if (key === "GRAPH") {
    return state.unlocks.visualizers.GRAPH;
  }
  if (key === "FEED") {
    return state.unlocks.visualizers.FEED;
  }
  if (key === "=" || key === "++" || key === "--") {
    return state.unlocks.execution[key];
  }
  return false;
};
