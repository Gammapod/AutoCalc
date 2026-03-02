import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderAllocatorV2Module } from "../src_v2/ui/renderAdapter.js";

type RootLike = {
  querySelector: (selector: string) => Element | null;
};

export const runUiModuleAllocatorV2Tests = (): void => {
  const state = initialState();
  const dispatch = () => ({ type: "RESET_RUN" as const });
  const missingRoot: RootLike = {
    querySelector: () => null,
  };
  assert.throws(
    () => renderAllocatorV2Module(missingRoot as unknown as Element, state, dispatch),
    /Allocator module mount point is missing/,
    "allocator v2 renderer validates mount point contract",
  );

  const presentRoot: RootLike = {
    querySelector: (selector: string) => (selector === "[data-allocator-device]" ? ({} as Element) : null),
  };
  assert.doesNotThrow(
    () => renderAllocatorV2Module(presentRoot as unknown as Element, state, dispatch),
    "allocator v2 renderer no-ops safely when mount point exists",
  );
};

