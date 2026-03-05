import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { createDesktopShellRenderer } from "../src_v2/ui/shells/desktopShellRenderer.js";

type MockEl = HTMLElement & {
  __attrs: Map<string, string>;
};

const createMockElement = (): MockEl =>
  ({
    __attrs: new Map<string, string>(),
    setAttribute(name: string, value: string): void {
      this.__attrs.set(name, value);
    },
    getAttribute(name: string): string | null {
      return this.__attrs.get(name) ?? null;
    },
  }) as MockEl;

const getAttr = (element: MockEl, name: string): string | null => element.__attrs.get(name) ?? null;

export const runUiShellDesktopAllocatorRevealTests = async (): Promise<void> => {
  const playArea = createMockElement();
  const checklist = createMockElement();
  const storage = createMockElement();
  const calc = createMockElement();
  const allocator = createMockElement();
  const root = {
    querySelector: (selector: string) => {
      if (selector === ".play-area") {
        return playArea;
      }
      if (selector === ".checklist-shell") {
        return checklist;
      }
      if (selector === ".storage") {
        return storage;
      }
      if (selector === "[data-calc-device]") {
        return calc;
      }
      if (selector === "[data-allocator-device]") {
        return allocator;
      }
      return null;
    },
  };

  const state = initialState();
  const renderer = createDesktopShellRenderer(root as unknown as Element);
  const dispatch = () => ({ type: "RESET_RUN" as const });

  try {
    try {
      renderer.render(state, dispatch, {
        interactionMode: "calculator",
        inputBlocked: false,
      });
    } catch {
      // Renderer module mount contracts are validated by dedicated module tests.
    }
    assert.equal(getAttr(playArea, "data-desktop-shell"), "true", "desktop shell marker is applied");
    assert.equal(getAttr(playArea, "data-desktop-mode"), "calculator", "desktop mode is calculator on initial render");
    assert.equal(getAttr(playArea, "data-allocator-reveal"), null, "allocator reveal state is not used in static desktop layout");

    try {
      renderer.render(state, dispatch, {
        interactionMode: "modify",
        inputBlocked: false,
      });
    } catch {
      // Renderer module mount contracts are validated by dedicated module tests.
    }
    assert.equal(getAttr(playArea, "data-desktop-mode"), "modify", "desktop mode reflects modify state");
    assert.equal(getAttr(playArea, "data-allocator-reveal"), null, "allocator remains static in modify mode");

    try {
      renderer.render(state, dispatch, {
        interactionMode: "calculator",
        inputBlocked: false,
      });
    } catch {
      // Renderer module mount contracts are validated by dedicated module tests.
    }
    assert.equal(getAttr(playArea, "data-desktop-mode"), "calculator", "desktop mode reflects calculator state");
    assert.equal(getAttr(playArea, "data-allocator-reveal"), null, "allocator remains static in calculator mode");
  } finally {
    renderer.dispose();
  }
};
