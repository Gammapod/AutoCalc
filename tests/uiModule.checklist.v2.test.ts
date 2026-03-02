import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderChecklistV2Module } from "../src_v2/ui/renderAdapter.js";

type RootLike = {
  querySelector: (selector: string) => Element | null;
};

export const runUiModuleChecklistV2Tests = (): void => {
  const mockRoot: RootLike = {
    querySelector: () => null,
  };

  assert.throws(
    () => renderChecklistV2Module(mockRoot as unknown as Element, initialState()),
    /Checklist mount point is missing/,
    "checklist v2 renderer validates mount point contract",
  );
};

