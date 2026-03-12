export {
  buildLayoutDropDispatchAction,
} from "./input/dragDrop.js";
import { keyToVisualizerId } from "../../domain/buttonRegistry.js";
import { resolveKeyId, toLegacyKey } from "../../domain/keyPresentation.js";
import type { Action, GameState, KeyButtonBehavior, KeyCell, VisualizerId } from "../../domain/types.js";
import { AUTO_EQUALS_FLAG } from "../../domain/state.js";
import { formatKeyLabel } from "../shared/readModel.js";

const PRESS_KEY_BEHAVIOR: KeyButtonBehavior = { type: "press_key" };

const getButtonFlag = (state: GameState, flag: string): boolean => {
  return Boolean(state.ui.buttonFlags[flag]);
};

const visualizerForKey = (key: KeyCell["key"]): VisualizerId | null => {
  return keyToVisualizerId(toLegacyKey(resolveKeyId(key)));
};

export const getToggleAnimationIdForCell = (cell: KeyCell): string | null => {
  const visualizer = visualizerForKey(cell.key);
  if (visualizer) {
    return visualizer;
  }
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type !== "toggle_flag") {
    return null;
  }
  return behavior.flag;
};

export const getKeyButtonBehavior = (cell: KeyCell): KeyButtonBehavior => {
  return cell.behavior ?? PRESS_KEY_BEHAVIOR;
};

export const isToggleFlagActive = (state: GameState, cell: KeyCell): boolean => {
  const visualizer = visualizerForKey(cell.key);
  if (visualizer) {
    return state.ui.activeVisualizer === visualizer;
  }
  const behavior = getKeyButtonBehavior(cell);
  return behavior.type === "toggle_flag" ? getButtonFlag(state, behavior.flag) : false;
};

export const isAutoEqualsToggleCell = (cell: KeyCell): boolean => {
  const behavior = getKeyButtonBehavior(cell);
  return behavior.type === "toggle_flag" && behavior.flag === AUTO_EQUALS_FLAG;
};

export const formatKeyCellLabel = (state: GameState, cell: KeyCell): string => {
  if (isAutoEqualsToggleCell(cell)) {
    return isToggleFlagActive(state, cell) ? "\u275A\u275A" : "\u25B6";
  }
  return formatKeyLabel(cell.key);
};

export const buildKeyButtonAction = (state: GameState, cell: KeyCell): Action => {
  const visualizer = visualizerForKey(cell.key);
  if (visualizer) {
    return { type: "TOGGLE_VISUALIZER", visualizer };
  }
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type === "toggle_flag") {
    return { type: "TOGGLE_FLAG", flag: behavior.flag };
  }
  return { type: "PRESS_KEY", key: cell.key };
};

export { resolveCalculatorKeysLocked } from "./calculator/dom.js";



