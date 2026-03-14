import "./support/keyCompat.runtime.js";
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
            inputBlocked: false,
    });
    const playArea = harness.root.querySelector<HTMLElement>(".play-area");
    const initialSlotDisplay = harness.root.querySelector<HTMLElement>("[data-slot]");
    assert.equal(playArea?.getAttribute("data-desktop-shell"), "true", "desktop shell marker is applied");
    assert.equal(playArea?.getAttribute("data-desktop-mode"), "calculator", "desktop mode starts in calculator");
    assert.equal(initialSlotDisplay?.classList.contains("slot-display--marquee"), false, "desktop initial render does not marquee non-overflow slot text");

    renderer.render(initialState(), dispatch, {
            inputBlocked: false,
    });
    assert.equal(playArea?.getAttribute("data-desktop-mode"), "calculator", "desktop mode remains calculator");

    renderer.render(initialState(), dispatch, {
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
      keys?.style.getPropertyValue("--desktop-key-min-width").endsWith("px"),
      true,
      "desktop render sets ratio-driven key minimum width token",
    );
    assert.equal(
      calcBody?.style.getPropertyValue("--desktop-calc-width").endsWith("px"),
      true,
      "desktop render sets calculated body width",
    );
    assert.equal(
      calcBody?.style.getPropertyValue("--desktop-calc-min-height").endsWith("px"),
      true,
      "desktop render sets calculated minimum body height",
    );
    const lowColumnVisualizerWidthToken = harness.root
      .querySelector<HTMLElement>("[data-display-window]")
      ?.style.getPropertyValue("--v2-visualizer-fixed-width");
    assert.equal(
      lowColumnVisualizerWidthToken,
      "var(--desktop-calc-width)",
      "when columns are <= 4, visualizer width follows calculator width token",
    );
    assert.equal(
      keys?.style.gridTemplateRows.includes("minmax(var(--desktop-key-height), 1fr)"),
      true,
      "desktop below-baseline rows stretch to fill baseline keypad height",
    );
    assert.equal(
      keys?.style.height.endsWith("px"),
      true,
      "desktop below-baseline rows apply explicit baseline keypad height",
    );

    const widthAtOneByOne = Number.parseFloat(calcBody?.style.getPropertyValue("--desktop-calc-width") ?? "0");
    const heightAtOneByOne = Number.parseFloat(calcBody?.style.getPropertyValue("--desktop-calc-min-height") ?? "0");
    const baselineState = reducer(initialState(), { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 2 });
    renderer.render(baselineState, dispatch, {
            inputBlocked: false,
    });
    const widthAtBaseline = Number.parseFloat(calcBody?.style.getPropertyValue("--desktop-calc-width") ?? "0");
    const heightAtBaseline = Number.parseFloat(calcBody?.style.getPropertyValue("--desktop-calc-min-height") ?? "0");
    assert.equal(
      keys?.style.gridTemplateRows.includes("repeat(2, var(--desktop-key-height))"),
      true,
      "desktop baseline rows use fixed-height row tracks",
    );
    assert.equal(keys?.style.height, "", "desktop baseline rows do not force stretch height");
    assert.equal(widthAtBaseline >= widthAtOneByOne, true, "desktop baseline width is not smaller than 1x1 width floor");
    assert.equal(heightAtBaseline >= heightAtOneByOne, true, "desktop baseline height is not smaller than 1x1 height floor");

    const grown = reducer(initialState(), { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 3 });
    renderer.render(grown, dispatch, {
            inputBlocked: false,
    });
    assert.equal(keys?.dataset.keypadGrow ?? "", "", "desktop suppresses keypad-only grow animation marker");
    assert.equal(
      ["row", "column", "both"].includes(calcBody?.dataset.keypadGrow ?? ""),
      true,
      "desktop keeps unified calc body grow marker",
    );
    const animatedSlots = keys ? Array.from(keys.children).filter((el) => (el as HTMLElement).classList.contains("keypad-slot-enter")) : [];
    assert.equal(animatedSlots.length, 0, "desktop suppresses slot-enter animations during keypad growth");
    assert.equal(keys?.style.getPropertyValue("--desktop-calc-cols"), "4", "desktop sizing vars update after growth");
    assert.equal(keys?.style.getPropertyValue("--desktop-calc-rows"), "3", "desktop row var updates after growth");

    const wide = reducer(initialState(), { type: "SET_KEYPAD_DIMENSIONS", columns: 5, rows: 2 });
    renderer.render(wide, dispatch, {
            inputBlocked: false,
    });
    const displayWindow = harness.root.querySelector<HTMLElement>("[data-display-window]");
    assert.equal(
      displayWindow?.style.getPropertyValue("--v2-visualizer-fixed-width"),
      "460px",
      "once columns exceed 4, visualizer switches to fixed visualizer width token",
    );
    const widthAfterWideGrowth = Number.parseFloat(calcBody?.style.getPropertyValue("--desktop-calc-width") ?? "0");
    assert.equal(widthAfterWideGrowth > widthAtBaseline, true, "desktop width grows once columns exceed 4-column minimum-width baseline");
    const tall = reducer(initialState(), { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 3 });
    renderer.render(tall, dispatch, {
            inputBlocked: false,
    });
    const heightAfterTallGrowth = Number.parseFloat(calcBody?.style.getPropertyValue("--desktop-calc-min-height") ?? "0");
    assert.equal(heightAfterTallGrowth > heightAtBaseline, true, "desktop min-height grows once rows exceed 2-row baseline");

    const keyButton = harness.root.querySelector<HTMLButtonElement>(`.key[data-key='${k("=")}']`);
    assert.ok(keyButton, "calculator key exists after desktop render");
    click(keyButton as HTMLButtonElement);
    assert.equal(
      dispatched.some((action) => action.type === "PRESS_KEY" && action.key === k("=")),
      true,
      "clicking a rendered key dispatches PRESS_KEY action on desktop shell",
    );

    renderer.dispose();
  } finally {
    harness.teardown();
  }
};

