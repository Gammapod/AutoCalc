import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import type { Action } from "../src/domain/types.js";
import { createShellRenderer } from "../src/ui/renderAdapter.js";
import { click } from "./helpers/eventHarness.js";
import { installDomHarness } from "./helpers/domHarness.js";

export const runUiIntegrationDesktopShellTests = (): void => {
  const harness = installDomHarness("http://localhost:4173/index.html?ui=desktop");
  const dispatched: Action[] = [];
  const dispatch = (action: Action): Action => {
    dispatched.push(action);
    return action;
  };

  try {
    const renderer = createShellRenderer(harness.root, { mode: "desktop" });

    renderer.render(initialState(), dispatch, {
      interactionMode: "calculator",
      inputBlocked: false,
    });
    const playArea = harness.root.querySelector<HTMLElement>(".play-area");
    assert.equal(playArea?.getAttribute("data-desktop-shell"), "true", "desktop shell marker is applied");
    assert.equal(playArea?.getAttribute("data-desktop-mode"), "calculator", "desktop mode starts in calculator");

    renderer.render(initialState(), dispatch, {
      interactionMode: "modify",
      inputBlocked: false,
    });
    assert.equal(playArea?.getAttribute("data-desktop-mode"), "modify", "desktop mode updates during orchestration");

    renderer.render(initialState(), dispatch, {
      interactionMode: "calculator",
      inputBlocked: false,
    });
    const keyButton = harness.root.querySelector<HTMLButtonElement>(".key[data-key='++']");
    assert.ok(keyButton, "calculator key exists after desktop render");
    click(keyButton as HTMLButtonElement);
    assert.equal(
      dispatched.some((action) => action.type === "PRESS_KEY" && action.key === "++"),
      true,
      "clicking a rendered key dispatches PRESS_KEY action on desktop shell",
    );

    renderer.dispose();
  } finally {
    harness.teardown();
  }
};
