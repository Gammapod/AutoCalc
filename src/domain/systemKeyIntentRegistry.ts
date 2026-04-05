import type { AppMode } from "../contracts/appMode.js";
import { KEY_ID, type KeyId } from "./keyPresentation.js";
import type { TransitionSavePolicy, UiEffect } from "./types.js";

export type SystemKeyIntent =
  | {
      type: "mode_transition";
      targetMode: AppMode;
      savePolicy: TransitionSavePolicy;
    }
  | {
      type: "quit_application";
    };

export const systemKeyIntentRegistry = {
  [KEY_ID.system_save_quit_main_menu]: {
    type: "mode_transition",
    targetMode: "main_menu",
    savePolicy: "save_current",
  },
  [KEY_ID.system_mode_game]: {
    type: "mode_transition",
    targetMode: "game",
    savePolicy: "none",
  },
  [KEY_ID.system_new_game]: {
    type: "mode_transition",
    targetMode: "game",
    savePolicy: "clear_save",
  },
  [KEY_ID.system_mode_sandbox]: {
    type: "mode_transition",
    targetMode: "sandbox",
    savePolicy: "none",
  },
  [KEY_ID.system_quit_game]: {
    type: "quit_application",
  },
} as const satisfies Partial<Record<KeyId, SystemKeyIntent>>;

export const resolveSystemKeyIntent = (key: KeyId): SystemKeyIntent | null =>
  (systemKeyIntentRegistry as Partial<Record<KeyId, SystemKeyIntent>>)[key] ?? null;

export const mapSystemKeyIntentToUiEffect = (intent: SystemKeyIntent): UiEffect =>
  intent.type === "quit_application"
    ? { type: "quit_application" }
    : {
      type: "request_mode_transition",
      targetMode: intent.targetMode,
      savePolicy: intent.savePolicy,
    };
