import { keyToVisualizerId } from "./buttonRegistry.js";
import { KEY_ID, resolveKeyId } from "./keyPresentation.js";
import type { Action, GameState, KeyButtonBehavior, KeyCell, VisualizerId } from "./types.js";
import { EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG } from "./state.js";

const PRESS_KEY_BEHAVIOR: KeyButtonBehavior = { type: "press_key" };

const getButtonFlag = (state: GameState, flag: string): boolean => Boolean(state.ui.buttonFlags[flag]);

export const resolveVisualizerForKey = (key: KeyCell["key"]): VisualizerId | null => {
  return keyToVisualizerId(resolveKeyId(key));
};

export const getKeyButtonBehavior = (cell: KeyCell): KeyButtonBehavior => cell.behavior ?? PRESS_KEY_BEHAVIOR;

export const isToggleFlagActive = (state: GameState, cell: KeyCell): boolean => {
  const visualizer = resolveVisualizerForKey(cell.key);
  if (visualizer) {
    return state.ui.activeVisualizer === visualizer;
  }
  if (cell.key === KEY_ID.exec_equals) {
    return getButtonFlag(state, EXECUTION_PAUSE_EQUALS_FLAG);
  }
  const behavior = getKeyButtonBehavior(cell);
  return behavior.type === "toggle_flag" ? getButtonFlag(state, behavior.flag) : false;
};

export const isPlayPauseToggleCell = (cell: KeyCell): boolean => {
  const behavior = getKeyButtonBehavior(cell);
  return behavior.type === "toggle_flag"
    && behavior.flag === EXECUTION_PAUSE_FLAG
    && cell.key === KEY_ID.exec_play_pause;
};

export const getToggleAnimationIdForCell = (cell: KeyCell): string | null => {
  const visualizer = resolveVisualizerForKey(cell.key);
  if (visualizer) {
    return visualizer;
  }
  if (cell.key === KEY_ID.exec_equals) {
    return EXECUTION_PAUSE_EQUALS_FLAG;
  }
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type !== "toggle_flag") {
    return null;
  }
  return behavior.flag;
};

export const buildKeyButtonAction = (cell: KeyCell): Action => {
  const visualizer = resolveVisualizerForKey(cell.key);
  if (visualizer) {
    return { type: "TOGGLE_VISUALIZER", visualizer };
  }
  if (cell.key === KEY_ID.exec_equals) {
    return { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG };
  }
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type === "toggle_flag") {
    return { type: "TOGGLE_FLAG", flag: behavior.flag };
  }
  return { type: "PRESS_KEY", key: cell.key };
};
