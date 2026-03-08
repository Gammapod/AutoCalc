import assert from "node:assert/strict";
import { getSnapOffset } from "../src/ui/shell/transforms.js";
import type { ShellRefs } from "../src/ui/shell/types.js";

const elementAtTop = (top: number): HTMLElement =>
  ({
    getBoundingClientRect: () => ({ top } as DOMRect),
  }) as HTMLElement;

export const runUiShellTransformsTests = (): void => {
  const refs = {
    track: elementAtTop(10),
    sectionCalc: elementAtTop(110),
    keys: elementAtTop(210),
  } as ShellRefs;

  assert.equal(getSnapOffset("middle", refs), 100, "middle snap offset is sectionCalc-top minus track-top");
  assert.equal(getSnapOffset("bottom", refs), 200, "bottom snap offset is keys-top minus track-top");
};
