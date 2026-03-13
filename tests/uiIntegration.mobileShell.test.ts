import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import type { Action, GameState, RollEntry } from "../src/domain/types.js";
import { createShellRenderer } from "../src/ui/renderAdapter.js";
import { click } from "./helpers/eventHarness.js";
import { installDomHarness } from "./helpers/domHarness.js";

export const runUiIntegrationMobileShellTests = (): void => {
  const r = (num: bigint, den: bigint = 1n): RollEntry["y"] => ({
    kind: "rational",
    value: { num, den },
  });
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
            inputBlocked: false,
    });

    const shellRoot = harness.root.querySelector<HTMLElement>("[data-v2-shell-root='true']");
    assert.ok(shellRoot, "mobile shell mounts v2 shell root");
    const menu = shellRoot?.querySelector<HTMLElement>("[data-v2-menu='true']");
    assert.equal(menu?.getAttribute("aria-hidden"), "true", "mobile menu is hidden by default");

    renderer.forceActiveView({
      snapId: "bottom",
      bottomPanelId: "checklist",
      includeTransition: false,
    });
    const allocatorPanel = shellRoot?.querySelector<HTMLElement>("[data-v2-drawer-panel='checklist']");
    assert.equal(
      allocatorPanel?.getAttribute("aria-hidden"),
      "false",
      "forceActiveView can orchestrate bottom checklist panel",
    );

    renderer.render(withStorage, dispatch, {
            inputBlocked: false,
    });
    const host = harness.root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
    const withGraph: GameState = {
      ...withStorage,
      ui: {
        ...withStorage.ui,
        activeVisualizer: "graph",
      },
    };
    const withFeed: GameState = {
      ...withStorage,
      ui: {
        ...withStorage.ui,
        activeVisualizer: "feed",
      },
    };
    const withTotal: GameState = {
      ...withStorage,
      ui: {
        ...withStorage.ui,
        activeVisualizer: "total",
      },
    };
    renderer.render(withGraph, dispatch, {
            inputBlocked: false,
    });
    renderer.render(withFeed, dispatch, {
            inputBlocked: false,
    });
    const feedPanel = harness.root.querySelector<HTMLElement>("[data-v2-feed-panel]");
    assert.ok(feedPanel, "feed panel is mounted");
    const withFeedTable: GameState = {
      ...withFeed,
      unlocks: {
        ...withFeed.unlocks,
        maxTotalDigits: 9,
      },
      calculator: {
        ...withFeed.calculator,
        rollEntries: [
          { y: r(9n) },
          { y: r(10n), remainder: { num: 1n, den: 2n } },
          { y: r(11n), error: { code: "n/0", kind: "division_by_zero" } },
        ],
      },
    };
    renderer.render(withFeedTable, dispatch, {
            inputBlocked: false,
    });
    assert.equal(
      feedPanel?.textContent?.includes("  X  |"),
      true,
      "feed panel renders ascii table header",
    );
    const headerLine = feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line");
    assert.equal(
      headerLine?.textContent ?? "",
      "  X  |     Y      |   r    ",
      "feed panel header uses fixed ascii column widths for maxTotalDigits=9",
    );
    assert.equal(
      (feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line")?.textContent?.split("|").length ?? 0) >= 3,
      true,
      "feed panel renders an r column when a visible row has remainder",
    );
    const rSegment = feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line .v2-feed-r-col");
    assert.equal(Boolean(rSegment), true, "feed panel renders r segment span when r column is visible");
    assert.equal(rSegment?.textContent?.startsWith("|"), true, "r segment includes the yellow separator bar");
    const firstNineLines = Array.from(feedPanel?.querySelectorAll<HTMLElement>(".v2-feed-table-line") ?? []).slice(0, 9);
    const firstPipeColumns = firstNineLines.map((line) => (line.textContent ?? "").indexOf("|"));
    const secondPipeColumns = firstNineLines.map((line) => (line.textContent ?? "").indexOf("|", firstPipeColumns[0]! + 1));
    assert.equal(firstPipeColumns.every((index) => index === firstPipeColumns[0]), true, "first feed separator stays vertically aligned");
    assert.equal(secondPipeColumns.every((index) => index === secondPipeColumns[0]), true, "r separator stays vertically aligned");
    assert.equal(
      feedPanel?.querySelectorAll(".v2-feed-row--error").length,
      1,
      "feed panel marks error rows in red",
    );
    const dividerLine = feedPanel?.querySelectorAll<HTMLElement>(".v2-feed-table-line")[1];
    assert.equal(
      /-{20,}/.test(dividerLine?.textContent ?? ""),
      false,
      "feed divider line does not emit oversized y-column padding dashes",
    );
    const withFeedNoVisibleRemainder: GameState = {
      ...withFeed,
      calculator: {
        ...withFeed.calculator,
        rollEntries: [
          { y: r(1n) },
          { y: r(2n), remainder: { num: 1n, den: 2n } },
          { y: r(3n) },
          { y: r(4n) },
          { y: r(5n) },
          { y: r(6n) },
          { y: r(7n) },
          { y: r(8n) },
          { y: r(9n) },
        ],
      },
    };
    renderer.render(withFeedNoVisibleRemainder, dispatch, {
            inputBlocked: false,
    });
    const feedHeaderWithoutRemainder = feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line");
    assert.equal(
      feedHeaderWithoutRemainder?.textContent?.split("|").length ?? 0,
      2,
      "feed panel hides r column when no visible row includes remainder",
    );
    assert.equal(
      feedPanel?.querySelector(".v2-feed-r-col") ?? null,
      null,
      "feed panel removes the r segment span when r column is hidden",
    );
    renderer.render(withGraph, dispatch, {
            inputBlocked: false,
    });
    renderer.render(withTotal, dispatch, {
            inputBlocked: false,
    });
    assert.equal(
      host?.dataset.v2VisualizerTransition,
      "exit",
      "rapid visualizer sequence ends with exit transition into total",
    );
    assert.equal(
      host?.getAttribute("data-v2-visualizer-height-lock"),
      null,
      "rapid visualizer sequence does not leave swap height lock behind",
    );

    const totalPanel = harness.root.querySelector<HTMLElement>("[data-v2-total-panel]");
    assert.ok(totalPanel, "total panel is mounted");
    const hiddenDomainOnCleared = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    assert.equal(
      hiddenDomainOnCleared?.getAttribute("aria-hidden"),
      "true",
      "domain indicator is hidden when total display is the cleared placeholder",
    );
    const withErrorTotal: GameState = {
      ...withTotal,
      calculator: {
        ...withTotal.calculator,
        total: r(11n),
        rollEntries: [
          { y: r(5n) },
          { y: r(11n), error: { code: "n/0", kind: "division_by_zero" } },
        ],
      },
    };
    renderer.render(withErrorTotal, dispatch, {
            inputBlocked: false,
    });
    const domainIndicatorWithError = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    const remainderDisplayWithError = totalPanel?.querySelector<HTMLElement>(".total-remainder-display");
    assert.equal(
      totalPanel?.classList.contains("total-display--error"),
      true,
      "total panel enters error color mode when latest roll entry has an error",
    );
    assert.equal(domainIndicatorWithError?.textContent, "ℕ", "domain indicator renders latest y domain symbol");
    assert.equal(
      domainIndicatorWithError?.classList.contains("total-domain-indicator--nan"),
      false,
      "domain indicator keeps default (green) styling for non-NaN totals",
    );
    assert.equal(
      remainderDisplayWithError?.getAttribute("aria-hidden"),
      "true",
      "remainder display is hidden when latest roll entry has no remainder",
    );

    const withRemainderTotal: GameState = {
      ...withErrorTotal,
      calculator: {
        ...withErrorTotal.calculator,
        total: r(1n, 2n),
        rollEntries: [
          ...withErrorTotal.calculator.rollEntries,
          { y: r(1n, 2n), remainder: { num: 1n, den: 3n } },
        ],
      },
    };
    renderer.render(withRemainderTotal, dispatch, {
            inputBlocked: false,
    });
    const domainIndicatorWithRemainder = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    const remainderDisplayWithRemainder = totalPanel?.querySelector<HTMLElement>(".total-remainder-display");
    assert.equal(
      totalPanel?.classList.contains("total-display--error"),
      false,
      "total panel clears error color mode when latest roll entry is not an error",
    );
    assert.equal(domainIndicatorWithRemainder?.textContent, "ℚ", "domain indicator updates for fractional y values");
    assert.equal(
      remainderDisplayWithRemainder?.getAttribute("aria-hidden"),
      "false",
      "remainder display is visible when latest roll entry includes remainder",
    );
    assert.equal(
      remainderDisplayWithRemainder?.textContent?.includes("1/3"),
      true,
      "remainder display renders the latest remainder value",
    );

    const withNanTotal: GameState = {
      ...withRemainderTotal,
      calculator: {
        ...withRemainderTotal.calculator,
        total: { kind: "nan" },
        rollEntries: [...withRemainderTotal.calculator.rollEntries, { y: { kind: "nan" } }],
      },
    };
    renderer.render(withNanTotal, dispatch, {
            inputBlocked: false,
    });
    const domainIndicatorWithNan = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    assert.equal(domainIndicatorWithNan?.textContent, "∅", "domain indicator shows null-set symbol when total is NaN");
    assert.equal(
      domainIndicatorWithNan?.classList.contains("total-domain-indicator--nan"),
      true,
      "domain indicator switches to NaN (red) styling when total is NaN",
    );

    const keyButton = harness.root.querySelector<HTMLButtonElement>(`.key[data-key='${k("=")}']`);
    assert.ok(keyButton, "calculator key exists after mobile render");
    click(keyButton as HTMLButtonElement);
    assert.equal(
      dispatched.some((action) => action.type === "PRESS_KEY" && action.key === k("=")),
      true,
      "clicking a rendered key dispatches PRESS_KEY action",
    );

    renderer.dispose();
  } finally {
    harness.teardown();
  }
};





