import type { Action, GameState } from "../../domain/types.js";

export const renderStorageV2Module = (
  root: Element,
  _state: GameState,
  _dispatch: (action: Action) => unknown,
): void => {
  const storageMount = root.querySelector("[data-storage-keys]");
  if (!storageMount) {
    throw new Error("Storage module mount point is missing.");
  }
};
