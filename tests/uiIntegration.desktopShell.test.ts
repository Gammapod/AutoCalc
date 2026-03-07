import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import type { Action } from "../src/domain/types.js";
import { reducer } from "../src/domain/reducer.js";
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
    const calcBody = harness.root.querySelector<HTMLElement>(".calc");
    const keys = harness.root.querySelector<HTMLElement>("[data-keys]");
    assert.ok(calcBody, "desktop calculator body exists");
    assert.ok(keys, "desktop keypad exists");
    assert.equal(keys?.style.gridTemplateRows.includes("var(--desktop-key-height)"), true, "desktop uses fixed key height token");
    assert.equal(
      keys?.style.gridTemplateColumns.includes("var(--desktop-key-min-width)"),
      true,
      "desktop uses minimum key-width token for keypad columns",
    );
    assert.equal(keys?.style.getPropertyValue("--desktop-calc-cols"), "1", "desktop render sets keypad column sizing var");
    assert.equal(keys?.style.getPropertyValue("--desktop-calc-rows"), "1", "desktop render sets keypad row sizing var");
    assert.equal(
      calcBody?.style.getPropertyValue("--desktop-calc-width").endsWith("px"),
      true,
      "desktop render sets calculated body width",
    );

    const grown = reducer(initialState(), { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 3 });
    renderer.render(grown, dispatch, {
      interactionMode: "calculator",
      inputBlocked: false,
    });
    assert.equal(keys?.dataset.keypadGrow ?? "", "", "desktop suppresses keypad-only grow animation marker");
    assert.equal(calcBody?.dataset.keypadGrow, "both", "desktop keeps unified calc body grow marker");
    const animatedSlots = keys ? Array.from(keys.children).filter((el) => (el as HTMLElement).classList.contains("keypad-slot-enter")) : [];
    assert.equal(animatedSlots.length, 0, "desktop suppresses slot-enter animations during keypad growth");
    assert.equal(keys?.style.getPropertyValue("--desktop-calc-cols"), "4", "desktop sizing vars update after growth");
    assert.equal(keys?.style.getPropertyValue("--desktop-calc-rows"), "3", "desktop row var updates after growth");

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
