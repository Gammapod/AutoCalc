import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import type { Action, GameState } from "../src/domain/types.js";
import { createShellRenderer } from "../src_v2/ui/renderAdapter.js";
import { click } from "./helpers/eventHarness.js";
import { installDomHarness } from "./helpers/domHarness.js";

export const runUiIntegrationMobileShellTests = (): void => {
  const harness = installDomHarness("http://localhost:4173/index.html?ui=mobile");
  const dispatched: Action[] = [];
  const dispatch = (action: Action): Action => {
    dispatched.push(action);
    return action;
  };

  const withStorage: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      uiUnlocks: {
        ...initialState().unlocks.uiUnlocks,
        storageVisible: true,
      },
    },
  };

  try {
    const renderer = createShellRenderer(harness.root, { mode: "mobile" });
    renderer.render(withStorage, dispatch, {
      interactionMode: "modify",
      inputBlocked: false,
    });

    const shellRoot = harness.root.querySelector<HTMLElement>("[data-v2-shell-root='true']");
    assert.ok(shellRoot, "mobile shell mounts v2 shell root");
    const menu = shellRoot?.querySelector<HTMLElement>("[data-v2-menu='true']");
    assert.equal(menu?.getAttribute("aria-hidden"), "true", "mobile menu is hidden by default");

    renderer.forceActiveView({
      snapId: "bottom",
      bottomPanelId: "allocator",
      includeTransition: false,
    });
    const allocatorPanel = shellRoot?.querySelector<HTMLElement>("[data-v2-drawer-panel='allocator']");
    assert.equal(
      allocatorPanel?.getAttribute("aria-hidden"),
      "false",
      "forceActiveView can orchestrate bottom allocator panel",
    );

    renderer.render(withStorage, dispatch, {
      interactionMode: "calculator",
      inputBlocked: false,
    });
    const keyButton = harness.root.querySelector<HTMLButtonElement>(".key[data-key='++']");
    assert.ok(keyButton, "calculator key exists after mobile render");
    click(keyButton as HTMLButtonElement);
    assert.equal(
      dispatched.some((action) => action.type === "PRESS_KEY" && action.key === "++"),
      true,
      "clicking a rendered key dispatches PRESS_KEY action",
    );

    renderer.dispose();
  } finally {
    harness.teardown();
  }
};
