import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { renderStorageV2Module } from "../src/ui/modules/storage/render.js";
import { installDomHarness } from "./helpers/domHarness.js";

const noopDispatch = () => ({ type: "RESET_RUN" as const });

export const runUiModuleStorageV2Tests = (): void => {
  const harness = installDomHarness("http://localhost:4173/index.html");
  try {
    const state = initialState();
    const dispatched: Array<{ type: string; [key: string]: unknown }> = [];
    renderStorageV2Module(harness.root, state, noopDispatch, {
            inputBlocked: false,
    });
    const storage = harness.root.querySelector<HTMLElement>("[data-storage-keys]");
    const sortControls = harness.root.querySelector<HTMLElement>("[data-storage-sort-controls]");
    const modeButton = harness.root.querySelector<HTMLButtonElement>("[data-storage-mode-toggle]");
    assert.ok(storage, "storage module renders storage mount");
    assert.ok(sortControls, "storage module renders sort controls mount");
    assert.ok(modeButton, "storage module renders mode toggle button");
    assert.equal(modeButton?.textContent, "Browse", "standard mode offers browse toggle");
    assert.equal(
      sortControls?.querySelectorAll(".storage-sort-button").length,
      6,
      "storage module renders all storage filter segments",
    );
    assert.equal(storage?.dataset.storageVisible, "true", "storage module marks storage as visible");
    assert.equal(
      Boolean(storage?.querySelector(".placeholder--storage-empty, .key--storage")),
      true,
      "storage module renders storage slots",
    );
    modeButton?.click();
    renderStorageV2Module(harness.root, state, (action) => {
      dispatched.push(action as { type: string; [key: string]: unknown });
      return action;
    }, {
      inputBlocked: false,
    });
    modeButton?.click();
    assert.deepEqual(
      dispatched[0],
      { type: "TOGGLE_FLAG", flag: "mode.storage_browse" },
      "mode toggle dispatches browse flag toggle action",
    );

    const mainMenuState = {
      ...state,
      ui: {
        ...state.ui,
        buttonFlags: {
          ...state.ui.buttonFlags,
          "mode.main_menu": true,
          "mode.storage_content_visible": false,
        },
      },
      unlocks: {
        ...state.unlocks,
        uiUnlocks: {
          ...state.unlocks.uiUnlocks,
          storageVisible: false,
        },
      },
    };
    renderStorageV2Module(harness.root, mainMenuState, noopDispatch, {
      inputBlocked: false,
    });
    const storageShell = harness.root.querySelector<HTMLElement>(".storage");
    assert.equal(storageShell?.hidden, true, "main menu hides storage shell");
    assert.equal(storage?.dataset.storageVisible, "false", "main menu hides storage contents");

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

    const binaryStorageCell = { kind: "key", key: k("op_add") } as const;
    const binaryState = {
      ...state,
      ui: {
        ...state.ui,
        storageLayout: [binaryStorageCell, ...state.ui.storageLayout.slice(1)],
      },
      unlocks: {
        ...state.unlocks,
        maxSlots: 1,
        slotOperators: {
          ...state.unlocks.slotOperators,
          [k("op_add")]: true,
        },
      },
    };
    renderStorageV2Module(harness.root, binaryState, noopDispatch, {
      inputBlocked: false,
    });
    const binaryButton = harness.root.querySelector<HTMLButtonElement>(`[data-storage-keys] button[data-key='${k("op_add")}']`);
    assert.equal(binaryButton?.classList.contains("key--group-slot_operator"), true, "storage binary key uses operator group styling");
    assert.equal(binaryButton?.classList.contains("key--unary-operator"), false, "storage binary key does not receive unary-only stripe class");
    assert.equal(binaryButton?.classList.contains("key--family-complex"), false, "storage non-complex binary key does not receive complex family class");

    const complexBinaryStorageCell = { kind: "key", key: k("op_log_tuple") } as const;
    const complexBinaryState = {
      ...state,
      ui: {
        ...state.ui,
        storageLayout: [complexBinaryStorageCell, ...state.ui.storageLayout.slice(1)],
      },
      unlocks: {
        ...state.unlocks,
        maxSlots: 1,
        slotOperators: {
          ...state.unlocks.slotOperators,
          [k("op_log_tuple")]: true,
        },
      },
    };
    renderStorageV2Module(harness.root, complexBinaryState, noopDispatch, {
      inputBlocked: false,
    });
    const complexBinaryButton = harness.root.querySelector<HTMLButtonElement>(`[data-storage-keys] button[data-key='${k("op_log_tuple")}']`);
    assert.equal(complexBinaryButton?.classList.contains("key--family-complex"), true, "storage complex-family binary key receives complex family class");

    const visualizerStorageCell = { kind: "key", key: k("viz_feed") } as const;
    const visualizerState = {
      ...state,
      ui: {
        ...state.ui,
        storageLayout: [visualizerStorageCell, ...state.ui.storageLayout.slice(1)],
      },
      unlocks: {
        ...state.unlocks,
        visualizers: {
          ...state.unlocks.visualizers,
          [k("viz_feed")]: true,
        },
      },
    };
    renderStorageV2Module(harness.root, visualizerState, noopDispatch, {
      inputBlocked: false,
    });
    const visualizerButton = harness.root.querySelector<HTMLButtonElement>(`[data-storage-keys] button[data-key='${k("viz_feed")}']`);
    assert.equal(visualizerButton?.classList.contains("key--group-settings"), true, "storage visualizer key uses unified settings group styling");

    const binaryModeStorageCell = { kind: "key", key: KEY_ID.toggle_binary_mode } as const;
    const binaryModeState = {
      ...state,
      ui: {
        ...state.ui,
        storageLayout: [binaryModeStorageCell, ...state.ui.storageLayout.slice(1)],
      },
      unlocks: {
        ...state.unlocks,
        utilities: {
          ...state.unlocks.utilities,
          [KEY_ID.toggle_binary_mode]: true,
        },
      },
    };
    renderStorageV2Module(harness.root, binaryModeState, noopDispatch, {
      inputBlocked: false,
    });
    const binaryModeButton = harness.root.querySelector<HTMLButtonElement>(`[data-storage-keys] button[data-key='${KEY_ID.toggle_binary_mode}']`);
    assert.equal(binaryModeButton?.classList.contains("key--group-settings"), true, "storage binary mode key stays in settings group styling");
  } finally {
    harness.teardown();
  }
};






