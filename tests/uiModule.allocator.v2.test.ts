import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const gridMatch = indexHtml.match(/<div class="allocator-grid">([\s\S]*?)<\/div>\s*<\/section>\s*<section class="device device--calc"/);
  assert.equal(gridMatch !== null, true, "allocator grid markup is present");
  const allocatorGrid = gridMatch?.[1] ?? "";
  const rowBlocks = [...allocatorGrid.matchAll(/<div class="allocator-row">([\s\S]*?)<\/div>/g)];
  assert.equal(rowBlocks.length >= 6, true, "allocator template includes at least six allocator rows");
  for (const [index, row] of rowBlocks.entries()) {
    const rowMarkup = row[1] ?? "";
    const displayPos = rowMarkup.indexOf("allocator-display");
    const labelPos = rowMarkup.indexOf("allocator-label");
    const stepperPos = rowMarkup.includes("allocator-stepper-placeholder")
      ? rowMarkup.indexOf("allocator-stepper-placeholder")
      : rowMarkup.indexOf("allocator-stepper");
    assert.equal(displayPos >= 0, true, `row ${index} includes display first column`);
    assert.equal(labelPos > displayPos, true, `row ${index} places label after display`);
    assert.equal(stepperPos > labelPos, true, `row ${index} places stepper column after label`);
  }
  assert.equal(
    rowBlocks[0]?.[1].includes("allocator-stepper-placeholder"),
    true,
    "lambda row uses a stepper placeholder column to preserve row alignment",
  );

  const labelKeys = [...allocatorGrid.matchAll(/data-allocator-label="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(
    labelKeys,
    ["lambda", "width", "height", "range", "speed", "slots"],
    "allocator label hooks include all compact symbolic KaTeX keys",
  );
};

