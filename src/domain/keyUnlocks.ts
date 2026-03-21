import { isButtonUnlocked } from "./buttonStateAccess.js";
import { isKeyId } from "./keyPresentation.js";
import type { GameState, Key } from "./types.js";

const assertKnownKey = (key: Key): void => {
  if (!isKeyId(key)) {
    throw new Error(`Unsupported key id: ${key}`);
  }
};

export const isKeyUnlocked = (state: GameState, key: Key): boolean => {
  assertKnownKey(key);
  return isButtonUnlocked(state, key);
};

export const isKeyInstalledOnActiveKeypad = (state: GameState, key: Key): boolean => {
  assertKnownKey(key);
  return state.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === key);
};

export const isKeyUsableForInput = (state: GameState, key: Key): boolean =>
  isKeyUnlocked(state, key) || isKeyInstalledOnActiveKeypad(state, key);
