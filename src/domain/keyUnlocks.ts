import { isButtonUnlocked } from "./buttonStateAccess.js";
import type { GameState, Key } from "./types.js";

export const isKeyUnlocked = (state: GameState, key: Key): boolean => isButtonUnlocked(state, key);

export const isKeyInstalledOnActiveKeypad = (state: GameState, key: Key): boolean =>
  state.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === key);

export const isKeyUsableForInput = (state: GameState, key: Key): boolean =>
  isKeyUnlocked(state, key) || isKeyInstalledOnActiveKeypad(state, key);
