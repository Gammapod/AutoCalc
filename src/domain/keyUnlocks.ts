import { isButtonUnlocked } from "./buttonStateAccess.js";
import { isKeyId } from "./keyPresentation.js";
import type { GameState, Key, KeyCapability } from "./types.js";

const assertKnownKey = (key: Key): void => {
  if (!isKeyId(key)) {
    throw new Error(`Unsupported key id: ${key}`);
  }
};

export const isKeyUnlocked = (state: GameState, key: Key): boolean => {
  assertKnownKey(key);
  return isButtonUnlocked(state, key);
};

export const resolveKeyCapability = (state: GameState, key: Key): KeyCapability => {
  assertKnownKey(key);
  if (isButtonUnlocked(state, key)) {
    return "portable";
  }
  if (Boolean(state.unlocks.installedOnly[key])) {
    return "installed_only";
  }
  return "locked";
};

export const isKeyPortable = (state: GameState, key: Key): boolean =>
  resolveKeyCapability(state, key) === "portable";

export const isKeyInstalledOnActiveKeypad = (state: GameState, key: Key): boolean => {
  assertKnownKey(key);
  return state.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === key);
};

export const isKeyUsableForInput = (state: GameState, key: Key): boolean =>
  resolveKeyCapability(state, key) !== "locked";
