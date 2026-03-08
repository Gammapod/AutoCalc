import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initialState } from "../src/domain/state.js";
import { renderStorageV2Module } from "../src/ui/modules/storage/render.js";
import { installDomHarness } from "./helpers/domHarness.js";

const noopDispatch = () => ({ type: "RESET_RUN" as const });

export const runUiModuleStorageV2Tests = (): void => {
  const harness = installDomHarness("http://localhost:4173/index.html");
  try {
    const state = initialState();
    renderStorageV2Module(harness.root, state, noopDispatch, {
      interactionMode: "modify",
      inputBlocked: false,
    });
    const storage = harness.root.querySelector<HTMLElement>("[data-storage-keys]");
    const sortControls = harness.root.querySelector<HTMLElement>("[data-storage-sort-controls]");
    assert.ok(storage, "storage module renders storage mount");
    assert.ok(sortControls, "storage module renders sort controls mount");
    assert.equal(
      sortControls?.querySelectorAll(".storage-sort-button").length,
      7,
      "storage module renders all storage sort segments",
    );
    assert.equal(storage?.dataset.storageVisible, "true", "storage module marks storage as visible");
    assert.equal(
      Boolean(storage?.querySelector(".placeholder--storage-empty, .key--storage")),
      true,
      "storage module renders storage slots",
    );
  } finally {
    harness.teardown();
  }

  const storageRendererSource = readFileSync(
    resolve(process.cwd(), "src/ui/modules/storageRenderer.ts"),
    "utf8",
  );
  assert.equal(
    storageRendererSource.includes("calculatorModuleRenderer"),
    false,
    "storage renderer no longer imports calculatorModuleRenderer directly",
  );
};

