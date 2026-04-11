import type { ControlField, GameState } from "../../domain/types.js";
import { resolveSelectedControlContextFromUi, type SelectedControlContext } from "../../domain/controlSelection.js";

export type SelectionRenderModel = {
  context: SelectedControlContext;
  selectedToken: "\u03B1" | "\u03B2" | "\u03B3" | "\u03B4" | "\u03F5" | null;
  highlightByField: Record<ControlField, boolean>;
};

const fieldToToken = (field: ControlField | null): SelectionRenderModel["selectedToken"] => {
  if (field === "alpha") {
    return "\u03B1";
  }
  if (field === "beta") {
    return "\u03B2";
  }
  if (field === "gamma") {
    return "\u03B3";
  }
  if (field === "delta") {
    return "\u03B4";
  }
  if (field === "epsilon") {
    return "\u03F5";
  }
  return null;
};

export const buildSelectionRenderModel = (state: GameState): SelectionRenderModel => {
  const context = resolveSelectedControlContextFromUi(state.ui);
  const selected: ControlField | null = null;
  return {
    context,
    selectedToken: fieldToToken(selected),
    highlightByField: {
      alpha: selected === "alpha",
      beta: selected === "beta",
      gamma: selected === "gamma",
      delta: selected === "delta",
      epsilon: selected === "epsilon",
    },
  };
};
