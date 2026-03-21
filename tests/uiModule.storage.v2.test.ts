import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
            inputBlocked: false,
    });
    const storage = harness.root.querySelector<HTMLElement>("[data-storage-keys]");
    const sortControls = harness.root.querySelector<HTMLElement>("[data-storage-sort-controls]");
    assert.ok(storage, "storage module renders storage mount");
    assert.ok(sortControls, "storage module renders sort controls mount");
    assert.equal(
      sortControls?.querySelectorAll(".storage-sort-button").length,
      8,
      "storage module renders all storage sort segments",
    );
    assert.equal(storage?.dataset.storageVisible, "true", "storage module marks storage as visible");
    assert.equal(
      Boolean(storage?.querySelector(".placeholder--storage-empty, .key--storage")),
      true,
      "storage module renders storage slots",
    );

    const unaryStorageCell = { kind: "key", key: k("unary_inc") } as const;
    const unaryState = {
      ...state,
      ui: {
        ...state.ui,
        storageLayout: [unaryStorageCell, ...state.ui.storageLayout.slice(1)],
      },
      unlocks: {
        ...state.unlocks,
        maxSlots: 1,
        unaryOperators: {
          ...state.unlocks.unaryOperators,
          [k("unary_inc")]: true,
        },
      },
    };
    renderStorageV2Module(harness.root, unaryState, noopDispatch, {
      inputBlocked: false,
    });
    const unaryButton = harness.root.querySelector<HTMLButtonElement>(`[data-storage-keys] button[data-key='${k("unary_inc")}']`);
    assert.equal(unaryButton?.classList.contains("key--group-slot_operator"), true, "storage unary key uses operator group styling");
    assert.equal(unaryButton?.classList.contains("key--unary-operator"), true, "storage unary key receives unary stripe class");
  } finally {
    harness.teardown();
  }

  const renderAdapterSource = readFileSync(
    resolve(process.cwd(), "src/ui/renderAdapter.ts"),
    "utf8",
  );
  assert.equal(
    renderAdapterSource.includes("./modules/storage/render.js"),
    true,
    "render adapter routes storage export to storage module owner path",
  );
  assert.equal(
    existsSync(resolve(process.cwd(), "src/ui/modules/storageRenderer.ts")),
    false,
    "storage wrapper file removed",
  );
};






