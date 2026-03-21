import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderCalculatorV2Module } from "../src/ui/modules/calculator/render.js";
import {
  advanceSlotMarqueeTickForTests,
  disposeCalculatorV2Module,
  reconcileSlotMarqueeGeometry,
} from "../src/ui/modules/calculator/runtime.js";
import type { Action, GameState } from "../src/domain/types.js";
import { installDomHarness } from "./helpers/domHarness.js";

const noopDispatch = (_action: Action): Action => _action;

export const runUiModuleCalculatorSlotMarqueeTests = (): void => {
  const harness = installDomHarness();
  let viewportWidth = 180;
  const clientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth");

  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      if ((this as HTMLElement).classList.contains("slot-display__viewport")) {
        return viewportWidth;
      }
      return clientWidthDescriptor?.get?.call(this) ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get() {
      if ((this as HTMLElement).classList.contains("slot-display__track")) {
        return ((this as HTMLElement).textContent ?? "").length * 8;
      }
      return scrollWidthDescriptor?.get?.call(this) ?? 0;
    },
  });

  try {
    const longSlotState: GameState = {
      ...initialState(),
      unlocks: {
        ...initialState().unlocks,
        maxSlots: 6,
      },
      calculator: {
        ...initialState().calculator,
        operationSlots: [
          { operator: op("op_add"), operand: 11111n },
          { operator: op("op_sub"), operand: 22222n },
          { operator: op("op_mul"), operand: 33333n },
          { operator: op("op_div"), operand: 44444n },
          { operator: op("op_euclid_div"), operand: 55555n },
        ],
      },
    };

    renderCalculatorV2Module(harness.root, longSlotState, noopDispatch, { inputBlocked: false });
    const slotEl = harness.root.querySelector<HTMLElement>("[data-slot]");
    const trackEl = slotEl?.querySelector<HTMLElement>(".slot-display__track");
    assert.ok(slotEl, "slot display exists");
    assert.ok(trackEl, "slot marquee track exists");
    assert.equal(slotEl?.classList.contains("slot-display--marquee"), true, "overflow slot enables marquee mode");
    assert.equal(trackEl?.style.transform ?? "", "translateX(-0ch)", "marquee starts at zero offset");
    advanceSlotMarqueeTickForTests(harness.root, 1);
    assert.equal(trackEl?.style.transform ?? "", "translateX(-1ch)", "one marquee tick advances by one character");
    let previousTransform = trackEl?.style.transform ?? "";
    let pauseTickCount = 0;
    let observedEdgePause = false;
    for (let index = 0; index < 1200; index += 1) {
      advanceSlotMarqueeTickForTests(harness.root, 1);
      const currentTransform = trackEl?.style.transform ?? "";
      if (currentTransform === previousTransform && currentTransform !== "translateX(-0ch)") {
        pauseTickCount += 1;
      } else if (pauseTickCount > 0) {
        observedEdgePause = true;
        break;
      }
      previousTransform = currentTransform;
    }
    assert.equal(observedEdgePause, true, "marquee pauses at edge before reversing");
    assert.equal(pauseTickCount, 5, "marquee pauses for five ticks (1 second at 5 chars/sec cadence)");

    viewportWidth = 1000;
    reconcileSlotMarqueeGeometry(harness.root);
    assert.equal(slotEl?.classList.contains("slot-display--marquee"), false, "geometry reconcile can disable marquee without rerender");
    assert.equal(trackEl?.style.transform ?? "", "translateX(-0ch)", "geometry reconcile resets transform when overflow clears");

    renderCalculatorV2Module(harness.root, initialState(), noopDispatch, { inputBlocked: false });
    const resetSlotEl = harness.root.querySelector<HTMLElement>("[data-slot]");
    const resetTrackEl = resetSlotEl?.querySelector<HTMLElement>(".slot-display__track");
    assert.equal(resetSlotEl?.classList.contains("slot-display--marquee"), false, "non-overflow slot disables marquee mode");
    assert.equal(resetTrackEl?.style.transform ?? "", "translateX(-0ch)", "non-overflow slot resets marquee offset");

    viewportWidth = 180;
    renderCalculatorV2Module(harness.root, longSlotState, noopDispatch, { inputBlocked: false });
    const lifecycleTrackEl = harness.root.querySelector<HTMLElement>("[data-slot] .slot-display__track");
    advanceSlotMarqueeTickForTests(harness.root, 3);
    assert.notEqual(lifecycleTrackEl?.style.transform ?? "", "translateX(-0ch)", "lifecycle precondition: marquee advanced before dispose");
    disposeCalculatorV2Module(harness.root);
    assert.equal(lifecycleTrackEl?.style.transform ?? "", "translateX(-0ch)", "dispose clears marquee transform on mounted slot track");

    renderCalculatorV2Module(harness.root, initialState(), noopDispatch, { inputBlocked: false });
    const remountSlotEl = harness.root.querySelector<HTMLElement>("[data-slot]");
    assert.equal(remountSlotEl?.classList.contains("slot-display--marquee"), false, "remount after dispose starts with stable non-marquee state");
  } finally {
    if (clientWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", clientWidthDescriptor);
    } else {
      delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    }
    if (scrollWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "scrollWidth", scrollWidthDescriptor);
    } else {
      delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
    }
    disposeCalculatorV2Module(harness.root);
    harness.teardown();
  }
};

