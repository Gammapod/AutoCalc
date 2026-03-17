import type { Action, GameState, Key, KeyCell } from "../domain/types.js";
import {
  buildKeyButtonAction,
  getKeyButtonBehavior,
  getToggleAnimationIdForCell,
  isAutoEqualsToggleCell,
  isToggleFlagActive,
} from "../domain/keyActionPolicy.js";
import {
  getInstalledExecutorKey,
  hasValidAutoEqualsEquation,
  isAutoEqualsEnabled,
} from "../domain/autoEqualsPolicy.js";

export type DomainPolicy = {
  keyAction: {
    buildKeyButtonAction: (cell: KeyCell) => Action;
    getKeyButtonBehavior: (cell: KeyCell) => KeyCell["behavior"] | { type: "press_key" };
    getToggleAnimationIdForCell: (cell: KeyCell) => string | null;
    isAutoEqualsToggleCell: (cell: KeyCell) => boolean;
    isToggleFlagActive: (state: GameState, cell: KeyCell) => boolean;
  };
  autoEquals: {
    getInstalledExecutorKey: (state: GameState) => Key | null;
    hasValidEquation: (state: GameState) => boolean;
    isEnabled: (state: GameState) => boolean;
  };
};

export const domainPolicy: DomainPolicy = {
  keyAction: {
    buildKeyButtonAction,
    getKeyButtonBehavior,
    getToggleAnimationIdForCell,
    isAutoEqualsToggleCell,
    isToggleFlagActive,
  },
  autoEquals: {
    getInstalledExecutorKey,
    hasValidEquation: hasValidAutoEqualsEquation,
    isEnabled: isAutoEqualsEnabled,
  },
};
