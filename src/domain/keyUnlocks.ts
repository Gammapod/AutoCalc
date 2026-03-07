import { isButtonUnlocked } from "./buttonStateAccess.js";
import type { GameState, Key } from "./types.js";

export const isKeyUnlocked = (state: GameState, key: Key): boolean => isButtonUnlocked(state, key);
