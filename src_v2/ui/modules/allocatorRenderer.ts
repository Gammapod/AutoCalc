import type { Action, GameState } from "../../../src/domain/types.js";

export const renderAllocatorV2Module = (
  root: Element,
  _state: GameState,
  _dispatch: (action: Action) => unknown,
): void => {
  const allocator = root.querySelector("[data-allocator-device]");
  if (!allocator) {
    throw new Error("Allocator module mount point is missing.");
  }
};

