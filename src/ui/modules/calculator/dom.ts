import type { Key } from "../../../domain/types.js";
import { getKeyVisualGroup as getKeyVisualGroupShared, type KeyVisualGroup } from "../../shared/readModel.js";

export const getKeyVisualGroup = (key: Key): KeyVisualGroup => {
  return getKeyVisualGroupShared(key);
};

export const resolveCalculatorKeysLocked = (
  inputBlocked: boolean,
): boolean => {
  return inputBlocked;
};

