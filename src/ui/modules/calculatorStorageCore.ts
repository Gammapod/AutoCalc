export {
  buildLayoutDropDispatchAction,
} from "./input/dragDrop.js";
import type { GameState, KeyCell } from "../../domain/types.js";
import {
  buildKeyButtonAction,
  getKeyButtonBehavior,
  getToggleAnimationIdForCell,
  isPlayPauseToggleCell,
  isToggleFlagActive,
} from "../../domain/keyActionPolicy.js";
import { formatKeyLabel } from "../shared/readModel.js";
export { buildKeyButtonAction, getKeyButtonBehavior, getToggleAnimationIdForCell, isPlayPauseToggleCell, isToggleFlagActive };

export const formatKeyCellLabel = (state: GameState, cell: KeyCell): string => {
  if (isPlayPauseToggleCell(cell)) {
    return isToggleFlagActive(state, cell) ? "\u275A\u275A" : "\u25B6";
  }
  return formatKeyLabel(cell.key);
};

export { resolveCalculatorKeysLocked } from "./calculator/dom.js";

