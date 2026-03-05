import type { Action } from "../domain/types.js";

export const resolveAllocatorModeAction = (mode: "calculator" | "modify"): Action =>
  mode === "calculator" ? { type: "ALLOCATOR_ALLOCATE_PRESSED" } : { type: "ALLOCATOR_RETURN_PRESSED" };
