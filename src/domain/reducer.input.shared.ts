import { isKeyUnlocked } from "./keyUnlocks.js";
import { resolveKeyId } from "./keyPresentation.js";
import {
  hasStepThroughOnKeypad,
  incrementKeyPressCount,
  preprocessForActiveRoll,
  withClearedStepProgress,
} from "./reducer.input.core.js";
import type { GameState, Key, KeyInput } from "./types.js";

export type PreparedKeyActionContext = {
  key: Key;
  stepAwareState: GameState;
  preprocessed: GameState;
  keyed: GameState;
  isUnlocked: boolean;
};

export const prepareKeyActionContext = (
  state: GameState,
  keyLike: KeyInput,
): PreparedKeyActionContext => {
  const stepAwareState = hasStepThroughOnKeypad(state) ? state : withClearedStepProgress(state);
  const key = resolveKeyId(keyLike);
  const preprocessed = preprocessForActiveRoll(stepAwareState, key);
  const isUnlocked = isKeyUnlocked(preprocessed, key);
  const keyed = isUnlocked ? incrementKeyPressCount(preprocessed, key) : preprocessed;
  return { key, stepAwareState, preprocessed, keyed, isUnlocked };
};

