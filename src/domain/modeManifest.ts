import type { AppMode } from "../contracts/appMode.js";
import type { GameState } from "./types.js";

export type ModeBootContext = {
  createFreshGameState: () => GameState;
  createSandboxState: () => GameState;
  createMainMenuState: () => GameState;
};

export type ModeManifest = {
  mode: AppMode;
  bootCalculatorOrder: readonly ("menu" | "f" | "g")[];
  activeCalculatorId: "menu" | "f" | "g";
  initialLockPolicy: "default_unlocks" | "all_keys_locked";
  storageContentVisible: boolean;
  modeButtonFlags: Readonly<Record<string, boolean>>;
  createBootState: (context: ModeBootContext) => GameState;
};

export const modeManifestById = {
  game: {
    mode: "game",
    bootCalculatorOrder: ["f"],
    activeCalculatorId: "f",
    initialLockPolicy: "default_unlocks",
    storageContentVisible: true,
    modeButtonFlags: {
      "mode.main_menu": false,
      "mode.storage_content_visible": true,
    },
    createBootState: (context: ModeBootContext) => context.createFreshGameState(),
  },
  sandbox: {
    mode: "sandbox",
    bootCalculatorOrder: ["f"],
    activeCalculatorId: "f",
    initialLockPolicy: "default_unlocks",
    storageContentVisible: false,
    modeButtonFlags: {
      "mode.main_menu": false,
      "mode.storage_content_visible": false,
    },
    createBootState: (context: ModeBootContext) => context.createSandboxState(),
  },
  main_menu: {
    mode: "main_menu",
    bootCalculatorOrder: ["menu"],
    activeCalculatorId: "menu",
    initialLockPolicy: "all_keys_locked",
    storageContentVisible: false,
    modeButtonFlags: {
      "mode.main_menu": true,
      "mode.storage_content_visible": false,
    },
    createBootState: (context: ModeBootContext) => context.createMainMenuState(),
  },
} as const satisfies Record<AppMode, ModeManifest>;

export const resolveModeManifest = (mode: AppMode): ModeManifest => modeManifestById[mode];
